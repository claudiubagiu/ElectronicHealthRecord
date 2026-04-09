export interface EncryptedPrescriptionPayload {
  /** Base64-encoded AES-GCM ciphertext of the serialized PrescriptionPayload JSON */
  encryptedData: string;
  /** Base64-encoded 12-byte AES-GCM IV */
  iv: string;
  /** Base64-encoded 32-byte salt — redundant with on-chain, stored for convenience */
  salt: string;
  /** Lit Protocol metadata for patient-side decryption */
  litMetadata: {
    ciphertext: string;
    dataToEncryptHash: string;
  };
  timestamp: number;
}

export interface DecryptedPrescriptionPayload {
  encryptedData: Uint8Array;
  iv: Uint8Array;
  salt: string;
  litMetadata: {
    ciphertext: string;
    dataToEncryptHash: string;
  };
  timestamp: number;
}
