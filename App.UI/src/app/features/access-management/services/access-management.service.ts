import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccessRequestDto } from '../../../core/models/access-request.model';
import { AccessRequestHistoryDto } from '../../../core/models/access-request-history.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccessManagementService {
  private readonly API = environment.apiUrls.accessRequest;
  private http = inject(HttpClient);

  getMyRequests(patientId: string): Promise<AccessRequestDto[]> {
    return firstValueFrom(this.http.get<AccessRequestDto[]>(`${this.API}/patient/${patientId}`));
  }

  approve(requestId: string): Promise<AccessRequestDto> {
    return firstValueFrom(
      this.http.patch<AccessRequestDto>(`${this.API}/${requestId}/approve`, {})
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

  /**
   * Fetches the IDs of all users (doctors, assistants, etc.) with approved access to a patient.
   * Used when creating envelopes.
   */
  async getApprovedUserIds(patientId: string): Promise<string[]> {
    const requests = await this.getMyRequests(patientId);
    return requests.filter((r) => r.status === 'Approved').map((r) => r.doctorId);
  }
}
