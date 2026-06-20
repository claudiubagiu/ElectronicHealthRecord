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
}
