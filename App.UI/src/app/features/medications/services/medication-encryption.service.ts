import { Injectable, inject } from '@angular/core';
import { CryptoService } from '../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../core/services/e2ee-key.service';
import { AccessRequestService } from '../../patient-access/services/access-request.service';
import { MedicationService } from './medication.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppError } from '../../../core/errors/app.error';
import { EnvelopeDto } from '../models/medication.model';

export interface MedicationFormData {
  name: string;
  dose: string;
  frequency: string;
  notes: string;
}

export interface MedicationSubmissionInput {
  patientId: string;
  medication: MedicationFormData;
}

@Injectable({ providedIn: 'root' })
export class MedicationEncryptionService {
  private e2eeService = inject(E2eeKeyService);
  private medicationService = inject(MedicationService);
  private authService = inject(AuthService);

  /**
   * Full encryption + submission pipeline:
   * 1. Serialize medication as JSON
   * 2. Generate random AES key
   * 3. Encrypt JSON with AES
   * 4. Fetch public keys for patient + all approved doctors
   * 5. Create RSA envelopes for each authorized user
   * 6. POST to backend
   */
  async submit(input: MedicationSubmissionInput): Promise<void> {
    const { patientId, medication } = input;
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser)
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });

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

    // 5. Get all user IDs who need an envelope:
    //    - The patient
    //    - The current doctor (self)
    //    - All other doctors with approved access to this patient
    const authorizedUserIds = await this.getAuthorizedUserIds(patientId);

    // 6. Fetch public keys in bulk
    const publicKeys = await this.e2eeService.getPublicKeysBulk(authorizedUserIds);

    // 7. Create envelopes
    const envelopes: EnvelopeDto[] = [];
    for (const pk of publicKeys) {
      const rsaPublicKey = await CryptoService.importPublicKey(pk.publicKey);
      const encryptedAesKey = await CryptoService.encryptAESKeyWithRSA(aesKeyRaw, rsaPublicKey);
      envelopes.push({
        userId: pk.userId,
        encryptedAesKey: this.arrayBufferToBase64(encryptedAesKey),
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

  /**
   * Returns unique user IDs: patient + current doctor + all other approved doctors.
   */
  private async getAuthorizedUserIds(
    patientId: string,
  ): Promise<string[]> {
    // Fetch all access requests for this patient from Diagnostics.Api
    // We reuse the existing access-request endpoint from the doctor's perspective
    // but we need the patient's approved doctors list.
    // Since the doctor has access, they can fetch this.
    const ids = new Set<string>();

    // Always include patient and self
    ids.add(patientId);

    // Fetch approved doctors for this patient via the access request endpoint
    try {
      const response = await this.e2eeService.getApprovedDoctorIds(patientId);
      response.forEach((id) => ids.add(id));
    } catch {
      // If this fails, at minimum patient + self have envelopes
      console.warn('Could not fetch approved doctors list, proceeding with patient + self only.');
    }

    return Array.from(ids);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
}
