import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { PrescriptionDecryptionService } from '../../../prescriptions/services/prescription-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Prescription } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { SharedRecordCard } from '../../../../shared/components/shared-record-card/shared-record-card';

@Component({
  selector: 'app-patient-prescriptions',
  templateUrl: './patient-prescriptions.html',
  styleUrls: ['./patient-prescriptions.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, SharedRecordCard],
})
export class PatientPrescriptions implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blockchainService = inject(BlockchainService);
  private decryptionService = inject(PrescriptionDecryptionService);
  private notify = inject(NotificationService);

  patientId = '';
  patientName = '';
  patientWalletAddress = '';

  prescriptions: Prescription[] = [];
  isLoading = false;
  openingId: bigint | null = null;

  readonly Number = Number;

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.patientName = this.route.snapshot.queryParamMap.get('patientName') ?? 'Patient';
    this.patientWalletAddress = this.route.snapshot.queryParamMap.get('patientWalletAddress') ?? '';
    this.loadPrescriptions();
  }

  async loadPrescriptions(): Promise<void> {
    if (!this.patientWalletAddress) {
      this.notify.showError('Missing patient wallet address.');
      return;
    }

    this.isLoading = true;
    try {
      const ids = await this.blockchainService.getPatientPrescriptionIds(this.patientWalletAddress);
      const all = await Promise.all(ids.map((id) => this.blockchainService.getPrescription(id)));
      this.prescriptions = all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch {
      this.notify.showError('Failed to load prescriptions.');
    } finally {
      this.isLoading = false;
    }
  }

  async openPrescription(prescription: Prescription): Promise<void> {
    this.openingId = prescription.id;
    try {
      await this.decryptionService.decryptAndOpenForPatient(prescription, this.patientId);
    } catch {
      this.notify.showError('Failed to decrypt prescription. Please try again.');
    } finally {
      this.openingId = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/patient', this.patientId, 'profile'], {
      queryParams: {
        patientName: this.patientName,
        patientWalletAddress: this.patientWalletAddress,
      },
    });
  }
}
