import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccessRequestDto } from '../../patient-access/models/access-request.model';
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
}
