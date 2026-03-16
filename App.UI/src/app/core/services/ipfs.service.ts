import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../errors/app.error';

/* ============================
   DTOs
   ============================ */

export interface EncryptedPayload {
  encryptedFile: number[];
  encryptedAesKey: number[];
  iv: number[];
  fileName: string;
  timestamp: number;
  litMetadata?: {
    ciphertext: string;
    dataToEncryptHash: string;
  };
}

export interface EncryptedData {
  encryptedFile: Uint8Array;
  encryptedAesKey: Uint8Array;
  iv: Uint8Array;
  fileName: string;
  timestamp: number;
  litMetadata?: {
    ciphertext: string;
    dataToEncryptHash: string;
  };
}

interface IpfsUploadResponse {
  cid: string;
}

/* ============================
   IPFS Service
   ============================ */

@Injectable({
  providedIn: 'root',
})
export class IpfsService {
  private readonly IPFS_API_URL = 'http://ipfs.api.docker.localhost/api/Ipfs';

  private http = inject(HttpClient);

  /* ============================
     Upload encrypted data to IPFS
     ============================ */
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

  /* ============================
     Download encrypted data from IPFS
     ============================ */
  async downloadEncryptedData(cid: string): Promise<EncryptedData> {
    try {
      const data = await firstValueFrom(
        this.http.get<EncryptedPayload>(`${this.IPFS_API_URL}/download/${cid}`)
      );

      return {
        encryptedFile: new Uint8Array(data.encryptedFile),
        encryptedAesKey: new Uint8Array(data.encryptedAesKey),
        iv: new Uint8Array(data.iv),
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
}
