import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AccessRequestDto,
  CreateAccessRequestDto,
} from '../../../core/models/access-request.model';
import { AccessRequestHistoryDto } from '../../../core/models/access-request-history.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccessRequestService {
  private readonly API = environment.apiUrls.accessRequest;
  private http = inject(HttpClient);

  requestAccess(body: CreateAccessRequestDto): Promise<AccessRequestDto> {
    return firstValueFrom(this.http.post<AccessRequestDto>(this.API, body));
  }

  getMyRequests(): Promise<AccessRequestDto[]> {
    return firstValueFrom(this.http.get<AccessRequestDto[]>(`${this.API}/doctor`));
  }

  getMyHistory(): Promise<AccessRequestHistoryDto[]> {
    return firstValueFrom(this.http.get<AccessRequestHistoryDto[]>(`${this.API}/history/doctor`));
  }
}
