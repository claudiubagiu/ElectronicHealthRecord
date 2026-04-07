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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { DiagnosticSubmissionService } from '../../services/diagnostic-submission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CustomField } from '../../services/diagnostic-pdf.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { UsersService } from '../../../../core/services/users.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { LabAnalysis } from '../../../../core/models/blockchain.model';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

export type { CustomField };

@Component({
  selector: 'app-add-diagnostic',
  templateUrl: './add-diagnostic.html',
  styleUrls: ['./add-diagnostic.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatAutocompleteModule, MatExpansionModule, MatSelectModule],
})
export class AddDiagnostic implements OnInit, OnDestroy {
  private usersService = inject(UsersService);
  private submissionService = inject(DiagnosticSubmissionService);
  private authService = inject(AuthService);
  private blockchainService = inject(BlockchainService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  filteredPatients: PatientDto[] = [];
  selectedPatient: PatientDto | null = null;
  isLoading = false;
  isSearching = false;
  searchPerformed = false;

  // Lab analyses
  labAnalyses: LabAnalysis[] = [];
  isLoadingAnalyses = false;
  labAnalysesLoaded = false;
  labAccessDenied = false;
  selectedAnalysis: LabAnalysis | null = null;

  customGeneralInfo: CustomField[] = [];
  customAnamnesis: CustomField[] = [];
  customClinicalExam: CustomField[] = [];
  customDiagnosis: CustomField[] = [];

  ngOnInit(): void {
    this.buildForm();
    this.setupPatientSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
      patientSearch: ['', [Validators.required, this.patientSelectedValidator.bind(this)]],
      title: ['', Validators.required],
      consultationDate: [today, Validators.required],
      chiefComplaint: ['', Validators.required],
      personalHistory: ['', Validators.required],
      familyHistory: [''],
      allergies: [''],
      bloodPressure: ['', Validators.required],
      pulse: ['', Validators.required],
      temperature: [''],
      weightHeight: [''],
      clinicalNotes: [''],
      primaryDiagnosis: ['', Validators.required],
      icdCode: [''],
      secondaryDiagnosis: [''],
      recommendedInvestigations: [''],
      treatment: ['', Validators.required],
      generalRecommendations: [''],
      followUpDate: [''],
      finalNotes: [''],
      newLabel_generalInfo: [''],
      newValue_generalInfo: [''],
      newLabel_anamnesis: [''],
      newValue_anamnesis: [''],
      newLabel_clinicalExam: [''],
      newValue_clinicalExam: [''],
      newLabel_diagnosis: [''],
      newValue_diagnosis: [''],
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
          if (typeof value === 'string') {
            this.selectedPatient = null;
            this.labAnalyses = [];
            this.labAnalysesLoaded = false;
            this.labAccessDenied = false;
            this.selectedAnalysis = null;
          }
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
    this.loadPatientLabAnalyses();
  }

  clearPatient(event: Event): void {
    event.stopPropagation();
    this.selectedPatient = null;
    this.form.get('patientSearch')!.setValue('');
    this.filteredPatients = [];
    this.searchPerformed = false;
    this.labAnalyses = [];
    this.labAnalysesLoaded = false;
    this.labAccessDenied = false;
    this.selectedAnalysis = null;
  }

  async loadPatientLabAnalyses(): Promise<void> {
    if (!this.selectedPatient) return;
    this.isLoadingAnalyses = true;
    this.labAnalysesLoaded = false;
    this.labAccessDenied = false;
    this.selectedAnalysis = null;
    try {
      this.labAnalyses = await this.blockchainService.getPatientLabAnalyses(
        this.selectedPatient.walletAddress
      );
    } catch (error: any) {
      this.labAnalyses = [];
      const msg: string = (
        error?.data?.message ??
        error?.error?.data?.message ??
        error?.message ??
        error?.reason ??
        ''
      ).toLowerCase();
      this.labAccessDenied = msg.includes('not authorized');
    } finally {
      this.isLoadingAnalyses = false;
      this.labAnalysesLoaded = true;
    }
  }

  selectAnalysis(analysis: LabAnalysis): void {
    this.selectedAnalysis = analysis;
  }

  clearAnalysis(): void {
    this.selectedAnalysis = null;
  }

  formatTimestamp(timestamp: bigint): string {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // ── Custom fields ─────────────────────────────────────────────────

  addCustomField(category: 'generalInfo' | 'anamnesis' | 'clinicalExam' | 'diagnosis'): void {
    const labelKey = `newLabel_${category}` as const;
    const valueKey = `newValue_${category}` as const;

    const label = (this.form.get(labelKey)?.value ?? '').trim();
    const value = (this.form.get(valueKey)?.value ?? '').trim();

    if (!label || !value) return;

    const field: CustomField = { label, value };

    switch (category) {
      case 'generalInfo':
        this.customGeneralInfo = [...this.customGeneralInfo, field];
        break;
      case 'anamnesis':
        this.customAnamnesis = [...this.customAnamnesis, field];
        break;
      case 'clinicalExam':
        this.customClinicalExam = [...this.customClinicalExam, field];
        break;
      case 'diagnosis':
        this.customDiagnosis = [...this.customDiagnosis, field];
        break;
    }

    this.form.get(labelKey)?.setValue('');
    this.form.get(valueKey)?.setValue('');
  }

  removeCustomField(
    category: 'generalInfo' | 'anamnesis' | 'clinicalExam' | 'diagnosis',
    index: number
  ): void {
    switch (category) {
      case 'generalInfo':
        this.customGeneralInfo = this.customGeneralInfo.filter((_, i) => i !== index);
        break;
      case 'anamnesis':
        this.customAnamnesis = this.customAnamnesis.filter((_, i) => i !== index);
        break;
      case 'clinicalExam':
        this.customClinicalExam = this.customClinicalExam.filter((_, i) => i !== index);
        break;
      case 'diagnosis':
        this.customDiagnosis = this.customDiagnosis.filter((_, i) => i !== index);
        break;
    }
  }

  // ── Validation ────────────────────────────────────────────────────

  get isCategoryGeneralInfoValid(): boolean {
    return !!this.form.get('title')?.valid && !!this.form.get('consultationDate')?.valid;
  }

  get isCategoryAnamnesisValid(): boolean {
    return !!this.form.get('chiefComplaint')?.valid && !!this.form.get('personalHistory')?.valid;
  }

  get isCategoryClinicalExamValid(): boolean {
    return !!this.form.get('bloodPressure')?.valid && !!this.form.get('pulse')?.valid;
  }

  get isCategoryDiagnosisValid(): boolean {
    return !!this.form.get('primaryDiagnosis')?.valid && !!this.form.get('treatment')?.valid;
  }

  get isFormReady(): boolean {
    return (
      !!this.selectedPatient &&
      this.isCategoryGeneralInfoValid &&
      this.isCategoryAnamnesisValid &&
      this.isCategoryClinicalExamValid &&
      this.isCategoryDiagnosisValid
    );
  }

  // ── Submit ────────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (!this.isFormReady) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const user = this.authService.getDecodedToken();
      const doctorName = user ? `${user.firstName} ${user.lastName}` : 'Doctor';
      const v = this.form.value;

      const extraGeneralInfo: CustomField[] = this.selectedAnalysis
        ? [
            ...this.customGeneralInfo,
            {
              label: 'Based on Lab Analysis',
              value: `${this.selectedAnalysis.title} (${this.formatTimestamp(
                this.selectedAnalysis.timestamp
              )})`,
            },
          ]
        : this.customGeneralInfo;

      await this.submissionService.submit({
        pdfData: {
          title: v.title,
          consultationDate: v.consultationDate,
          patient: `${this.selectedPatient!.firstName} ${this.selectedPatient!.lastName}`,
          patientCNP: this.selectedPatient!.cnp,
          doctor: doctorName,
          chiefComplaint: v.chiefComplaint,
          personalHistory: v.personalHistory,
          familyHistory: v.familyHistory || undefined,
          allergies: v.allergies || undefined,
          bloodPressure: v.bloodPressure,
          pulse: v.pulse,
          temperature: v.temperature || undefined,
          weightHeight: v.weightHeight || undefined,
          clinicalNotes: v.clinicalNotes || undefined,
          primaryDiagnosis: v.primaryDiagnosis,
          icdCode: v.icdCode || undefined,
          secondaryDiagnosis: v.secondaryDiagnosis || undefined,
          recommendedInvestigations: v.recommendedInvestigations || undefined,
          treatment: v.treatment,
          generalRecommendations: v.generalRecommendations || undefined,
          followUpDate: v.followUpDate || undefined,
          finalNotes: v.finalNotes || undefined,
          customGeneralInfo: extraGeneralInfo,
          customAnamnesis: this.customAnamnesis,
          customClinicalExam: this.customClinicalExam,
          customDiagnosis: this.customDiagnosis,
        },
        patientWalletAddress: this.selectedPatient!.walletAddress,
        doctorName,
      });

      this.notify.showSuccess('Diagnosis added successfully!');
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message =
        error instanceof AppError ? error.message : 'Failed to add diagnosis. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}
