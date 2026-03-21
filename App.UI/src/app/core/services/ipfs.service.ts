import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../errors/app.error';
import { EncryptedData, EncryptedPayload, IpfsUploadResponse } from '../models/ipfs.model';
import { environment } from '../../../environments/environment';

/**
 * Service responsible for uploading and downloading encrypted
 * diagnostic payloads to/from IPFS via the backend Pinata proxy.
 *
 * All payloads use Base64-encoded binary fields to minimise
 * JSON size on the wire and in IPFS storage.
 */
@Injectable({ providedIn: 'root' })
export class IpfsService {
  private readonly IPFS_API_URL = environment.apiUrls.ipfs;
  private http = inject(HttpClient);

  /**
   * Uploads an encrypted payload to IPFS through the backend proxy.
   *
   * @param payload - The {@link EncryptedPayload} containing the
   *   Base64-encoded encrypted file, IV, and Lit metadata.
   * @returns The IPFS CID of the pinned content.
   * @throws {AppError} If the HTTP request to the backend fails.
   */
  async uploadEncryptedData(payload: EncryptedPayload): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<IpfsUploadResponse>(`${this.IPFS_API_URL}/upload`, payload)
      );

      return response.cid;
    } catch (error) {
      throw new AppError({
        message: 'Failed to upload data to IPFS. Please try again.',
        status: 500,
        title: 'IPFS Upload Failed',
        type: 'IPFS_UPLOAD_FAILED',
      });
    }
  }

  /**
   * Downloads an encrypted payload from IPFS and converts the
   * Base64-encoded fields back into typed byte arrays.
   *
   * @param cid - The IPFS content identifier to fetch.
   * @returns An {@link EncryptedData} object with binary fields
   *   ready for use with the Web Crypto API.
   * @throws {AppError} If the download or JSON parsing fails.
   */
  async downloadEncryptedData(cid: string): Promise<EncryptedData> {
    try {
      const data = await firstValueFrom(
        this.http.get<EncryptedPayload>(`${this.IPFS_API_URL}/download/${cid}`)
      );

      return {
        encryptedFile: this.base64ToUint8Array(data.encryptedFile),
        iv: this.base64ToUint8Array(data.iv),
        fileName: data.fileName,
        timestamp: data.timestamp,
        litMetadata: data.litMetadata,
      };
    } catch (error) {
      throw new AppError({
        message: 'Failed to download data from IPFS. Please try again.',
        status: 500,
        title: 'IPFS Download Failed',
        type: 'IPFS_DOWNLOAD_FAILED',
      });
    }
  }

  /**
   * Decodes a Base64 string into a Uint8Array.
   *
   * @param base64 - The Base64-encoded string to decode.
   * @returns The decoded bytes as a Uint8Array.
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
