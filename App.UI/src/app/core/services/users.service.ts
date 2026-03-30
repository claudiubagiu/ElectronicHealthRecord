import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PatientDto } from '../models/patient.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly API = environment.apiUrls.users;
  private http = inject(HttpClient);

  searchPatients(search: string): Promise<PatientDto[]> {
    const params = new HttpParams().set('search', search);
    return firstValueFrom(this.http.get<PatientDto[]>(`${this.API}/search`, { params }));
  }

  getMyProfile(): Promise<PatientDto> {
    return firstValueFrom(this.http.get<PatientDto>(`${this.API}/me`));
  }
}
