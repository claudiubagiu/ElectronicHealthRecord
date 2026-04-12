import { Injectable, inject } from '@angular/core';
import { CryptoService } from '../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../core/services/e2ee-key.service';
import { MedicalDataService } from './medical-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppError } from '../../../core/errors/app.error';
import { MedicalRecordEnvelopeDto, MedicalRecordDto } from '../models/medical-data.model';
import {
  MedicalRecordFormData,
  MedicalRecordSubmissionInput,
} from '../models/medical-data-form.model';
import { AccessManagementService } from '../../access-management/services/access-management.service';

@Injectable({ providedIn: 'root' })
export class MedicalDataCryptoService {
  private e2eeService = inject(E2eeKeyService);
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

    const jsonPayload = JSON.stringify(record);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonPayload).buffer as ArrayBuffer;

    const aesKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, aesKey);
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);

    const authorizedUserIds = await this.getAuthorizedUserIds(patientId);
    const publicKeys = await this.e2eeService.getPublicKeysBulk(authorizedUserIds);

    const envelopes: MedicalRecordEnvelopeDto[] = [];
    for (const pk of publicKeys) {
      const encryptedAesKey = CryptoService.encryptAESKeyWithECIES(aesKeyRaw, pk.publicKey);
      envelopes.push({
        userId: pk.userId,
        encryptedAesKey: this.arrayBufferToBase64(encryptedAesKey.buffer as ArrayBuffer),
      });
    }

    await this.medicalDataService.create({
      patientId,
      recordType: record.type,
      encryptedData: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      envelopes,
    });
  }

  async decrypt(record: MedicalRecordDto): Promise<MedicalRecordFormData> {
    const privateKey = this.requirePrivateKey();

    if (!record.encryptedAesKey) {
      throw new AppError({
        message: 'No encryption envelope found for this record.',
        status: 403,
        title: 'No Envelope',
        type: 'MEDICAL_RECORD_NO_ENVELOPE',
      });
    }

    const encryptedAesKeyBuffer = this.base64ToArrayBuffer(record.encryptedAesKey);
    const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(encryptedAesKeyBuffer, privateKey);

    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyRaw.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const encryptedDataBuffer = this.base64ToArrayBuffer(record.encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(record.iv);
    const iv = new Uint8Array(ivBuffer);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(encryptedDataBuffer, aesKey, iv);
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as MedicalRecordFormData;
  }

  async grantEnvelopesToDoctor(doctorId: string, patientId: string): Promise<void> {
    const privateKey = this.requirePrivateKey();

    const records = await this.medicalDataService.getByPatientId(patientId);
    if (records.length === 0) return;

    const doctorPkResponse = await this.e2eeService.getPublicKey_remote(doctorId);

    const envelopes: { medicalRecordId: string; userId: string; encryptedAesKey: string }[] = [];

    for (const rec of records) {
      if (!rec.encryptedAesKey) continue;

      const encryptedAesKeyBuffer = this.base64ToArrayBuffer(rec.encryptedAesKey);
      const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(encryptedAesKeyBuffer, privateKey);

      const encryptedForDoctor = CryptoService.encryptAESKeyWithECIES(
        aesKeyRaw.buffer as ArrayBuffer,
        doctorPkResponse.publicKey
      );

      envelopes.push({
        medicalRecordId: rec.id,
        userId: doctorId,
        encryptedAesKey: this.arrayBufferToBase64(encryptedForDoctor.buffer as ArrayBuffer),
      });
    }

    if (envelopes.length > 0) {
      await this.medicalDataService.addEnvelopesBulk({ envelopes });
    }
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

  private async getAuthorizedUserIds(patientId: string): Promise<string[]> {
    const ids = new Set<string>();
    ids.add(patientId);
    try {
      const response = await this.accessService.getApprovedDoctorIds(patientId);
      response.forEach((id) => ids.add(id));
    } catch {
      console.warn('Could not fetch approved doctors, proceeding with patient only.');
    }
    return Array.from(ids);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
}
