import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { AccessManagementService } from '../../services/access-management.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AccessRequestDto } from '../../../../core/models/access-request.model';
import { AccessRequestHistoryDto } from '../../../../core/models/access-request-history.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { MedicalDataService } from '../../../medical-data/services/medical-data.service';
import { MedicalDataCryptoService } from '../../../medical-data/services/medical-data-crypto.service';
import { AccessHistoryListComponent } from '../../../../shared/components/access-history-list/access-history-list';

@Component({
  selector: 'app-access-management',
  templateUrl: './access-management.html',
  styleUrls: ['./access-management.scss'],
  standalone: true,
  imports: [CommonModule, ...MAT_COMMON_IMPORTS, MatTabsModule, AccessHistoryListComponent],
})
export class AccessManagement implements OnInit {
  private service = inject(AccessManagementService);
  private blockchainService = inject(BlockchainService);
  private medicalDataService = inject(MedicalDataService);
  private medicalDataCryptoService = inject(MedicalDataCryptoService);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

  private readonly ACCESS_DURATION_SECONDS = 7 * 24 * 60 * 60;

  allRequests: AccessRequestDto[] = [];
  historyEntries: AccessRequestHistoryDto[] = [];
  isLoading = false;
  isLoadingHistory = false;
  actioningId: string | null = null;

  get pending(): AccessRequestDto[] {
    return this.allRequests.filter((r) => r.status === 'Pending');
  }

  get active(): AccessRequestDto[] {
    return this.allRequests.filter((r) => r.status === 'Approved');
  }

  ngOnInit(): void {
    this.load();
    this.loadHistory();
  }

  async load(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoading = true;
    try {
      this.allRequests = await this.service.getMyRequests(user.userId);
    } catch {
      this.notify.showError('Failed to load requests.');
    } finally {
      this.isLoading = false;
    }
  }

  async loadHistory(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoadingHistory = true;
    try {
      this.historyEntries = await this.service.getMyHistory(user.userId);
    } catch {
      this.notify.showError('Failed to load history.');
    } finally {
      this.isLoadingHistory = false;
    }
  }

  async onApprove(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      await this.blockchainService.grantAccess(
        request.doctorWalletAddress,
        this.ACCESS_DURATION_SECONDS
      );

      const updated = await this.service.approve(request.id);
      this.updateLocal(updated);

      const user = this.authService.getDecodedToken();
      if (user) {
        try {
          await this.medicalDataCryptoService.grantEnvelopesToUser(request.doctorId, user.userId);
        } catch (e) {
          console.warn('Failed to create medical data envelopes for user:', e);
        }
      }

      this.notify.showSuccess(`Access granted to ${request.doctorName} for 7 days.`);
      this.loadHistory();
    } catch {
      this.notify.showError('Failed to approve. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  async onReject(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      const updated = await this.service.reject(request.id);
      this.updateLocal(updated);
      this.notify.showSuccess(`Request from ${request.doctorName} rejected.`);
      this.loadHistory();
    } catch {
      this.notify.showError('Failed to reject. Please try again.');
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

      try {
        await this.medicalDataService.deleteEnvelopes(request.doctorId, request.patientId);
      } catch (e) {
        console.warn('Failed to delete medical data envelopes:', e);
      }

      this.notify.showSuccess(`Access revoked for ${request.doctorName}.`);
      this.loadHistory();
    } catch {
      this.notify.showError('Failed to revoke. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  private updateLocal(updated: AccessRequestDto): void {
    this.allRequests = this.allRequests.map((r) => (r.id === updated.id ? updated : r));
  }

  getRemainingTime(expiresAt?: string): string {
    if (!expiresAt) return '';
    const now = new Date().getTime();
    const normalized = expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z';
    const expiry = new Date(normalized).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
