import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticDecryptionService } from '../../../diagnostics/services/diagnostic-decryption.service';
import { PrescriptionDecryptionService } from '../../../prescriptions/services/prescription-decryption.service';
import { LabAnalysisService } from '../../../lab-analyses/services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Diagnosis, Prescription, LabAnalysis } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-doctor-patient-profile',
  templateUrl: './doctor-patient-profile.html',
  styleUrls: ['./doctor-patient-profile.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe],
})
export class DoctorPatientProfile implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blockchainService = inject(BlockchainService);
  private diagnosticDecryptionService = inject(DiagnosticDecryptionService);
  private prescriptionDecryptionService = inject(PrescriptionDecryptionService);
  private labAnalysisService = inject(LabAnalysisService);
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

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress') ?? '';

    this.loadDiagnoses();
    this.loadPrescriptions();
    this.loadLabAnalyses();
  }

  /**
   * Fetches all on-chain diagnoses for the patient using their wallet address.
   * Sorted most-recent first.
   */
  async loadDiagnoses(): Promise<void> {
    if (!this.patientWalletAddress) return;
    this.isLoadingDiagnoses = true;
    try {
      const all = await this.blockchainService.getPatientDiagnoses(this.patientWalletAddress);
      this.diagnoses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load diagnoses.');
    } finally {
      this.isLoadingDiagnoses = false;
    }
  }

  /**
   * Fetches all on-chain prescriptions for the patient using their wallet address.
   * Sorted most-recent first.
   */
  async loadPrescriptions(): Promise<void> {
    if (!this.patientWalletAddress) return;
    this.isLoadingPrescriptions = true;
    try {
      const ids = await this.blockchainService.getPatientPrescriptionIds(this.patientWalletAddress);
      const all = await Promise.all(ids.map((id) => this.blockchainService.getPrescription(id)));
      this.prescriptions = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load prescriptions.');
    } finally {
      this.isLoadingPrescriptions = false;
    }
  }

  /**
   * Fetches all on-chain lab analyses for the patient using their wallet address.
   * Sorted most-recent first.
   */
  async loadLabAnalyses(): Promise<void> {
    if (!this.patientWalletAddress) return;
    this.isLoadingLabAnalyses = true;
    try {
      const all = await this.blockchainService.getPatientLabAnalyses(this.patientWalletAddress);
      this.labAnalyses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load lab analyses.');
    } finally {
      this.isLoadingLabAnalyses = false;
    }
  }

  /**
   * Decrypts and opens a diagnosis PDF using Lit Protocol.
   */
  async onOpenDiagnosis(diagnosis: Diagnosis): Promise<void> {
    this.openingDiagnosisId = diagnosis.id;
    try {
      await this.diagnosticDecryptionService.decryptAndOpen(diagnosis);
    } catch {
      this.notify.showError('Failed to decrypt diagnosis.');
    } finally {
      this.openingDiagnosisId = null;
    }
  }

  /**
   * Decrypts and opens a prescription PDF using Lit Protocol.
   */
  async onOpenPrescription(prescription: Prescription): Promise<void> {
    this.openingPrescriptionId = prescription.id;
    try {
      await this.prescriptionDecryptionService.decryptAndOpenForPatient(prescription);
    } catch {
      this.notify.showError('Failed to decrypt prescription.');
    } finally {
      this.openingPrescriptionId = null;
    }
  }

  /**
   * Decrypts and opens a lab analysis PDF using Lit Protocol.
   */
  async onOpenLabAnalysis(analysis: LabAnalysis): Promise<void> {
    this.openingLabAnalysisId = analysis.id;
    try {
      await this.labAnalysisService.decryptAndOpen(analysis);
    } catch {
      this.notify.showError('Failed to decrypt lab analysis.');
    } finally {
      this.openingLabAnalysisId = null;
    }
  }

  /**
   * Navigates to the full diagnostics list page for this patient.
   */
  goToDiagnostics(): void {
    this.router.navigate(['/patient', this.patientId, 'diagnostics'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  /**
   * Navigates to the full medications page for this patient.
   */
  goToMedications(): void {
    this.router.navigate(['/patient', this.patientId, 'medications'], {
      queryParams: { patientName: this.patientName },
    });
  }

  /**
   * Navigates to the full lab analyses list page for this patient.
   */
  goToLabAnalyses(): void {
    this.router.navigate(['/patient', this.patientId, 'lab-analyses'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  /**
   * Navigates to the full prescriptions list page for this patient.
   */
  goToPrescriptions(): void {
    this.router.navigate(['/patient', this.patientId, 'prescriptions'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }

  /**
   * Navigates back to the Patient Access page.
   */
  goBack(): void {
    this.router.navigate(['/patient-access']);
  }

  /**
   * Converts a blockchain bigint timestamp (seconds) to a JavaScript Date.
   */
  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  /**
   * Smoothly scrolls a carousel by one card width (280px + 16px gap) using ease-out animation.
   * Duration: 300ms.
   */
  scrollCarousel(elementId: string, direction: 'left' | 'right'): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    const distance = 296;
    const target = direction === 'left' ? -distance : distance;
    const duration = 300;
    const start = el.scrollLeft;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + target * easeOutCubic(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}
