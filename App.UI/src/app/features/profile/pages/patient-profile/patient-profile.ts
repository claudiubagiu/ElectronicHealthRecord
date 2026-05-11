import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
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
import { UsersService } from '../../../../core/services/users.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AccessManagementService } from '../../../access-management/services/access-management.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { DiagnosticDecryptionService } from '../../../diagnostics/services/diagnostic-decryption.service';
import { PrescriptionDecryptionService } from '../../../prescriptions/services/prescription-decryption.service';
import { LabAnalysisService } from '../../../lab-analyses/services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AccessRequestDto } from '../../../../core/models/access-request.model';
import { Diagnosis, Prescription, LabAnalysis } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.html',
  styleUrls: ['./patient-profile.scss'],
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
export class PatientProfile implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private accessService = inject(AccessManagementService);
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(DiagnosticDecryptionService);
  private prescriptionService = inject(PrescriptionDecryptionService);
  private labAnalysisService = inject(LabAnalysisService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  patient: PatientDto | null = null;
  isLoadingProfile = false;

  approvedDoctors: AccessRequestDto[] = [];
  isLoadingAccess = false;
  revokingId: string | null = null;

  diagnoses: Diagnosis[] = [];
  isLoadingDiagnoses = false;
  downloadingId: bigint | null = null;

  prescriptions: Prescription[] = [];
  isLoadingPrescriptions = false;
  openingPrescriptionId: bigint | null = null;

  labAnalyses: LabAnalysis[] = [];
  isLoadingLabAnalyses = false;
  openingLabAnalysisId: bigint | null = null;

  ngOnInit(): void {
    this.loadProfile();
    this.loadAccessRequests();
    this.loadDiagnoses();
    this.loadPrescriptions();
    this.loadLabAnalyses();
  }

  // ── Getters ───────────────────────────────────────────────────────

  get profileDetails(): ProfileDetailRow[] {
    if (!this.patient) return [];
    return [
      { icon: 'fingerprint', label: 'CNP', value: this.maskCnp(this.patient.cnp) },
      {
        icon: 'calendar_today',
        label: 'Date of birth',
        value: this.formatDate(this.patient.dateOfBirth),
      },
      {
        icon: 'account_balance_wallet',
        label: 'Wallet address',
        value: this.patient.walletAddress,
        isWallet: true,
        onClickCopy: () => this.copyWallet(),
      },
    ];
  }

  // ── Load ──────────────────────────────────────────────────────────

  async loadProfile(): Promise<void> {
    this.isLoadingProfile = true;
    try {
      this.patient = await this.usersService.getMyProfile();
    } catch {
      this.notify.showError('Failed to load profile.');
    } finally {
      this.isLoadingProfile = false;
    }
  }

  async loadAccessRequests(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;
    this.isLoadingAccess = true;
    try {
      this.approvedDoctors = await this.accessService.getApprovedDoctors(user.userId);
    } catch {
      this.notify.showError('Failed to load access requests.');
    } finally {
      this.isLoadingAccess = false;
    }
  }

  async loadDiagnoses(): Promise<void> {
    await this.web3Service.waitForInit();
    const address = this.web3Service.getAddressOrNull();
    if (!address) return;
    this.isLoadingDiagnoses = true;
    try {
      this.diagnoses = await this.blockchainService.getPatientDiagnoses(address);
    } catch {
      this.notify.showError('Failed to load diagnoses.');
    } finally {
      this.isLoadingDiagnoses = false;
    }
  }

  async loadPrescriptions(): Promise<void> {
    await this.web3Service.waitForInit();
    const address = this.web3Service.getAddressOrNull();
    if (!address) return;
    this.isLoadingPrescriptions = true;
    try {
      const ids = await this.blockchainService.getPatientPrescriptionIds(address);
      const all = await Promise.all(ids.map((id) => this.blockchainService.getPrescription(id)));
      this.prescriptions = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load prescriptions.');
    } finally {
      this.isLoadingPrescriptions = false;
    }
  }

  async loadLabAnalyses(): Promise<void> {
    await this.web3Service.waitForInit();
    const address = this.web3Service.getAddressOrNull();
    if (!address) return;
    this.isLoadingLabAnalyses = true;
    try {
      this.labAnalyses = await this.blockchainService.getPatientLabAnalyses(address);
      this.labAnalyses.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load lab analyses.');
    } finally {
      this.isLoadingLabAnalyses = false;
    }
  }

  // ── Actions ───────────────────────────────────────────────────────

  async onRevoke(request: AccessRequestDto): Promise<void> {
    this.revokingId = request.id;
    try {
      await this.blockchainService.revokeAccess(request.doctorWalletAddress);
      await this.accessService.revoke(request.id);
      this.approvedDoctors = this.approvedDoctors.filter((r) => r.id !== request.id);
      this.notify.showSuccess(`Access revoked for ${request.doctorName}.`);
    } catch {
      this.notify.showError('Failed to revoke access.');
    } finally {
      this.revokingId = null;
    }
  }

  async onOpenDiagnosis(diagnosis: Diagnosis): Promise<void> {
    this.downloadingId = diagnosis.id;
    try {
      await this.decryptionService.decryptAndOpen(diagnosis);
    } catch {
      this.notify.showError('Failed to decrypt file.');
    } finally {
      this.downloadingId = null;
    }
  }

  async onOpenPrescription(prescription: Prescription): Promise<void> {
    this.openingPrescriptionId = prescription.id;
    try {
      await this.prescriptionService.decryptAndOpenForPatient(prescription);
    } catch {
      this.notify.showError('Failed to decrypt prescription. Please try again.');
    } finally {
      this.openingPrescriptionId = null;
    }
  }

  async onOpenLabAnalysis(analysis: LabAnalysis): Promise<void> {
    this.openingLabAnalysisId = analysis.id;
    try {
      await this.labAnalysisService.decryptAndOpen(analysis);
    } catch {
      this.notify.showError('Failed to decrypt lab analysis. Please try again.');
    } finally {
      this.openingLabAnalysisId = null;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────

  goToDiagnostics(): void {
    this.router.navigate(['/diagnostics']);
  }
  goToAccessManagement(): void {
    this.router.navigate(['/access-management']);
  }
  goToPrescriptions(): void {
    this.router.navigate(['/prescriptions']);
  }
  goToLabAnalyses(): void {
    this.router.navigate(['/lab-analyses']);
  }
  goToMedicalData(): void {
    this.router.navigate(['/medical-data']);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  formatDate(value: string | Date): string {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  shortenAddress(address: string): string {
    if (!address || address === '0x0000000000000000000000000000000000000000') return '—';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  maskCnp(cnp: string): string {
    if (cnp.length <= 6) return cnp;
    return `${cnp.substring(0, 3)}${'*'.repeat(cnp.length - 6)}${cnp.substring(cnp.length - 3)}`;
  }

  copyWallet(): void {
    if (!this.patient?.walletAddress) return;
    navigator.clipboard.writeText(this.patient.walletAddress);
    this.notify.showSuccess('Wallet address copied!');
  }
}
