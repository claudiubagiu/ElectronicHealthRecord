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

    const shortCode = this.generateShortCode();
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));

    const prescriptionPayload: PrescriptionPayload = {
      prescription: formData,
      shortCode,
      patientName,
      doctorName,
      timestamp: Date.now(),
    };

    const pdfBlob = await this.pdfService.generatePrescriptionPdf(prescriptionPayload);
    const fileBuffer = await pdfBlob.arrayBuffer();

    const documentKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, documentKey);

    const documentKeyRaw = await CryptoService.exportAESKey(documentKey);

    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );

    const pbkdf2Key = await this.deriveKeyFromCode(shortCode, saltBytes);
    const { encrypted: encryptedDocKeyForPharmacist, iv: docKeyIv } =
      await CryptoService.encryptFileWithAES(documentKeyRaw, pbkdf2Key);

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

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    await this.documentKeyService.create({
      patientId,
      ipfsCid,
      encryptedDocumentKey,
    });

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
