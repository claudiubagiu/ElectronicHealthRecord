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
import { AuthService } from '../../../../core/services/auth.service';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';
import { AccessHistoryListComponent } from '../../../../shared/components/access-history-list/access-history-list';

@Component({
  selector: 'app-patient-access',
  templateUrl: './patient-access.html',
  styleUrls: ['./patient-access.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ...MAT_FORM_IMPORTS,
    MatTabsModule,
    MatChipsModule,
    AccessHistoryListComponent,
  ],
})
export class PatientAccess implements OnInit, OnDestroy {
  private usersService = inject(UsersService);
  private accessRequestService = inject(AccessRequestService);
  private notify = inject(NotificationService);
  private authService = inject(AuthService);
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
      this.loadHistory();
    } catch {
      this.notify.showError('Failed to send access request.');
    } finally {
      this.requestingId = null;
    }
  }

  get isLabTechnician(): boolean {
    const user = this.authService.getDecodedToken();
    const roles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
    return roles.includes('LaboratoryTechnician');
  }

  /**
   * For Doctor/MedicalAssistant: navigates to the patient's profile page.
   * For LaboratoryTechnician: navigates directly to the "Add Lab Analysis"
   * form, pre-filled with this patient — lab techs don't have a patient
   * profile view, their only action once access is granted is to upload
   * a new analysis.
   */
  viewPatientProfile(req: AccessRequestDto): void {
    const user = this.authService.getDecodedToken();
    const roles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];

    if (roles.includes('LaboratoryTechnician')) {
      this.router.navigate(['/add-lab-analysis'], {
        queryParams: {
          patientId: req.patientId,
          patientName: req.patientName,
          patientWalletAddress: req.patientWalletAddress,
        },
      });
      return;
    }

    const isAssistant = roles.includes('MedicalAssistant');
    const targetPath = isAssistant ? 'assistant-profile' : 'profile';

    this.router.navigate(['/patient', req.patientId, targetPath], {
      queryParams: {
        patientName: req.patientName,
        patientWalletAddress: req.patientWalletAddress,
      },
    });
  }

  getRemainingTime(expiresAt?: string): string {
    if (!expiresAt) return '';
    const now = new Date().getTime();
    const normalized = expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z';
    const exp = new Date(normalized).getTime();
    const diff = exp - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }

  formatDate(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
