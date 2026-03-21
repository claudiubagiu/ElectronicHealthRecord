import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DiagnosticDto } from '../models/diagnostic.model';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class DiagnosticsService {
  private readonly DIAGNOSTICS_API = environment.apiUrls.diagnostics;
  private http = inject(HttpClient);

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
