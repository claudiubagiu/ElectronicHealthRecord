import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { DiagnosticDecryptionService } from '../../services/diagnostic-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Diagnosis } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-get-diagnostics',
  templateUrl: './get-diagnostics.html',
  styleUrls: ['./get-diagnostics.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
})
export class GetDiagnostics implements OnInit {
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(DiagnosticDecryptionService);
  private notify = inject(NotificationService);

  diagnoses: Diagnosis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

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
      this.diagnoses = await this.blockchainService.getPatientDiagnoses(address);
    } catch (error: any) {
      console.error('[GetDiagnostics] error:', error);
      this.notify.showError('Failed to load diagnoses.');
    } finally {
      this.isLoading = false;
    }
  }

  async openFile(diagnosis: Diagnosis): Promise<void> {
    this.downloadingId = diagnosis.id;
    try {
      await this.decryptionService.decryptAndOpen(diagnosis);
    } catch (error) {
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
