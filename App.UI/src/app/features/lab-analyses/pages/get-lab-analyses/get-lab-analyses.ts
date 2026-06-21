import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { LabAnalysisService } from '../../services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LabAnalysis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { SharedRecordCard } from '../../../../shared/components/shared-record-card/shared-record-card';
import { AppError } from '../../../../core/errors/app.error';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-get-lab-analyses',
  templateUrl: './get-lab-analyses.html',
  styleUrls: ['./get-lab-analyses.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, SharedRecordCard],
})
export class GetLabAnalyses implements OnInit {
  private authService = inject(AuthService);
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private labAnalysisService = inject(LabAnalysisService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  analyses: LabAnalysis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  readonly Number = Number;

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
      const all = await this.blockchainService.getPatientLabAnalyses(address);
      this.analyses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load lab analyses.');
    } finally {
      this.isLoading = false;
    }
  }

  async openFile(analysis: LabAnalysis): Promise<void> {
    this.downloadingId = analysis.id;
    try {
      const currentUser = this.authService.getDecodedToken();
      if (!currentUser) {
        throw new AppError({
          message: 'You must be logged in.',
          status: 401,
          title: 'Unauthorized',
          type: 'UNAUTHORIZED',
        });
      }
      await this.labAnalysisService.decryptAndOpen(analysis, currentUser.userId);
    } catch {
      this.notify.showError('Failed to decrypt file.');
    } finally {
      this.downloadingId = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
