export interface MedicationFormData {
  name: string;
  dose: string;
  frequency: string;
  notes: string;
}

export interface MedicationSubmissionInput {
  patientId: string;
  medication: MedicationFormData;
}
