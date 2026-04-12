import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccessRequestHistoryDto } from '../../../core/models/access-request-history.model';

@Component({
  selector: 'app-access-history-list',
  templateUrl: './access-history-list.html',
  styleUrls: ['./access-history-list.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
})
export class AccessHistoryListComponent {
  @Input() entries: AccessRequestHistoryDto[] = [];
  @Input() isLoading = false;
  @Input() nameField: 'doctorName' | 'patientName' = 'doctorName';
  @Input() avatarIcon: 'medical_services' | 'person' = 'medical_services';

  formatDateTime(dateStr: string): string {
    const normalized = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
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
      case 'Expired':
        return 'badge-expired';
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
      case 'Expired':
        return 'timer_off';
      default:
        return 'send';
    }
  }
}
