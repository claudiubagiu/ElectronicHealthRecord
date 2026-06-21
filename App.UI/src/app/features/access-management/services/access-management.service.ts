import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AccessRequestDto,
  CreateEnvelopeDto,
  EnvelopeDto,
} from '../../../core/models/access-request.model';
import { AccessRequestHistoryDto } from '../../../core/models/access-request-history.model';
import { environment } from '../../../../environments/environment';

/**
 * One entry in a batch envelope-rotation request — re-wraps the patient's
 * new PatientMasterKey for a single authorized user who currently holds an
 * active envelope.
 */
export interface RotateEnvelopeEntry {
  userId: string;
  encryptedAesKey: string;
}

@Injectable({ providedIn: 'root' })
export class AccessManagementService {
  private readonly API = environment.apiUrls.accessRequest;
  private http = inject(HttpClient);

  getMyRequests(patientId: string): Promise<AccessRequestDto[]> {
    return firstValueFrom(this.http.get<AccessRequestDto[]>(`${this.API}/patient/${patientId}`));
  }

  /**
   * Approves a pending access request. Must include the patient's AES key,
   * ECIES-encrypted with the requesting user's public key — this becomes
   * the envelope that user uses to decrypt this patient's medical data and
   * diagnostics. See AccessManagement (component) for how the envelope is built.
   */
  approve(requestId: string, envelope: CreateEnvelopeDto): Promise<AccessRequestDto> {
    return firstValueFrom(
      this.http.patch<AccessRequestDto>(`${this.API}/${requestId}/approve`, envelope)
    );
  }

  reject(requestId: string): Promise<AccessRequestDto> {
    return firstValueFrom(this.http.patch<AccessRequestDto>(`${this.API}/${requestId}/reject`, {}));
  }

  revoke(requestId: string): Promise<AccessRequestDto> {
    return firstValueFrom(this.http.patch<AccessRequestDto>(`${this.API}/${requestId}/revoke`, {}));
  }

  getMyHistory(patientId: string): Promise<AccessRequestHistoryDto[]> {
    return firstValueFrom(
      this.http.get<AccessRequestHistoryDto[]>(`${this.API}/history/patient/${patientId}`)
    );
  }

  getApprovedDoctors(patientId: string): Promise<AccessRequestDto[]> {
    return firstValueFrom(
      this.http.get<AccessRequestDto[]>(`${this.API}/patient/${patientId}/approved`)
    );
  }

  /**
   * Fetches the IDs of all users (doctors, assistants, etc.) with approved access to a patient.
   */
  async getApprovedUserIds(patientId: string): Promise<string[]> {
    const requests = await this.getMyRequests(patientId);
    return requests.filter((r) => r.status === 'Approved').map((r) => r.doctorId);
  }

  /**
   * Fetches the envelope (the patient's AES key, ECIES-encrypted for the
   * calling user) for the given patient. Used by an authorized user
   * (doctor, lab tech, pharmacist, medical assistant, etc.) to decrypt
   * that patient's medical data / diagnostics. Returns null if no envelope
   * exists (access not approved, revoked, or expired).
   */
  async getEnvelope(patientId: string): Promise<EnvelopeDto | null> {
    try {
      return await firstValueFrom(
        this.http.get<EnvelopeDto>(`${this.API}/patient/${patientId}/envelope`)
      );
    } catch {
      return null;
    }
  }

  /**
   * Batch-rotates EncryptedAesKey for every active envelope owned by the
   * calling patient, after the patient has generated a new
   * PatientMasterKey client-side and re-encrypted it for each user who
   * currently holds an envelope. patientId is resolved server-side from
   * the JWT — only ever rotates the caller's own envelopes.
   *
   * @returns The number of envelopes actually updated.
   */
  async rotateEnvelopes(entries: RotateEnvelopeEntry[]): Promise<number> {
    const response = await firstValueFrom(
      this.http.patch<{ updatedCount: number }>(`${this.API}/patient/me/envelopes/rotate`, {
        entries: entries.map((e) => ({
          userId: e.userId,
          encryptedAesKey: e.encryptedAesKey,
        })),
      })
    );
    return response.updatedCount;
  }
}
