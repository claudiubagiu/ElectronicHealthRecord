import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Centralized notification service that wraps MatSnackBar.
 *
 * Provides a consistent look and feel for success, error, and info
 * notifications across the entire application. All configuration
 * (position, duration, CSS classes) is defined in one place.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  /**
   * Show a success notification (green styling).
   * @param message - The message to display.
   * @param duration - Duration in milliseconds (default: 3000).
   */
  showSuccess(message: string, duration = 3000): void {
    this.snackBar.open(message, 'OK', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'snackbar-success',
    });
  }

  /**
   * Show an error notification (red styling).
   * @param message - The message to display.
   * @param duration - Duration in milliseconds (default: 4000).
   */
  showError(message: string, duration = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'snackbar-error',
    });
  }

  /**
   * Show a neutral / informational notification.
   * @param message - The message to display.
   * @param duration - Duration in milliseconds (default: 3000).
   */
  showInfo(message: string, duration = 3000): void {
    this.snackBar.open(message, 'OK', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
