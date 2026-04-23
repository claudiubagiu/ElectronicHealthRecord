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
import { DiagnosticDraftService } from '../../services/diagnostic-draft.service';
import { DiagnosticDraftDto, DiagnosticDraftPayload } from '../../models/diagnostic-draft.model';

export interface IcdSuggestion {
  code: string;
  description: string;
}

@Component({
  selector: 'app-finalize-diagnostic-draft',
  templateUrl: './finalize-diagnostic-draft.html',
  styleUrls: ['./finalize-diagnostic-draft.scss'],
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
export class FinalizeDiagnosticDraft implements OnInit, OnDestroy {
  private submissionService = inject(DiagnosticSubmissionService);
  private draftService = inject(DiagnosticDraftService);
  private authService = inject(AuthService);
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
  isInitialLoading = true;

  // Existing draft (required here — the page makes no sense without one)
  existingDraft: DiagnosticDraftDto | null = null;
  draftNotFound = false;

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

    // Load everything in the right order: we need past diagnoses + lab analyses
    // already loaded before we can hydrate the selected values from the draft.
    this.bootstrap();

    this.setupIcdSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async bootstrap(): Promise<void> {
    try {
      // Load reference data in parallel so hydration has everything it needs
      await Promise.all([this.loadPatientLabAnalyses(), this.loadPastDiagnoses()]);
      await this.loadExistingDraftAndPrefill();
    } finally {
      this.isInitialLoading = false;
    }
  }

  // ── Form setup ────────────────────────────────────────────────────────────

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

  // ── Load existing draft (required) ────────────────────────────────────────

  async loadExistingDraftAndPrefill(): Promise<void> {
    if (!this.selectedPatient) return;

    try {
      const draft = await this.draftService.getActiveByPatient(this.selectedPatient.id);
      if (!draft) {
        this.draftNotFound = true;
        return;
      }

      this.existingDraft = draft;
      const payload = await this.draftService.decrypt(draft);
      this.prefillFormFromPayload(payload);

      // Linked medical records come from the draft-level JSON column
      try {
        const ids = JSON.parse(draft.linkedMedicalRecordIds || '[]');
        if (Array.isArray(ids)) this.linkedMedicalRecordIds = ids;
      } catch {
        this.linkedMedicalRecordIds = [];
      }
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Failed to load the draft for this patient.';
      this.notify.showError(message);
      this.draftNotFound = true;
    }
  }

  private prefillFormFromPayload(payload: DiagnosticDraftPayload): void {
    this.form.patchValue({
      title: payload.title ?? '',
      consultationDate: payload.consultationDate ?? this.form.get('consultationDate')?.value,
      chiefComplaint: payload.chiefComplaint ?? '',
      familyHistory: payload.familyHistory ?? '',
      bloodPressure: payload.bloodPressure ?? '',
      pulse: payload.pulse ?? '',
      temperature: payload.temperature ?? '',
      weightHeight: payload.weightHeight ?? '',
      clinicalNotes: payload.clinicalNotes ?? '',
    });

    // The assistant stores the lab-analysis link as a synthetic entry in
    // customGeneralInfo. We strip it here so the doctor's UI can re-derive it
    // from `selectedAnalysis` (preventing duplicates when the final PDF is built).
    const customGeneralInfoWithoutLabLink = (payload.customGeneralInfo ?? []).filter(
      (f) => f.label !== 'Based on Lab Analysis'
    );
    this.customGeneralInfo = customGeneralInfoWithoutLabLink;
    this.customAnamnesis = payload.customAnamnesis ?? [];
    this.customClinicalExam = payload.customClinicalExam ?? [];

    if (payload.linkedLabAnalysis) {
      const match = this.labAnalyses.find((a) => String(a.id) === payload.linkedLabAnalysis!.id);
      if (match) this.selectedAnalysis = match;
    }

    if (payload.linkedPastDiagnosisIds?.length) {
      const ids = new Set(payload.linkedPastDiagnosisIds);
      this.selectedPastDiagnoses = this.pastDiagnoses.filter((d) => ids.has(String(d.id)));
    }
  }

  // ── Past diagnoses ────────────────────────────────────────────────────────

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

  // ── ICD-10 ────────────────────────────────────────────────────────────────

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

  // ── Medical records ───────────────────────────────────────────────────────

  onMedicalRecordSelectionChanged(ids: string[]): void {
    this.linkedMedicalRecordIds = ids;
  }

  // ── Lab analyses ──────────────────────────────────────────────────────────

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

  // ── Custom fields ─────────────────────────────────────────────────────────

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

  // ── Validation ────────────────────────────────────────────────────────────

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

  // ── Submit ────────────────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (!this.isFormReady) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.selectedPatient || !this.existingDraft) return;

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

      // 1. Publish the full diagnosis on-chain
      await this.submissionService.submit({
        pdfData: {
          title: v.title,
          consultationDate: v.consultationDate,
          patient: `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`,
          patientCNP: this.selectedPatient.cnp,
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
        patientWalletAddress: this.selectedPatient.walletAddress,
        doctorName,
        linkedMedicalRecordIds: this.linkedMedicalRecordIds,
        patientId: this.selectedPatient.id,
      });

      // 2. After on-chain success, delete the draft.
      //    If this fails we don't roll back the diagnosis — it's published.
      //    We just surface a non-blocking warning.
      try {
        await this.draftService.deleteDraft(this.existingDraft.id);
      } catch (cleanupErr) {
        console.error('Failed to delete finalized draft:', cleanupErr);
        this.notify.showError(
          'Diagnosis published, but the draft could not be deleted automatically.'
        );
      }

      this.notify.showSuccess('Diagnosis finalized and published successfully!');
      this.router.navigate(['/patient', this.selectedPatient.id, 'profile'], {
        queryParams: {
          patientName: `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`,
          patientWalletAddress: this.selectedPatient.walletAddress,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Failed to finalize diagnosis. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }

  async onDiscardDraft(): Promise<void> {
    if (!this.existingDraft || !this.selectedPatient) return;

    const confirmed = window.confirm(
      'Discard this draft? All data prepared by the assistant will be lost and cannot be recovered.'
    );
    if (!confirmed) return;

    this.isLoading = true;
    try {
      await this.draftService.deleteDraft(this.existingDraft.id);
      this.notify.showSuccess('Draft discarded.');
      this.router.navigate(['/patient', this.selectedPatient.id, 'profile'], {
        queryParams: {
          patientName: `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`,
          patientWalletAddress: this.selectedPatient.walletAddress,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof AppError ? error.message : 'Failed to discard draft.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    if (!this.selectedPatient) {
      this.router.navigate(['/patient-access']);
      return;
    }
    this.router.navigate(['/patient', this.selectedPatient.id, 'profile'], {
      queryParams: {
        patientName: `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`,
        patientWalletAddress: this.selectedPatient.walletAddress,
      },
    });
  }
}
