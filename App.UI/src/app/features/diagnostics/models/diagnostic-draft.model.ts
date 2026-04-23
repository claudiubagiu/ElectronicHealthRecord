import { CustomField } from '../services/diagnostic-pdf.service';

/**
 * The decrypted payload that lives inside a DiagnosticDraft.
 * Mirrors the AddDiagnostic form value minus "Diagnosis & Treatment"
 * (primaryDiagnosis, icdCode, treatment, etc.) — those are added by
 * the doctor when the draft is promoted into a full diagnosis.
 */
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

  // Clinical examination (all optional)
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  weightHeight?: string;
  clinicalNotes?: string;

  // Custom fields
  customGeneralInfo?: CustomField[];
  customAnamnesis?: CustomField[];
  customClinicalExam?: CustomField[];

  // Linked lab analysis (by blockchain id + title)
  linkedLabAnalysis?: { id: string; title: string; dateLabel: string };

  // Past diagnoses selected as personal history (ids only — titles recomputed on open)
  linkedPastDiagnosisIds?: string[];
}

/**
 * Envelope DTO — one per authorized recipient.
 */
export interface DiagnosticDraftEnvelopeDto {
  userId: string;
  encryptedAesKey: string;
}

/**
 * DTO returned by the backend.
 */
export interface DiagnosticDraftDto {
  id: string;
  status: string;
  patientId: string;
  patientWalletAddress: string;
  createdByAssistantId?: string;
  completedByDoctorId?: string;
  createdAt: string;
  updatedAt: string;
  encryptedData: string;
  iv: string;
  linkedMedicalRecordIds: string;
  envelopes: DiagnosticDraftEnvelopeDto[];
}

/**
 * Payload for POST api/diagnostic-drafts.
 */
export interface CreateDiagnosticDraftDto {
  patientId: string;
  patientWalletAddress: string;
  encryptedData: string;
  iv: string;
  linkedMedicalRecordIds: string;
  envelopes: DiagnosticDraftEnvelopeDto[];
}

/**
 * Payload for PUT api/diagnostic-drafts/{id}.
 */
export interface UpdateDiagnosticDraftDto {
  encryptedData: string;
  iv: string;
  linkedMedicalRecordIds: string;
  status?: string;
  completedByDoctorId?: string;
  envelopes: DiagnosticDraftEnvelopeDto[];
}
