import { Injectable, inject } from '@angular/core';
import { CryptoService } from '../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../core/services/e2ee-key.service';
import { MedicationService } from './medication.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppError } from '../../../core/errors/app.error';
import { EnvelopeDto, MedicationDto } from '../models/medication.model';
import { MedicationFormData, MedicationSubmissionInput } from '../models/medication-form.model';
import { AccessManagementService } from '../../access-management/services/access-management.service';

@Injectable({ providedIn: 'root' })
export class MedicationCryptoService {
  private e2eeService = inject(E2eeKeyService);
  private medicationService = inject(MedicationService);
  private accessService = inject(AccessManagementService);
  private authService = inject(AuthService);

  // ==================== Encryption (Submit) ====================

  /**
   * Full encryption + submission pipeline:
   * 1. Serialize medication as JSON.
   * 2. Generate random AES-256 key.
   * 3. Encrypt JSON with AES-GCM.
   * 4. Export AES key as raw bytes.
   * 5. Fetch ECC public keys for patient + all approved doctors.
   * 6. Create ECIES envelopes for each authorized user (encrypt AES key with their public key).
   * 7. POST encrypted payload + envelopes to Medications.Api.
   */
  async submit(input: MedicationSubmissionInput): Promise<void> {
    const { patientId, medication } = input;
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    // 1. Serialize medication as JSON
    const jsonPayload = JSON.stringify(medication);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonPayload).buffer as ArrayBuffer;

    // 2. Generate random AES-256 key
    const aesKey = await CryptoService.generateAESKey();

    // 3. Encrypt with AES-GCM
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, aesKey);

    // 4. Export AES key as raw bytes
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);

    // 5. Get all user IDs who need an envelope
    const authorizedUserIds = await this.getAuthorizedUserIds(patientId);

    // 6. Fetch ECC public keys in bulk
    const publicKeys = await this.e2eeService.getPublicKeysBulk(authorizedUserIds);

    // 7. Create ECIES envelopes (one per authorized user)
    const envelopes: EnvelopeDto[] = [];
    for (const pk of publicKeys) {
      const encryptedAesKey = CryptoService.encryptAESKeyWithECIES(aesKeyRaw, pk.publicKey);
      envelopes.push({
        userId: pk.userId,
        encryptedAesKey: this.arrayBufferToBase64(encryptedAesKey.buffer as ArrayBuffer),
      });
    }

    // 8. POST to Medications.Api
    await this.medicationService.create({
      patientId,
      encryptedData: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      envelopes,
    });
  }

  // ==================== Decryption ====================

  /**
   * Decrypts a medication's encrypted data using the user's ECC private key.
   *
   * Flow:
   * 1. Decode the envelope's encryptedAesKey from base64.
   * 2. Decrypt it with ECIES using the wallet-derived private key → raw AES key.
   * 3. Import the AES key.
   * 4. Decode encryptedData + IV from base64.
   * 5. Decrypt with AES-GCM → JSON string.
   * 6. Parse JSON → MedicationFormData.
   */
  async decrypt(medication: MedicationDto): Promise<MedicationFormData> {
    const privateKey = this.requirePrivateKey();

    if (!medication.encryptedAesKey) {
      throw new AppError({
        message: 'No encryption envelope found for this medication. You may not have access.',
        status: 403,
        title: 'No Envelope',
        type: 'MEDICATION_NO_ENVELOPE',
      });
    }

    // 1. Decrypt AES key with ECIES
    const encryptedAesKeyBuffer = this.base64ToArrayBuffer(medication.encryptedAesKey);
    const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(encryptedAesKeyBuffer, privateKey);

    // 2. Import AES key
    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyRaw.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 3. Decrypt the medication data
    const encryptedDataBuffer = this.base64ToArrayBuffer(medication.encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(medication.iv);
    const iv = new Uint8Array(ivBuffer);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(encryptedDataBuffer, aesKey, iv);

    // 4. Parse JSON
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as MedicationFormData;
  }

  // ==================== Envelope Management ====================

  /**
   * Called by the patient after approving a doctor's access request.
   * Re-wraps the AES key of every existing medication so the new doctor can decrypt them.
   *
   * Flow per medication:
   * 1. Decrypt the patient's own ECIES envelope to recover the raw AES key.
   * 2. Re-encrypt the AES key with the doctor's ECC public key via ECIES.
   * 3. Submit all new envelopes to the backend in bulk.
   */
  async grantEnvelopesToDoctor(doctorId: string, patientId: string): Promise<void> {
    const privateKey = this.requirePrivateKey();

    // 1. Fetch patient's medications
    const medications = await this.medicationService.getByPatientId(patientId);
    if (medications.length === 0) return;

    // 2. Fetch doctor's ECC public key
    const doctorPkResponse = await this.e2eeService.getPublicKey_remote(doctorId);

    // 3. Re-wrap AES key for each medication
    const envelopes: { medicationId: string; userId: string; encryptedAesKey: string }[] = [];

    for (const med of medications) {
      if (!med.encryptedAesKey) continue;

      // Decrypt the AES key using patient's private key
      const encryptedAesKeyBuffer = this.base64ToArrayBuffer(med.encryptedAesKey);
      const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(encryptedAesKeyBuffer, privateKey);

      // Re-encrypt with doctor's ECC public key
      const encryptedForDoctor = CryptoService.encryptAESKeyWithECIES(
        aesKeyRaw.buffer as ArrayBuffer,
        doctorPkResponse.publicKey
      );

      envelopes.push({
        medicationId: med.id,
        userId: doctorId,
        encryptedAesKey: this.arrayBufferToBase64(encryptedForDoctor.buffer as ArrayBuffer),
      });
    }

    // 4. Send bulk
    if (envelopes.length > 0) {
      await this.medicationService.addEnvelopesBulk({ envelopes });
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Returns the ECC private key (hex string) or throws if unavailable.
   */
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

  /**
   * Returns unique user IDs: patient + current doctor + all other approved doctors.
   */
  private async getAuthorizedUserIds(patientId: string): Promise<string[]> {
    const ids = new Set<string>();
    ids.add(patientId);

    try {
      const response = await this.accessService.getApprovedDoctorIds(patientId);
      response.forEach((id) => ids.add(id));
    } catch {
      console.warn('Could not fetch approved doctors list, proceeding with patient + self only.');
    }

    return Array.from(ids);
  }

  /**
   * Converts a base64 string to an ArrayBuffer.
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
  }

  /**
   * Converts an ArrayBuffer to a base64 string.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
}
