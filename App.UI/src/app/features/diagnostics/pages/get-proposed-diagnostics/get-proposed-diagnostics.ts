import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { IpfsService, EncryptedPayload } from '../../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../../core/services/lit-protocol.service';
import { CryptoService } from '../../../../core/services/crypto.service';
import { DiagnosticDto } from '../../models/diagnostic.model';
import { AppError } from '../../../../core/errors/app.error';
import { getAddress } from 'ethers';

@Component({
  selector: 'app-get-diagnostics',
  templateUrl: './get-proposed-diagnostics.html',
  styleUrls: ['./get-proposed-diagnostics.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class GetProposedDiagnostics implements OnInit {
  private diagnosticsService = inject(DiagnosticsService);
  private authService = inject(AuthService);
  private web3Service = inject(Web3Service);
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private litService = inject(LitProtocolService);
  private snackBar = inject(MatSnackBar);

  diagnostics: DiagnosticDto[] = [];
  isLoading = false;
  loadingId: string | null = null;

  private readonly BASE_URL = 'http://diagnostics.api.docker.localhost';

  ngOnInit(): void {
    this.loadDiagnostics();
  }

  async loadDiagnostics(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoading = true;
    try {
      this.diagnostics = await this.diagnosticsService.getDiagnosticsByPatient(user.userId);
    } catch (error) {
      this.snackBar.open('Failed to load diagnostics.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.isLoading = false;
    }
  }

  openFile(diagnostic: DiagnosticDto): void {
    const url = `${this.BASE_URL}${diagnostic.fileUrl}`;
    window.open(url, '_blank');
  }

  async onApprove(diagnostic: DiagnosticDto): Promise<void> {
    this.loadingId = diagnostic.id;
    try {
      const fileUrl = `${this.BASE_URL}${diagnostic.fileUrl}`;
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to download diagnostic file.');
      }
      const fileBuffer = await fileResponse.arrayBuffer();

      const aesKey = await CryptoService.generateAESKey();

      const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, aesKey);

      const aesKeyRaw = await CryptoService.exportAESKey(aesKey);
      const aesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(aesKeyRaw)));

      const patientAddress = getAddress(this.web3Service.getAddress());

      await this.litService.connect();
      const accs = this.litService.createAccsBuilder(patientAddress);

      const litResult = await this.litService.encrypt(aesKeyBase64, accs);

      const payload: EncryptedPayload = {
        encryptedFile: Array.from(new Uint8Array(encrypted)),
        encryptedAesKey: [],
        litMetadata: {
          ciphertext: litResult.ciphertext,
          dataToEncryptHash: litResult.dataToEncryptHash,
        },
        iv: Array.from(iv),
        fileName: diagnostic.fileName,
        timestamp: Date.now(),
      };

      const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

      await this.blockchainService.addDiagnosis(
        diagnostic.description,
        ipfsCid,
        diagnostic.doctorWalletAddress,
        diagnostic.doctorName
      );

      await this.diagnosticsService.deleteDiagnostic(diagnostic.id);
      this.diagnostics = this.diagnostics.filter((d) => d.id !== diagnostic.id);

      this.snackBar.open('Diagnostic approved and stored on blockchain!', 'OK', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });
    } catch (error) {
      console.log(error);
      const message =
        error instanceof AppError ? error.message : 'Approval failed. Please try again.';
      this.snackBar.open(message, 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.loadingId = null;
    }
  }

  async onDecline(diagnostic: DiagnosticDto): Promise<void> {
    this.loadingId = diagnostic.id;
    try {
      await this.diagnosticsService.deleteDiagnostic(diagnostic.id);
      this.diagnostics = this.diagnostics.filter((d) => d.id !== diagnostic.id);
      this.snackBar.open('Diagnostic declined.', 'OK', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Something went wrong.';
      this.snackBar.open(message, 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.loadingId = null;
    }
  }
}
