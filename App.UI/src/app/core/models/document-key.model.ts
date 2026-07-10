export interface DocumentKeyDto {
  id: string;
  patientId: string;
  ipfsCid: string;
  encryptedDocumentKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentKeyDto {
  patientId: string;
  ipfsCid: string;
  encryptedDocumentKey: string;
}

export interface RotateDocumentKeyEntry {
  ipfsCid: string;
  encryptedDocumentKey: string;
}

export interface RotateDocumentKeysDto {
  entries: RotateDocumentKeyEntry[];
}
