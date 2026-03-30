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
import { MedicationService } from '../../../medications/services/medication.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PatientDto } from '../../../../core/models/patient.model';
import { AccessRequestDto } from '../../../../core/models/access-request.model';
import { Diagnosis } from '../../../../core/models/blockchain.model';

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

  ngOnInit(): void {
    this.loadProfile();
    this.loadAccessRequests();
    this.loadDiagnoses();
  }

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
      const all = await this.accessService.getMyRequests(user.userId);
      this.approvedDoctors = all.filter((r) => r.status === 'Approved');
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

  goToMedications(): void {
    this.router.navigate(['/medications']);
  }

  goToDiagnostics(): void {
    this.router.navigate(['/diagnostics']);
  }

  goToAccessManagement(): void {
    this.router.navigate(['/access-management']);
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

  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  shortenAddress(address: string): string {
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
