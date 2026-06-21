import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticDecryptionService } from '../../../diagnostics/services/diagnostic-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Diagnosis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { SharedRecordCard } from '../../../../shared/components/shared-record-card/shared-record-card';

@Component({
  selector: 'app-patient-diagnostics',
  templateUrl: './patient-diagnostics.html',
  styleUrls: ['./patient-diagnostics.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, SharedRecordCard],
})
export class PatientDiagnostics implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blockchainService = inject(BlockchainService);
  private decryptionService = inject(DiagnosticDecryptionService);
  private notify = inject(NotificationService);

  patientId = '';
  patientName = '';
  patientWalletAddress = '';

  diagnoses: Diagnosis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  readonly Number = Number;

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
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
      const all = await this.blockchainService.getPatientDiagnoses(this.patientWalletAddress);
      this.diagnoses = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load diagnoses.');
    } finally {
      this.isLoading = false;
    }
  }

  async openFile(diagnosis: Diagnosis): Promise<void> {
    this.downloadingId = diagnosis.id;
    try {
      await this.decryptionService.decryptAndOpen(diagnosis, this.patientId);
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
