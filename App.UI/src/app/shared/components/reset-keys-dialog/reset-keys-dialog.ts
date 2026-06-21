import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';
import { KeyRotationService } from '../../../core/services/key-rotation.service';
import { AppError } from '../../../core/errors/app.error';

export type ResetKeysDialogResult = 'rotated' | undefined;

type DialogStep = 'confirm' | 'rotating' | 'error';

/**
 * Confirmation modal for "Reset Account Keys" (navbar profile menu, Patient
 * only). On confirm, runs the full client-side PatientMasterKey rotation
 * via KeyRotationService — generates a new key, re-wraps every document
 * key and access envelope under it, and finally makes it authoritative on
 * Auth.Api. See KeyRotationService for why that order matters and what
 * happens if a step fails partway through.
 *
 * The dialog is non-dismissible while rotating (disableClose set by the
 * caller) so the patient can't accidentally close the tab mid-operation
 * via a stray click — they're still free to retry on error.
 */
@Component({
  selector: 'app-reset-keys-dialog',
  templateUrl: './reset-keys-dialog.html',
  styleUrls: ['./reset-keys-dialog.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, MatDialogModule],
})
export class ResetKeysDialogComponent {
  private keyRotationService = inject(KeyRotationService);

  step: DialogStep = 'confirm';
  errorMessage = '';

  constructor(public dialogRef: MatDialogRef<ResetKeysDialogComponent, ResetKeysDialogResult>) {}

  async onConfirm(): Promise<void> {
    this.step = 'rotating';
    this.dialogRef.disableClose = true;

    try {
      await this.keyRotationService.rotateForCurrentPatient();
      this.dialogRef.close('rotated');
    } catch (error: unknown) {
      console.error('Key rotation failed:', error);
      this.errorMessage =
        error instanceof AppError
          ? error.message
          : 'Something went wrong while resetting your keys. Please try again.';
      this.step = 'error';
      this.dialogRef.disableClose = false;
    }
  }

  onRetry(): void {
    this.onConfirm();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
