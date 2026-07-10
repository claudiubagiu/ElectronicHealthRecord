import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CreateDocumentKeyDto,
  DocumentKeyDto,
  RotateDocumentKeysDto,
} from '../models/document-key.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DocumentKeyService {
  private readonly API = environment.apiUrls.accessRequest.replace(
    '/api/AccessRequests',
    '/api/DocumentKeys'
  );
  private http = inject(HttpClient);

  create(dto: CreateDocumentKeyDto): Promise<DocumentKeyDto> {
    return firstValueFrom(this.http.post<DocumentKeyDto>(this.API, dto));
  }

  getByIpfsCid(ipfsCid: string): Promise<DocumentKeyDto> {
    return firstValueFrom(this.http.get<DocumentKeyDto>(`${this.API}/${ipfsCid}`));
  }

  getByPatientId(patientId: string): Promise<DocumentKeyDto[]> {
    return firstValueFrom(this.http.get<DocumentKeyDto[]>(`${this.API}/patient/${patientId}`));
  }

  rotate(dto: RotateDocumentKeysDto): Promise<{ updatedCount: number }> {
    return firstValueFrom(this.http.patch<{ updatedCount: number }>(`${this.API}/rotate`, dto));
  }
}
