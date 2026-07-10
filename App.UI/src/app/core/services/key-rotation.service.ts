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

@Injectable({ providedIn: 'root' })
export class KeyRotationService {
  private e2eeService = inject(E2eeKeyService);
  private authService = inject(AuthService);
  private documentKeyService = inject(DocumentKeyService);

  private medicalDataService = inject(MedicalDataService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);
  private diagnosticDraftService = inject(DiagnosticDraftService);
  private accessManagementService = inject(AccessManagementService);

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

    const oldMasterKey = await this.medicalDataCryptoService.resolvePatientAesKey(patientId);

    const newMasterKey = await CryptoService.generateAESKey();

    await this.rotateMedicalRecordKeys(patientId, oldMasterKey, newMasterKey);
    await this.rotateDiagnosticDraftKeys(patientId, oldMasterKey, newMasterKey);
    await this.rotateIpfsDocumentKeys(patientId, oldMasterKey, newMasterKey);
    await this.rotateEnvelopes(patientId, newMasterKey);

    const newMasterKeyRaw = await CryptoService.exportAESKey(newMasterKey);
    const encryptedForSelf = CryptoService.encryptAESKeyWithECIES(newMasterKeyRaw, myPublicKey);
    const encryptedForSelfBase64 = CryptoService.arrayBufferToBase64(
      encryptedForSelf.buffer as ArrayBuffer
    );

    await this.authService.rotateAesKey(encryptedForSelfBase64);
  }

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
