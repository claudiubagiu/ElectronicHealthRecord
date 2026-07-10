import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  PrescriptionDispenseService,
  DispenseLookupResult,
} from '../../services/prescription-dispense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Prescription } from '../../../../core/models/blockchain.model';
import { AppError } from '../../../../core/errors/app.error';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-dispense-prescription',
  templateUrl: './dispense-prescription.html',
  styleUrls: ['./dispense-prescription.scss'],
  standalone: true,
  imports: [...MAT_FORM_IMPORTS],
})
export class DispensePrescription implements OnInit {
  private fb = inject(FormBuilder);
  private dispenseService = inject(PrescriptionDispenseService);
  private notify = inject(NotificationService);

  form!: FormGroup;

  isSearching = false;
  isOpening = false;
  isDispensing = false;
  dispensedSuccess = false;

  prescription: Prescription | null = null;
  lookupError: string | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });
  }

  get codeValue(): string {
    return (this.form.get('code')?.value ?? '').toUpperCase();
  }

  onCodeInput(): void {
    const ctrl = this.form.get('code')!;
    const upper = ctrl.value?.toUpperCase() ?? '';
    ctrl.setValue(upper, { emitEvent: false });
    this.prescription = null;
    this.lookupError = null;
    this.dispensedSuccess = false;
  }

  async onSearch(): Promise<void> {
    if (this.form.invalid || this.isSearching) return;

    this.isSearching = true;
    this.prescription = null;
    this.lookupError = null;
    this.dispensedSuccess = false;

    try {
      const result: DispenseLookupResult = await this.dispenseService.lookupByCode(this.codeValue);
      this.prescription = result.prescription;
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Failed to find prescription.';
      this.lookupError = message;
    } finally {
      this.isSearching = false;
    }
  }

  async onOpenPdf(): Promise<void> {
    if (!this.prescription || this.isOpening) return;

    this.isOpening = true;
    try {
      await this.dispenseService.decryptAndOpen(this.codeValue, this.prescription);
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Failed to decrypt prescription.';
      this.notify.showError(message);
    } finally {
      this.isOpening = false;
    }
  }

  async onDispense(): Promise<void> {
    if (!this.prescription || this.isDispensing) return;

    this.isDispensing = true;
    try {
      await this.dispenseService.dispense(this.codeValue);
      this.dispensedSuccess = true;
      const result = await this.dispenseService.lookupByCode(this.codeValue);
      this.prescription = result.prescription;
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : 'Failed to dispense prescription.';
      this.notify.showError(message);
    } finally {
      this.isDispensing = false;
    }
  }

  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  shortenAddress(address: string): string {
    if (!address || address === '0x0000000000000000000000000000000000000000') return '—';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
