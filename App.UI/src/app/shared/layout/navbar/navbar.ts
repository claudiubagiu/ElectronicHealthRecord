import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Web3Service } from '../../../core/services/web3.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AppError } from '../../../core/errors/app.error';
import {
  ResetKeysDialogComponent,
  ResetKeysDialogResult,
} from '../../components/reset-keys-dialog/reset-keys-dialog';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

const ROLE_NAV_ITEMS: NavItem[] = [
  {
    label: 'Access Management',
    route: '/access-management',
    icon: 'admin_panel_settings',
    roles: ['Patient'],
  },
  {
    label: 'Patient Access',
    route: '/patient-access',
    icon: 'manage_accounts',
    roles: ['Doctor', 'MedicalAssistant', 'LaboratoryTechnician'],
  },
  {
    label: 'My Diagnostics',
    route: '/diagnostics',
    icon: 'assignment',
    roles: ['Patient'],
  },
  {
    label: 'My Lab Analyses',
    route: '/lab-analyses',
    icon: 'biotech',
    roles: ['Patient'],
  },
  {
    label: 'My Prescriptions',
    route: '/prescriptions',
    icon: 'receipt_long',
    roles: ['Patient'],
  },
  {
    label: 'Dispense Prescription',
    route: '/dispense',
    icon: 'local_pharmacy',
    roles: ['Pharmacist'],
  },
  {
    label: 'My Medical Data',
    route: '/medical-data',
    icon: 'health_and_safety',
    roles: ['Patient'],
  },
  {
    label: 'User Management',
    route: '/user-management',
    icon: 'manage_accounts',
    roles: ['Administrator'],
  },
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private web3Service = inject(Web3Service);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  isSidenavOpen = false;
  isLoggingIn = false;

  isAuthenticated$ = this.authService.isAuthenticated$;
  user$ = this.authService.user$;
  roles$ = this.authService.roles$;

  readonly roleNavItems = ROLE_NAV_ITEMS;

  async onLogin(): Promise<void> {
    this.isLoggingIn = true;
    try {
      await this.authService.login();
      this.notify.showSuccess('Successfully connected!', 1000);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = error instanceof AppError ? error.message : 'Login failed. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoggingIn = false;
    }
  }

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  getShortAddress(): string {
    return this.web3Service.getShortAddress();
  }

  getVisibleItems(roles: string[]): NavItem[] {
    return this.roleNavItems.filter(
      (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r))
    );
  }

  getProfileRoute(): string {
    const roles = this.authService.getRoles();
    if (roles.includes('Doctor')) return '/doctor-profile';
    if (roles.includes('LaboratoryTechnician')) return '/lab-tech-profile';
    if (roles.includes('Pharmacist')) return '/pharmacist-profile';
    if (roles.includes('MedicalAssistant')) return '/medical-assistant-profile';
    return '/profile';
  }

  isPatient(roles: string[]): boolean {
    return roles.includes('Patient');
  }

  openResetKeysDialog(): void {
    const dialogRef = this.dialog.open<ResetKeysDialogComponent, unknown, ResetKeysDialogResult>(
      ResetKeysDialogComponent,
      { disableClose: false }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'rotated') {
        this.notify.showSuccess('Your account keys have been reset.');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
