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
  patientId: string;
  labTechName: string;
}

export interface LabAnalysisSubmissionResult {
  labAnalysisId: bigint;
  ipfsCid: string;
}

@Injectable({ providedIn: 'root' })
export class LabAnalysisService {
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

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

    const fileBuffer = await pdfFile.arrayBuffer();

    const documentKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, documentKey);

    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );

    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      fileName: pdfFile.name,
      timestamp: Date.now(),
    };

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    await this.documentKeyService.create({
      patientId,
      ipfsCid,
      encryptedDocumentKey,
    });

    const title = pdfFile.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const labAnalysisId = await this.blockchainService.addLabAnalysis(
      title,
      ipfsCid,
      patientWalletAddress,
      labTechName
    );

    return { labAnalysisId, ipfsCid };
  }

  async decryptAndOpen(analysis: LabAnalysis, patientId: string): Promise<void> {
    const data = await this.ipfsService.downloadEncryptedData(analysis.ipfsCid);

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

    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);

    const documentKey = await this.medicalDataCryptoService.unwrapDocumentKey(
      documentKeyRecord.encryptedDocumentKey,
      patientMasterKey
    );

    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.buffer as ArrayBuffer,
      documentKey,
      new Uint8Array(data.iv) as Uint8Array<ArrayBuffer>
    );

    const mimeType = this.getMimeType(data.fileName);
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

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
