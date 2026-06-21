/**
 * Mirrors AccessRequests.Api's DocumentKeyDto. Represents the per-document
 * DocumentKey (AES-GCM key used to encrypt a single IPFS file), wrapped
 * with the patient's PatientMasterKey.
 */
export interface DocumentKeyDto {
  id: string;
  patientId: string;
  ipfsCid: string;
  encryptedDocumentKey: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body to register a new DocumentKey right after a file has been
 * encrypted client-side and uploaded to IPFS.
 */
export interface CreateDocumentKeyDto {
  patientId: string;
  ipfsCid: string;
  encryptedDocumentKey: string;
}

/**
 * One entry in a batch DocumentKey rotation request.
 */
export interface RotateDocumentKeyEntry {
  ipfsCid: string;
  encryptedDocumentKey: string;
}

/**
 * Batch request to re-wrap every DocumentKey under a new PatientMasterKey.
 */
export interface RotateDocumentKeysDto {
  entries: RotateDocumentKeyEntry[];
}
