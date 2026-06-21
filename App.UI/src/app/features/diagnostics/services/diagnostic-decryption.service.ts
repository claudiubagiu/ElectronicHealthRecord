import { Injectable, inject } from '@angular/core';
import { IpfsService } from '../../../core/services/ipfs.service';
import { DocumentKeyService } from '../../../core/services/document-key.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import { AppError } from '../../../core/errors/app.error';
import { Diagnosis } from '../../../core/models/blockchain.model';

/**
 * Facade service that orchestrates the full decryption pipeline for
 * a blockchain-stored diagnosis:
 *
 * 1. Download the encrypted payload from IPFS.
 * 2. Fetch the DocumentKey (wrapped with the patient's PatientMasterKey)
 *    from AccessRequests.Api, by IPFS CID.
 * 3. Resolve the caller's usable PatientMasterKey — their own key if
 *    they're the patient, or their envelope's key otherwise.
 * 4. Unwrap the DocumentKey, decrypt the file with it.
 * 5. Open the decrypted file in a new browser tab.
 *
 * This service owns NO UI state — it simply accepts a Diagnosis and
 * either opens the file or throws an error. The calling component
 * handles loading indicators and error notifications.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticDecryptionService {
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

  /**
   * Decrypts and opens a diagnosis file in a new browser tab.
   *
   * @param diagnosis - The on-chain Diagnosis object containing the IPFS CID.
   * @param patientId - The patient's user ID (GUID) — needed to resolve the
   *   PatientMasterKey. Pass the caller's own userId if they ARE the patient,
   *   or the patient's userId if the caller is an authorized doctor/assistant.
   * @throws {AppError} If any step in the pipeline fails (IPFS download,
   *         missing DocumentKey, key resolution, or AES decryption).
   */
  async decryptAndOpen(diagnosis: Diagnosis, patientId: string): Promise<void> {
    // 1. Download the encrypted payload from IPFS (already decoded from Base64)
    const data = await this.ipfsService.downloadEncryptedData(diagnosis.ipfsCid);

    // 2. Fetch the wrapped DocumentKey for this file
    const documentKeyRecord = await this.documentKeyService.getByIpfsCid(diagnosis.ipfsCid);
    if (!documentKeyRecord?.encryptedDocumentKey) {
      throw new AppError({
        message:
          'No document key was found for this file. The diagnosis may be corrupted or ' +
          'stored in an unsupported format.',
        status: 422,
        title: 'Missing Document Key',
        type: 'MISSING_DOCUMENT_KEY',
      });
    }

    // 3. Resolve the caller's usable PatientMasterKey
    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);

    // 4. Unwrap the DocumentKey and decrypt the file
    const documentKey = await this.medicalDataCryptoService.unwrapDocumentKey(
      documentKeyRecord.encryptedDocumentKey,
      patientMasterKey
    );

    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.buffer as ArrayBuffer,
      documentKey,
      new Uint8Array(data.iv) as Uint8Array<ArrayBuffer>
    );

    // 5. Determine the MIME type from the file extension and open in a new tab
    const mimeType = this.getMimeType(data.fileName);
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Infers a MIME type from the file extension.
   *
   * Defaults to 'application/octet-stream' for unrecognised extensions.
   *
   * @param fileName - The original file name including its extension.
   * @returns The corresponding MIME type string.
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      txt: 'text/plain',
    };

    return mimeTypes[ext ?? ''] ?? 'application/octet-stream';
  }
}
