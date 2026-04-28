import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_IMPORTS } from '../../imports/material.imports';
import { MedicalDataService } from '../../../features/medical-data/services/medical-data.service';
import { MedicalDataCryptoService } from '../../../features/medical-data/services/medical-data-crypto.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MedicalRecordDto } from '../../../features/medical-data/models/medical-data.model';
import {
  MedicalRecordFormData,
  MedicalRecordType,
} from '../../../features/medical-data/models/medical-data-form.model';

export interface DecryptedMedicalRecord {
  id: string;
  recordType: MedicalRecordType;
  data: MedicalRecordFormData;
  createdByDoctorId: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-medical-records-panel',
  templateUrl: './medical-records-panel.html',
  styleUrls: ['./medical-records-panel.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS, MatSelectModule, MatCheckboxModule, MatDialogModule],
})
export class MedicalRecordsPanelComponent implements OnInit, OnChanges {
  @Input() patientId!: string;
  @Input() selectionMode = false;
  @Input() initialSelection: string[] = [];
  @Output() selectionChanged = new EventEmitter<string[]>();

  private medicalDataService = inject(MedicalDataService);
  private cryptoService = inject(MedicalDataCryptoService);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  records: DecryptedMedicalRecord[] = [];
  isLoading = false;
  selectedIds = new Set<string>();

  expandedDetailId: string | null = null;
  expandedEditId: string | null = null;
  editForms: Record<string, FormGroup> = {};

  isAddExpandedForType: Partial<Record<MedicalRecordType, boolean>> = {};
  addForms: Partial<Record<MedicalRecordType, FormGroup>> = {};

  isSavingEdit = false;
  isSavingAdd: Partial<Record<MedicalRecordType, boolean>> = {};
  isDeletingId: string | null = null;

  readonly recordTypes: MedicalRecordType[] = [
    'Allergy',
    'Condition',
    'Immunization',
    'Implant',
    'Note',
  ];

  readonly recordTypeConfig: Record<
    MedicalRecordType,
    { icon: string; color: string; label: string }
  > = {
    Allergy: { icon: 'warning_amber', color: '#e65100', label: 'Allergies' },
    Condition: { icon: 'monitor_heart', color: '#1565c0', label: 'Conditions' },
    Immunization: { icon: 'vaccines', color: '#2e7d32', label: 'Immunizations' },
    Implant: { icon: 'medical_services', color: '#6a1b9a', label: 'Implants / Devices' },
    Note: { icon: 'note', color: '#00796b', label: 'Notes' },
  };

  get groupedRecords(): { type: MedicalRecordType; items: DecryptedMedicalRecord[] }[] {
    return this.recordTypes.map((type) => ({
      type,
      items: this.records.filter((r) => r.recordType === type),
    }));
  }

  ngOnInit(): void {
    this.loadRecords();
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSelection'] && this.records.length > 0) {
      this.applyInitialSelection();
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async loadRecords(): Promise<void> {
    if (!this.patientId) return;
    this.isLoading = true;
    try {
      const encrypted: MedicalRecordDto[] = await this.medicalDataService.getByPatientId(
        this.patientId
      );
      const decrypted: DecryptedMedicalRecord[] = [];
      for (const rec of encrypted) {
        try {
          const data = await this.cryptoService.decrypt(rec);
          decrypted.push({
            id: rec.id,
            recordType: rec.recordType as MedicalRecordType,
            data,
            createdByDoctorId: rec.createdByDoctorId,
            createdAt: rec.createdAt,
            updatedAt: rec.updatedAt,
          });
        } catch (err) {
          console.error(`Failed to decrypt record ${rec.id}:`, err);
        }
      }
      this.records = decrypted;

      this.applyInitialSelection();
    } catch {
      this.notify.showError('Failed to load medical records.');
    } finally {
      this.isLoading = false;
    }
  }

  private applyInitialSelection(): void {
    if (!this.selectionMode || this.initialSelection.length === 0) return;

    if (this.selectedIds.size > 0) return;

    const validIds = this.initialSelection.filter((id) => this.records.some((r) => r.id === id));
    if (validIds.length === 0) return;

    validIds.forEach((id) => this.selectedIds.add(id));
    this.selectionChanged.emit(Array.from(this.selectedIds));
  }

  // ── Detail expand ─────────────────────────────────────────────────────────

  toggleDetail(id: string): void {
    this.expandedDetailId = this.expandedDetailId === id ? null : id;
    if (this.expandedDetailId !== null) {
      this.expandedEditId = null;
    }
  }

  getDetailRows(record: DecryptedMedicalRecord): { label: string; value: string; icon: string }[] {
    const d = record.data;
    const rows: { label: string; value: string; icon: string }[] = [];

    switch (record.recordType) {
      case 'Allergy':
        if (d.substance)
          rows.push({ label: 'Substance', value: d.substance, icon: 'warning_amber' });
        if (d.severity) rows.push({ label: 'Severity', value: d.severity, icon: 'priority_high' });
        if (d.reaction) rows.push({ label: 'Reaction', value: d.reaction, icon: 'sick' });
        break;
      case 'Condition':
        if (d.conditionName)
          rows.push({ label: 'Condition', value: d.conditionName, icon: 'monitor_heart' });
        if (d.diagnosedAt)
          rows.push({ label: 'Diagnosed', value: d.diagnosedAt, icon: 'calendar_today' });
        if (d.status) rows.push({ label: 'Status', value: d.status, icon: 'info' });
        break;
      case 'Immunization':
        if (d.vaccine) rows.push({ label: 'Vaccine', value: d.vaccine, icon: 'vaccines' });
        if (d.administeredAt)
          rows.push({ label: 'Administered', value: d.administeredAt, icon: 'event' });
        if (d.boosterDue)
          rows.push({ label: 'Booster due', value: d.boosterDue, icon: 'event_repeat' });
        break;
      case 'Implant':
        if (d.implantName)
          rows.push({ label: 'Device', value: d.implantName, icon: 'medical_services' });
        if (d.implantedAt) rows.push({ label: 'Implanted', value: d.implantedAt, icon: 'event' });
        break;
      case 'Note':
        if (d.noteContent) rows.push({ label: 'Note', value: d.noteContent, icon: 'note' });
        break;
    }

    if (d.notes) rows.push({ label: 'Notes', value: d.notes, icon: 'notes' });
    return rows;
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.selectionChanged.emit(Array.from(this.selectedIds));
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  getSummary(record: DecryptedMedicalRecord): string {
    const d = record.data;
    switch (record.recordType) {
      case 'Allergy':
        return `${d.substance ?? '—'} · ${d.severity ?? ''}`;
      case 'Condition':
        return `${d.conditionName ?? '—'} · ${d.status ?? ''}`;
      case 'Immunization':
        return `${d.vaccine ?? '—'}`;
      case 'Implant':
        return `${d.implantName ?? '—'}`;
      case 'Note':
        return (d.noteContent ?? '').substring(0, 60);
      default:
        return '';
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  toggleEdit(record: DecryptedMedicalRecord): void {
    if (this.expandedEditId === record.id) {
      this.expandedEditId = null;
      return;
    }
    this.expandedEditId = record.id;
    this.expandedDetailId = null;
    this.editForms[record.id] = this.buildFormForType(record.recordType, record.data);
  }

  cancelEdit(): void {
    this.expandedEditId = null;
  }

  async saveEdit(record: DecryptedMedicalRecord): Promise<void> {
    const form = this.editForms[record.id];
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }

    this.isSavingEdit = true;
    try {
      const newData = this.extractFormData(record.recordType, form);
      const updated: DecryptedMedicalRecord = { ...record, data: newData };
      await this.cryptoService.updateRecord(updated, this.patientId);

      const idx = this.records.findIndex((r) => r.id === record.id);
      if (idx !== -1) {
        this.records = [
          ...this.records.slice(0, idx),
          { ...record, data: newData },
          ...this.records.slice(idx + 1),
        ];
      }

      this.expandedEditId = null;
      this.notify.showSuccess('Record updated successfully.');
    } catch {
      this.notify.showError('Failed to update record.');
    } finally {
      this.isSavingEdit = false;
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async onDelete(record: DecryptedMedicalRecord): Promise<void> {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this ${record.recordType} record?`
    );
    if (!confirmed) return;

    this.isDeletingId = record.id;
    try {
      await this.cryptoService.deleteRecord(record.id);
      this.records = this.records.filter((r) => r.id !== record.id);
      this.selectedIds.delete(record.id);
      this.selectionChanged.emit(Array.from(this.selectedIds));
      this.notify.showSuccess('Record deleted.');
    } catch {
      this.notify.showError('Failed to delete record.');
    } finally {
      this.isDeletingId = null;
    }
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  toggleAdd(type: MedicalRecordType): void {
    const current = this.isAddExpandedForType[type] ?? false;
    this.isAddExpandedForType = { ...this.isAddExpandedForType, [type]: !current };
    if (!current) {
      this.addForms[type] = this.buildFormForType(type, null);
    }
  }

  cancelAdd(type: MedicalRecordType): void {
    this.isAddExpandedForType = { ...this.isAddExpandedForType, [type]: false };
  }

  async saveNew(type: MedicalRecordType): Promise<void> {
    const form = this.addForms[type];
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }

    this.isSavingAdd = { ...this.isSavingAdd, [type]: true };
    try {
      const data = this.extractFormData(type, form);
      await this.cryptoService.submit({ patientId: this.patientId, record: data });

      await this.loadRecords();

      if (this.selectionMode) {
        const newest = [...this.records]
          .filter((r) => r.recordType === type)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (newest) {
          this.selectedIds.add(newest.id);
          this.selectionChanged.emit(Array.from(this.selectedIds));
        }
      }

      this.isAddExpandedForType = { ...this.isAddExpandedForType, [type]: false };
      this.notify.showSuccess('Record added successfully.');
    } catch {
      this.notify.showError('Failed to add record.');
    } finally {
      this.isSavingAdd = { ...this.isSavingAdd, [type]: false };
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  buildFormForType(type: MedicalRecordType, prefill: MedicalRecordFormData | null): FormGroup {
    switch (type) {
      case 'Allergy':
        return this.fb.group({
          substance: [prefill?.substance ?? '', Validators.required],
          severity: [prefill?.severity ?? '', Validators.required],
          reaction: [prefill?.reaction ?? '', Validators.required],
          notes: [prefill?.notes ?? ''],
        });
      case 'Condition':
        return this.fb.group({
          conditionName: [prefill?.conditionName ?? '', Validators.required],
          diagnosedAt: [prefill?.diagnosedAt ?? '', Validators.required],
          status: [prefill?.status ?? '', Validators.required],
          notes: [prefill?.notes ?? ''],
        });
      case 'Immunization':
        return this.fb.group({
          vaccine: [prefill?.vaccine ?? '', Validators.required],
          administeredAt: [prefill?.administeredAt ?? '', Validators.required],
          boosterDue: [prefill?.boosterDue ?? ''],
          notes: [prefill?.notes ?? ''],
        });
      case 'Implant':
        return this.fb.group({
          implantName: [prefill?.implantName ?? '', Validators.required],
          implantedAt: [prefill?.implantedAt ?? '', Validators.required],
          notes: [prefill?.notes ?? ''],
        });
      case 'Note':
        return this.fb.group({
          noteContent: [prefill?.noteContent ?? '', Validators.required],
          notes: [prefill?.notes ?? ''],
        });
    }
  }

  extractFormData(type: MedicalRecordType, form: FormGroup): MedicalRecordFormData {
    const v = form.value;
    const base: MedicalRecordFormData = { type, notes: v.notes || undefined };
    switch (type) {
      case 'Allergy':
        return { ...base, substance: v.substance, severity: v.severity, reaction: v.reaction };
      case 'Condition':
        return {
          ...base,
          conditionName: v.conditionName,
          diagnosedAt: v.diagnosedAt,
          status: v.status,
        };
      case 'Immunization':
        return {
          ...base,
          vaccine: v.vaccine,
          administeredAt: v.administeredAt,
          boosterDue: v.boosterDue || undefined,
        };
      case 'Implant':
        return { ...base, implantName: v.implantName, implantedAt: v.implantedAt };
      case 'Note':
        return { ...base, noteContent: v.noteContent };
    }
  }

  getForm(id: string): FormGroup {
    return this.editForms[id];
  }

  getAddForm(type: MedicalRecordType): FormGroup {
    return this.addForms[type]!;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
