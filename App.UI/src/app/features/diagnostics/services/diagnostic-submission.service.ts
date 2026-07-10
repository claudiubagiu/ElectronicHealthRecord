import { Injectable, inject } from '@angular/core';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { IpfsService } from '../../../core/services/ipfs.service';
import { DocumentKeyService } from '../../../core/services/document-key.service';
import { CryptoService } from '../../../core/services/crypto.service';
import {
  DiagnosticPdfService,
  DiagnosticPdfData,
  SelectedMedicalRecord,
} from './diagnostic-pdf.service';
import { EncryptedPayload } from '../../../core/models/ipfs.model';
import { MedicalDataService } from '../../medical-data/services/medical-data.service';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import { AppError } from '../../../core/errors/app.error';

export interface DiagnosticSubmissionInput {
  pdfData: DiagnosticPdfData;
  patientWalletAddress: string;
  doctorName: string;
  linkedMedicalRecordIds?: string[];
  patientId: string;
}

export interface DiagnosticSubmissionResult {
  diagnosisId: bigint;
  ipfsCid: string;
}

@Injectable({ providedIn: 'root' })
export class DiagnosticSubmissionService {
  private pdfService = inject(DiagnosticPdfService);
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataService = inject(MedicalDataService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

  async submit(input: DiagnosticSubmissionInput): Promise<DiagnosticSubmissionResult> {
    const { pdfData, patientWalletAddress, doctorName, linkedMedicalRecordIds, patientId } = input;

    if (!patientId) {
      throw new AppError({
        message: 'Patient ID is required to submit a diagnosis.',
        status: 400,
        title: 'Missing Patient ID',
        type: 'MISSING_PATIENT_ID',
      });
    }

    if (linkedMedicalRecordIds?.length) {
      pdfData.selectedMedicalRecords = await this.resolveSelectedRecords(
        linkedMedicalRecordIds,
        patientId
      );
    }

    const pdfBlob = await this.pdfService.generateDiagnosticPdf(pdfData);
    const fileBuffer = await pdfBlob.arrayBuffer();

    const documentKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, documentKey);

    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );

    const fileName = `diagnostic_${pdfData.title.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      fileName,
      timestamp: Date.now(),
    };

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    await this.documentKeyService.create({
      patientId,
      ipfsCid,
      encryptedDocumentKey,
    });

    const diagnosisId = await this.blockchainService.addDiagnosis(
      pdfData.title,
      ipfsCid,
      patientWalletAddress,
      doctorName
    );

    return { diagnosisId, ipfsCid };
  }

  private async resolveSelectedRecords(
    ids: string[],
    patientId: string
  ): Promise<SelectedMedicalRecord[]> {
    try {
      const allEncrypted = await this.medicalDataService.getByPatientId(patientId);
      const selected = allEncrypted.filter((r) => ids.includes(r.id));

      const result: SelectedMedicalRecord[] = [];
      for (const rec of selected) {
        try {
          const data = await this.medicalDataCryptoService.decrypt(rec);
          let summary = '';
          switch (rec.recordType) {
            case 'Allergy':
              summary = `${data.substance ?? '—'} – ${data.severity ?? ''} (${
                data.reaction ?? ''
              })`;
              break;
            case 'Condition':
              summary = `${data.conditionName ?? '—'} – ${data.status ?? ''}`;
              break;
            case 'Immunization':
              summary = `${data.vaccine ?? '—'} administered ${data.administeredAt ?? ''}`;
              break;
            case 'Implant':
              summary = `${data.implantName ?? '—'} implanted ${data.implantedAt ?? ''}`;
              break;
            case 'Note':
              summary = (data.noteContent ?? '').substring(0, 80);
              break;
            default:
              summary = '';
          }
          result.push({ recordType: rec.recordType, summary });
        } catch (err) {
          console.error(`Could not decrypt record ${rec.id} for PDF:`, err);
        }
      }
      return result;
    } catch (err) {
      console.error('Could not resolve selected medical records for PDF:', err);
      return [];
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
}
