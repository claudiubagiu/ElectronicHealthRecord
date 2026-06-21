import { Injectable, inject } from '@angular/core';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { IpfsService } from '../../../core/services/ipfs.service';
import { DocumentKeyService } from '../../../core/services/document-key.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import { EncryptedPayload } from '../../../core/models/ipfs.model';
import { LabAnalysis } from '../../../core/models/blockchain.model';
import { AppError } from '../../../core/errors/app.error';

export interface LabAnalysisSubmissionInput {
  pdfFile: File;
  patientWalletAddress: string;
  /** The patient's user ID (GUID) — required to resolve the PatientMasterKey
   *  and to register the new DocumentKey in AccessRequests.Api. */
  patientId: string;
  labTechName: string;
}

export interface LabAnalysisSubmissionResult {
  labAnalysisId: bigint;
  ipfsCid: string;
}

/**
 * Facade service that orchestrates the full lab analysis submission and
 * decryption pipeline — mirrors DiagnosticSubmissionService /
 * DiagnosticDecryptionService:
 *
 * Submission:
 * 1. Encrypt the uploaded PDF with a random per-document DocumentKey.
 * 2. Resolve the patient's PatientMasterKey and wrap the DocumentKey with it.
 * 3. Upload the encrypted file to IPFS (no key material included).
 * 4. Register the wrapped DocumentKey in AccessRequests.Api, by IPFS CID.
 * 5. Record the analysis on-chain.
 *
 * Decryption:
 * 1. Download the encrypted payload from IPFS.
 * 2. Fetch the wrapped DocumentKey by IPFS CID.
 * 3. Resolve the caller's usable PatientMasterKey.
 * 4. Unwrap the DocumentKey, decrypt the file with it.
 * 5. Open the decrypted file in a new browser tab.
 */
@Injectable({ providedIn: 'root' })
export class LabAnalysisService {
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

  // ── Submission ─────────────────────────────────────────────────────────────

  async submit(input: LabAnalysisSubmissionInput): Promise<LabAnalysisSubmissionResult> {
    const { pdfFile, patientWalletAddress, patientId, labTechName } = input;

    if (!patientId) {
      throw new AppError({
        message: 'Patient ID is required to submit a lab analysis.',
        status: 400,
        title: 'Missing Patient ID',
        type: 'MISSING_PATIENT_ID',
      });
    }

    // 1. Read uploaded PDF into ArrayBuffer
    const fileBuffer = await pdfFile.arrayBuffer();

    // 2. Encrypt with a random per-document DocumentKey (AES-256-GCM)
    const documentKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, documentKey);

    // 3. Resolve the patient's PatientMasterKey and wrap the DocumentKey with it
    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );

    // 4. Build and upload the IPFS payload — no key material included
    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      fileName: pdfFile.name,
      timestamp: Date.now(),
    };

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 5. Register the wrapped DocumentKey, indexed by the IPFS CID
    await this.documentKeyService.create({
      patientId,
      ipfsCid,
      encryptedDocumentKey,
    });

    // 6. Record on blockchain
    const title = pdfFile.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const labAnalysisId = await this.blockchainService.addLabAnalysis(
      title,
      ipfsCid,
      patientWalletAddress,
      labTechName
    );

    return { labAnalysisId, ipfsCid };
  }

  // ── Decryption ─────────────────────────────────────────────────────────────

  /**
   * @param analysis - The on-chain LabAnalysis object containing the IPFS CID.
   * @param patientId - The patient's user ID (GUID) — needed to resolve the
   *   PatientMasterKey. Pass the caller's own userId if they ARE the patient,
   *   or the patient's userId if the caller is an authorized doctor/assistant.
   */
  async decryptAndOpen(analysis: LabAnalysis, patientId: string): Promise<void> {
    // 1. Download encrypted payload from IPFS
    const data = await this.ipfsService.downloadEncryptedData(analysis.ipfsCid);

    // 2. Fetch the wrapped DocumentKey for this file
    const documentKeyRecord = await this.documentKeyService.getByIpfsCid(analysis.ipfsCid);
    if (!documentKeyRecord?.encryptedDocumentKey) {
      throw new AppError({
        message:
          'No document key was found for this file. The analysis may be corrupted or ' +
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

    // 5. Open in new tab
    const mimeType = this.getMimeType(data.fileName);
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

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
