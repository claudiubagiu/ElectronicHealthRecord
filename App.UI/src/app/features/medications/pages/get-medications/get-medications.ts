import { Component, OnInit, inject } from '@angular/core';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicationService } from '../../services/medication.service';
import { MedicationCryptoService } from '../../services/medication-crypto.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MedicationDto } from '../../models/medication.model';
import { MedicationFormData } from '../../models/medication-form.model';

export interface DecryptedMedication {
  id: string;
  data: MedicationFormData;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-my-medications',
  templateUrl: './get-medications.html',
  styleUrls: ['./get-medications.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class GetMedications implements OnInit {
  private medicationService = inject(MedicationService);
  private medicationCryptoService = inject(MedicationCryptoService);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

  medications: DecryptedMedication[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadMedications();
  }

  async loadMedications(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoading = true;
    try {
      const encrypted: MedicationDto[] = await this.medicationService.getByPatientId(user.userId);

      const decrypted: DecryptedMedication[] = [];
      for (const med of encrypted) {
        try {
          const data = await this.medicationCryptoService.decrypt(med);
          decrypted.push({
            id: med.id,
            data,
            createdByDoctorId: med.createdByDoctorId,
            createdAt: med.createdAt,
            updatedAt: med.updatedAt,
          });
        } catch (error) {
          console.error(`Failed to decrypt medication ${med.id}:`, error);
          // Skip medications that can't be decrypted
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
