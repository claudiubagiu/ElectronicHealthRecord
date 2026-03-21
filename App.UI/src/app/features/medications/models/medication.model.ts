export interface CreateMedicationDto {
  patientId: string;
  encryptedData: string;
  iv: string;
  envelopes: EnvelopeDto[];
}

export interface EnvelopeDto {
  userId: string;
  encryptedAesKey: string;
}

export interface MedicationDto {
  id: string;
  patientId: string;
  encryptedData: string;
  iv: string;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
  encryptedAesKey: string | null;
}

export interface BulkEnvelopeDto {
  envelopes: CreateEnvelopeItemDto[];
}

export interface CreateEnvelopeItemDto {
  medicationId: string;
  userId: string;
  encryptedAesKey: string;
}
