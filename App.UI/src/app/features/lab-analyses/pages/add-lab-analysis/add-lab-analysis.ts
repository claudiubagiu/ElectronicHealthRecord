import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { LabAnalysisService } from '../../services/lab-analysis.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-add-lab-analysis',
  templateUrl: './add-lab-analysis.html',
  styleUrls: ['./add-lab-analysis.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatAutocompleteModule],
})
export class AddLabAnalysis implements OnInit, OnDestroy {
  private submissionService = inject(LabAnalysisService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  selectedPatient: PatientDto | null = null;
  filteredPatients: PatientDto[] = [];
  selectedFile: File | null = null;
  isLoading = false;
  isSearching = false;
  searchPerformed = false;

  /** True when the patient was pre-filled via query params (from Patient
   *  Access > Active Access), so the search field is hidden/locked. */
  patientPrefilled = false;

  ngOnInit(): void {
    this.buildForm();
    this.hydratePatientFromQueryParams();
    this.setupPatientSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * If navigated here from Patient Access (Active Access tab), the patient
   * is already known and approved — pre-fill it instead of making the lab
   * tech search again.
   */
  private hydratePatientFromQueryParams(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');
    const patientName = this.route.snapshot.queryParamMap.get('patientName');
    const patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress');

    if (!patientId || !patientName || !patientWalletAddress) return;

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
    this.patientPrefilled = true;
    this.form.get('patientSearch')!.setValue(patientName);
  }

  buildForm(): void {
    this.form = this.fb.group({
      patientSearch: ['', [Validators.required, this.patientSelectedValidator.bind(this)]],
    });
  }

  patientSelectedValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    if (typeof control.value === 'string' && !this.selectedPatient) {
      return { invalidPatient: true };
    }
    return null;
  }

  setupPatientSearch(): void {
    this.form
      .get('patientSearch')!
      .valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap((value) => {
          if (typeof value === 'string') this.selectedPatient = null;
          if (typeof value !== 'string' || value.trim().length < 2) {
            this.filteredPatients = [];
            this.searchPerformed = false;
            return of([]);
          }
          this.isSearching = true;
          this.searchPerformed = true;
          return this.usersService.searchPatients(value.trim());
        })
      )
      .subscribe({
        next: (patients) => {
          this.filteredPatients = patients;
          this.isSearching = false;
        },
        error: () => {
          this.filteredPatients = [];
          this.isSearching = false;
        },
      });
  }

  displayPatient(patient: PatientDto | string): string {
    if (!patient) return '';
    if (typeof patient === 'string') return patient;
    return `${patient.firstName} ${patient.lastName}`;
  }

  onPatientSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedPatient = event.option.value as PatientDto;
    this.form.get('patientSearch')!.updateValueAndValidity();
  }

  clearPatient(event: Event): void {
    event.stopPropagation();
    this.selectedPatient = null;
    this.patientPrefilled = false;
    this.form.get('patientSearch')!.setValue('');
    this.filteredPatients = [];
    this.searchPerformed = false;
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
    return !!this.selectedPatient && !!this.selectedFile && this.form.valid;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormReady) {
      this.form.markAllAsTouched();
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
