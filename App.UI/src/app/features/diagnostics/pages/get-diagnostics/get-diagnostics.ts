import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { IpfsService } from '../../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../../core/services/lit-protocol.service';
import { CryptoService } from '../../../../core/services/crypto.service';
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
  private litService = inject(LitProtocolService);
  private snackBar = inject(MatSnackBar);

  diagnoses: Diagnosis[] = [];
  isLoading = false;
  downloadingId: bigint | null = null;

  ngOnInit(): void {
    this.loadDiagnoses();
  }

  async loadDiagnoses(): Promise<void> {
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

      await this.litService.connect();

      const accs = this.litService.createAccsBuilder(diagnosis.patientAddr);

      const walletClient = await this.web3Service.getSigner();

      const decryptResult = await this.litService.decrypt(
        {
          ciphertext: data.litMetadata!.ciphertext,
          dataToEncryptHash: data.litMetadata!.dataToEncryptHash,
        },
        accs,
        walletClient
      );

      const aesKeyBase64: string = decryptResult.decryptedData;
      const aesKeyRaw = Uint8Array.from(atob(aesKeyBase64), (c) => c.charCodeAt(0)).buffer;

      const aesKey = await CryptoService.importAESKey(aesKeyRaw);

      const decryptedBuffer = await CryptoService.decryptFileWithAES(
        data.encryptedFile.buffer as ArrayBuffer,
        aesKey,
        new Uint8Array(data.iv)
      );

      const ext = data.fileName.split('.').pop()?.toLowerCase();
      const mimeType =
        ext === 'pdf'
          ? 'application/pdf'
          : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'dcm'
          ? 'application/dicom'
          : 'application/octet-stream';

      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('[openFile] Decryption failed:', error);
      this.snackBar.open('Failed to decrypt file.', 'Close', {
        duration: 4000,
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
