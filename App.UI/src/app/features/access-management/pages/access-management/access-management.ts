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
import { AccessHistoryListComponent } from '../../../../shared/components/access-history-list/access-history-list';
import { CryptoService } from '../../../../core/services/crypto.service';
import { E2eeKeyService } from '../../../../core/services/e2ee-key.service';
import { UsersService } from '../../../../core/services/users.service';
import { AppError } from '../../../../core/errors/app.error';

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
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private e2eeService = inject(E2eeKeyService);
  private usersService = inject(UsersService);

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

  /**
   * Approving access now does two things beyond the on-chain grant:
   *   1. Build an envelope for the requesting user — decrypt the patient's
   *      own AES key (with the patient's private key) and re-encrypt it
   *      with the requesting user's public key (ECIES). This never leaves
   *      plaintext key material outside the browser.
   *   2. Send that envelope to AccessRequests.Api as part of the approve
   *      call, so it can be stored (one envelope per patient/user pair)
   *      and later retrieved by the authorized user to decrypt medical
   *      data and diagnostics.
   */
  async onApprove(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      await this.blockchainService.grantAccess(
        request.doctorWalletAddress,
        this.ACCESS_DURATION_SECONDS
      );

      const envelope = await this.buildEnvelopeForUser(request.doctorId);

      const updated = await this.service.approve(request.id, envelope);
      this.updateLocal(updated);

      this.notify.showSuccess(`Access granted to ${request.doctorName} for 7 days.`);
      this.loadHistory();
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Failed to approve. Please try again.';
      this.notify.showError(message);
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

  /**
   * Revoking access removes the on-chain grant and flips the request status.
   * The envelope itself is deleted server-side by AccessRequests.Api as part
   * of the revoke call — no separate cleanup call needed here anymore.
   */
  async onRevoke(request: AccessRequestDto): Promise<void> {
    this.actioningId = request.id;
    try {
      await this.blockchainService.revokeAccess(request.doctorWalletAddress);

      const updated = await this.service.revoke(request.id);
      this.updateLocal(updated);

      this.notify.showSuccess(`Access revoked for ${request.doctorName}.`);
      this.loadHistory();
    } catch {
      this.notify.showError('Failed to revoke. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  /**
   * Builds the envelope payload for a newly-approved user: the patient's
   * own AES key, decrypted with the patient's private key and re-encrypted
   * (ECIES) with the target user's public key.
   */
  private async buildEnvelopeForUser(userId: string): Promise<{ encryptedAesKey: string }> {
    const privateKey = this.e2eeService.getPrivateKey();
    if (!privateKey) {
      throw new AppError({
        message: 'Your encryption key is not available. Please log in again.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }

    const myProfile = await this.usersService.getMyProfile();
    if (!myProfile.encryptedAesKey) {
      throw new AppError({
        message: 'Your personal encryption key was not found on your profile.',
        status: 403,
        title: 'No Encryption Key',
        type: 'PATIENT_NO_AES_KEY',
      });
    }

    const myEncryptedAesKeyBuffer = CryptoService.base64ToUint8Array(myProfile.encryptedAesKey)
      .buffer as ArrayBuffer;
    const aesKeyRaw = CryptoService.decryptAESKeyWithECIES(myEncryptedAesKeyBuffer, privateKey);

    const userPkResponse = await this.e2eeService.getPublicKey_remote(userId);
    const encryptedForUser = CryptoService.encryptAESKeyWithECIES(
      aesKeyRaw.buffer as ArrayBuffer,
      userPkResponse.publicKey
    );

    return {
      encryptedAesKey: CryptoService.arrayBufferToBase64(encryptedForUser.buffer as ArrayBuffer),
    };
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
