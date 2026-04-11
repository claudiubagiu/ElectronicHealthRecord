import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';

export type SharedRecordType = 'diagnosis' | 'prescription' | 'lab-analysis';

const TYPE_CONFIG: Record<SharedRecordType, { label: string }> = {
  diagnosis: { label: 'Diagnosis' },
  prescription: { label: 'Prescription' },
  'lab-analysis': { label: 'Lab Analysis' },
};

@Component({
  selector: 'app-shared-record-card',
  templateUrl: './shared-record-card.html',
  styleUrls: ['./shared-record-card.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe],
})
export class SharedRecordCard {
  @Input() type!: SharedRecordType;
  @Input() title?: string | null;
  @Input() timestamp?: number | null;
  @Input() authorName?: string | null;
  @Input() walletAddress?: string | null;
  @Input() ipfsCid?: string | null;
  @Input() isDownloading = false;
  @Input() status?: 'active' | 'dispensed' | null;

  @Output() downloadClick = new EventEmitter<void>();

  get displayTitle(): string {
    return this.title?.trim() ? this.title : TYPE_CONFIG[this.type].label;
  }

  get shortWallet(): string {
    if (!this.walletAddress) return '';
    return this.walletAddress.slice(0, 6) + '...' + this.walletAddress.slice(-4);
  }

  get shortCid(): string {
    if (!this.ipfsCid) return '';
    return this.ipfsCid.length > 30
      ? this.ipfsCid.slice(0, 20) + '...' + this.ipfsCid.slice(-6)
      : this.ipfsCid;
  }

  get dateMs(): number | null {
    return this.timestamp ? this.timestamp * 1000 : null;
  }
}
