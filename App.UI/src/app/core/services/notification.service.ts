import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  showSuccess(message: string, duration = 3000): void {
    this.snackBar.open(message, 'OK', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'snackbar-success',
    });
  }

  showError(message: string, duration = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: 'snackbar-error',
    });
  }

  showInfo(message: string, duration = 3000): void {
    this.snackBar.open(message, 'OK', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
