import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil, of } from 'rxjs';
import { DiagnosticSubmissionService } from '../../services/diagnostic-submission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { CustomField } from '../../services/diagnostic-pdf.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { LabAnalysis, Diagnosis } from '../../../../core/models/blockchain.model';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicalRecordsPanelComponent } from '../../../../shared/components/medical-records-panel/medical-records-panel';
import {
  PastDiagnosesDialogComponent,
  PastDiagnosesDialogResult,
} from '../../../../shared/components/past-diagnoses-dialog/past-diagnoses-dialog';

export type { CustomField };

export interface IcdSuggestion {
  code: string;
  description: string;
}

@Component({
  selector: 'app-add-diagnostic',
  templateUrl: './add-diagnostic.html',
  styleUrls: ['./add-diagnostic.scss'],
  standalone: true,
  imports: [
    ...MAT_FORM_IMPORTS,
    MatExpansionModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
    MedicalRecordsPanelComponent,
  ],
})
export class AddDiagnostic implements OnInit, OnDestroy {
  private submissionService = inject(DiagnosticSubmissionService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private blockchainService = inject(BlockchainService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  selectedPatient: PatientDto | null = null;
  isLoading = false;

  // Lab analyses
  labAnalyses: LabAnalysis[] = [];
  isLoadingAnalyses = false;
  labAnalysesLoaded = false;
  labAccessDenied = false;
  selectedAnalysis: LabAnalysis | null = null;

  // Past diagnoses
  pastDiagnoses: Diagnosis[] = [];
  isLoadingPastDiagnoses = false;
  selectedPastDiagnoses: Diagnosis[] = [];

  // ICD-10
  icdSuggestions: IcdSuggestion[] = [];
  isSearchingIcd = false;
  selectedIcdCode = '';
  selectedIcdDescription = '';

  // Medical records
  linkedMedicalRecordIds: string[] = [];

  // Custom fields
  customGeneralInfo: CustomField[] = [];
  customAnamnesis: CustomField[] = [];
  customClinicalExam: CustomField[] = [];
  customDiagnosis: CustomField[] = [];

  async ngOnInit(): Promise<void> {
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

    this.loadPatientCnp(patientId);
    this.loadPatientLabAnalyses();
    this.loadPastDiagnoses();
    this.setupIcdSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadPatientCnp(patientId: string): Promise<void> {
    if (!patientId) return;
    try {
      const fullPatient = await this.usersService.getPatientById(patientId);
      if (this.selectedPatient) {
        this.selectedPatient = { ...this.selectedPatient, cnp: fullPatient.cnp };
      }
    } catch {
    }
  }

  buildForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
      title: ['', Validators.required],
      consultationDate: [today, Validators.required],
      chiefComplaint: ['', Validators.required],
      familyHistory: [''],
      bloodPressure: [''],
      pulse: [''],
      temperature: [''],
      weightHeight: [''],
      clinicalNotes: [''],
      primaryDiagnosis: ['', Validators.required],
      icdSearch: [''],
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

  async loadPastDiagnoses(): Promise<void> {
    if (!this.selectedPatient?.walletAddress) return;
    this.isLoadingPastDiagnoses = true;
    try {
      const all = await this.blockchainService.getPatientDiagnoses(
        this.selectedPatient.walletAddress
      );
      this.pastDiagnoses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.pastDiagnoses = [];
    } finally {
      this.isLoadingPastDiagnoses = false;
    }
  }

  openPastDiagnosesModal(): void {
    const ref = this.dialog.open(PastDiagnosesDialogComponent, {
      data: {
        diagnoses: this.pastDiagnoses,
        alreadySelected: this.selectedPastDiagnoses,
      },
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });

    ref.afterClosed().subscribe((result: PastDiagnosesDialogResult | undefined) => {
      if (result) {
        this.selectedPastDiagnoses = result.selected;
      }
    });
  }

  removePastDiagnosis(diagnosis: Diagnosis): void {
    this.selectedPastDiagnoses = this.selectedPastDiagnoses.filter((d) => d.id !== diagnosis.id);
  }

  formatTimestampFull(timestamp: bigint): string {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  get personalHistorySummary(): string {
    if (this.selectedPastDiagnoses.length === 0) return '';
    return this.selectedPastDiagnoses
      .map((d) => `${d.title} (${this.formatTimestampFull(d.timestamp)})`)
      .join('; ');
  }

  setupIcdSearch(): void {
    this.form
      .get('icdSearch')!
      .valueChanges.pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((term) => {
          if (this.selectedIcdCode) return of(null);
          const q = (term ?? '').toString().trim();
          if (q.length < 2) {
            this.icdSuggestions = [];
            return of(null);
          }
          this.isSearchingIcd = true;
          return this.http.get<any[]>(
            `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(
              q
            )}&maxList=8`
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          this.isSearchingIcd = false;
          if (!res) {
            this.icdSuggestions = [];
            return;
          }
          const items: string[][] = res[3] ?? [];
          this.icdSuggestions = items.map((item) => ({ code: item[0], description: item[1] }));
        },
        error: () => {
          this.isSearchingIcd = false;
          this.icdSuggestions = [];
        },
      });
  }

  onIcdSelected(suggestion: IcdSuggestion): void {
    this.selectedIcdCode = suggestion.code;
    this.selectedIcdDescription = suggestion.description;
    this.form.get('icdCode')!.setValue(suggestion.code);
    this.form
      .get('icdSearch')!
      .setValue(`${suggestion.code} – ${suggestion.description}`, { emitEvent: false });
    this.icdSuggestions = [];
  }

  clearIcd(): void {
    this.selectedIcdCode = '';
    this.selectedIcdDescription = '';
    this.form.get('icdCode')!.setValue('');
    this.form.get('icdSearch')!.setValue('');
    this.icdSuggestions = [];
  }

  displayIcd(value: string): string {
    return value ?? '';
  }

  onMedicalRecordSelectionChanged(ids: string[]): void {
    this.linkedMedicalRecordIds = ids;
  }

  async loadPatientLabAnalyses(): Promise<void> {
    if (!this.selectedPatient?.walletAddress) return;
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

  get isCategoryGeneralInfoValid(): boolean {
    return !!this.form.get('title')?.valid && !!this.form.get('consultationDate')?.valid;
  }

  get isCategoryAnamnesisValid(): boolean {
    return !!this.form.get('chiefComplaint')?.valid;
  }

  get isCategoryDiagnosisValid(): boolean {
    return !!this.form.get('primaryDiagnosis')?.valid && !!this.form.get('treatment')?.valid;
  }

  get isCategoryMedicalDataValid(): boolean {
    return this.linkedMedicalRecordIds.length > 0;
  }

  get isCategoryClinicalExamValid(): boolean {
    return !!(
      this.form.get('bloodPressure')?.value ||
      this.form.get('pulse')?.value ||
      this.form.get('temperature')?.value ||
      this.form.get('weightHeight')?.value ||
      this.form.get('clinicalNotes')?.value ||
      this.customClinicalExam.length > 0
    );
  }

  get isFormReady(): boolean {
    return (
      !!this.selectedPatient &&
      this.isCategoryGeneralInfoValid &&
      this.isCategoryAnamnesisValid &&
      this.isCategoryDiagnosisValid
    );
  }

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
          personalHistory: this.personalHistorySummary || undefined,
          familyHistory: v.familyHistory || undefined,
          bloodPressure: v.bloodPressure || undefined,
          pulse: v.pulse || undefined,
          temperature: v.temperature || undefined,
          weightHeight: v.weightHeight || undefined,
          clinicalNotes: v.clinicalNotes || undefined,
          primaryDiagnosis: v.primaryDiagnosis,
          icdCode: this.selectedIcdCode || undefined,
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
        linkedMedicalRecordIds: this.linkedMedicalRecordIds,
        patientId: this.selectedPatient!.id,
      });

      this.notify.showSuccess('Diagnosis added successfully!');
      this.router.navigate(['/patient', this.selectedPatient!.id, 'profile'], {
        queryParams: {
          patientName: `${this.selectedPatient!.firstName} ${this.selectedPatient!.lastName}`,
          patientWalletAddress: this.selectedPatient!.walletAddress,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof AppError ? error.message : 'Failed to add diagnosis. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}
