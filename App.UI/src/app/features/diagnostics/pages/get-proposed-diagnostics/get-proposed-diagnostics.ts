import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DiagnosticDto } from '../../models/diagnostic.model';
import { AppError } from '../../../../core/errors/app.error';

@Component({
  selector: 'app-get-diagnostics',
  templateUrl: './get-proposed-diagnostics.html',
  styleUrls: ['./get-proposed-diagnostics.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class GetProposedDiagnostics implements OnInit {
  private diagnosticsService = inject(DiagnosticsService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  diagnostics: DiagnosticDto[] = [];
  isLoading = false;
  loadingId: string | null = null;

  private readonly BASE_URL = 'http://diagnostics.api.docker.localhost';

  ngOnInit(): void {
    this.loadDiagnostics();
  }

  async loadDiagnostics(): Promise<void> {
    const user = this.authService.getDecodedToken();
    if (!user) return;

    this.isLoading = true;
    try {
      this.diagnostics = await this.diagnosticsService.getDiagnosticsByPatient(user.userId);
    } catch (error) {
      this.snackBar.open('Failed to load diagnostics.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.isLoading = false;
    }
  }

  openFile(diagnostic: DiagnosticDto): void {
    const url = `${this.BASE_URL}${diagnostic.fileUrl}`;
    window.open(url, '_blank');
  }

  async onApprove(diagnostic: DiagnosticDto): Promise<void> {
    await this.deleteDiagnostic(diagnostic, 'Diagnostic approved.');
  }

  async onDecline(diagnostic: DiagnosticDto): Promise<void> {
    await this.deleteDiagnostic(diagnostic, 'Diagnostic declined.');
  }

  private async deleteDiagnostic(diagnostic: DiagnosticDto, successMessage: string): Promise<void> {
    this.loadingId = diagnostic.id;
    try {
      await this.diagnosticsService.deleteDiagnostic(diagnostic.id);
      this.diagnostics = this.diagnostics.filter((d) => d.id !== diagnostic.id);
      this.snackBar.open(successMessage, 'OK', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Something went wrong.';
      this.snackBar.open(message, 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.loadingId = null;
    }
  }
}
