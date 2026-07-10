export interface EncryptedPayload {
  encryptedFile: string;
  iv: string;
  fileName: string;
  timestamp: number;
}

export interface EncryptedData {
  encryptedFile: Uint8Array;
  iv: Uint8Array;
  fileName: string;
  timestamp: number;
}

export interface IpfsUploadResponse {
  cid: string;
}
