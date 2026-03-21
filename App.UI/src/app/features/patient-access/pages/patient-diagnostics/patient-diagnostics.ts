import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticDecryptionService } from '../../../diagnostics/services/diagnostic-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Diagnosis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-patient-diagnostics',
  templateUrl: './patient-diagnostics.html',
  styleUrls: ['./patient-diagnostics.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe],
})
export class PatientDiagnostics implements OnInit {
  private route = inject(ActivatedRoute);
  private blockchainService = inject(BlockchainService);
  private decryptionService = inject(DiagnosticDecryptionService);
  private notify = inject(NotificationService);

  patientName = '';
  patientWalletAddress = '';

  diagnoses: Diagnosis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  ngOnInit(): void {
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress') ?? '';
    this.loadDiagnoses();
  }

  async loadDiagnoses(): Promise<void> {
    if (!this.patientWalletAddress) {
      this.notify.showError('Missing patient wallet address.');
      return;
    }

    this.isLoading = true;
    try {
      this.diagnoses = await this.blockchainService.getPatientDiagnoses(this.patientWalletAddress);
    } catch {
      this.notify.showError('Failed to load diagnoses.');
    } finally {
      this.isLoading = false;
    }
  }

  async openFile(diagnosis: Diagnosis): Promise<void> {
    this.downloadingId = diagnosis.id;
    try {
      await this.decryptionService.decryptAndOpen(diagnosis);
    } catch {
      this.notify.showError('Failed to decrypt file.');
    } finally {
      this.downloadingId = null;
    }
  }

  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  shortenAddress(address: string): string {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
