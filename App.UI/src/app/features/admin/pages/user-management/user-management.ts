import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MedicDto } from '../../models/medic.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
})
export class UserManagement implements OnInit {
  private adminService = inject(AdminService);
  private notify = inject(NotificationService);

  pendingMedics: MedicDto[] = [];
  approvedMedics: MedicDto[] = [];

  isLoadingPending = false;
  isLoadingApproved = false;
  actioningId: string | null = null;

  ngOnInit(): void {
    this.loadPending();
    this.loadApproved();
  }

  async loadPending(): Promise<void> {
    this.isLoadingPending = true;
    try {
      this.pendingMedics = await this.adminService.getPendingMedics();
    } catch {
      this.notify.showError('Failed to load pending medics.');
    } finally {
      this.isLoadingPending = false;
    }
  }

  async loadApproved(): Promise<void> {
    this.isLoadingApproved = true;
    try {
      this.approvedMedics = await this.adminService.getApprovedMedics();
    } catch {
      this.notify.showError('Failed to load approved medics.');
    } finally {
      this.isLoadingApproved = false;
    }
  }

  async onApprove(medic: MedicDto): Promise<void> {
    this.actioningId = medic.id;
    try {
      // Passes the full medic object so the service can call both
      // approveMedic(walletAddress) on-chain and the HTTP endpoint.
      await this.adminService.approveMedic(medic);
      this.notify.showSuccess(`${medic.firstName} ${medic.lastName} has been approved.`);
      this.pendingMedics = this.pendingMedics.filter((m) => m.id !== medic.id);
      medic.isApproved = true;
      this.approvedMedics = [medic, ...this.approvedMedics];
    } catch {
      this.notify.showError('Failed to approve medic. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  async onRevoke(medic: MedicDto): Promise<void> {
    this.actioningId = medic.id;
    try {
      await this.adminService.revokeMedic(medic);
      this.notify.showSuccess(`${medic.firstName} ${medic.lastName}'s access has been revoked.`);
      this.approvedMedics = this.approvedMedics.filter((m) => m.id !== medic.id);
      medic.isApproved = false;
      this.pendingMedics = [medic, ...this.pendingMedics];
    } catch {
      this.notify.showError('Failed to revoke medic. Please try again.');
    } finally {
      this.actioningId = null;
    }
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'Doctor':
        return 'medical_services';
      case 'LaboratoryTechnician':
        return 'biotech';
      case 'Pharmacist':
        return 'local_pharmacy';
      case 'MedicalAssistant':
        return 'support_agent';
      default:
        return 'person';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'LaboratoryTechnician':
        return 'Lab Technician';
      case 'MedicalAssistant':
        return 'Medical Assistant';
      default:
        return role;
    }
  }

  shortWallet(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
