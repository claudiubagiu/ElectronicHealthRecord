export interface PrescriptionMedication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionFormData {
  medications: PrescriptionMedication[];
  notes: string;
}

export interface PrescriptionPayload {
  prescription: PrescriptionFormData;
  /** 6-char short code — stored encrypted so the patient can always see it */
  shortCode: string;
  patientName: string;
  doctorName: string;
  timestamp: number;
}
