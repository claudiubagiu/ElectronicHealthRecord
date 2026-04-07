import { Injectable, inject } from '@angular/core';
import { getAddress } from 'ethers';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { IpfsService } from '../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../core/services/lit-protocol.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { Web3Service } from '../../../core/services/web3.service';
import { EncryptedPayload } from '../../../core/models/ipfs.model';
import { LabAnalysis } from '../../../core/models/blockchain.model';
import { AppError } from '../../../core/errors/app.error';

export interface LabAnalysisSubmissionInput {
  pdfFile: File;
  patientWalletAddress: string;
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
  private litService = inject(LitProtocolService);
  private web3Service = inject(Web3Service);

  // ── Submission ─────────────────────────────────────────────────────────────

  async submit(input: LabAnalysisSubmissionInput): Promise<LabAnalysisSubmissionResult> {
    const { pdfFile, patientWalletAddress, labTechName } = input;

    // 1. Read uploaded PDF into ArrayBuffer
    const fileBuffer = await pdfFile.arrayBuffer();

    // 2. Encrypt with AES-256-GCM
    const aesKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, aesKey);

    // 3. Export AES key and encrypt via Lit Protocol
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);
    const aesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(aesKeyRaw)));

    const patientAddress = getAddress(patientWalletAddress);
    await this.litService.connect();
    const accs = this.litService.createAccsBuilder(patientAddress);
    const litResult = await this.litService.encrypt(aesKeyBase64, accs);

    // 4. Build and upload IPFS payload
    const payload: EncryptedPayload = {
      encryptedFile: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      litMetadata: {
        ciphertext: litResult.ciphertext,
        dataToEncryptHash: litResult.dataToEncryptHash,
      },
      fileName: pdfFile.name,
      timestamp: Date.now(),
    };

    const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

    // 5. Record on blockchain
    const title = pdfFile.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const labAnalysisId = await this.blockchainService.addLabAnalysis(
      title,
      ipfsCid,
      patientAddress,
      labTechName
    );

    return { labAnalysisId, ipfsCid };
  }

  // ── Decryption ─────────────────────────────────────────────────────────────

  async decryptAndOpen(analysis: LabAnalysis): Promise<void> {
    // 1. Download encrypted payload from IPFS
    const data = await this.ipfsService.downloadEncryptedData(analysis.ipfsCid);

    // 2. Validate Lit metadata
    if (!data.litMetadata?.ciphertext || !data.litMetadata?.dataToEncryptHash) {
      throw new AppError({
        message: 'The encrypted payload is missing Lit Protocol metadata.',
        status: 422,
        title: 'Invalid Payload',
        type: 'MISSING_LIT_METADATA',
      });
    }

    // 3. Connect to Lit Protocol
    await this.litService.connect();

    // 4. Build access control conditions
    const accs = this.litService.createAccsBuilder(analysis.patientAddr);

    // 5. Get wallet client for Lit SIWE auth
    const walletClient = await this.web3Service.getViemWalletClient();

    // 6. Decrypt AES key via Lit
    const decryptResult = await this.litService.decrypt(
      {
        ciphertext: data.litMetadata.ciphertext,
        dataToEncryptHash: data.litMetadata.dataToEncryptHash,
      },
      accs,
      walletClient
    );

    // 7. Recover raw AES key
    const raw = decryptResult.decryptedData as Uint8Array;
    const aesKeyBase64 = new TextDecoder().decode(raw);
    const aesKeyRaw = Uint8Array.from(atob(aesKeyBase64), (c) => c.charCodeAt(0))
      .buffer as ArrayBuffer;
    const aesKey = await CryptoService.importAESKey(aesKeyRaw);

    // 8. Decrypt file
    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.buffer as ArrayBuffer,
      aesKey,
      new Uint8Array(data.iv) as Uint8Array<ArrayBuffer>
    );

    // 9. Open in new tab
    const mimeType = this.getMimeType(data.fileName);
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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
