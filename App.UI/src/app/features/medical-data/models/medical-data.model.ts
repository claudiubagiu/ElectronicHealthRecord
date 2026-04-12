export interface CreateMedicalRecordDto {
  patientId: string;
  recordType: string;
  encryptedData: string;
  iv: string;
  envelopes: MedicalRecordEnvelopeDto[];
}

export interface MedicalRecordEnvelopeDto {
  userId: string;
  encryptedAesKey: string;
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
  encryptedAesKey: string | null;
}

export interface BulkMedicalRecordEnvelopeDto {
  envelopes: BulkMedicalRecordEnvelopeItemDto[];
}

export interface BulkMedicalRecordEnvelopeItemDto {
  medicalRecordId: string;
  userId: string;
  encryptedAesKey: string;
}
