import { Injectable, inject } from '@angular/core';
import { IpfsService } from '../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../core/services/lit-protocol.service';
import { Web3Service } from '../../../core/services/web3.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { Diagnosis } from '../../../core/models/blockchain.model';

/**
 * Facade service that orchestrates the full decryption pipeline for
 * a blockchain-stored diagnosis:
 *
 * 1. Download encrypted payload from IPFS.
 * 2. Connect to Lit Protocol and build access control conditions.
 * 3. Decrypt the AES key via Lit (requires wallet signature).
 * 4. Decrypt the file with the recovered AES key.
 * 5. Open the decrypted file in a new browser tab.
 *
 * This service owns NO UI state — it simply accepts a Diagnosis and
 * either opens the file or throws an error. The calling component
 * handles loading indicators and error notifications.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticDecryptionService {
  private ipfsService = inject(IpfsService);
  private litService = inject(LitProtocolService);
  private web3Service = inject(Web3Service);

  /**
   * Decrypts and opens a diagnosis file in a new browser tab.
   *
   * @param diagnosis - The on-chain Diagnosis object containing the IPFS CID
   *                    and patient address needed for decryption.
   * @throws {AppError} If any step in the pipeline fails (IPFS download,
   *         Lit connection, wallet signature, AES decryption).
   */
  async decryptAndOpen(diagnosis: Diagnosis): Promise<void> {
    // 1. Download encrypted payload from IPFS
    const data = await this.ipfsService.downloadEncryptedData(diagnosis.ipfsCid);

    // 2. Connect to Lit Protocol
    await this.litService.connect();

    // 3. Build access control conditions for this patient
    const accs = this.litService.createAccsBuilder(diagnosis.patientAddr);

    // 4. Get viem wallet client for Lit auth context
    const walletClient = await this.web3Service.getViemWalletClient();

    // 5. Decrypt the AES key via Lit Protocol
    const decryptResult = await this.litService.decrypt(
      {
        ciphertext: data.litMetadata!.ciphertext,
        dataToEncryptHash: data.litMetadata!.dataToEncryptHash,
      },
      accs,
      walletClient
    );

    // 6. Recover the raw AES key from the Lit-decrypted result
    const raw = decryptResult.decryptedData as Uint8Array;
    const aesKeyBase64 = new TextDecoder().decode(raw);
    const aesKeyRaw = Uint8Array.from(atob(aesKeyBase64), (c) => c.charCodeAt(0))
      .buffer as ArrayBuffer;
    const aesKey = await CryptoService.importAESKey(aesKeyRaw);

    // 7. Decrypt the file with AES
    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.buffer as ArrayBuffer,
      aesKey,
      new Uint8Array(data.iv)
    );

    // 8. Determine MIME type from the original file name
    const ext = data.fileName.split('.').pop()?.toLowerCase();
    const mimeType = this.getMimeType(ext);

    // 9. Open the decrypted file in a new tab
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up the object URL after 1 minute
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /**
   * Maps a file extension to its MIME type.
   */
  private getMimeType(ext: string | undefined): string {
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'dcm':
        return 'application/dicom';
      default:
        return 'application/octet-stream';
    }
  }
}
