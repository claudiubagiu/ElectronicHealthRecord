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

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  getShortAddress(): string {
    return this.web3Service.getShortAddress();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
