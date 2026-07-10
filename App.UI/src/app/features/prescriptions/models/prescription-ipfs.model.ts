export interface EncryptedPrescriptionPayload {
  /** Base64-encoded AES-GCM ciphertext of the serialized PrescriptionPayload JSON */
  encryptedData: string;
  /** Base64-encoded 12-byte AES-GCM IV */
  iv: string;
  /** Base64-encoded 32-byte salt */
  salt: string;
  timestamp: number;
}

export interface DecryptedPrescriptionPayload {
  encryptedData: Uint8Array;
  iv: Uint8Array;
  salt: string;
  timestamp: number;
}
