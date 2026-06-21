/**
 * Payload structure sent to the IPFS backend for upload.
 *
 * Uses Base64-encoded strings instead of raw byte arrays to
 * significantly reduce JSON payload size (roughly 2.5× smaller
 * than a number[] representation for binary data).
 *
 * The DocumentKey used to encrypt this file is NOT stored here.
 * It lives in AccessRequests.Api as a DocumentKey record (see
 * core/models/document-key.model.ts), wrapped with the patient's
 * PatientMasterKey and indexed by the IPFS CID returned after upload.
 */
export interface EncryptedPayload {
  /** AES-GCM encrypted file content, encoded as a Base64 string. */
  encryptedFile: string;

  /** AES-GCM initialization vector (12 bytes), encoded as a Base64 string. */
  iv: string;

  /** Original file name (e.g. "diagnostic_mri_lumbar.pdf"). */
  fileName: string;

  /** Unix timestamp (milliseconds) when the payload was created. */
  timestamp: number;
}

/**
 * Parsed representation of encrypted data downloaded from IPFS.
 *
 * Binary fields are converted from Base64 strings back into
 * typed arrays for direct use with the Web Crypto API.
 */
export interface EncryptedData {
  /** AES-GCM encrypted file content as raw bytes. */
  encryptedFile: Uint8Array;

  /** AES-GCM initialization vector (12 bytes) as raw bytes. */
  iv: Uint8Array;

  /** Original file name preserved from the upload payload. */
  fileName: string;

  /** Unix timestamp (milliseconds) from when the payload was created. */
  timestamp: number;
}

/**
 * Response returned by the IPFS backend after a successful upload.
 */
export interface IpfsUploadResponse {
  /** The IPFS content identifier (CID) of the pinned payload. */
  cid: string;
}
