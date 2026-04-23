import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicalRecordsPanelComponent } from '../../../../shared/components/medical-records-panel/medical-records-panel';

@Component({
  selector: 'app-patient-medical-data',
  templateUrl: './patient-medical-data.html',
  styleUrls: ['./patient-medical-data.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, MedicalRecordsPanelComponent],
})
export class PatientMedicalData implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  patientId = '';
  patientName = '';

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
  }

  goBack(): void {
    this.router.navigate(['/patient', this.patientId, 'profile'], {
      queryParams: { patientName: this.patientName },
    });
  }
}
