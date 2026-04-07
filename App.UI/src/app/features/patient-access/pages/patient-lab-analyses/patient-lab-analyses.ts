import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { LabAnalysisService } from '../../../lab-analyses/services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LabAnalysis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-patient-lab-analyses',
  templateUrl: './patient-lab-analyses.html',
  styleUrls: ['./patient-lab-analyses.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class PatientLabAnalyses implements OnInit {
  private route = inject(ActivatedRoute);
  private blockchainService = inject(BlockchainService);
  private decryptionService = inject(LabAnalysisService);
  private notify = inject(NotificationService);

  patientName = '';
  patientWalletAddress = '';

  analyses: LabAnalysis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  ngOnInit(): void {
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress') ?? '';
    this.loadAnalyses();
  }

  async loadAnalyses(): Promise<void> {
    if (!this.patientWalletAddress) {
      this.notify.showError('Missing patient wallet address.');
      return;
    }

    this.isLoading = true;
    try {
      this.analyses = await this.blockchainService.getPatientLabAnalyses(this.patientWalletAddress);
    } catch {
      this.notify.showError('Failed to load lab analyses.');
    } finally {
      this.isLoading = false;
    }
  }

  async openFile(analysis: LabAnalysis): Promise<void> {
    this.downloadingId = analysis.id;
    try {
      await this.decryptionService.decryptAndOpen(analysis);
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
