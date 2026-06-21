import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { DiagnosticDecryptionService } from '../../services/diagnostic-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Diagnosis } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { SharedRecordCard } from '../../../../shared/components/shared-record-card/shared-record-card';
import { AppError } from '../../../../core/errors/app.error';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-get-diagnostics',
  templateUrl: './get-diagnostics.html',
  styleUrls: ['./get-diagnostics.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, SharedRecordCard],
})
export class GetDiagnostics implements OnInit {
  private authService = inject(AuthService);
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(DiagnosticDecryptionService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  diagnoses: Diagnosis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  readonly Number = Number;

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  async loadDiagnoses(): Promise<void> {
    await this.web3Service.waitForInit();

    const address = this.web3Service.getAddressOrNull();
    if (!address) {
      this.notify.showError('Wallet not connected.');
      return;
    }

    this.isLoading = true;
    try {
      const all = await this.blockchainService.getPatientDiagnoses(address);
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
      const currentUser = this.authService.getDecodedToken();
      if (!currentUser) {
        throw new AppError({
          message: 'You must be logged in.',
          status: 401,
          title: 'Unauthorized',
          type: 'UNAUTHORIZED',
        });
      }
      await this.decryptionService.decryptAndOpen(diagnosis, currentUser.userId);
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
