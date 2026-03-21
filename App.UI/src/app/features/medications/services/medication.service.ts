import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateMedicationDto, MedicationDto, BulkEnvelopeDto } from '../models/medication.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MedicationService {
  private readonly API = environment.apiUrls.medications;
  private http = inject(HttpClient);

  create(dto: CreateMedicationDto): Promise<MedicationDto> {
    return firstValueFrom(this.http.post<MedicationDto>(this.API, dto));
  }

  getByPatientId(patientId: string): Promise<MedicationDto[]> {
    return firstValueFrom(this.http.get<MedicationDto[]>(`${this.API}/patient/${patientId}`));
  }

  addEnvelopesBulk(dto: BulkEnvelopeDto): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.API}/envelopes/bulk`, dto));
  }

  deleteEnvelopes(doctorId: string, patientId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.API}/envelopes/user/${doctorId}/patient/${patientId}`)
    );
  }
}
