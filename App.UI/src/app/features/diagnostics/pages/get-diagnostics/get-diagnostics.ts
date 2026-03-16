import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { IpfsService } from '../../../../core/services/ipfs.service';
import { Diagnosis } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-get-diagnostics',
  templateUrl: './get-diagnostics.html',
  styleUrls: ['./get-diagnostics.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class GetDiagnostics implements OnInit {
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private ipfsService = inject(IpfsService);
  private snackBar = inject(MatSnackBar);

  diagnoses: Diagnosis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  async loadDiagnoses(): Promise<void> {
    // Asteapta pana walletul e initializat
    await this.web3Service['initPromise'];

    const address = this.web3Service.getAddressOrNull();
    console.log('[GetDiagnostics] wallet address:', address);

    if (!address) {
      this.snackBar.open('Wallet not connected.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
      return;
    }

    this.isLoading = true;
    try {
      this.diagnoses = await this.blockchainService.getPatientDiagnoses(address);
    } catch (error: any) {
      console.error('[GetDiagnostics] error:', error);
      this.snackBar.open('Failed to load diagnoses.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.isLoading = false;
    }
  }

  async openFile(diagnosis: Diagnosis): Promise<void> {
    this.downloadingId = diagnosis.id;
    try {
      const data = await this.ipfsService.downloadEncryptedData(diagnosis.ipfsCid);
      const blob = new Blob([data.encryptedFile.buffer as ArrayBuffer], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || 'diagnostic-file';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.snackBar.open('Failed to download file.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
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
