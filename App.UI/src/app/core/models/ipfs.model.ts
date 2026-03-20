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
  cid: string;
}
