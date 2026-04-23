import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { DiagnosticSubmissionService } from '../../services/diagnostic-submission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CustomField } from '../../services/diagnostic-pdf.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AppError } from '../../../../core/errors/app.error';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { LabAnalysis } from '../../../../core/models/blockchain.model';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicalRecordsPanelComponent } from '../../../../shared/components/medical-records-panel/medical-records-panel';

export type { CustomField };

@Component({
  selector: 'app-add-diagnostic',
  templateUrl: './add-diagnostic.html',
  styleUrls: ['./add-diagnostic.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatExpansionModule, MatSelectModule, MedicalRecordsPanelComponent],
})
export class AddDiagnostic implements OnInit {
  private submissionService = inject(DiagnosticSubmissionService);
  private authService = inject(AuthService);
  private blockchainService = inject(BlockchainService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  form!: FormGroup;
  selectedPatient: PatientDto | null = null;
  isLoading = false;

  labAnalyses: LabAnalysis[] = [];
  isLoadingAnalyses = false;
  labAnalysesLoaded = false;
  labAccessDenied = false;
  selectedAnalysis: LabAnalysis | null = null;

  linkedMedicalRecordIds: string[] = [];

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

    this.loadPatientLabAnalyses();
  }

  buildForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
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

  // ── Submit ────────────────────────────────────────────────────────────────

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
