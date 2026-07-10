import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

export const MAT_COMMON_IMPORTS = [
  CommonModule,
  MatButtonModule,
  MatIconModule,
  MatProgressSpinnerModule,
  MatDividerModule,
  MatTooltipModule,
] as const;

import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export const MAT_FORM_IMPORTS = [
  ...MAT_COMMON_IMPORTS,
  ReactiveFormsModule,
  MatFormFieldModule,
  MatInputModule,
] as const;
