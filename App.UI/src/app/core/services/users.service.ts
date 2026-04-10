import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PatientDto } from '../models/patient.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly API = environment.apiUrls.users;
  private http = inject(HttpClient);

  /**
   * Searches patients by full name. Returns a list of matching PatientDto objects.
   */
  searchPatients(search: string): Promise<PatientDto[]> {
    const params = new HttpParams().set('search', search);
    return firstValueFrom(this.http.get<PatientDto[]>(`${this.API}/search`, { params }));
  }

  /**
   * Returns the full profile of the currently authenticated patient.
   * Uses the identityId claim from the JWT to look up the record.
   */
  getMyProfile(): Promise<PatientDto> {
    return firstValueFrom(this.http.get<PatientDto>(`${this.API}/me`));
  }
}
