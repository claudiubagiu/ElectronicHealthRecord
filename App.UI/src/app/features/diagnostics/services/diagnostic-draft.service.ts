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

export interface DiagnosticDraftSubmissionInput {
  patientId: string;
  patientWalletAddress: string;
  payload: DiagnosticDraftPayload;
  linkedMedicalRecordIds: string[];
}

@Injectable({ providedIn: 'root' })
export class DiagnosticDraftService {
  private readonly API = `${environment.apiUrls.diagnostics.replace(
    '/api/Diagnostics',
    '/api/diagnostic-drafts'
  )}`;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);

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
