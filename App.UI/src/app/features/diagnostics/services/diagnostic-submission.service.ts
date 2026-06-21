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

/**
 * Input data required to submit a diagnosis.
 */
export interface DiagnosticSubmissionInput {
  /** All the fields needed to generate the diagnostic PDF. */
  pdfData: DiagnosticPdfData;

  /** The patient's Ethereum wallet address (checksummed or not). */
  patientWalletAddress: string;

  /** The doctor's full name to be recorded on-chain. */
  doctorName: string;

  /** IDs of medical records selected as relevant for this consultation. */
  linkedMedicalRecordIds?: string[];

  /** The patient's user ID (GUID) — required to resolve the PatientMasterKey
   *  and to register the new DocumentKey in AccessRequests.Api. */
  patientId: string;
}

/**
 * Result returned after a successful submission.
 */
export interface DiagnosticSubmissionResult {
  /** The on-chain diagnosis ID emitted by the smart contract event. */
  diagnosisId: bigint;

  /** The IPFS CID where the encrypted payload is stored. */
  ipfsCid: string;
}

/**
 * Facade service that orchestrates the full diagnostic submission pipeline:
 *
 * 1. Resolve selected medical records and inject them into the PDF data.
 * 2. Generate a PDF from the diagnostic data.
 * 3. Encrypt the PDF with a random per-document DocumentKey (AES-256-GCM).
 * 4. Resolve the patient's PatientMasterKey (via envelope/own profile) and
 *    wrap the DocumentKey with it.
 * 5. Upload the encrypted file to IPFS (Base64-encoded, no key material).
 * 6. Register the wrapped DocumentKey in AccessRequests.Api, keyed by the
 *    IPFS CID returned in step 5.
 * 7. Record the diagnosis on-chain.
 *
 * This service owns NO UI state — it simply accepts data and returns a result
 * or throws an error. The calling component handles loading indicators,
 * snackbar messages, and navigation.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticSubmissionService {
  private pdfService = inject(DiagnosticPdfService);
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataService = inject(MedicalDataService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

  /**
   * Runs the full submission pipeline.
   *
   * @param input - The diagnostic data, patient wallet/id, doctor name, and optional linked records.
   * @returns The on-chain diagnosis ID and the IPFS CID.
   * @throws {AppError} If any step in the pipeline fails.
   */
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

    // 1. Resolve selected medical records into human-readable summaries for the PDF
    if (linkedMedicalRecordIds?.length) {
      pdfData.selectedMedicalRecords = await this.resolveSelectedRecords(
        linkedMedicalRecordIds,
        patientId
      );
    }

    // 2. Generate PDF from the diagnostic form data
    const pdfBlob = await this.pdfService.generateDiagnosticPdf(pdfData);
    const fileBuffer = await pdfBlob.arrayBuffer();

    // 3. Encrypt the PDF with a random per-document DocumentKey (AES-256-GCM)
    const documentKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, documentKey);

    // 4. Resolve the patient's PatientMasterKey and wrap the DocumentKey with it
    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );

    // 5. Build and upload the IPFS payload — no key material included
    const fileName = `diagnostic_${pdfData.title.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      fileName,
      timestamp: Date.now(),
    };

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 6. Register the wrapped DocumentKey, indexed by the IPFS CID
    await this.documentKeyService.create({
      patientId,
      ipfsCid,
      encryptedDocumentKey,
    });

    // 7. Store the IPFS CID on the blockchain smart contract
    const diagnosisId = await this.blockchainService.addDiagnosis(
      pdfData.title,
      ipfsCid,
      patientWalletAddress,
      doctorName
    );

    return { diagnosisId, ipfsCid };
  }

  /**
   * Fetches and decrypts the selected medical records, then converts each
   * to a short human-readable summary for inclusion in the PDF.
   */
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

  /**
   * Converts an ArrayBuffer to a Base64-encoded string.
   *
   * @param buffer - The raw binary data to encode.
   * @returns The Base64 string representation of the buffer.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
}
