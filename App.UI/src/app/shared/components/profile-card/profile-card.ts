import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';

export interface ProfileDetailRow {
  icon: string;
  label: string;
  value: string;
  isWallet?: boolean;
  onClickCopy?: () => void;
}

@Component({
  selector: 'app-profile-card',
  templateUrl: './profile-card.html',
  styleUrls: ['./profile-card.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class ProfileCard {
  @Input() name!: string;
  @Input() role!: string;
  @Input() roleIcon!: string;
  @Input() avatarColor: 'blue' | 'orange' = 'blue';
  @Input() details: ProfileDetailRow[] = [];
  @Input() showBackButton = false;
  @Input() backTooltip = 'Go back';

  @Output() backClick = new EventEmitter<void>();
}
