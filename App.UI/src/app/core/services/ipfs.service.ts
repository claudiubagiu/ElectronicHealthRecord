import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../errors/app.error';
import { EncryptedData, EncryptedPayload, IpfsUploadResponse } from '../models/ipfs.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IpfsService {
  private readonly IPFS_API_URL = environment.apiUrls.ipfs;
  private http = inject(HttpClient);

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

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
