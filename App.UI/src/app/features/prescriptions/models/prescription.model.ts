export interface PrescriptionMedication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionFormData {
  title: string;
  medications: PrescriptionMedication[];
  notes: string;
}

export interface PrescriptionPayload {
  prescription: PrescriptionFormData;
  shortCode: string;
  patientName: string;
  doctorName: string;
  timestamp: number;
}
