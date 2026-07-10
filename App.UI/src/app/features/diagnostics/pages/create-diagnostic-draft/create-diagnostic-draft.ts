import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
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

@Component({
  selector: 'app-create-diagnostic-draft',
  templateUrl: './create-diagnostic-draft.html',
  styleUrls: ['./create-diagnostic-draft.scss'],
  standalone: true,
  imports: [
    ...MAT_FORM_IMPORTS,
    MatExpansionModule,
    MatSelectModule,
    MatDialogModule,
    MedicalRecordsPanelComponent,
  ],
})
export class CreateDiagnosticDraft implements OnInit, OnDestroy {
  private draftService = inject(DiagnosticDraftService);
  private authService = inject(AuthService);
  private blockchainService = inject(BlockchainService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  selectedPatient: PatientDto | null = null;
  isLoading = false;
  isInitialLoading = true;

  // Existing draft
  existingDraft: DiagnosticDraftDto | null = null;

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

  // Medical records
  linkedMedicalRecordIds: string[] = [];

  // Custom fields
  customGeneralInfo: CustomField[] = [];
  customAnamnesis: CustomField[] = [];
  customClinicalExam: CustomField[] = [];

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

    this.loadPatientLabAnalyses();
    this.loadPastDiagnoses();
    this.loadExistingDraftAndPrefill();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      newLabel_generalInfo: [''],
      newValue_generalInfo: [''],
      newLabel_anamnesis: [''],
      newValue_anamnesis: [''],
      newLabel_clinicalExam: [''],
      newValue_clinicalExam: [''],
    });
  }

  async loadExistingDraftAndPrefill(): Promise<void> {
    if (!this.selectedPatient) {
      this.isInitialLoading = false;
      return;
    }

    try {
      const draft = await this.draftService.getActiveByPatient(this.selectedPatient.id);
      if (!draft) {
        this.existingDraft = null;
        return;
      }

      this.existingDraft = draft;
      const payload = await this.draftService.decrypt(draft);
      this.prefillFormFromPayload(payload);

      try {
        const ids = JSON.parse(draft.linkedMedicalRecordIds || '[]');
        if (Array.isArray(ids)) this.linkedMedicalRecordIds = ids;
      } catch {
        this.linkedMedicalRecordIds = [];
      }
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Failed to load existing draft for this patient.';
      this.notify.showError(message);
    } finally {
      this.isInitialLoading = false;
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
    this.customGeneralInfo = payload.customGeneralInfo ?? [];
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

  addCustomField(category: 'generalInfo' | 'anamnesis' | 'clinicalExam'): void {
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
    }
    this.form.get(labelKey)?.setValue('');
    this.form.get(valueKey)?.setValue('');
  }

  removeCustomField(category: 'generalInfo' | 'anamnesis' | 'clinicalExam', index: number): void {
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
    }
  }

  get isCategoryGeneralInfoValid(): boolean {
    return !!this.form.get('title')?.valid && !!this.form.get('consultationDate')?.valid;
  }

  get isCategoryAnamnesisValid(): boolean {
    return !!this.form.get('chiefComplaint')?.valid;
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
      !!this.selectedPatient && this.isCategoryGeneralInfoValid && this.isCategoryAnamnesisValid
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormReady) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.selectedPatient) return;

    this.isLoading = true;

    try {
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

      const payload: DiagnosticDraftPayload = {
        title: v.title,
        consultationDate: v.consultationDate,
        patient: `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`,
        patientCNP: this.selectedPatient.cnp,
        chiefComplaint: v.chiefComplaint,
        personalHistory: this.personalHistorySummary || undefined,
        familyHistory: v.familyHistory || undefined,
        bloodPressure: v.bloodPressure || undefined,
        pulse: v.pulse || undefined,
        temperature: v.temperature || undefined,
        weightHeight: v.weightHeight || undefined,
        clinicalNotes: v.clinicalNotes || undefined,
        customGeneralInfo: extraGeneralInfo,
        customAnamnesis: this.customAnamnesis,
        customClinicalExam: this.customClinicalExam,
        linkedLabAnalysis: this.selectedAnalysis
          ? {
              id: String(this.selectedAnalysis.id),
              title: this.selectedAnalysis.title,
              dateLabel: this.formatTimestamp(this.selectedAnalysis.timestamp),
            }
          : undefined,
        linkedPastDiagnosisIds: this.selectedPastDiagnoses.map((d) => String(d.id)),
      };

      await this.draftService.saveDraft(
        {
          patientId: this.selectedPatient.id,
          patientWalletAddress: this.selectedPatient.walletAddress,
          payload,
          linkedMedicalRecordIds: this.linkedMedicalRecordIds,
        },
        this.existingDraft?.id ?? null
      );

      this.notify.showSuccess(
        this.existingDraft ? 'Draft updated successfully!' : 'Draft saved successfully!'
      );
      this.router.navigate(['/patient', this.selectedPatient.id, 'assistant-profile'], {
        queryParams: {
          patientName: `${this.selectedPatient.firstName} ${this.selectedPatient.lastName}`,
          patientWalletAddress: this.selectedPatient.walletAddress,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof AppError ? error.message : 'Failed to save draft. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }

  async onDiscardDraft(): Promise<void> {
    if (!this.existingDraft) return;

    const confirmed = window.confirm(
      'Discard this draft? All entered data will be lost and cannot be recovered.'
    );
    if (!confirmed) return;

    this.isLoading = true;
    try {
      await this.draftService.deleteDraft(this.existingDraft.id);
      this.notify.showSuccess('Draft discarded.');
      this.router.navigate(['/patient', this.selectedPatient!.id, 'assistant-profile'], {
        queryParams: {
          patientName: `${this.selectedPatient!.firstName} ${this.selectedPatient!.lastName}`,
          patientWalletAddress: this.selectedPatient!.walletAddress,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof AppError ? error.message : 'Failed to discard draft.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}
