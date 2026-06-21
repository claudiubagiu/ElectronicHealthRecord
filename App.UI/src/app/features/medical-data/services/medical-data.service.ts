import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
  MedicalRecordDto,
} from '../models/medical-data.model';
import { environment } from '../../../../environments/environment';

/**
 * One entry in a batch DocumentKey-rotation request — re-wraps a single
 * record's DocumentKey under a new PatientMasterKey. EncryptedData/Iv are
 * untouched, only EncryptedDocumentKey changes.
 */
export interface RotateDocumentKeyEntry {
  recordId: string;
  encryptedDocumentKey: string;
}

@Injectable({ providedIn: 'root' })
export class MedicalDataService {
  private readonly API = environment.apiUrls.medicalData;
  private http = inject(HttpClient);

  create(dto: CreateMedicalRecordDto): Promise<MedicalRecordDto> {
    return firstValueFrom(this.http.post<MedicalRecordDto>(this.API, dto));
  }

  getByPatientId(patientId: string): Promise<MedicalRecordDto[]> {
    return firstValueFrom(this.http.get<MedicalRecordDto[]>(`${this.API}/patient/${patientId}`));
  }

  update(id: string, dto: UpdateMedicalRecordDto): Promise<MedicalRecordDto> {
    return firstValueFrom(this.http.put<MedicalRecordDto>(`${this.API}/${id}`, dto));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.API}/${id}`));
  }

  async rotateDocumentKeys(entries: RotateDocumentKeyEntry[]): Promise<number> {
    const response = await firstValueFrom(
      this.http.patch<{ updatedCount: number }>(`${this.API}/rotate-keys`, {
        entries: entries.map((e) => ({
          recordId: e.recordId,
          encryptedDocumentKey: e.encryptedDocumentKey,
        })),
      })
    );
    return response.updatedCount;
  }
}
