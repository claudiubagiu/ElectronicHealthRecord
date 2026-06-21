import { Injectable, inject } from '@angular/core';
import { CryptoService } from '../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../core/services/e2ee-key.service';
import { UsersService } from '../../../core/services/users.service';
import { MedicalDataService } from './medical-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppError } from '../../../core/errors/app.error';
import { MedicalRecordDto } from '../models/medical-data.model';
import {
  MedicalRecordFormData,
  MedicalRecordSubmissionInput,
} from '../models/medical-data-form.model';
import { AccessManagementService } from '../../access-management/services/access-management.service';
import { DecryptedMedicalRecord } from '../../../shared/components/medical-records-panel/medical-records-panel';

/**
 * Handles E2EE for medical records under a two-level key hierarchy:
 *
 *   - Every patient has exactly one personal PatientMasterKey (AES-256-GCM),
 *     generated at registration, ECIES-encrypted with their own public key,
 *     stored as User.EncryptedAesKey.
 *   - Every medical record is encrypted with its own random DocumentKey
 *     (AES-256-GCM). The DocumentKey itself is encrypted with the
 *     PatientMasterKey (also AES-GCM, via CryptoService.encryptString /
 *     decryptString) and stored on the record as EncryptedDocumentKey.
 *   - A doctor (or other authorized user) recovers the PatientMasterKey via
 *     the envelope issued by AccessRequests.Api when access was approved
 *     (one envelope per (patient, user) pair, not per document), then uses
 *     it to unwrap each record's DocumentKey individually.
 *
 * This means: revoking/rotating access only requires re-wrapping the small
 * EncryptedDocumentKey blobs (see rotateDocumentKeys), never re-encrypting
 * the (potentially large) EncryptedData payloads themselves.
 *
 * `resolvePatientAesKey` resolves the PatientMasterKey and is public —
 * also used by DiagnosticDraftService, which shares this same model.
 */
@Injectable({ providedIn: 'root' })
export class MedicalDataCryptoService {
  private e2eeService = inject(E2eeKeyService);
  private usersService = inject(UsersService);
  private medicalDataService = inject(MedicalDataService);
  private accessService = inject(AccessManagementService);
  private authService = inject(AuthService);

  async submit(input: MedicalRecordSubmissionInput): Promise<void> {
    const { patientId, record } = input;
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    const patientMasterKey = await this.resolvePatientAesKey(patientId);
    const documentKey = await CryptoService.generateAESKey();

    const jsonPayload = JSON.stringify(record);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonPayload).buffer as ArrayBuffer;

    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, documentKey);
    const encryptedDocumentKey = await this.wrapDocumentKey(documentKey, patientMasterKey);

    await this.medicalDataService.create({
      patientId,
      recordType: record.type,
      encryptedData: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      encryptedDocumentKey,
    });
  }

  async updateRecord(record: DecryptedMedicalRecord, patientId: string): Promise<MedicalRecordDto> {
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    const patientMasterKey = await this.resolvePatientAesKey(patientId);
    const documentKey = await CryptoService.generateAESKey();

    const jsonPayload = JSON.stringify(record.data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonPayload).buffer as ArrayBuffer;

    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, documentKey);
    const encryptedDocumentKey = await this.wrapDocumentKey(documentKey, patientMasterKey);

    return this.medicalDataService.update(record.id, {
      recordType: record.data.type,
      encryptedData: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      encryptedDocumentKey,
    });
  }

  async deleteRecord(id: string): Promise<void> {
    await this.medicalDataService.delete(id);
  }

  async decrypt(record: MedicalRecordDto): Promise<MedicalRecordFormData> {
    const patientMasterKey = await this.resolvePatientAesKey(record.patientId);
    const documentKey = await this.unwrapDocumentKey(record.encryptedDocumentKey, patientMasterKey);

    const encryptedDataBuffer = this.base64ToArrayBuffer(record.encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(record.iv);
    const iv = new Uint8Array(ivBuffer);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      encryptedDataBuffer,
      documentKey,
      iv
    );
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as MedicalRecordFormData;
  }

  /**
   * Resolves a usable AES-GCM CryptoKey (the PatientMasterKey) for the
   * given patient, regardless of who is currently logged in:
   *
   *   - If the caller IS the patient: decrypts their own EncryptedAesKey
   *     (from their profile) with their own private key.
   *   - Otherwise: fetches the envelope AccessRequests.Api issued for this
   *     (patient, caller) pair on approval, and decrypts it with the
   *     caller's private key. Throws if no envelope exists (access not
   *     approved, revoked, or expired).
   *
   * Public — also used by DiagnosticDraftService, which shares the same
   * two-level key model.
   */
  async resolvePatientAesKey(patientId: string): Promise<CryptoKey> {
    const privateKey = this.requirePrivateKey();
    const currentUser = this.authService.getDecodedToken();

    let encryptedAesKeyBase64: string;

    if (currentUser?.userId === patientId) {
      const myProfile = await this.usersService.getMyProfile();
      if (!myProfile.encryptedAesKey) {
        throw new AppError({
          message: 'Your personal encryption key was not found on your profile.',
          status: 403,
          title: 'No Encryption Key',
          type: 'PATIENT_NO_AES_KEY',
        });
      }
      encryptedAesKeyBase64 = myProfile.encryptedAesKey;
    } else {
      const envelope = await this.accessService.getEnvelope(patientId);
      if (!envelope) {
        throw new AppError({
          message: 'No decryption envelope found for this patient. Access may not be approved.',
          status: 403,
          title: 'No Envelope',
          type: 'MEDICAL_RECORD_NO_ENVELOPE',
        });
      }
      encryptedAesKeyBase64 = envelope.encryptedAesKey;
    }

    const encryptedAesKeyBuffer = this.base64ToArrayBuffer(encryptedAesKeyBase64);
    const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(encryptedAesKeyBuffer, privateKey);

    return crypto.subtle.importKey(
      'raw',
      aesKeyRaw.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts (wraps) a DocumentKey with the patient's PatientMasterKey.
   * Returns a combined string: base64(iv) + ":" + base64(ciphertext) — the
   * same format CryptoService.encryptString already uses, so backends can
   * store it as a single opaque string (EncryptedDocumentKey).
   *
   * Public — also used by DiagnosticDraftService.
   */
  async wrapDocumentKey(documentKey: CryptoKey, patientMasterKey: CryptoKey): Promise<string> {
    const rawDocumentKey = await CryptoService.exportAESKey(documentKey);
    const rawKeyBase64 = this.arrayBufferToBase64(rawDocumentKey);
    return CryptoService.encryptString(rawKeyBase64, patientMasterKey);
  }

  /**
   * Decrypts (unwraps) a DocumentKey using the patient's PatientMasterKey,
   * returning a usable CryptoKey for the underlying document.
   *
   * Public — also used by DiagnosticDraftService.
   */
  async unwrapDocumentKey(
    encryptedDocumentKey: string,
    patientMasterKey: CryptoKey
  ): Promise<CryptoKey> {
    const rawKeyBase64 = await CryptoService.decryptString(encryptedDocumentKey, patientMasterKey);
    const rawDocumentKey = this.base64ToArrayBuffer(rawKeyBase64);

    return crypto.subtle.importKey('raw', rawDocumentKey, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  private requirePrivateKey(): string {
    const privateKey = this.e2eeService.getPrivateKey();
    if (!privateKey) {
      throw new AppError({
        message: 'Your encryption key is not available. Please log in again.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }
    return privateKey;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
}
