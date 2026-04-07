import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { LabAnalysisService } from '../../services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LabAnalysis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-get-lab-analyses',
  templateUrl: './get-lab-analyses.html',
  styleUrls: ['./get-lab-analyses.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class GetLabAnalyses implements OnInit {
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(LabAnalysisService);
  private notify = inject(NotificationService);

  analyses: LabAnalysis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  ngOnInit(): void {
    this.loadAnalyses();
  }

  async loadAnalyses(): Promise<void> {
    await this.web3Service.waitForInit();

    const address = this.web3Service.getAddressOrNull();
    if (!address) {
      this.notify.showError('Wallet not connected.');
      return;
    }

    this.isLoading = true;
    try {
      this.analyses = await this.blockchainService.getPatientLabAnalyses(address);
    } catch (error: any) {
      console.error('[GetLabAnalyses] error:', error);
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
