export type MedicalRecordType = 'Allergy' | 'Condition' | 'Immunization' | 'Implant' | 'Note';

export interface MedicalRecordFormData {
  type: MedicalRecordType;
  // Allergy
  substance?: string;
  severity?: string;
  reaction?: string;
  // Condition
  conditionName?: string;
  diagnosedAt?: string;
  status?: string;
  // Immunization
  vaccine?: string;
  administeredAt?: string;
  boosterDue?: string;
  // Implant
  implantName?: string;
  implantedAt?: string;
  // Note
  noteContent?: string;
  // Shared
  notes?: string;
}

export interface MedicalRecordSubmissionInput {
  patientId: string;
  record: MedicalRecordFormData;
}
