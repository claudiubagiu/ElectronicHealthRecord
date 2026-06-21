import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CryptoService } from '../../../core/services/crypto.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppError } from '../../../core/errors/app.error';
import { environment } from '../../../../environments/environment';
import { MedicalDataCryptoService } from '../../medical-data/services/medical-data-crypto.service';
import {
  CreateDiagnosticDraftDto,
  DiagnosticDraftDto,
  DiagnosticDraftPayload,
  UpdateDiagnosticDraftDto,
} from '../models/diagnostic-draft.model';

/**
 * Input required by the service to save/update a draft.
 */
export interface DiagnosticDraftSubmissionInput {
  patientId: string;
  patientWalletAddress: string;
  payload: DiagnosticDraftPayload;
  linkedMedicalRecordIds: string[];
}

/**
 * Facade service for DiagnosticDraft CRUD + E2EE pipeline.
 *
 * Pipeline on save:
 *   1. Serialize the DiagnosticDraftPayload as JSON.
 *   2. Generate a random per-draft DocumentKey (AES-256-GCM) and encrypt
 *      the JSON with it.
 *   3. Wrap the DocumentKey with the patient's PatientMasterKey (resolved
 *      via MedicalDataCryptoService — same two-level key model used for
 *      medical records) and store it as EncryptedDocumentKey.
 *   4. POST (or PUT) to Diagnostics.Api.
 *
 * A doctor (or assistant) recovers the PatientMasterKey via the envelope
 * AccessRequests.Api issued on access approval, exactly as for medical
 * records, then unwraps this draft's DocumentKey to decrypt it.
 *
 * No IPFS, no blockchain, no PDF — a draft is off-chain by design and can be
 * edited any number of times before a doctor finalizes it.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticDraftService {
  private readonly API = `${environment.apiUrls.diagnostics.replace(
    '/api/Diagnostics',
    '/api/diagnostic-drafts'
  )}`;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

  // ── HTTP endpoints ───────────────────────────────────────────────────────

  getActiveByPatient(patientId: string): Promise<DiagnosticDraftDto | null> {
    return firstValueFrom(
      this.http.get<DiagnosticDraftDto | null>(`${this.API}/patient/${patientId}`)
    );
  }

  createRaw(dto: CreateDiagnosticDraftDto): Promise<DiagnosticDraftDto> {
    return firstValueFrom(this.http.post<DiagnosticDraftDto>(this.API, dto));
  }

  updateRaw(id: string, dto: UpdateDiagnosticDraftDto): Promise<DiagnosticDraftDto> {
    return firstValueFrom(this.http.put<DiagnosticDraftDto>(`${this.API}/${id}`, dto));
  }

  deleteDraft(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.API}/${id}`));
  }

  // ── High-level: create or update with full E2EE pipeline ─────────────────

  /**
   * Either creates a new draft, or — if one already exists for the patient —
   * updates it in place.
   *
   * Returns the DTO the backend persisted.
   */
  async saveDraft(
    input: DiagnosticDraftSubmissionInput,
    existingDraftId: string | null
  ): Promise<DiagnosticDraftDto> {
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(
      input.patientId
    );
    const documentKey = await CryptoService.generateAESKey();

    const jsonPayload = JSON.stringify(input.payload);
    const dataBuffer = new TextEncoder().encode(jsonPayload).buffer as ArrayBuffer;

    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, documentKey);

    const encryptedDataB64 = this.medicalDataCryptoService.arrayBufferToBase64(encrypted);
    const ivB64 = this.medicalDataCryptoService.arrayBufferToBase64(iv.buffer as ArrayBuffer);
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      patientMasterKey
    );
    const linkedMedicalRecordIdsJson = JSON.stringify(input.linkedMedicalRecordIds ?? []);

    if (existingDraftId) {
      return this.updateRaw(existingDraftId, {
        encryptedData: encryptedDataB64,
        iv: ivB64,
        encryptedDocumentKey,
        linkedMedicalRecordIds: linkedMedicalRecordIdsJson,
      });
    }

    return this.createRaw({
      patientId: input.patientId,
      patientWalletAddress: input.patientWalletAddress,
      encryptedData: encryptedDataB64,
      iv: ivB64,
      encryptedDocumentKey,
      linkedMedicalRecordIds: linkedMedicalRecordIdsJson,
    });
  }

  /**
   * Decrypts a draft payload using the patient's PatientMasterKey, resolved
   * the same way as for medical records (own key if caller is the patient,
   * envelope from AccessRequests.Api otherwise), then unwraps this draft's
   * DocumentKey before decrypting the payload itself.
   */
  async decrypt(draft: DiagnosticDraftDto): Promise<DiagnosticDraftPayload> {
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    const patientMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(
      draft.patientId
    );
    const documentKey = await this.medicalDataCryptoService.unwrapDocumentKey(
      draft.encryptedDocumentKey,
      patientMasterKey
    );

    const encryptedDataBuffer = this.medicalDataCryptoService.base64ToArrayBuffer(
      draft.encryptedData
    );
    const ivBuffer = this.medicalDataCryptoService.base64ToArrayBuffer(draft.iv);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      encryptedDataBuffer,
      documentKey,
      ivBuffer
    );
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as DiagnosticDraftPayload;
  }

  async rotateDocumentKeys(
    entries: { draftId: string; encryptedDocumentKey: string }[]
  ): Promise<number> {
    const response = await firstValueFrom(
      this.http.patch<{ updatedCount: number }>(`${this.API}/rotate-keys`, {
        entries: entries.map((e) => ({
          draftId: e.draftId,
          encryptedDocumentKey: e.encryptedDocumentKey,
        })),
      })
    );
    return response.updatedCount;
  }
}
