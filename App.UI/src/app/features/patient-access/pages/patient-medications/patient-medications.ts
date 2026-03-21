import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicationService } from '../../../medications/services/medication.service';
import { MedicationDecryptionService } from '../../../medications/services/medication-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MedicationDto } from '../../../medications/models/medication.model';
import { MedicationFormData } from '../../../medications/services/medication-encryption.service';

export interface DecryptedMedication {
  id: string;
  data: MedicationFormData;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-patient-medications',
  templateUrl: './patient-medications.html',
  styleUrls: ['./patient-medications.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class PatientMedications implements OnInit {
  private route = inject(ActivatedRoute);
  private medicationService = inject(MedicationService);
  private decryptionService = inject(MedicationDecryptionService);
  private notify = inject(NotificationService);

  patientId = '';
  patientName = '';

  medications: DecryptedMedication[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.loadMedications();
  }

  async loadMedications(): Promise<void> {
    if (!this.patientId) {
      this.notify.showError('Missing patient ID.');
      return;
    }

    this.isLoading = true;
    try {
      const encrypted: MedicationDto[] = await this.medicationService.getByPatientId(
        this.patientId
      );

      const decrypted: DecryptedMedication[] = [];
      for (const med of encrypted) {
        try {
          const data = await this.decryptionService.decrypt(med);
          decrypted.push({
            id: med.id,
            data,
            createdByDoctorId: med.createdByDoctorId,
            createdAt: med.createdAt,
            updatedAt: med.updatedAt,
          });
        } catch (error) {
          console.error(`Failed to decrypt medication ${med.id}:`, error);
        }
      }

      this.medications = decrypted;
    } catch {
      this.notify.showError('Failed to load medications.');
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
