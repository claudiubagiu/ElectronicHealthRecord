import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LabAnalysisService } from '../../services/lab-analysis.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-add-lab-analysis',
  templateUrl: './add-lab-analysis.html',
  styleUrls: ['./add-lab-analysis.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS],
})
export class AddLabAnalysis implements OnInit {
  private submissionService = inject(LabAnalysisService);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  form!: FormGroup;
  selectedPatient: PatientDto | null = null;
  selectedFile: File | null = null;
  isLoading = false;

  /** True when the page was opened without a patient in the query params
   *  (e.g. direct URL access) — the patient is always pre-selected from
   *  Patient Access > Active Access, never searched here. */
  patientMissing = false;

  ngOnInit(): void {
    this.buildForm();
    this.hydratePatientFromQueryParams();
  }

  buildForm(): void {
    this.form = this.fb.group({});
  }

  /**
   * The patient is always pre-selected via query params (from Patient
   * Access > Active Access). If they're missing, the lab tech navigated
   * here directly and must be sent back to pick a patient first.
   */
  private hydratePatientFromQueryParams(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');
    const patientName = this.route.snapshot.queryParamMap.get('patientName');
    const patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress');

    if (!patientId || !patientName || !patientWalletAddress) {
      this.patientMissing = true;
      return;
    }

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

  goToPatientAccess(): void {
    this.router.navigate(['/patient-access']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.notify.showError('Only PDF files are accepted.');
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  clearFile(): void {
    this.selectedFile = null;
  }

  get isFormReady(): boolean {
    return !!this.selectedPatient && !!this.selectedFile;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormReady) {
      return;
    }

    this.isLoading = true;

    try {
      const user = this.authService.getDecodedToken();
      const labTechName = user ? `${user.firstName} ${user.lastName}` : 'Lab Technician';

      await this.submissionService.submit({
        pdfFile: this.selectedFile!,
        patientWalletAddress: this.selectedPatient!.walletAddress,
        patientId: this.selectedPatient!.id,
        labTechName,
      });

      this.notify.showSuccess('Lab analysis uploaded successfully!');
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message =
        error instanceof AppError ? error.message : 'Failed to upload analysis. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}
