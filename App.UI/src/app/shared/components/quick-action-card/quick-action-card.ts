import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';

@Component({
  selector: 'app-quick-action-card',
  templateUrl: './quick-action-card.html',
  styleUrls: ['./quick-action-card.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class QuickActionCard {
  @Input() label!: string;
  @Input() icon!: string;
  @Input() color: 'blue' | 'purple' | 'green' | 'cyan' | 'orange' = 'blue';

  @Output() clicked = new EventEmitter<void>();
}
