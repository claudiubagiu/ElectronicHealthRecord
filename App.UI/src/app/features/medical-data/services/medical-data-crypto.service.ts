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
 * Handles E2EE for medical records under the single-key-per-patient model:
 *
 *   - Every patient has exactly one personal AES data key (generated at
 *     registration, ECIES-encrypted with their own public key, stored as
 *     User.EncryptedAesKey).
 *   - Every medical record is encrypted once with that key (AES-256-GCM).
 *     There is no per-document envelope anymore.
 *   - A doctor (or other authorized user) recovers the patient's AES key
 *     via the envelope issued by AccessRequests.Api when access was
 *     approved — one envelope per (patient, user) pair, not per document.
 *
 * Both paths converge on `resolvePatientAesKey`, which returns a usable
 * CryptoKey regardless of whether the caller is the patient or an
 * authorized doctor/assistant/etc.
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

    const aesKey = await this.resolvePatientAesKey(patientId);

    const jsonPayload = JSON.stringify(record);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonPayload).buffer as ArrayBuffer;

    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, aesKey);

    await this.medicalDataService.create({
      patientId,
      recordType: record.type,
      encryptedData: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
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

    const aesKey = await this.resolvePatientAesKey(patientId);

    const jsonPayload = JSON.stringify(record.data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonPayload).buffer as ArrayBuffer;

    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, aesKey);

    return this.medicalDataService.update(record.id, {
      recordType: record.data.type,
      encryptedData: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
    });
  }

  async deleteRecord(id: string): Promise<void> {
    await this.medicalDataService.delete(id);
  }

  async decrypt(record: MedicalRecordDto): Promise<MedicalRecordFormData> {
    const aesKey = await this.resolvePatientAesKey(record.patientId);

    const encryptedDataBuffer = this.base64ToArrayBuffer(record.encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(record.iv);
    const iv = new Uint8Array(ivBuffer);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(encryptedDataBuffer, aesKey, iv);
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as MedicalRecordFormData;
  }

  /**
   * Resolves a usable AES-GCM CryptoKey for the given patient, regardless of
   * who is currently logged in:
   *
   *   - If the caller IS the patient: decrypts their own EncryptedAesKey
   *     (from their profile) with their own private key.
   *   - Otherwise: fetches the envelope AccessRequests.Api issued for this
   *     (patient, caller) pair on approval, and decrypts it with the
   *     caller's private key. Throws if no envelope exists (access not
   *     approved, revoked, or expired).
   *
   * Public — also used by DiagnosticDraftService, which shares the same
   * single-key-per-patient model.
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
