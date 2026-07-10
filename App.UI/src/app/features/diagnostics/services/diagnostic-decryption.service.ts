import { Injectable, inject } from '@angular/core';
import { IpfsService } from '../../../core/services/ipfs.service';
import { DocumentKeyService } from '../../../core/services/document-key.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import { AppError } from '../../../core/errors/app.error';
import { Diagnosis } from '../../../core/models/blockchain.model';

@Injectable({ providedIn: 'root' })
export class DiagnosticDecryptionService {
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

  async decryptAndOpen(diagnosis: Diagnosis, patientId: string): Promise<void> {
    const data = await this.ipfsService.downloadEncryptedData(diagnosis.ipfsCid);

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
