import { Injectable, inject } from '@angular/core';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { IpfsService } from '../../../core/services/ipfs.service';
import { DocumentKeyService } from '../../../core/services/document-key.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import { AppError } from '../../../core/errors/app.error';
import { EncryptedPayload } from '../../../core/models/ipfs.model';
import { PrescriptionFormData, PrescriptionPayload } from '../models/prescription.model';
import { PrescriptionPdfService } from './prescription-pdf.service';

export interface PrescriptionSubmissionInput {
  formData: PrescriptionFormData;
  patientWalletAddress: string;
  /** The patient's user ID (GUID) — required to resolve the PatientMasterKey
   *  and to register the new DocumentKey in AccessRequests.Api. */
  patientId: string;
  patientName: string;
  doctorName: string;
}

export interface PrescriptionSubmissionResult {
  prescriptionId: bigint;
  ipfsCid: string;
  shortCode: string;
}

const SHORT_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Prescriptions support TWO independent decryption paths, both wrapping
 * the same per-document AES key (DocumentKey) used to encrypt the PDF:
 *
 *   - Patient path: DocumentKey wrapped with the patient's PatientMasterKey
 *     (registered as a DocumentKey record in AccessRequests.Api, same as
 *     diagnoses and lab analyses) — the patient and any authorized doctor
 *     can recover it the standard way.
 *   - Pharmacist path: DocumentKey wrapped with a PBKDF2 key derived from
 *     the prescription's short code + salt — lets a pharmacist who only
 *     has the short code (no wallet, no envelope) decrypt and dispense it.
 *     This path is independent of PatientMasterKey/Envelope entirely and
 *     is NOT affected by key rotation.
 */
@Injectable({ providedIn: 'root' })
export class PrescriptionSubmissionService {
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private documentKeyService = inject(DocumentKeyService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);
  private pdfService = inject(PrescriptionPdfService);

  async submit(input: PrescriptionSubmissionInput): Promise<PrescriptionSubmissionResult> {
    const { formData, patientWalletAddress, patientId, patientName, doctorName } = input;

    if (!patientId) {
      throw new AppError({
        message: 'Patient ID is required to submit a prescription.',
        status: 400,
        title: 'Missing Patient ID',
        type: 'MISSING_PATIENT_ID',
      });
    }

    // 1. Generate short code and salt
    const shortCode = this.generateShortCode();
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));

    // 2. Build the prescription payload (shortCode is embedded in the PDF)
    const prescriptionPayload: PrescriptionPayload = {
      prescription: formData,
      shortCode,
      patientName,
      doctorName,
      timestamp: Date.now(),
    };

    // 3. Generate PDF from prescription data
    const pdfBlob = await this.pdfService.generatePrescriptionPdf(prescriptionPayload);
    const fileBuffer = await pdfBlob.arrayBuffer();

    // 4. Encrypt the PDF with a random per-document DocumentKey (AES-256-GCM)
    const documentKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, documentKey);

    // 5. Export the DocumentKey as raw bytes (needed for both wrap paths below)
    const documentKeyRaw = await CryptoService.exportAESKey(documentKey);

    // 6. Patient path — resolve the PatientMasterKey and wrap the DocumentKey with it
    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );

    // 7. Pharmacist path — wrap the DocumentKey with a PBKDF2 key derived from shortCode+salt
    const pbkdf2Key = await this.deriveKeyFromCode(shortCode, saltBytes);
    const { encrypted: encryptedDocKeyForPharmacist, iv: docKeyIv } =
      await CryptoService.encryptFileWithAES(documentKeyRaw, pbkdf2Key);

    // 8. Build the IPFS payload.
    //    fileName stores: "prescription_XXXX.pdf|base64(salt)|base64(encDocKey)|base64(iv)"
    //    This lets the pharmacist recover the DocumentKey without ever
    //    touching PatientMasterKey/Envelope.
    const saltB64 = this.arrayBufferToBase64(saltBytes.buffer as ArrayBuffer);
    const encDocKeyB64 = this.arrayBufferToBase64(encryptedDocKeyForPharmacist);
    const docKeyIvB64 = this.arrayBufferToBase64(docKeyIv.buffer as ArrayBuffer);
    const pharmacistMeta = `${saltB64}|${encDocKeyB64}|${docKeyIvB64}`;

    const fileName = `prescription_${shortCode}.pdf|${pharmacistMeta}`;

    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      fileName,
      timestamp: prescriptionPayload.timestamp,
    };

    // 9. Upload to IPFS
    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 10. Register the patient-path wrapped DocumentKey, indexed by the IPFS CID
    await this.documentKeyService.create({
      patientId,
      ipfsCid,
      encryptedDocumentKey,
    });

    // 11. Call smart contract
    const codeHash = this.blockchainService.hashShortCode(shortCode);
    const saltHex =
      '0x' +
      Array.from(saltBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const prescriptionId = await this.blockchainService.addPrescription(
      formData.title,
      ipfsCid,
      patientWalletAddress,
      doctorName,
      codeHash,
      saltHex
    );

    return { prescriptionId, ipfsCid, shortCode };
  }

  // ── PBKDF2 key derivation (shared with decryption service) ───────────────

  async deriveKeyFromCode(shortCode: string, salt: Uint8Array): Promise<CryptoKey> {
    try {
      const encoder = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(shortCode),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt.slice().buffer,
          iterations: 100_000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to derive key from short code:', error);
      throw new AppError({
        message: 'Failed to derive encryption key from the prescription code.',
        status: 500,
        title: 'Key Derivation Failed',
        type: 'PBKDF2_KEY_DERIVATION_FAILED',
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private generateShortCode(): string {
    const array = window.crypto.getRandomValues(new Uint8Array(6));
    return Array.from(array)
      .map((b) => SHORT_CODE_CHARSET[b % SHORT_CODE_CHARSET.length])
      .join('');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
}
