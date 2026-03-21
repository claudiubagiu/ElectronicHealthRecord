import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Base Material imports used by virtually every page component.
 * Spread into the `imports` array of standalone components:
 *
 * @example
 * imports: [...MAT_COMMON_IMPORTS, MatTabsModule],
 */
export const MAT_COMMON_IMPORTS = [
  CommonModule,
  MatButtonModule,
  MatIconModule,
  MatProgressSpinnerModule,
  MatDividerModule,
  MatTooltipModule,
] as const;

/**
 * Form-specific Material imports (extends MAT_COMMON_IMPORTS).
 * Use for pages with reactive forms.
 *
 * @example
 * imports: [...MAT_FORM_IMPORTS, MatAutocompleteModule],
 */
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export const MAT_FORM_IMPORTS = [
  ...MAT_COMMON_IMPORTS,
  ReactiveFormsModule,
  MatFormFieldModule,
  MatInputModule,
] as const;
