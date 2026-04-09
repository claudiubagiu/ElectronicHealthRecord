import { Injectable, inject } from '@angular/core';
import { IpfsService } from '../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../core/services/lit-protocol.service';
import { Web3Service } from '../../../core/services/web3.service';
import { CryptoService } from '../../../core/services/crypto.service';
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
  private litService = inject(LitProtocolService);
  private web3Service = inject(Web3Service);
  private submissionService = inject(PrescriptionSubmissionService);

  // ── Patient path — Lit Protocol ──────────────────────────────────────────

  /**
   * Downloads, decrypts and opens the prescription PDF for the patient.
   * Uses Lit Protocol (wallet ownership ACC) — requires MetaMask signature.
   */
  async decryptAndOpenForPatient(prescription: Prescription): Promise<void> {
    const data = await this.ipfsService.downloadEncryptedData(prescription.ipfsCid);

    if (!data.litMetadata?.ciphertext || !data.litMetadata?.dataToEncryptHash) {
      throw new AppError({
        message: 'The prescription payload is missing Lit Protocol metadata.',
        status: 422,
        title: 'Invalid Payload',
        type: 'MISSING_LIT_METADATA',
      });
    }

    await this.litService.connect();
    const accs = this.litService.createAccsBuilder(prescription.patientAddr);
    const walletClient = await this.web3Service.getViemWalletClient();

    const litResult = await this.litService.decrypt(
      {
        ciphertext: data.litMetadata.ciphertext,
        dataToEncryptHash: data.litMetadata.dataToEncryptHash,
      },
      accs,
      walletClient
    );

    const decryptedRaw = litResult.decryptedData as Uint8Array;
    const aesKeyBase64 = new TextDecoder().decode(decryptedRaw);
    const aesKeyBytes = Uint8Array.from(atob(aesKeyBase64), (c) => c.charCodeAt(0)).slice().buffer;
    const aesKey = await CryptoService.importAESKey(aesKeyBytes);

    const pdfBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.slice().buffer,
      aesKey,
      data.iv.slice().buffer
    );

    this.openPdfInNewTab(pdfBuffer);
  }

  // ── Pharmacist path — PBKDF2 from short code ─────────────────────────────

  /**
   * Downloads, decrypts and opens the prescription PDF for the pharmacist.
   * Uses PBKDF2 key derivation from the short code — no wallet signature needed.
   *
   * The AES key was wrapped with PBKDF2 during encryption and stored in
   * the fileName field of the IPFS payload as: salt|encAesKey|aesKeyIv
   */
  async decryptAndOpenForPharmacist(shortCode: string, prescription: Prescription): Promise<void> {
    const data = await this.ipfsService.downloadEncryptedData(prescription.ipfsCid);

    // Parse pharmacist metadata from fileName: "prescription_XXXX.pdf|salt|encAesKey|iv"
    const parts = data.fileName.split('|');
    if (parts.length < 4) {
      throw new AppError({
        message: 'The prescription payload is missing pharmacist key metadata.',
        status: 422,
        title: 'Invalid Payload',
        type: 'MISSING_PHARMACIST_METADATA',
      });
    }

    const [, saltB64, encAesKeyB64, aesKeyIvB64] = parts;

    // Recover salt from on-chain bytes32 (used for PBKDF2)
    const saltHex = prescription.salt.startsWith('0x')
      ? prescription.salt.slice(2)
      : prescription.salt;
    const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

    // Derive the PBKDF2 wrapping key
    const pbkdf2Key = await this.submissionService.deriveKeyFromCode(shortCode, saltBytes);

    // Decrypt the AES key using the PBKDF2 key
    const encAesKeyBytes = Uint8Array.from(atob(encAesKeyB64), (c) => c.charCodeAt(0));
    const aesKeyIvBytes = Uint8Array.from(atob(aesKeyIvB64), (c) => c.charCodeAt(0));

    const aesKeyRaw = await CryptoService.decryptFileWithAES(
      encAesKeyBytes.slice().buffer,
      pbkdf2Key,
      aesKeyIvBytes.slice().buffer
    );

    const aesKey = await CryptoService.importAESKey(aesKeyRaw);

    // Decrypt the PDF
    const pdfBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.slice().buffer,
      aesKey,
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
