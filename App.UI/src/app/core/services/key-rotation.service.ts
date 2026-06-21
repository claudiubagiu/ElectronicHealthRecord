import { Injectable, inject } from '@angular/core';
import { CryptoService } from './crypto.service';
import { E2eeKeyService } from './e2ee-key.service';
import { AuthService } from './auth.service';
import { DocumentKeyService } from './document-key.service';
import { AppError } from '../errors/app.error';

import { MedicalDataService } from '../../features/medical-data/services/medical-data.service';
import { MedicalDataCryptoService } from '../../features/medical-data/services/medical-data-crypto.service';
import { DiagnosticDraftService } from '../../features/diagnostics/services/diagnostic-draft.service';
import { AccessManagementService } from '../../features/access-management/services/access-management.service';

/**
 * Orchestrates a full PatientMasterKey rotation, entirely client-side.
 *
 * The PatientMasterKey is the AES-256 key that wraps every DocumentKey
 * (medical records, diagnostic drafts, IPFS-backed files like diagnoses
 * and lab analyses) and that's re-wrapped per-recipient into every active
 * access envelope. Rotating it means: generate a new one, then make it
 * the encryption key everywhere the old one was — without ever sending
 * the plaintext key to any server.
 *
 * Step order is deliberate and matters for safety:
 *
 *   1. Generate the new PatientMasterKey (in memory only).
 *   2. Re-wrap every MedicalRecord's DocumentKey under it, push to
 *      MedicalData.Api.
 *   3. Re-wrap every DiagnosticDraft's DocumentKey under it, push to
 *      Diagnostics.Api.
 *   4. Re-wrap every IPFS-backed DocumentKey under it (diagnoses, lab
 *      analyses), push to AccessRequests.Api. The underlying IPFS files
 *      are content-addressed and immutable, so only the wrapped key
 *      moves — never the file itself.
 *   5. Re-wrap the new master key for every user with active access,
 *      push to AccessRequests.Api (envelopes).
 *   6. LAST: push the new EncryptedAesKey to Auth.Api — the system of
 *      record. Only once this succeeds is the new key authoritative.
 *
 * Step 6 is intentionally last: if anything in steps 1-5 fails or the
 * connection drops, Auth.Api (and everything derived from it) still
 * holds the OLD key, which is still valid everywhere nothing has been
 * migrated to the new one yet. The patient can simply retry the whole
 * operation from scratch — there is no half-migrated state to recover
 * from, because nothing becomes authoritative until the very last call
 * succeeds.
 *
 * Conversely, if the document/envelope re-wraps succeed but step 6 fails,
 * the documents and envelopes are already wrapped under the new key but
 * Auth.Api (and EncryptedAesKey copies derived from it) still report the
 * old one — so resolvePatientAesKey would keep handing out the OLD key,
 * which can no longer unwrap the now-rotated DocumentKeys/envelopes.
 * Practically: a retry re-derives the SAME new key only if step 1's
 * randomness were deterministic, which it isn't — so a failed step 6
 * requires the retry to redo steps 2-5 too, not just step 6 alone. This
 * service always re-runs the full sequence on retry for that reason; it
 * is not designed to be resumed from an arbitrary step.
 */
@Injectable({ providedIn: 'root' })
export class KeyRotationService {
  private e2eeService = inject(E2eeKeyService);
  private authService = inject(AuthService);
  private documentKeyService = inject(DocumentKeyService);

  private medicalDataService = inject(MedicalDataService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);
  private diagnosticDraftService = inject(DiagnosticDraftService);
  private accessManagementService = inject(AccessManagementService);

  /**
   * Runs the full rotation for the currently logged-in patient.
   *
   * @throws {AppError} If the caller has no private key available, or any
   *         step of the rotation fails. On failure, the old key remains
   *         fully valid everywhere — see class doc for why.
   */
  async rotateForCurrentPatient(): Promise<void> {
    const currentUser = this.authService.getDecodedToken();
    if (!currentUser) {
      throw new AppError({
        message: 'You must be logged in.',
        status: 401,
        title: 'Unauthorized',
        type: 'UNAUTHORIZED',
      });
    }

    const myPublicKey = this.e2eeService.getPublicKey();
    if (!myPublicKey) {
      throw new AppError({
        message: 'Your encryption key is not available. Please log in again.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }

    const patientId = currentUser.userId;

    // Step 0 — resolve the OLD PatientMasterKey. Needed to unwrap every
    // existing DocumentKey/envelope key so it can be re-wrapped under the
    // new one. This is the same resolution path used everywhere else in
    // the app (own EncryptedAesKey, since the caller IS the patient).
    const oldMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);

    // Step 1 — generate the new PatientMasterKey (stays in memory only).
    const newMasterKey = await CryptoService.generateAESKey();

    // Step 2 — re-wrap every MedicalRecord's DocumentKey.
    await this.rotateMedicalRecordKeys(patientId, oldMasterKey, newMasterKey);

    // Step 3 — re-wrap every DiagnosticDraft's DocumentKey, if one exists.
    await this.rotateDiagnosticDraftKeys(patientId, oldMasterKey, newMasterKey);

    // Step 4 — re-wrap every IPFS-backed DocumentKey (diagnoses, lab analyses).
    await this.rotateIpfsDocumentKeys(patientId, oldMasterKey, newMasterKey);

    // Step 5 — re-wrap the new master key for every user with active access.
    await this.rotateEnvelopes(patientId, newMasterKey);

    // Step 6 — LAST: make the new key authoritative on Auth.Api.
    const newMasterKeyRaw = await CryptoService.exportAESKey(newMasterKey);
    const encryptedForSelf = CryptoService.encryptAESKeyWithECIES(newMasterKeyRaw, myPublicKey);
    const encryptedForSelfBase64 = CryptoService.arrayBufferToBase64(
      encryptedForSelf.buffer as ArrayBuffer
    );

    await this.authService.rotateAesKey(encryptedForSelfBase64);
  }

  // ==================== Step 2: Medical Records ====================

  private async rotateMedicalRecordKeys(
    patientId: string,
    oldMasterKey: CryptoKey,
    newMasterKey: CryptoKey
  ): Promise<void> {
    const records = await this.medicalDataService.getByPatientId(patientId);
    if (records.length === 0) return;

    const entries = await Promise.all(
      records.map(async (record) => {
        const documentKey = await this.medicalDataCryptoService.unwrapDocumentKeyExtractable(
          record.encryptedDocumentKey,
          oldMasterKey
        );
        const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
          documentKey,
          newMasterKey
        );
        return { recordId: record.id, encryptedDocumentKey };
      })
    );

    await this.medicalDataService.rotateDocumentKeys(entries);
  }

  // ==================== Step 3: Diagnostic Drafts ====================

  private async rotateDiagnosticDraftKeys(
    patientId: string,
    oldMasterKey: CryptoKey,
    newMasterKey: CryptoKey
  ): Promise<void> {
    const draft = await this.diagnosticDraftService.getActiveByPatient(patientId);
    if (!draft) return;

    const documentKey = await this.medicalDataCryptoService.unwrapDocumentKeyExtractable(
      draft.encryptedDocumentKey,
      oldMasterKey
    );
    const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
      documentKey,
      newMasterKey
    );

    await this.diagnosticDraftService.rotateDocumentKeys([
      { draftId: draft.id, encryptedDocumentKey },
    ]);
  }

  // ==================== Step 4: IPFS-backed Document Keys ====================

  /**
   * Re-wraps every DocumentKey registered in AccessRequests.Api — the
   * per-document AES keys for files stored on IPFS (diagnoses, lab
   * analyses). The underlying IPFS files are content-addressed and
   * immutable, so only the small wrapped-key blob moves; the file at
   * each IpfsCid is never re-uploaded or touched.
   */
  private async rotateIpfsDocumentKeys(
    patientId: string,
    oldMasterKey: CryptoKey,
    newMasterKey: CryptoKey
  ): Promise<void> {
    const documentKeys = await this.documentKeyService.getByPatientId(patientId);
    if (documentKeys.length === 0) return;

    const entries = await Promise.all(
      documentKeys.map(async (dk) => {
        const documentKey = await this.medicalDataCryptoService.unwrapDocumentKeyExtractable(
          dk.encryptedDocumentKey,
          oldMasterKey
        );
        const encryptedDocumentKey = await this.medicalDataCryptoService.wrapDocumentKey(
          documentKey,
          newMasterKey
        );
        return { ipfsCid: dk.ipfsCid, encryptedDocumentKey };
      })
    );

    await this.documentKeyService.rotate({ entries });
  }

  // ==================== Step 5: Access Envelopes ====================

  private async rotateEnvelopes(patientId: string, newMasterKey: CryptoKey): Promise<void> {
    const activeUserIds = await this.accessManagementService.getApprovedUserIds(patientId);
    if (activeUserIds.length === 0) return;

    const publicKeys = await this.e2eeService.getPublicKeysBulk(activeUserIds);
    if (publicKeys.length === 0) return;

    const newMasterKeyRaw = await CryptoService.exportAESKey(newMasterKey);

    const entries = publicKeys.map(({ userId, publicKey }) => {
      const encrypted = CryptoService.encryptAESKeyWithECIES(newMasterKeyRaw, publicKey);
      return {
        userId,
        encryptedAesKey: CryptoService.arrayBufferToBase64(encrypted.buffer as ArrayBuffer),
      };
    });

    await this.accessManagementService.rotateEnvelopes(entries);
  }
}
