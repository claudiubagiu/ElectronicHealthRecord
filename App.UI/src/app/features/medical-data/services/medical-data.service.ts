import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CreateMedicalRecordDto,
  MedicalRecordDto,
  BulkMedicalRecordEnvelopeDto,
} from '../models/medical-data.model';
import { environment } from '../../../../environments/environment';

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

  addEnvelopesBulk(dto: BulkMedicalRecordEnvelopeDto): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.API}/envelopes/bulk`, dto));
  }

  deleteEnvelopes(doctorId: string, patientId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.API}/envelopes/user/${doctorId}/patient/${patientId}`)
    );
  }
}
