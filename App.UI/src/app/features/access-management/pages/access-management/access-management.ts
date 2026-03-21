import { Component, OnInit, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { AccessManagementService } from '../../services/access-management.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AccessRequestDto } from '../../../../core/models/access-request.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-access-management',
  templateUrl: './access-management.html',
  styleUrls: ['./access-management.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, MatTabsModule],
})
export class AccessManagement implements OnInit {
  private service = inject(AccessManagementService);
  private blockchainService = inject(BlockchainService);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

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
    return this.allRequests.filter(
      (r) => r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Revoked'
    );
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
      this.notify.showError('Failed to load requests.');
    } finally {
      this.isLoading = false;
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

      this.notify.showSuccess(`Access granted to ${request.doctorName}.`);
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
      this.notify.showSuccess(`Access revoked for ${request.doctorName}.`);
    } catch {
      this.notify.showError('Failed to revoke. Please try again.');
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
}
