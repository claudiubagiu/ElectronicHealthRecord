import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { PrescriptionSubmissionService } from '../../services/prescription-submission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-prescription',
  templateUrl: './create-prescription.html',
  styleUrls: ['./create-prescription.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, CommonModule],
})
export class CreatePrescription implements OnInit {
  private fb = inject(FormBuilder);
  private submissionService = inject(PrescriptionSubmissionService);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  isLoading = false;
  selectedPatient: PatientDto | null = null;

  createdShortCode: string | null = null;
  showSuccessModal = false;

  ngOnInit(): void {
    this.buildForm();

    const patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    const patientName = this.route.snapshot.queryParamMap.get('patientName') ?? '';
    const patientWalletAddress =
      this.route.snapshot.queryParamMap.get('patientWalletAddress') ?? '';

    const spaceIndex = patientName.indexOf(' ');
    const firstName = spaceIndex > -1 ? patientName.substring(0, spaceIndex) : patientName;
    const lastName = spaceIndex > -1 ? patientName.substring(spaceIndex + 1) : '';

    this.selectedPatient = {
      id: patientId,
      firstName,
      lastName,
      walletAddress: patientWalletAddress,
      cnp: '',
      identityId: '',
      dateOfBirth: '',
    };
  }

  buildForm(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      medications: this.fb.array([this.createMedicationRow()]),
      notes: [''],
    });
  }

  createMedicationRow(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      dose: ['', Validators.required],
      frequency: ['', Validators.required],
      duration: ['', Validators.required],
    });
  }

  get medications(): FormArray {
    return this.form.get('medications') as FormArray;
  }

  addMedication(): void {
    this.medications.push(this.createMedicationRow());
  }

  removeMedication(index: number): void {
    if (this.medications.length > 1) {
      this.medications.removeAt(index);
    }
  }

  get isFormReady(): boolean {
    return this.form.valid && !!this.selectedPatient;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.createdShortCode = null;
    this.form.get('title')?.reset();
    this.form.get('notes')?.reset();
    while (this.medications.length > 1) {
      this.medications.removeAt(1);
    }
    this.medications.at(0).reset();
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormReady || this.isLoading) return;

    this.isLoading = true;
    try {
      const token = this.authService.getDecodedToken();
      const doctorName = token ? `${token.firstName} ${token.lastName}` : 'Unknown Doctor';

      const result = await this.submissionService.submit({
        formData: {
          title: this.form.value.title ?? '',
          medications: this.medications.value,
          notes: this.form.value.notes ?? '',
        },
        patientWalletAddress: this.selectedPatient!.walletAddress,
        patientName: `${this.selectedPatient!.firstName} ${this.selectedPatient!.lastName}`,
        doctorName,
      });

      this.createdShortCode = result.shortCode;
      this.showSuccessModal = true;
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Failed to create prescription.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/patient', this.selectedPatient?.id, 'profile'], {
      queryParams: {
        patientName: `${this.selectedPatient?.firstName} ${this.selectedPatient?.lastName}`,
        patientWalletAddress: this.selectedPatient?.walletAddress,
      },
    });
  }
}
