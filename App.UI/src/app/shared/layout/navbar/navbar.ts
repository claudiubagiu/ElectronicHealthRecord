import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Web3Service } from '../../../core/services/web3.service';

/**
 * Represents a navigation item that is gated behind one or more roles.
 * If `roles` is empty, the item is visible to all authenticated users.
 */
export interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

/**
 * Role-based navigation items.
 * To add a new role or page, simply append an entry here —
 * the navbar template iterates over this array dynamically.
 */
const ROLE_NAV_ITEMS: NavItem[] = [
  {
    label: 'Add Diagnostic',
    route: '/add-diagnostic',
    icon: 'medical_services',
    roles: ['Doctor'],
  },
  { label: 'My Diagnostics', route: '/diagnostics', icon: 'assignment', roles: ['Patient'] },
  { label: 'Patient Access', route: '/patient-access', icon: 'manage_accounts', roles: ['Doctor'] },
  {
    label: 'Access Management',
    route: '/access-management',
    icon: 'admin_panel_settings',
    roles: ['Patient'],
  },
  {
    label: 'Add Medication',
    route: '/add-medication',
    icon: 'medication',
    roles: ['Doctor'],
  },
  {
    label: 'My Medications',
    route: '/medications',
    icon: 'medication',
    roles: ['Patient'],
  },
  {
    label: 'Upload Analysis',
    route: '/add-lab-analysis',
    icon: 'biotech',
    roles: ['LaboratoryTechnician'],
  },
  {
    label: 'My Lab Analyses',
    route: '/lab-analyses',
    icon: 'biotech',
    roles: ['Patient'],
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

  isSidenavOpen = false;

  isAuthenticated$ = this.authService.isAuthenticated$;
  user$ = this.authService.user$;
  roles$ = this.authService.roles$;

  /** Role-based nav items exposed to the template. */
  readonly roleNavItems = ROLE_NAV_ITEMS;

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  getShortAddress(): string {
    return this.web3Service.getShortAddress();
  }

  /**
   * Returns only the nav items that the user has access to
   * based on their current roles.
   */
  getVisibleItems(roles: string[]): NavItem[] {
    return this.roleNavItems.filter(
      (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r))
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
