import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { LabAnalysisService } from '../../../lab-analyses/services/lab-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LabAnalysis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { SharedRecordCard } from '../../../../shared/components/shared-record-card/shared-record-card';

@Component({
  selector: 'app-patient-lab-analyses',
  templateUrl: './patient-lab-analyses.html',
  styleUrls: ['./patient-lab-analyses.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, SharedRecordCard],
})
export class PatientLabAnalyses implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blockchainService = inject(BlockchainService);
  private labAnalysisService = inject(LabAnalysisService);
  private notify = inject(NotificationService);

  patientId = '';
  patientName = '';
  patientWalletAddress = '';

  analyses: LabAnalysis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  readonly Number = Number;

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
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
      const all = await this.blockchainService.getPatientLabAnalyses(this.patientWalletAddress);
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
      await this.labAnalysisService.decryptAndOpen(analysis);
    } catch {
      this.notify.showError('Failed to decrypt file.');
    } finally {
      this.downloadingId = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/patient', this.patientId, 'profile'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }
}
