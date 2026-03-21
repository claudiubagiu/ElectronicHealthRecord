import { Injectable, inject } from '@angular/core';
import { IpfsService } from '../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../core/services/lit-protocol.service';
import { Web3Service } from '../../../core/services/web3.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { AppError } from '../../../core/errors/app.error';
import { Diagnosis } from '../../../core/models/blockchain.model';

/**
 * Facade service that orchestrates the full decryption pipeline for
 * a blockchain-stored diagnosis:
 *
 * 1. Download the encrypted payload from IPFS.
 * 2. Validate that Lit Protocol metadata is present.
 * 3. Connect to Lit Protocol and build access control conditions.
 * 4. Decrypt the AES key via Lit (requires wallet signature).
 * 5. Decrypt the file with the recovered AES key.
 * 6. Open the decrypted file in a new browser tab.
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
   * The method downloads the encrypted payload from IPFS, uses Lit Protocol
   * to recover the AES key (which requires the user to sign a SIWE message),
   * decrypts the file with AES-GCM, and opens the result as a blob URL.
   *
   * @param diagnosis - The on-chain Diagnosis object containing the IPFS CID
   *                    and patient address needed for decryption.
   * @throws {AppError} If any step in the pipeline fails (IPFS download,
   *         missing Lit metadata, Lit connection, wallet signature, AES decryption).
   */
  async decryptAndOpen(diagnosis: Diagnosis): Promise<void> {
    // 1. Download the encrypted payload from IPFS (already decoded from Base64)
    const data = await this.ipfsService.downloadEncryptedData(diagnosis.ipfsCid);

    // 2. Validate that Lit Protocol metadata exists in the payload
    if (!data.litMetadata?.ciphertext || !data.litMetadata?.dataToEncryptHash) {
      throw new AppError({
        message:
          'The encrypted payload is missing Lit Protocol metadata. ' +
          'The file may be corrupted or stored in an unsupported format.',
        status: 422,
        title: 'Invalid Payload',
        type: 'MISSING_LIT_METADATA',
      });
    }

    // 3. Connect to Lit Protocol network
    await this.litService.connect();

    // 4. Build access control conditions scoped to this patient
    const accs = this.litService.createAccsBuilder(diagnosis.patientAddr);

    // 5. Get viem wallet client for Lit SIWE auth context
    const walletClient = await this.web3Service.getViemWalletClient();

    // 6. Decrypt the AES key via Lit Protocol (triggers wallet signature)
    const decryptResult = await this.litService.decrypt(
      {
        ciphertext: data.litMetadata.ciphertext,
        dataToEncryptHash: data.litMetadata.dataToEncryptHash,
      },
      accs,
      walletClient
    );

    // 7. Recover the raw AES key from the Lit-decrypted Base64 string
    const raw = decryptResult.decryptedData as Uint8Array;
    const aesKeyBase64 = new TextDecoder().decode(raw);
    const aesKeyRaw = Uint8Array.from(atob(aesKeyBase64), (c) => c.charCodeAt(0))
      .buffer as ArrayBuffer;
    const aesKey = await CryptoService.importAESKey(aesKeyRaw);

    // 8. Decrypt the file content with AES-GCM
    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      data.encryptedFile.buffer as ArrayBuffer,
      aesKey,
      new Uint8Array(data.iv) as Uint8Array<ArrayBuffer>
    );

    // 9. Determine the MIME type from the file extension and open in a new tab
    const mimeType = this.getMimeType(data.fileName);
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Infers a MIME type from the file extension.
   *
   * Defaults to 'application/octet-stream' for unrecognised extensions.
   *
   * @param fileName - The original file name including its extension.
   * @returns The corresponding MIME type string.
   */
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
