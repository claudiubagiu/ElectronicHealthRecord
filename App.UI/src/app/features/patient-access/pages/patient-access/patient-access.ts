import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { AccessRequestService } from '../../services/access-request.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  AccessRequestDto,
  AccessRequestStatus,
} from '../../../../core/models/access-request.model';
import { PatientDto } from '../../../../core/models/patient.model';
import { UsersService } from '../../../../core/services/users.service';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-patient-access',
  templateUrl: './patient-access.html',
  styleUrls: ['./patient-access.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatTabsModule, MatChipsModule],
})
export class PatientAccess implements OnInit, OnDestroy {
  private usersService = inject(UsersService);
  private accessRequestService = inject(AccessRequestService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  searchControl = new FormControl('');
  searchResults: PatientDto[] = [];
  isSearching = false;
  searchPerformed = false;
  requestingId: string | null = null;

  myRequests: AccessRequestDto[] = [];
  isLoadingRequests = false;

  requestStatusMap = new Map<string, AccessRequestStatus>();

  get activeRequests(): AccessRequestDto[] {
    return this.myRequests.filter((r) => r.status === 'Approved');
  }

  get historyRequests(): AccessRequestDto[] {
    return [...this.myRequests]
      .filter((r) => r.status !== 'Pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

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
          return this.usersService.searchPatients(term);
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
      this.notify.showError('Failed to load requests.');
    } finally {
      this.isLoadingRequests = false;
    }
  }

  getPatientStatus(patientId: string): AccessRequestStatus | null {
    return this.requestStatusMap.get(patientId) ?? null;
  }

  async onRequestAccess(patient: PatientDto): Promise<void> {
    this.requestingId = patient.id;
    try {
      const result = await this.accessRequestService.requestAccess({ patientId: patient.id });
      this.requestStatusMap.set(patient.id, 'Pending');
      this.myRequests = [result, ...this.myRequests];
      this.notify.showSuccess(`Access requested for ${patient.firstName} ${patient.lastName}.`);
    } catch {
      this.notify.showError('Failed to send access request.');
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

  viewMedications(req: AccessRequestDto): void {
    this.router.navigate(['/patient', req.patientId, 'medications'], {
      queryParams: {
        patientName: req.patientName,
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
