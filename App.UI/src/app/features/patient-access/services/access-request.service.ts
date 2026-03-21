import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AccessRequestDto,
  CreateAccessRequestDto,
} from '../../../core/models/access-request.model';
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
}
