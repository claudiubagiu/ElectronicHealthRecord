import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccessRequestDto } from '../../../core/models/access-request.model';
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

  /**
   * Fetches the IDs of all doctors with approved access to a patient.
   * Used when creating medication envelopes.
   */
  async getApprovedDoctorIds(patientId: string): Promise<string[]> {
    const requests = await this.getMyRequests(patientId);
    return requests.filter((r) => r.status === 'Approved').map((r) => r.doctorId);
  }
}
