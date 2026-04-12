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
import { MatSelectModule } from '@angular/material/select';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicalDataCryptoService } from '../../services/medical-data-crypto.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { MedicalRecordType } from '../../models/medical-data-form.model';

@Component({
  selector: 'app-add-medical-data',
  templateUrl: './add-medical-data.html',
  styleUrls: ['./add-medical-data.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatAutocompleteModule, MatSelectModule],
})
export class AddMedicalData implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private cryptoService = inject(MedicalDataCryptoService);
  private notify = inject(NotificationService);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isLoading = false;
  isSearching = false;
  searchPerformed = false;

  filteredPatients: PatientDto[] = [];
  selectedPatient: PatientDto | null = null;

  readonly recordTypes: { value: MedicalRecordType; label: string; icon: string }[] = [
    { value: 'Allergy', label: 'Allergy', icon: 'warning_amber' },
    { value: 'Condition', label: 'Condition', icon: 'monitor_heart' },
    { value: 'Immunization', label: 'Immunization', icon: 'vaccines' },
    { value: 'Implant', label: 'Implant / Device', icon: 'medical_services' },
    { value: 'Note', label: 'Note', icon: 'note' },
  ];

  readonly recordTypeConfig: Record<string, { icon: string; label: string }> = {
    Allergy: { icon: 'warning_amber', label: 'Allergy' },
    Condition: { icon: 'monitor_heart', label: 'Condition' },
    Immunization: { icon: 'vaccines', label: 'Immunization' },
    Implant: { icon: 'medical_services', label: 'Implant / Device' },
    Note: { icon: 'note', label: 'Note' },
  };

  get selectedType(): MedicalRecordType | null {
    return this.form?.get('recordType')?.value ?? null;
  }

  get isFormReady(): boolean {
    return !!this.selectedPatient && this.form.valid;
  }

  getConfig(type: string) {
    return this.recordTypeConfig[type];
  }

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
      recordType: ['', Validators.required],
      // Allergy
      substance: [''],
      severity: ['', Validators.required],
      reaction: ['', Validators.required],
      // Condition
      conditionName: [''],
      diagnosedAt: ['', Validators.required],
      conditionStatus: ['', Validators.required],
      // Immunization
      vaccine: [''],
      administeredAt: ['', Validators.required],
      boosterDue: [''],
      // Implant
      implantName: [''],
      implantedAt: ['', Validators.required],
      // Note
      noteContent: [''],
      // Shared
      notes: [''],
    });

    this.form.get('recordType')!.valueChanges.subscribe((type: MedicalRecordType) => {
      this.clearTypeFields();
      this.applyValidators(type);
    });
  }

  applyValidators(type: MedicalRecordType): void {
    const allTypeFields = [
      'substance',
      'severity',
      'reaction',
      'conditionName',
      'diagnosedAt',
      'conditionStatus',
      'vaccine',
      'administeredAt',
      'boosterDue',
      'implantName',
      'implantedAt',
      'noteContent',
    ];

    // Resetează toți validatorii
    allTypeFields.forEach((f) => {
      this.form.get(f)!.clearValidators();
      this.form.get(f)!.updateValueAndValidity({ emitEvent: false });
    });

    // Aplică validatorii pentru tipul selectat
    if (type === 'Allergy') {
      this.form.get('substance')!.setValidators(Validators.required);
      this.form.get('severity')!.setValidators(Validators.required);
      this.form.get('reaction')!.setValidators(Validators.required);
    } else if (type === 'Condition') {
      this.form.get('conditionName')!.setValidators(Validators.required);
      this.form.get('diagnosedAt')!.setValidators(Validators.required);
      this.form.get('conditionStatus')!.setValidators(Validators.required);
    } else if (type === 'Immunization') {
      this.form.get('vaccine')!.setValidators(Validators.required);
      this.form.get('administeredAt')!.setValidators(Validators.required);
    } else if (type === 'Implant') {
      this.form.get('implantName')!.setValidators(Validators.required);
      this.form.get('implantedAt')!.setValidators(Validators.required);
    } else if (type === 'Note') {
      this.form.get('noteContent')!.setValidators(Validators.required);
    }

    allTypeFields.forEach((f) => {
      this.form.get(f)!.updateValueAndValidity({ emitEvent: false });
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
          const term = (value ?? '').toString().trim();
          if (term.length < 2) {
            this.searchPerformed = false;
            return of([]);
          }
          this.isSearching = true;
          this.searchPerformed = true;
          return this.usersService.searchPatients(term);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (patients) => {
          this.filteredPatients = patients;
          this.isSearching = false;
        },
        error: () => {
          this.isSearching = false;
        },
      });
  }

  onPatientSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedPatient = event.option.value as PatientDto;
    this.form.get('patientSearch')!.setValue(this.selectedPatient, { emitEvent: false });
  }

  clearPatient(): void {
    this.selectedPatient = null;
    this.form.get('patientSearch')!.setValue('');
    this.filteredPatients = [];
    this.searchPerformed = false;
  }

  displayPatient(patient: PatientDto | string): string {
    if (!patient) return '';
    if (typeof patient === 'string') return patient;
    return `${patient.firstName} ${patient.lastName}`;
  }

  clearTypeFields(): void {
    const fields = [
      'substance',
      'severity',
      'reaction',
      'conditionName',
      'diagnosedAt',
      'conditionStatus',
      'vaccine',
      'administeredAt',
      'boosterDue',
      'implantName',
      'implantedAt',
      'noteContent',
      'notes',
    ];
    fields.forEach((f) => {
      this.form.get(f)!.setValue('', { emitEvent: false });
      this.form.get(f)!.markAsUntouched();
      this.form.get(f)!.markAsPristine();
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.selectedPatient || !this.form.get('recordType')?.value) return;

    if (!this.isFormReady) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const v = this.form.value;
    const type: MedicalRecordType = v.recordType;
    const record: any = { type };

    if (type === 'Allergy') {
      record.substance = v.substance;
      record.severity = v.severity;
      record.reaction = v.reaction;
    } else if (type === 'Condition') {
      record.conditionName = v.conditionName;
      record.diagnosedAt = v.diagnosedAt;
      record.status = v.conditionStatus;
    } else if (type === 'Immunization') {
      record.vaccine = v.vaccine;
      record.administeredAt = v.administeredAt;
      record.boosterDue = v.boosterDue;
    } else if (type === 'Implant') {
      record.implantName = v.implantName;
      record.implantedAt = v.implantedAt;
    } else if (type === 'Note') {
      record.noteContent = v.noteContent;
    }

    if (v.notes) record.notes = v.notes;

    try {
      await this.cryptoService.submit({
        patientId: this.selectedPatient!.id,
        record,
      });
      this.notify.showSuccess('Medical record saved successfully.');
      this.router.navigate(['/patient-access']);
    } catch (err) {
      if (err instanceof AppError) {
        this.notify.showError(err.message);
      } else {
        this.notify.showError('Failed to save medical record.');
      }
    } finally {
      this.isLoading = false;
    }
  }
}
