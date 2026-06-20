export interface CreateMedicalRecordDto {
  patientId: string;
  recordType: string;
  encryptedData: string;
  iv: string;
}

export interface UpdateMedicalRecordDto {
  recordType: string;
  encryptedData: string;
  iv: string;
}

export interface MedicalRecordDto {
  id: string;
  patientId: string;
  recordType: string;
  encryptedData: string;
  iv: string;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
}
