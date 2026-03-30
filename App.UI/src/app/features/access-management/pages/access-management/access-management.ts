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
import { MedicationService } from '../../../medications/services/medication.service';
import { MedicationCryptoService } from '../../../medications/services/medication-crypto.service';

@Component({
  selector: 'app-access-management',
  templateUrl: './access-management.html',
  styleUrls: ['./access-management.scss'],
  standalone: true,
  imports: [CommonModule, ...MAT_COMMON_IMPORTS, MatTabsModule],
})
export class AccessManagement implements OnInit {
  private service = inject(AccessManagementService);
  private blockchainService = inject(BlockchainService);
  private medicationService = inject(MedicationService);
  private medicationCryptoService = inject(MedicationCryptoService);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

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
      // 1. Blockchain first — patient signs grantAccess
      await this.blockchainService.grantAccess(request.doctorWalletAddress);

      // 2. After on-chain confirmation, update in backend
      const updated = await this.service.approve(request.id);
      this.updateLocal(updated);

      // 3. Create medication envelopes for the newly approved doctor
      const user = this.authService.getDecodedToken();
      if (user) {
        try {
          await this.medicationCryptoService.grantEnvelopesToDoctor(request.doctorId, user.userId);
        } catch (e) {
          console.warn('Failed to create medication envelopes for doctor:', e);
        }
      }

      this.notify.showSuccess(`Access granted to ${request.doctorName}.`);
      // Reload history to include the new "Approved" entry
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
      // Reload history to include the new "Rejected" entry
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
      // 1. Blockchain — revoke on-chain
      await this.blockchainService.revokeAccess(request.doctorWalletAddress);

      // 2. Backend — update access request status
      const updated = await this.service.revoke(request.id);
      this.updateLocal(updated);

      // 3. Delete medication envelopes for this doctor
      await this.medicationService.deleteEnvelopes(request.doctorId, request.patientId);

      this.notify.showSuccess(`Access revoked for ${request.doctorName}.`);
      // Reload history to include the new "Revoked" entry
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

  getActionIcon(action: string): string {
    switch (action) {
      case 'Requested':
        return 'send';
      case 'Approved':
        return 'check_circle';
      case 'Rejected':
        return 'cancel';
      case 'Revoked':
        return 'remove_circle';
      default:
        return 'history';
    }
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Revoked':
        return 'revoked';
      case 'Requested':
        return 'pending';
      default:
        return '';
    }
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
