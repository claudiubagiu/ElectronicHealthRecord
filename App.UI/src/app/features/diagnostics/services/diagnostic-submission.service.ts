import { Injectable, inject } from '@angular/core';
import { getAddress } from 'ethers';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { IpfsService } from '../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../core/services/lit-protocol.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { DiagnosticPdfService, DiagnosticPdfData } from './diagnostic-pdf.service';
import { EncryptedPayload } from '../../../core/models/ipfs.model';

/**
 * Input data required to submit a diagnosis.
 * Combines the PDF content data with the patient's wallet address
 * and the doctor's display name.
 */
export interface DiagnosticSubmissionInput {
  /** All the fields needed to generate the diagnostic PDF. */
  pdfData: DiagnosticPdfData;

  /** The patient's Ethereum wallet address (checksummed or not). */
  patientWalletAddress: string;

  /** The doctor's full name to be recorded on-chain. */
  doctorName: string;
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
 * 1. Generate a PDF from the diagnostic data.
 * 2. Encrypt the PDF with a random AES-256-GCM key.
 * 3. Encrypt the AES key via Lit Protocol (access-controlled).
 * 4. Upload the encrypted payload to IPFS (Base64-encoded).
 * 5. Record the IPFS CID on the blockchain smart contract.
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
  private litService = inject(LitProtocolService);

  /**
   * Runs the full submission pipeline.
   *
   * @param input - The diagnostic data, patient wallet, and doctor name.
   * @returns The on-chain diagnosis ID and the IPFS CID.
   * @throws {AppError} If any step in the pipeline fails.
   */
  async submit(input: DiagnosticSubmissionInput): Promise<DiagnosticSubmissionResult> {
    const { pdfData, patientWalletAddress, doctorName } = input;

    // 1. Generate PDF from the diagnostic form data
    const pdfBlob = await this.pdfService.generateDiagnosticPdf(pdfData);
    const fileBuffer = await pdfBlob.arrayBuffer();

    // 2. Encrypt the PDF with a random AES-256-GCM key
    const aesKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, aesKey);

    // 3. Export the AES key as a Base64 string for Lit encryption
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);
    const aesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(aesKeyRaw)));

    // 4. Encrypt the AES key via Lit Protocol with patient-bound access control
    const patientAddress = getAddress(patientWalletAddress);
    await this.litService.connect();
    const accs = this.litService.createAccsBuilder(patientAddress);
    const litResult = await this.litService.encrypt(aesKeyBase64, accs);

    // 5. Build the IPFS payload with Base64-encoded binary fields
    const fileName = `diagnostic_${pdfData.title.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      litMetadata: {
        ciphertext: litResult.ciphertext,
        dataToEncryptHash: litResult.dataToEncryptHash,
      },
      fileName,
      timestamp: Date.now(),
    };

    // 6. Upload encrypted payload to IPFS via the backend proxy
    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 7. Store the IPFS CID on the blockchain smart contract
    const diagnosisId = await this.blockchainService.addDiagnosis(
      pdfData.title,
      ipfsCid,
      patientAddress,
      doctorName
    );

    return { diagnosisId, ipfsCid };
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
