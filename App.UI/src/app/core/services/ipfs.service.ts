import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/* ============================
   DTOs (Data Transfer Objects)
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

export interface IpfsUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/* ============================
   IPFS Service (Pinata)
   ============================ */

@Injectable({
  providedIn: 'root',
})
export class IpfsService {
  private readonly PINATA_API_URL = 'https://api.pinata.cloud/pinning';
  private readonly PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs';

  constructor(private http: HttpClient) {}

  /* ============================
     Upload encrypted data to IPFS
     ============================ */
  async uploadEncryptedData(payload: EncryptedPayload): Promise<string> {
    const formData = new FormData();

    const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    formData.append('file', jsonBlob, 'encrypted-data.json');

    const headers = new HttpHeaders({
      pinata_api_key: environment.pinataApiKey,
      pinata_secret_api_key: environment.pinataSecretKey,
    });

    try {
      const response = await firstValueFrom(
        this.http.post<IpfsUploadResponse>(`${this.PINATA_API_URL}/pinFileToIPFS`, formData, {
          headers,
        })
      );

      return response.IpfsHash;
    } catch (error) {
      console.error('[IPFS] Upload failed:', error);
      throw new Error('Încărcarea pe IPFS a eșuat');
    }
  }

  /* ============================
     Download encrypted data from IPFS
     ============================ */
  async downloadEncryptedData(cid: string): Promise<EncryptedData> {
    try {
      const data = await firstValueFrom(
        this.http.get<EncryptedPayload>(`${this.PINATA_GATEWAY_URL}/${cid}`)
      );

      return {
        encryptedFile: new Uint8Array(data.encryptedFile),
        encryptedAesKey: new Uint8Array(data.encryptedAesKey),
        iv: new Uint8Array(data.iv),
        fileName: data.fileName,
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error('[IPFS] Download failed:', error);
      throw new Error('Descărcarea de pe IPFS a eșuat');
    }
  }
}
