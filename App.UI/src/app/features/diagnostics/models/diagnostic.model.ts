export interface PatientDto {
  id: string;
  identityId: string;
  firstName: string;
  lastName: string;
  cnp: string;
  dateOfBirth: string;
}

export interface DiagnosticDto {
  id: string;
  patientId: string;
  doctorName: string;
  description: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}
