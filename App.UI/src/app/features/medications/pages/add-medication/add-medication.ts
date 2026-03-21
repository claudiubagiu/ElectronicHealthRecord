import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicationCryptoService } from '../../services/medication-crypto.service';
import { MedicationFormData } from '../../models/medication-form.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';

@Component({
  selector: 'app-add-medication',
  templateUrl: './add-medication.html',
  styleUrls: ['./add-medication.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatAutocompleteModule],
})
export class AddMedication implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private medicationCryptoService = inject(MedicationCryptoService);
  private notify = inject(NotificationService);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isLoading = false;
  isSearching = false;
  searchPerformed = false;

  filteredPatients: PatientDto[] = [];
  selectedPatient: PatientDto | null = null;

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
      name: ['', Validators.required],
      dose: ['', Validators.required],
      frequency: ['', Validators.required],
      notes: [''],
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

  clearPatient(): void {
    this.selectedPatient = null;
    this.form.get('patientSearch')!.setValue('');
    this.filteredPatients = [];
    this.searchPerformed = false;
  }

  get isFormReady(): boolean {
    return this.form.valid && this.selectedPatient !== null;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormReady || this.isLoading) return;

    this.isLoading = true;
    try {
      const medication: MedicationFormData = {
        name: this.form.value.name,
        dose: this.form.value.dose,
        frequency: this.form.value.frequency,
        notes: this.form.value.notes ?? '',
      };

      await this.medicationCryptoService.submit({
        patientId: this.selectedPatient!.id,
        medication,
      });

      this.notify.showSuccess('Medication added and encrypted successfully.');
      this.router.navigate(['/patient-access']);
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : 'Failed to add medication.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}