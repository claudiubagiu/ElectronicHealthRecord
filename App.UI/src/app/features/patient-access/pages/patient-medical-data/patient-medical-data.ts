import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicalDataService } from '../../../medical-data/services/medical-data.service';
import { MedicalDataCryptoService } from '../../../medical-data/services/medical-data-crypto.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MedicalRecordDto } from '../../../medical-data/models/medical-data.model';
import {
  MedicalRecordFormData,
  MedicalRecordType,
} from '../../../medical-data/models/medical-data-form.model';

export interface DecryptedMedicalRecord {
  id: string;
  recordType: MedicalRecordType;
  data: MedicalRecordFormData;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-patient-medical-data',
  templateUrl: './patient-medical-data.html',
  styleUrls: ['./patient-medical-data.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class PatientMedicalData implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private medicalDataService = inject(MedicalDataService);
  private cryptoService = inject(MedicalDataCryptoService);
  private notify = inject(NotificationService);

  patientId = '';
  patientName = '';

  records: DecryptedMedicalRecord[] = [];
  isLoading = false;

  readonly recordTypeConfig: Record<
    MedicalRecordType,
    { icon: string; color: string; label: string }
  > = {
    Allergy: { icon: 'warning_amber', color: '#e65100', label: 'Allergy' },
    Condition: { icon: 'monitor_heart', color: '#1565c0', label: 'Condition' },
    Immunization: { icon: 'vaccines', color: '#2e7d32', label: 'Immunization' },
    Implant: { icon: 'medical_services', color: '#6a1b9a', label: 'Implant / Device' },
    Note: { icon: 'note', color: '#00796b', label: 'Note' },
  };

  get groupedRecords(): { type: MedicalRecordType; items: DecryptedMedicalRecord[] }[] {
    const order: MedicalRecordType[] = ['Allergy', 'Condition', 'Immunization', 'Implant', 'Note'];
    return order
      .map((type) => ({ type, items: this.records.filter((r) => r.recordType === type) }))
      .filter((g) => g.items.length > 0);
  }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.loadRecords();
  }

  async loadRecords(): Promise<void> {
    if (!this.patientId) {
      this.notify.showError('Missing patient ID.');
      return;
    }

    this.isLoading = true;
    try {
      const encrypted: MedicalRecordDto[] = await this.medicalDataService.getByPatientId(
        this.patientId
      );

      const decrypted: DecryptedMedicalRecord[] = [];
      for (const rec of encrypted) {
        try {
          const data = await this.cryptoService.decrypt(rec);
          decrypted.push({
            id: rec.id,
            recordType: rec.recordType as MedicalRecordType,
            data,
            createdByDoctorId: rec.createdByDoctorId,
            createdAt: rec.createdAt,
            updatedAt: rec.updatedAt,
          });
        } catch (err) {
          console.error(`Failed to decrypt record ${rec.id}:`, err);
        }
      }

      this.records = decrypted;
    } catch {
      this.notify.showError('Failed to load medical records.');
    } finally {
      this.isLoading = false;
    }
  }

  getConfig(type: MedicalRecordType) {
    return this.recordTypeConfig[type];
  }

  getDetailRows(record: DecryptedMedicalRecord): { label: string; value: string; icon: string }[] {
    const d = record.data;
    const rows: { label: string; value: string; icon: string }[] = [];

    switch (record.recordType) {
      case 'Allergy':
        if (d.substance)
          rows.push({ label: 'Substance', value: d.substance, icon: 'warning_amber' });
        if (d.severity) rows.push({ label: 'Severity', value: d.severity, icon: 'priority_high' });
        if (d.reaction) rows.push({ label: 'Reaction', value: d.reaction, icon: 'sick' });
        break;
      case 'Condition':
        if (d.conditionName)
          rows.push({ label: 'Condition', value: d.conditionName, icon: 'monitor_heart' });
        if (d.diagnosedAt)
          rows.push({ label: 'Diagnosed', value: d.diagnosedAt, icon: 'calendar_today' });
        if (d.status) rows.push({ label: 'Status', value: d.status, icon: 'info' });
        break;
      case 'Immunization':
        if (d.vaccine) rows.push({ label: 'Vaccine', value: d.vaccine, icon: 'vaccines' });
        if (d.administeredAt)
          rows.push({ label: 'Administered', value: d.administeredAt, icon: 'event' });
        if (d.boosterDue)
          rows.push({ label: 'Booster due', value: d.boosterDue, icon: 'event_repeat' });
        break;
      case 'Implant':
        if (d.implantName)
          rows.push({ label: 'Device', value: d.implantName, icon: 'medical_services' });
        if (d.implantedAt) rows.push({ label: 'Implanted', value: d.implantedAt, icon: 'event' });
        break;
    }

    if (d.notes) rows.push({ label: 'Notes', value: d.notes, icon: 'notes' });
    return rows;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/patient', this.patientId, 'profile'], {
      queryParams: { patientName: this.patientName },
    });
  }
}
