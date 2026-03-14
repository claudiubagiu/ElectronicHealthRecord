import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PatientDto, DiagnosticDto } from '../models/diagnostic.model';

@Injectable({
  providedIn: 'root',
})
export class DiagnosticsService {
  private readonly DIAGNOSTICS_API = 'http://diagnostics.api.docker.localhost/api/Diagnostics';
  private readonly USERS_API = 'http://users.api.docker.localhost/api/Users';

  private http = inject(HttpClient);

  searchPatients(search: string): Promise<PatientDto[]> {
    const params = new HttpParams().set('search', search);
    return firstValueFrom(this.http.get<PatientDto[]>(`${this.USERS_API}/search`, { params }));
  }

  createDiagnostic(formData: FormData): Promise<DiagnosticDto> {
    return firstValueFrom(this.http.post<DiagnosticDto>(this.DIAGNOSTICS_API, formData));
  }

  getDiagnosticsByPatient(patientId: string): Promise<DiagnosticDto[]> {
    return firstValueFrom(
      this.http.get<DiagnosticDto[]>(`${this.DIAGNOSTICS_API}/patient/${patientId}`),
    );
  }

  deleteDiagnostic(id: string): Promise<boolean> {
    return firstValueFrom(this.http.delete<boolean>(`${this.DIAGNOSTICS_API}/${id}`));
  }
}
