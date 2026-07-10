import { CustomField } from '../services/diagnostic-pdf.service';

export interface DiagnosticDraftPayload {
  // General
  title: string;
  consultationDate: string;
  patient: string;
  patientCNP: string;

  // Anamnesis
  chiefComplaint: string;
  personalHistory?: string;
  familyHistory?: string;

  // Clinical examination
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  weightHeight?: string;
  clinicalNotes?: string;

  // Custom fields
  customGeneralInfo?: CustomField[];
  customAnamnesis?: CustomField[];
  customClinicalExam?: CustomField[];

  // Linked lab analysis
  linkedLabAnalysis?: { id: string; title: string; dateLabel: string };

  // Past diagnoses selected as personal history 
  linkedPastDiagnosisIds?: string[];
}

export interface DiagnosticDraftDto {
  id: string;
  status: string;
  patientId: string;
  patientWalletAddress: string;
  createdByAssistantId?: string;
  createdByAssistantName?: string;
  completedByDoctorId?: string;
  createdAt: string;
  updatedAt: string;
  encryptedData: string;
  iv: string;
  encryptedDocumentKey: string;
  linkedMedicalRecordIds: string;
}

export interface CreateDiagnosticDraftDto {
  patientId: string;
  patientWalletAddress: string;
  encryptedData: string;
  iv: string;
  encryptedDocumentKey: string;
  linkedMedicalRecordIds: string;
}

export interface UpdateDiagnosticDraftDto {
  encryptedData: string;
  iv: string;
  encryptedDocumentKey: string;
  linkedMedicalRecordIds: string;
  status?: string;
  completedByDoctorId?: string;
}
