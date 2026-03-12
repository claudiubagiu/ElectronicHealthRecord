import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';
import { AppError } from '../../../../core/errors/app.error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = false;

  async onLogin(): Promise<void> {
    this.isLoading = true;

    try {
      await this.authService.login();

      this.snackBar.open('Successfully connected!', 'OK', {
        duration: 1000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });

      this.router.navigate(['/']);
    } catch (error: unknown) {
      console.error('Login failed:', error);

      if (error instanceof AppError) {
        this.snackBar.open(error.message, 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: 'snackbar-error',
        });
      } else {
        this.snackBar.open('Registration failed. Please try again.', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: 'snackbar-error',
        });
      }
    } finally {
      this.isLoading = false;
    }
  }
}
