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
 * 4. Upload the encrypted payload to IPFS.
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

    // 1. Generate PDF
    const pdfBlob = await this.pdfService.generateDiagnosticPdf(pdfData);
    const fileBuffer = await pdfBlob.arrayBuffer();

    // 2. AES encryption
    const aesKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, aesKey);
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);
    const aesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(aesKeyRaw)));

    // 3. Lit Protocol — encrypt the AES key with access control
    const patientAddress = getAddress(patientWalletAddress);
    await this.litService.connect();
    const accs = this.litService.createAccsBuilder(patientAddress);
    const litResult = await this.litService.encrypt(aesKeyBase64, accs);

    // 4. Upload encrypted payload to IPFS
    const fileName = `diagnostic_${pdfData.title.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const payload: EncryptedPayload = {
      encryptedFile: Array.from(new Uint8Array(encrypted)),
      encryptedAesKey: [],
      litMetadata: {
        ciphertext: litResult.ciphertext,
        dataToEncryptHash: litResult.dataToEncryptHash,
      },
      iv: Array.from(iv),
      fileName,
      timestamp: Date.now(),
    };

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 5. Store CID on the blockchain
    const diagnosisId = await this.blockchainService.addDiagnosis(
      pdfData.title,
      ipfsCid,
      patientAddress,
      doctorName
    );

    return { diagnosisId, ipfsCid };
  }
}
