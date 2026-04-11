import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { PrescriptionSubmissionService } from '../../services/prescription-submission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-prescription',
  templateUrl: './create-prescription.html',
  styleUrls: ['./create-prescription.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatAutocompleteModule, MatDialogModule, CommonModule],
})
export class CreatePrescription implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private submissionService = inject(PrescriptionSubmissionService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isLoading = false;
  isSearching = false;
  searchPerformed = false;
  filteredPatients: PatientDto[] = [];
  selectedPatient: PatientDto | null = null;

  // Shown after successful submission
  createdShortCode: string | null = null;
  showSuccessModal = false;

  ngOnInit(): void {
    this.buildForm();
    this.setupPatientSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm(): void {
    this.form = this.fb.group({
      patientSearch: ['', [Validators.required, this.patientSelectedValidator.bind(this)]],
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
        switchMap((value) => {
          if (this.selectedPatient) return of([]);
          const term = (value ?? '').trim();
          if (term.length < 2) {
            this.filteredPatients = [];
            this.searchPerformed = false;
            return of([]);
          }
          this.isSearching = true;
          return this.usersService.searchPatients(term);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (patients) => {
          this.filteredPatients = patients;
          this.isSearching = false;
          this.searchPerformed = true;
        },
        error: () => {
          this.isSearching = false;
          this.searchPerformed = true;
        },
      });
  }

  displayPatient(patient: PatientDto): string {
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  onPatientSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedPatient = event.option.value as PatientDto;
    this.form.get('patientSearch')!.updateValueAndValidity();
  }

  clearPatient(event?: Event): void {
    event?.stopPropagation();
    this.selectedPatient = null;
    this.form.get('patientSearch')!.setValue('');
    this.filteredPatients = [];
    this.searchPerformed = false;
  }

  get isFormReady(): boolean {
    return this.form.valid && this.selectedPatient !== null;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.createdShortCode = null;
    // Reset form for a new prescription
    this.form.reset();
    this.selectedPatient = null;
    this.filteredPatients = [];
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
}
