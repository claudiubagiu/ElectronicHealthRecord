// App.UI/src/app/features/patient-access/pages/patient-diagnostics/patient-diagnostics.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
  selector: 'app-patient-diagnostics',
  templateUrl: './patient-diagnostics.html',
  styleUrls: ['./patient-diagnostics.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class PatientDiagnostics implements OnInit {
  private route = inject(ActivatedRoute);
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private ipfsService = inject(IpfsService);
  private litService = inject(LitProtocolService);
  private snackBar = inject(MatSnackBar);

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
      this.snackBar.open('Missing patient wallet address.', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    try {
      this.diagnoses = await this.blockchainService.getPatientDiagnoses(this.patientWalletAddress);
    } catch {
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
      const walletClient = await this.web3Service.getViemWalletClient();

      const decryptResult = await this.litService.decrypt(
        {
          ciphertext: data.litMetadata!.ciphertext,
          dataToEncryptHash: data.litMetadata!.dataToEncryptHash,
        },
        accs,
        walletClient
      );

      const raw = decryptResult.decryptedData as Uint8Array;
      const aesKeyBase64 = new TextDecoder().decode(raw);
      const aesKeyRaw = Uint8Array.from(atob(aesKeyBase64), (c) => c.charCodeAt(0))
        .buffer as ArrayBuffer;
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
    } catch {
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
