import { Injectable, inject } from '@angular/core';
import { IpfsService } from '../../../core/services/ipfs.service';
import { DocumentKeyService } from '../../../core/services/document-key.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import { AppError } from '../../../core/errors/app.error';
import { Prescription } from '../../../core/models/blockchain.model';
import { PrescriptionSubmissionService } from './prescription-submission.service';

export interface DecryptedPrescriptionFile {
  /** PDF blob ready to open in a new tab */
  pdfBlob: Blob;
}

@Injectable({ providedIn: 'root' })
export class PrescriptionDecryptionService {
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);
  private submissionService = inject(PrescriptionSubmissionService);

  // ── Patient/doctor path — DocumentKey wrapped with PatientMasterKey ──────

  /**
   * Downloads, decrypts and opens the prescription PDF for the patient or
   * an authorized doctor.
   *
   * @param prescription - The on-chain Prescription object.
   * @param patientId - The patient's user ID (GUID) — needed to resolve the
   *   PatientMasterKey. Pass the caller's own userId if they ARE the patient,
   *   or the patient's userId if the caller is an authorized doctor.
   */
  async decryptAndOpenForPatient(prescription: Prescription, patientId: string): Promise<void> {
    const data = await this.ipfsService.downloadEncryptedData(prescription.ipfsCid);

    const documentKeyRecord = await this.documentKeyService.getByIpfsCid(prescription.ipfsCid);
    if (!documentKeyRecord?.encryptedDocumentKey) {
      throw new AppError({
        message:
          'No document key was found for this prescription. It may be corrupted or ' +
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

    const pdfBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.slice().buffer,
      documentKey,
      data.iv.slice().buffer
    );

    this.openPdfInNewTab(pdfBuffer);
  }

  // ── Pharmacist path — PBKDF2 from short code ─────────────────────────────

  /**
   * Downloads, decrypts and opens the prescription PDF for the pharmacist.
   * Uses PBKDF2 key derivation from the short code — no wallet signature
   * or PatientMasterKey/Envelope needed, independent of key rotation.
   *
   * The DocumentKey was wrapped with PBKDF2 during encryption and stored in
   * the fileName field of the IPFS payload as: salt|encDocumentKey|iv
   */
  async decryptAndOpenForPharmacist(shortCode: string, prescription: Prescription): Promise<void> {
    const data = await this.ipfsService.downloadEncryptedData(prescription.ipfsCid);

    // Parse pharmacist metadata from fileName: "prescription_XXXX.pdf|salt|encDocumentKey|iv"
    const parts = data.fileName.split('|');
    if (parts.length < 4) {
      throw new AppError({
        message: 'The prescription payload is missing pharmacist key metadata.',
        status: 422,
        title: 'Invalid Payload',
        type: 'MISSING_PHARMACIST_METADATA',
      });
    }

    const [, saltB64, encDocKeyB64, docKeyIvB64] = parts;

    // Recover salt from on-chain bytes32 (used for PBKDF2)
    const saltHex = prescription.salt.startsWith('0x')
      ? prescription.salt.slice(2)
      : prescription.salt;
    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

    // Derive the PBKDF2 wrapping key
    const pbkdf2Key = await this.submissionService.deriveKeyFromCode(shortCode, saltBytes);

    // Decrypt the DocumentKey using the PBKDF2 key
    const encDocKeyBytes = Uint8Array.from(atob(encDocKeyB64), (c) => c.charCodeAt(0));
    const docKeyIvBytes = Uint8Array.from(atob(docKeyIvB64), (c) => c.charCodeAt(0));

    const documentKeyRaw = await CryptoService.decryptFileWithAES(
      encDocKeyBytes.slice().buffer,
      pbkdf2Key,
      docKeyIvBytes.slice().buffer
    );

    const documentKey = await CryptoService.importAESKey(documentKeyRaw);

    // Decrypt the PDF
    const pdfBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.slice().buffer,
      documentKey,
      data.iv.slice().buffer
    );

    this.openPdfInNewTab(pdfBuffer);
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  private openPdfInNewTab(buffer: ArrayBuffer): void {
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
