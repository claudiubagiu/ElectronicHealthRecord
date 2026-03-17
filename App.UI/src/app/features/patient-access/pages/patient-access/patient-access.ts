// App.UI/src/app/features/patient-access/pages/patient-access/patient-access.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiagnosticsService } from '../../../diagnostics/services/diagnostics.service';
import { AccessRequestService } from '../../services/access-request.service';
import { AccessRequestDto } from '../../models/access-request.model';
import { PatientDto } from '../../../diagnostics/models/diagnostic.model';

@Component({
  selector: 'app-patient-access',
  templateUrl: './patient-access.html',
  styleUrls: ['./patient-access.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
  ],
})
export class PatientAccess implements OnInit, OnDestroy {
  private diagnosticsService = inject(DiagnosticsService);
  private accessRequestService = inject(AccessRequestService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  searchControl = new FormControl('');
  searchResults: PatientDto[] = [];
  isSearching = false;
  searchPerformed = false;
  requestingId: string | null = null;

  myRequests: AccessRequestDto[] = [];
  isLoadingRequests = false;

  requestStatusMap = new Map<string, 'Pending' | 'Approved' | 'Rejected'>();

  ngOnInit(): void {
    this.setupSearch();
    this.loadMyRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          const term = (value ?? '').trim();
          if (term.length < 2) {
            this.searchResults = [];
            this.searchPerformed = false;
            return of([]);
          }
          this.isSearching = true;
          return this.diagnosticsService.searchPatients(term);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (patients) => {
          this.searchResults = patients;
          this.isSearching = false;
          this.searchPerformed = true;
        },
        error: () => {
          this.isSearching = false;
          this.searchPerformed = true;
        },
      });
  }

  async loadMyRequests(): Promise<void> {
    this.isLoadingRequests = true;
    try {
      this.myRequests = await this.accessRequestService.getMyRequests();
      this.myRequests.forEach((r) => {
        this.requestStatusMap.set(r.patientId, r.status);
      });
    } catch {
      this.snackBar.open('Failed to load requests.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.isLoadingRequests = false;
    }
  }

  getPatientStatus(patientId: string): 'Pending' | 'Approved' | 'Rejected' | null {
    return this.requestStatusMap.get(patientId) ?? null;
  }

  async onRequestAccess(patient: PatientDto): Promise<void> {
    this.requestingId = patient.id;
    try {
      const result = await this.accessRequestService.requestAccess({ patientId: patient.id });
      this.requestStatusMap.set(patient.id, 'Pending');
      this.myRequests = [result, ...this.myRequests];
      this.snackBar.open(
        `Access requested for ${patient.firstName} ${patient.lastName}.`,
        'Close',
        {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: 'snackbar-success',
        }
      );
    } catch {
      this.snackBar.open('Failed to send access request.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.requestingId = null;
    }
  }

  viewDiagnostics(req: AccessRequestDto): void {
    this.router.navigate(['/patient', req.patientId, 'diagnostics'], {
      queryParams: {
        patientName: req.patientName,
        patientWalletAddress: req.patientWalletAddress,
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
