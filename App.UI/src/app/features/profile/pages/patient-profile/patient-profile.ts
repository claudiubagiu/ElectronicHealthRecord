import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { UsersService } from '../../../../core/services/users.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AccessManagementService } from '../../../access-management/services/access-management.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { DiagnosticDecryptionService } from '../../../diagnostics/services/diagnostic-decryption.service';
import { PrescriptionDecryptionService } from '../../../prescriptions/services/prescription-decryption.service';
import { LabAnalysisService } from '../../../lab-analyses/services/lab-analysis.service';
import { MedicationService } from '../../../medications/services/medication.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AccessRequestDto } from '../../../../core/models/access-request.model';
import { Diagnosis, Prescription, LabAnalysis } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.html',
  styleUrls: ['./patient-profile.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe],
})
export class PatientProfile implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private accessService = inject(AccessManagementService);
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(DiagnosticDecryptionService);
  private prescriptionDecryptionService = inject(PrescriptionDecryptionService);
  private labAnalysisService = inject(LabAnalysisService);
  private medicationService = inject(MedicationService);
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

  /**
   * Fetches the patient's profile from the backend API.
   */
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

  /**
   * Loads all access requests and filters only the approved ones
   * to display doctors who currently have access to the patient's records.
   */
  async loadAccessRequests(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoadingAccess = true;
    try {
      const all = await this.accessService.getMyRequests(user.userId);
      this.approvedDoctors = all.filter((r) => r.status === 'Approved');
    } catch {
      this.notify.showError('Failed to load access requests.');
    } finally {
      this.isLoadingAccess = false;
    }
  }

  /**
   * Fetches all on-chain diagnoses for the connected patient wallet.
   */
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

  /**
   * Fetches all on-chain prescriptions for the connected patient wallet,
   * sorted most-recent first.
   */
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

  /**
   * Fetches all on-chain lab analyses for the connected patient wallet,
   * sorted most-recent first.
   */
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

  /**
   * Revokes a doctor's on-chain access and removes their medication envelopes.
   * Removes the doctor from the local list on success.
   */
  async onRevoke(request: AccessRequestDto): Promise<void> {
    this.revokingId = request.id;
    try {
      await this.blockchainService.revokeAccess(request.doctorWalletAddress);
      await this.accessService.revoke(request.id);
      await this.medicationService.deleteEnvelopes(request.doctorId, request.patientId);

      this.approvedDoctors = this.approvedDoctors.filter((r) => r.id !== request.id);
      this.notify.showSuccess(`Access revoked for ${request.doctorName}.`);
    } catch {
      this.notify.showError('Failed to revoke access.');
    } finally {
      this.revokingId = null;
    }
  }

  /**
   * Decrypts and opens a diagnosis PDF using Lit Protocol.
   * Requires a MetaMask wallet signature to prove ownership.
   */
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

  /**
   * Decrypts and opens a prescription PDF for the patient using Lit Protocol.
   * Requires a MetaMask wallet signature to prove ownership.
   */
  async onOpenPrescription(prescription: Prescription): Promise<void> {
    this.openingPrescriptionId = prescription.id;
    try {
      await this.prescriptionDecryptionService.decryptAndOpenForPatient(prescription);
    } catch {
      this.notify.showError('Failed to decrypt prescription. Please try again.');
    } finally {
      this.openingPrescriptionId = null;
    }
  }

  /**
   * Decrypts and opens a lab analysis PDF using Lit Protocol.
   * Requires a MetaMask wallet signature to prove ownership.
   */
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

  /**
   * Converts a blockchain bigint timestamp (seconds) to a JavaScript Date.
   */
  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  /**
   * Returns a shortened wallet address in the format 0x1234...abcd.
   */
  shortenAddress(address: string): string {
    if (!address || address === '0x0000000000000000000000000000000000000000') return '—';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Masks the middle digits of a CNP for privacy display.
   */
  maskCnp(cnp: string): string {
    if (cnp.length <= 6) return cnp;
    return `${cnp.substring(0, 3)}${'*'.repeat(cnp.length - 6)}${cnp.substring(cnp.length - 3)}`;
  }

  /**
   * Copies the patient's wallet address to the clipboard and shows a success toast.
   */
  copyWallet(): void {
    if (!this.patient?.walletAddress) return;
    navigator.clipboard.writeText(this.patient.walletAddress);
    this.notify.showSuccess('Wallet address copied!');
  }

  goToMedications(): void {
    this.router.navigate(['/medications']);
  }

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

  /**
   * Smoothly scrolls a carousel by one card width (280px + 16px gap)
   * using requestAnimationFrame for consistent animation across browsers.
   * Duration: 300ms with ease-out easing.
   */
  scrollCarousel(elementId: string, direction: 'left' | 'right'): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    const distance = 296; // 280px card + 16px gap
    const target = direction === 'left' ? -distance : distance;
    const duration = 300;
    const start = el.scrollLeft;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      el.scrollLeft = start + target * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}
