import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CryptoService } from '../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../core/services/e2ee-key.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccessManagementService } from '../../access-management/services/access-management.service';
import { AppError } from '../../../core/errors/app.error';
import { environment } from '../../../../environments/environment';
import {
  CreateDiagnosticDraftDto,
  DiagnosticDraftDto,
  DiagnosticDraftEnvelopeDto,
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
 *   2. Encrypt the JSON with a random AES-256-GCM key.
 *   3. Fetch ECC public keys for: the patient, the caller (assistant/doctor),
 *      and all doctors with active (Approved) access to the patient.
 *   4. Wrap the AES key once per recipient using ECIES.
 *   5. POST (or PUT) to the Diagnostics.Api.
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
  private e2eeService = inject(E2eeKeyService);
  private authService = inject(AuthService);
  private accessService = inject(AccessManagementService);

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

    // 1. Serialize + encrypt
    const jsonPayload = JSON.stringify(input.payload);
    const dataBuffer = new TextEncoder().encode(jsonPayload).buffer as ArrayBuffer;

    const aesKey = await CryptoService.generateAESKey();
    const { encrypted, iv } = await CryptoService.encryptFileWithAES(dataBuffer, aesKey);
    const aesKeyRaw = await CryptoService.exportAESKey(aesKey);

    // 2. Build recipient set: patient + caller + all currently-approved doctors
    const recipientUserIds = await this.buildRecipientUserIds(input.patientId, currentUser.userId);

    // 3. Fetch all public keys in one round-trip
    const publicKeys = await this.e2eeService.getPublicKeysBulk(recipientUserIds);

    // 4. Build envelopes
    const envelopes: DiagnosticDraftEnvelopeDto[] = [];
    for (const pk of publicKeys) {
      const encryptedAesKey = CryptoService.encryptAESKeyWithECIES(aesKeyRaw, pk.publicKey);
      envelopes.push({
        userId: pk.userId,
        encryptedAesKey: CryptoService.arrayBufferToBase64(encryptedAesKey.buffer as ArrayBuffer),
      });
    }

    const encryptedDataB64 = CryptoService.arrayBufferToBase64(encrypted);
    const ivB64 = CryptoService.arrayBufferToBase64(iv.buffer as ArrayBuffer);
    const linkedMedicalRecordIdsJson = JSON.stringify(input.linkedMedicalRecordIds ?? []);

    // 5. Create or update
    if (existingDraftId) {
      return this.updateRaw(existingDraftId, {
        encryptedData: encryptedDataB64,
        iv: ivB64,
        linkedMedicalRecordIds: linkedMedicalRecordIdsJson,
        envelopes,
      });
    }

    return this.createRaw({
      patientId: input.patientId,
      patientWalletAddress: input.patientWalletAddress,
      encryptedData: encryptedDataB64,
      iv: ivB64,
      linkedMedicalRecordIds: linkedMedicalRecordIdsJson,
      envelopes,
    });
  }

  /**
   * Decrypts a draft payload using the caller's ECC private key.
   * Expects the DTO's envelopes to include an entry keyed by the caller.
   */
  async decrypt(draft: DiagnosticDraftDto): Promise<DiagnosticDraftPayload> {
    const privateKey = this.e2eeService.getPrivateKey();
    if (!privateKey) {
      throw new AppError({
        message: 'Your encryption key is not available. Please log in again.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }

    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    const envelope = draft.envelopes.find((e) => e.userId === currentUser.userId);
    if (!envelope) {
      throw new AppError({
        message: 'No decryption envelope found for your account.',
        status: 403,
        title: 'No Envelope',
        type: 'DRAFT_NO_ENVELOPE',
      });
    }

    const encryptedAesKeyBuffer = CryptoService.base64ToUint8Array(envelope.encryptedAesKey)
      .buffer as ArrayBuffer;
    const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(encryptedAesKeyBuffer, privateKey);

    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyRaw.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const encryptedDataBuffer = CryptoService.base64ToUint8Array(draft.encryptedData)
      .buffer as ArrayBuffer;
    const ivBytes = CryptoService.base64ToUint8Array(draft.iv);

    const decryptedBuffer = await CryptoService.decryptFileWithAES(
      encryptedDataBuffer,
      aesKey,
      ivBytes.buffer as ArrayBuffer
    );
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as DiagnosticDraftPayload;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Builds the recipient set for a draft:
   *   - the patient themself
   *   - the caller (assistant/doctor creating/updating the draft)
   *   - every doctor with an Approved access request for this patient
   *
   * De-duplicated.
   */
  private async buildRecipientUserIds(patientId: string, callerUserId: string): Promise<string[]> {
    const ids = new Set<string>();
    ids.add(patientId);
    ids.add(callerUserId);

    try {
      const approvedDoctorIds = await this.accessService.getApprovedUserIds(patientId);
      approvedDoctorIds.forEach((id) => ids.add(id));
    } catch {
      // If the call fails we still proceed — worst case the doctor will have
      // to re-save the draft to get an envelope once access is granted.
      console.warn('Could not fetch approved doctors; proceeding with patient + caller only.');
    }

    return Array.from(ids);
  }
}
