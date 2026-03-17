import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccessManagementService } from '../../services/access-management.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AccessRequestDto } from '../../../patient-access/models/access-request.model';

@Component({
  selector: 'app-access-management',
  templateUrl: './access-management.html',
  styleUrls: ['./access-management.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class AccessManagement implements OnInit {
  private service = inject(AccessManagementService);
  private blockchainService = inject(BlockchainService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  allRequests: AccessRequestDto[] = [];
  isLoading = false;
  actioningId: string | null = null;

  get pending(): AccessRequestDto[] {
    return this.allRequests.filter((r) => r.status === 'Pending');
  }

  get active(): AccessRequestDto[] {
    return this.allRequests.filter((r) => r.status === 'Approved');
  }

  get history(): AccessRequestDto[] {
    return this.allRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected');
  }

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoading = true;
    try {
      this.allRequests = await this.service.getMyRequests(user.userId);
    } catch {
      this.showError('Failed to load requests.');
    } finally {
      this.isLoading = false;
    }
  }

  async onApprove(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      // 1. Blockchain first — pacientul semnează grantAccess
      await this.blockchainService.grantAccess(request.doctorWalletAddress);

      // 2. După confirmare on-chain, update în backend
      const updated = await this.service.approve(request.id);
      this.updateLocal(updated);

      this.showSuccess(`Access granted to ${request.doctorName}.`);
    } catch {
      this.showError('Failed to approve. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  async onReject(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      const updated = await this.service.reject(request.id);
      this.updateLocal(updated);
      this.showSuccess(`Request from ${request.doctorName} rejected.`);
    } catch {
      this.showError('Failed to reject. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  async onRevoke(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      await this.blockchainService.revokeAccess(request.doctorWalletAddress);
      const updated = await this.service.revoke(request.id); 
      this.updateLocal(updated);
      this.showSuccess(`Access revoked for ${request.doctorName}.`);
    } catch {
      this.showError('Failed to revoke. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  private updateLocal(updated: AccessRequestDto): void {
    this.allRequests = this.allRequests.map((r) => (r.id === updated.id ? updated : r));
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'snackbar-error',
    });
  }
}
