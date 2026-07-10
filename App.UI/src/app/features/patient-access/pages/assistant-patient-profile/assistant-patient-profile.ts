import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { CarouselSection } from '../../../../shared/components/carousel-section/carousel-section';
import {
  ProfileCard,
  ProfileDetailRow,
} from '../../../../shared/components/profile-card/profile-card';
import { ViewAllCard } from '../../../../shared/components/view-all-card/view-all-card';
import { MedicalCard } from '../../../../shared/components/medical-card/medical-card';
import { QuickActionCard } from '../../../../shared/components/quick-action-card/quick-action-card';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticDecryptionService } from '../../../diagnostics/services/diagnostic-decryption.service';
import { PrescriptionDecryptionService } from '../../../prescriptions/services/prescription-decryption.service';
import { LabAnalysisService } from '../../../lab-analyses/services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Diagnosis, Prescription, LabAnalysis } from '../../../../core/models/blockchain.model';
import { DiagnosticDraftService } from '../../../diagnostics/services/diagnostic-draft.service';
import { DiagnosticDraftDto } from '../../../diagnostics/models/diagnostic-draft.model';

@Component({
  selector: 'app-assistant-patient-profile',
  templateUrl: './assistant-patient-profile.html',
  styleUrls: ['./assistant-patient-profile.scss'],
  standalone: true,
  imports: [
    ...MAT_COMMON_IMPORTS,
    DatePipe,
    CarouselSection,
    ProfileCard,
    ViewAllCard,
    MedicalCard,
    QuickActionCard,
  ],
})
export class AssistantPatientProfile implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blockchain = inject(BlockchainService);
  private diagService = inject(DiagnosticDecryptionService);
  private rxService = inject(PrescriptionDecryptionService);
  private labService = inject(LabAnalysisService);
  private draftService = inject(DiagnosticDraftService);
  private notify = inject(NotificationService);

  patientId = '';
  patientName = '';
  patientWalletAddress = '';

  diagnoses: Diagnosis[] = [];
  isLoadingDiagnoses = false;
  openingDiagnosisId: bigint | null = null;

  prescriptions: Prescription[] = [];
  isLoadingPrescriptions = false;
  openingPrescriptionId: bigint | null = null;

  labAnalyses: LabAnalysis[] = [];
  isLoadingLabAnalyses = false;
  openingLabAnalysisId: bigint | null = null;

  activeDraft: DiagnosticDraftDto | null = null;
  isLoadingDraft = false;

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress') ?? '';

    this.loadDiagnoses();
    this.loadPrescriptions();
    this.loadLabAnalyses();
    this.loadActiveDraft();
  }

  get profileDetails(): ProfileDetailRow[] {
    return [
      {
        icon: 'account_balance_wallet',
        label: 'Wallet address',
        value: this.patientWalletAddress || '—',
      },
    ];
  }

  async loadDiagnoses(): Promise<void> {
    if (!this.patientWalletAddress) return;
    this.isLoadingDiagnoses = true;
    try {
      const all = await this.blockchain.getPatientDiagnoses(this.patientWalletAddress);
      this.diagnoses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load diagnoses.');
    } finally {
      this.isLoadingDiagnoses = false;
    }
  }

  async loadPrescriptions(): Promise<void> {
    if (!this.patientWalletAddress) return;
    this.isLoadingPrescriptions = true;
    try {
      const ids = await this.blockchain.getPatientPrescriptionIds(this.patientWalletAddress);
      const all = await Promise.all(ids.map((id) => this.blockchain.getPrescription(id)));
      this.prescriptions = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load prescriptions.');
    } finally {
      this.isLoadingPrescriptions = false;
    }
  }

  async loadLabAnalyses(): Promise<void> {
    if (!this.patientWalletAddress) return;
    this.isLoadingLabAnalyses = true;
    try {
      const all = await this.blockchain.getPatientLabAnalyses(this.patientWalletAddress);
      this.labAnalyses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load lab analyses.');
    } finally {
      this.isLoadingLabAnalyses = false;
    }
  }

  async loadActiveDraft(): Promise<void> {
    if (!this.patientId) return;
    this.isLoadingDraft = true;
    try {
      this.activeDraft = await this.draftService.getActiveByPatient(this.patientId);
    } catch {
      this.activeDraft = null;
    } finally {
      this.isLoadingDraft = false;
    }
  }

  async onOpenDiagnosis(diagnosis: Diagnosis): Promise<void> {
    this.openingDiagnosisId = diagnosis.id;
    try {
      await this.diagService.decryptAndOpen(diagnosis, this.patientId);
    } catch {
      this.notify.showError('Failed to decrypt diagnosis.');
    } finally {
      this.openingDiagnosisId = null;
    }
  }

  async onOpenPrescription(prescription: Prescription): Promise<void> {
    this.openingPrescriptionId = prescription.id;
    try {
      await this.rxService.decryptAndOpenForPatient(prescription, this.patientId);
    } catch {
      this.notify.showError('Failed to decrypt prescription.');
    } finally {
      this.openingPrescriptionId = null;
    }
  }

  async onOpenLabAnalysis(analysis: LabAnalysis): Promise<void> {
    this.openingLabAnalysisId = analysis.id;
    try {
      await this.labService.decryptAndOpen(analysis, this.patientId);
    } catch {
      this.notify.showError('Failed to decrypt lab analysis.');
    } finally {
      this.openingLabAnalysisId = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/patient-access']);
  }

  goToDiagnostics(): void {
    this.router.navigate(['/patient', this.patientId, 'diagnostics'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  goToPrescriptions(): void {
    this.router.navigate(['/patient', this.patientId, 'prescriptions'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  goToLabAnalyses(): void {
    this.router.navigate(['/patient', this.patientId, 'lab-analyses'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  goToMedicalData(): void {
    this.router.navigate(['/patient', this.patientId, 'medical-data'], {
      queryParams: { patientName: this.patientName },
    });
  }

  goToDraft(): void {
    this.router.navigate(['/patient', this.patientId, 'create-diagnostic-draft'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }
}
