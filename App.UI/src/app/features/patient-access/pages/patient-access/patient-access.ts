import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { AccessRequestHistoryDto } from '../../../../core/models/access-request-history.model';
import { PatientDto } from '../../../../core/models/patient.model';
import { UsersService } from '../../../../core/services/users.service';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-patient-access',
  templateUrl: './patient-access.html',
  styleUrls: ['./patient-access.scss'],
  standalone: true,
  imports: [CommonModule, ...MAT_FORM_IMPORTS, MatTabsModule, MatChipsModule],
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

  historyEntries: AccessRequestHistoryDto[] = [];
  isLoadingHistory = false;

  requestStatusMap = new Map<string, AccessRequestStatus>();

  get activeRequests(): AccessRequestDto[] {
    return this.myRequests.filter((r) => r.status === 'Approved');
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadMyRequests();
    this.loadHistory();
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

  /**
   * Loads all of the doctor's access requests and builds the status map
   * used to show the correct action button in the search results.
   */
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

  /**
   * Loads the full history of access request actions for this doctor.
   */
  async loadHistory(): Promise<void> {
    this.isLoadingHistory = true;
    try {
      this.historyEntries = await this.accessRequestService.getMyHistory();
    } catch {
      this.notify.showError('Failed to load history.');
    } finally {
      this.isLoadingHistory = false;
    }
  }

  /**
   * Returns the current access request status for a patient, or null if none exists.
   */
  getPatientStatus(patientId: string): AccessRequestStatus | null {
    return this.requestStatusMap.get(patientId) ?? null;
  }

  /**
   * Sends a new access request to the given patient and updates the local state.
   */
  async onRequestAccess(patient: PatientDto): Promise<void> {
    this.requestingId = patient.id;
    try {
      const result = await this.accessRequestService.requestAccess({ patientId: patient.id });
      this.requestStatusMap.set(patient.id, 'Pending');
      this.myRequests = [result, ...this.myRequests];
      this.notify.showSuccess(`Access requested for ${patient.firstName} ${patient.lastName}.`);
      this.loadHistory();
    } catch {
      this.notify.showError('Failed to send access request.');
    } finally {
      this.requestingId = null;
    }
  }

  /**
   * Navigates to the doctor's view of the patient's full profile.
   * Passes the patient name and wallet address as query params.
   */
  viewPatientProfile(req: AccessRequestDto): void {
    this.router.navigate(['/patient', req.patientId, 'profile'], {
      queryParams: {
        patientName: req.patientName,
        patientWalletAddress: req.patientWalletAddress,
      },
    });
  }

  /**
   * Returns a human-readable string for the remaining access time.
   */
  getRemainingTime(expiresAt?: string): string {
    if (!expiresAt) return '';
    const now = new Date().getTime();
    const normalized = expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z';
    const exp = new Date(normalized).getTime();
    const diff = exp - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `Expires in ${days}d ${hours % 24}h`;
    return `Expires in ${hours}h`;
  }

  formatDate(date?: string): string {
    if (!date) return '';
    const normalized = date.endsWith('Z') ? date : date + 'Z';
    return new Date(normalized).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(date?: string): string {
    if (!date) return '';
    const normalized = date.endsWith('Z') ? date : date + 'Z';
    return new Date(normalized).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'Approved':
        return 'badge-approved';
      case 'Rejected':
        return 'badge-rejected';
      case 'Revoked':
        return 'badge-revoked';
      default:
        return 'badge-requested';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'Approved':
        return 'check_circle';
      case 'Rejected':
        return 'cancel';
      case 'Revoked':
        return 'block';
      default:
        return 'send';
    }
  }
}
