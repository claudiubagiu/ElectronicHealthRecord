import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppError } from '../../../../core/errors/app.error';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  isLoading = false;

  async onLogin(): Promise<void> {
    this.isLoading = true;

    try {
      await this.authService.login();

      this.notify.showSuccess('Successfully connected!', 1000);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      console.error('Login failed:', error);

      const message = error instanceof AppError ? error.message : 'Login failed. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}
