import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PatientDto } from '../models/patient.model';
import { DoctorDto } from '../models/doctor.model';
import { LaboratoryTechnicianDto } from '../models/lab-technician.model';
import { PharmacistDto } from '../models/pharmacist.model';
import { MedicalAssistantDto } from '../models/medical-assistant.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly API = environment.apiUrls.users;
  private http = inject(HttpClient);

  searchPatients(search: string): Promise<PatientDto[]> {
    const params = new HttpParams().set('search', search);
    return firstValueFrom(this.http.get<PatientDto[]>(`${this.API}/search`, { params }));
  }

  getPatientById(patientId: string): Promise<PatientDto> {
    return firstValueFrom(this.http.get<PatientDto>(`${this.API}/patient/${patientId}`));
  }

  getMyProfile(): Promise<PatientDto> {
    return firstValueFrom(this.http.get<PatientDto>(`${this.API}/me`));
  }

  getMyDoctorProfile(): Promise<DoctorDto> {
    return firstValueFrom(this.http.get<DoctorDto>(`${this.API}/me/doctor`));
  }

  getMyLabTechProfile(): Promise<LaboratoryTechnicianDto> {
    return firstValueFrom(this.http.get<LaboratoryTechnicianDto>(`${this.API}/me/lab-tech`));
  }

  getMyPharmacistProfile(): Promise<PharmacistDto> {
    return firstValueFrom(this.http.get<PharmacistDto>(`${this.API}/me/pharmacist`));
  }

  getMyMedicalAssistantProfile(): Promise<MedicalAssistantDto> {
    return firstValueFrom(this.http.get<MedicalAssistantDto>(`${this.API}/me/medical-assistant`));
  }
}
