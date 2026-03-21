import { Injectable, inject } from '@angular/core';
import { CryptoService } from '../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../core/services/e2ee-key.service';
import { AppError } from '../../../core/errors/app.error';
import { MedicationDto } from '../models/medication.model';
import { MedicationFormData } from './medication-encryption.service';

/**
 * Decrypts a medication's encrypted data using the patient's RSA private key.
 *
 * Flow:
 * 1. Decode the envelope's encryptedAesKey from base64
 * 2. Decrypt it with the patient's RSA private key → raw AES key
 * 3. Import the AES key
 * 4. Decode encryptedData + IV from base64
 * 5. Decrypt with AES-GCM → JSON string
 * 6. Parse JSON → MedicationFormData
 */
@Injectable({ providedIn: 'root' })
export class MedicationDecryptionService {
  private e2eeService = inject(E2eeKeyService);

  async decrypt(medication: MedicationDto): Promise<MedicationFormData> {
    const privateKey = this.e2eeService.getPrivateKey();
    if (!privateKey) {
      throw new AppError({
        message: 'Your encryption key is not available. Please log in again.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }

    if (!medication.encryptedAesKey) {
      throw new AppError({
        message: 'No encryption envelope found for this medication. You may not have access.',
        status: 403,
        title: 'No Envelope',
        type: 'MEDICATION_NO_ENVELOPE',
      });
    }

    // 1. Decrypt AES key with RSA
    const encryptedAesKeyBuffer = this.base64ToArrayBuffer(medication.encryptedAesKey);
    const aesKeyRaw = await CryptoService.decryptAESKeyWithRSA(encryptedAesKeyBuffer, privateKey);

    // 2. Import AES key (need encrypt+decrypt for importAESKey which only allows decrypt,
    //    so we import manually with both usages not needed — decrypt is enough)
    const aesKey = await crypto.subtle.importKey('raw', aesKeyRaw, { name: 'AES-GCM' }, false, [
      'decrypt',
    ]);

    // 3. Decrypt the medication data
    const encryptedDataBuffer = this.base64ToArrayBuffer(medication.encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(medication.iv);
    const iv = new Uint8Array(ivBuffer);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(encryptedDataBuffer, aesKey, iv);

    // 4. Parse JSON
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as MedicationFormData;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
  }
}
