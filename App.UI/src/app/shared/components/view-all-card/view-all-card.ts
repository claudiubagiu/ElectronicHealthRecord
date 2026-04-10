import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';

@Component({
  selector: 'app-view-all-card',
  templateUrl: './view-all-card.html',
  styleUrls: ['./view-all-card.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class ViewAllCard {
  @Input() icon!: string;
  @Input() label!: string;
  @Output() clicked = new EventEmitter<void>();
}
