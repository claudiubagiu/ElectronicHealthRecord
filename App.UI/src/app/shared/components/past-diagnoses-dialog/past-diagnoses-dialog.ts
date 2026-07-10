import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_FORM_IMPORTS } from '../../imports/material.imports';
import { Diagnosis } from '../../../core/models/blockchain.model';

export interface PastDiagnosesDialogData {
  diagnoses: Diagnosis[];
  alreadySelected: Diagnosis[];
}

export interface PastDiagnosesDialogResult {
  selected: Diagnosis[];
}

@Component({
  selector: 'app-past-diagnoses-dialog',
  templateUrl: './past-diagnoses-dialog.html',
  styleUrls: ['./past-diagnoses-dialog.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatDialogModule, MatCheckboxModule],
})
export class PastDiagnosesDialogComponent implements OnInit {
  searchControl = new FormControl('');
  selectedIds = new Set<bigint>();
  filteredDiagnoses: Diagnosis[] = [];

  constructor(
    public dialogRef: MatDialogRef<PastDiagnosesDialogComponent, PastDiagnosesDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: PastDiagnosesDialogData
  ) {}

  ngOnInit(): void {
    this.data.alreadySelected.forEach((d) => this.selectedIds.add(d.id));
    this.filteredDiagnoses = this.data.diagnoses;

    this.searchControl.valueChanges.subscribe((term) => {
      const q = (term ?? '').toLowerCase().trim();
      if (!q) {
        this.filteredDiagnoses = this.data.diagnoses;
      } else {
        this.filteredDiagnoses = this.data.diagnoses.filter((d) =>
          d.title.toLowerCase().includes(q)
        );
      }
    });
  }

  toggle(diagnosis: Diagnosis): void {
    if (this.selectedIds.has(diagnosis.id)) {
      this.selectedIds.delete(diagnosis.id);
    } else {
      this.selectedIds.add(diagnosis.id);
    }
  }

  isSelected(diagnosis: Diagnosis): boolean {
    return this.selectedIds.has(diagnosis.id);
  }

  formatDate(timestamp: bigint): string {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  onAdd(): void {
    const selected = this.data.diagnoses.filter((d) => this.selectedIds.has(d.id));
    this.dialogRef.close({ selected });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }
}
