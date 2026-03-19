export interface PatientDto {
  id: string;
  identityId: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
  cnp: string;
  dateOfBirth: string;
}

export interface DiagnosticDto {
  id: string;
  patientId: string;
  doctorName: string;
  doctorWalletAddress: string;
  description: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}
