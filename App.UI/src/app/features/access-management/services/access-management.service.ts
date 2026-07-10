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

  async getApprovedUserIds(patientId: string): Promise<string[]> {
    const requests = await this.getMyRequests(patientId);
    return requests.filter((r) => r.status === 'Approved').map((r) => r.doctorId);
  }

  async getEnvelope(patientId: string): Promise<EnvelopeDto | null> {
    try {
      return await firstValueFrom(
        this.http.get<EnvelopeDto>(`${this.API}/patient/${patientId}/envelope`)
      );
    } catch {
      return null;
    }
  }

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
