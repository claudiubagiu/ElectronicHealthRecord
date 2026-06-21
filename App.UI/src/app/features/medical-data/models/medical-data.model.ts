export interface CreateMedicalRecordDto {
  patientId: string;
  recordType: string;
  encryptedData: string;
  iv: string;
  encryptedDocumentKey: string;
}

export interface UpdateMedicalRecordDto {
  recordType: string;
  encryptedData: string;
  iv: string;
  encryptedDocumentKey: string;
}

export interface MedicalRecordDto {
  id: string;
  patientId: string;
  recordType: string;
  encryptedData: string;
  iv: string;
  encryptedDocumentKey: string;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
}
