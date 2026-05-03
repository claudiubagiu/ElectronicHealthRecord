import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';

export type MedicalCardType = 'diagnosis' | 'prescription' | 'lab-analysis';

export interface MedicalCardMeta {
  icon: string;
  text: string | null;
}

const TYPE_CONFIG: Record<MedicalCardType, { label: string }> = {
  diagnosis: { label: 'Diagnosis' },
  prescription: { label: 'Prescription' },
  'lab-analysis': { label: 'Lab Analysis' },
};

@Component({
  selector: 'app-medical-card',
  templateUrl: './medical-card.html',
  styleUrls: ['./medical-card.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class MedicalCard {
  @Input() type!: MedicalCardType;
  @Input() title?: string | null;
  @Input() meta: MedicalCardMeta[] = [];
  @Input() isLoading = false;
  @Input() loadingText = 'Decrypting...';
  @Input() actionLabel = 'View report';
  @Input() actionIcon = 'lock_open';
  @Input() showAction = true;

  @Output() actionClick = new EventEmitter<void>();

  get displayTitle(): string {
    return this.title?.trim() ? this.title : TYPE_CONFIG[this.type].label;
  }
}
