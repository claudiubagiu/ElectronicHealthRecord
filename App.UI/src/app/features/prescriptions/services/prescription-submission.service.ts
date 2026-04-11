import { Injectable, inject } from '@angular/core';
import { getAddress } from 'ethers';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { IpfsService } from '../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../core/services/lit-protocol.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { AppError } from '../../../core/errors/app.error';
import { EncryptedPayload } from '../../../core/models/ipfs.model';
import { PrescriptionFormData, PrescriptionPayload } from '../models/prescription.model';
import { PrescriptionPdfService } from './prescription-pdf.service';

export interface PrescriptionSubmissionInput {
  formData: PrescriptionFormData;
  patientWalletAddress: string;
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
  private litService = inject(LitProtocolService);
  private pdfService = inject(PrescriptionPdfService);

  async submit(input: PrescriptionSubmissionInput): Promise<PrescriptionSubmissionResult> {
    const { formData, patientWalletAddress, patientName, doctorName } = input;

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

    // 4. Encrypt the PDF with a random AES-256-GCM key
    const aesKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, aesKey);

    // 5. Export the AES key as raw bytes
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);

    // 6. Encrypt the AES key via Lit Protocol (patient path)
    const aesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(aesKeyRaw)));
    const patientAddress = getAddress(patientWalletAddress);
    await this.litService.connect();
    const accs = this.litService.createAccsBuilder(patientAddress);
    const litResult = await this.litService.encrypt(aesKeyBase64, accs);

    // 7. Encrypt the AES key via PBKDF2 (pharmacist path)
    //    Derive a wrapping key from shortCode+salt, then encrypt the raw AES key with it
    const pbkdf2Key = await this.deriveKeyFromCode(shortCode, saltBytes);
    const { encrypted: encryptedAesKey, iv: aesKeyIv } = await CryptoService.encryptFileWithAES(
      aesKeyRaw,
      pbkdf2Key
    );

    // 8. Build the IPFS payload
    //    fileName stores: base64(salt)|base64(encryptedAesKey)|base64(iv of encrypted AES key)
    //    This allows the pharmacist to recover the AES key without Lit
    const saltB64 = this.arrayBufferToBase64(saltBytes.buffer as ArrayBuffer);
    const encAesKeyB64 = this.arrayBufferToBase64(encryptedAesKey);
    const aesKeyIvB64 = this.arrayBufferToBase64(aesKeyIv.buffer as ArrayBuffer);
    const pharmacistMeta = `${saltB64}|${encAesKeyB64}|${aesKeyIvB64}`;

    const fileName = `prescription_${shortCode}.pdf|${pharmacistMeta}`;

    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      fileName,
      timestamp: prescriptionPayload.timestamp,
      litMetadata: {
        ciphertext: litResult.ciphertext,
        dataToEncryptHash: litResult.dataToEncryptHash,
      },
    };

    // 9. Upload to IPFS
    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 10. Call smart contract
    const codeHash = this.blockchainService.hashShortCode(shortCode);
    const saltHex =
      '0x' +
      Array.from(saltBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const prescriptionId = await this.blockchainService.addPrescription(
      formData.title,
      ipfsCid,
      patientAddress,
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
