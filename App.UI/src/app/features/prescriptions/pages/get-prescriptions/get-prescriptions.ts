import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { PrescriptionDecryptionService } from '../../services/prescription-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Prescription } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { SharedRecordCard } from '../../../../shared/components/shared-record-card/shared-record-card';

@Component({
  selector: 'app-my-prescriptions',
  templateUrl: './get-prescriptions.html',
  styleUrls: ['./get-prescriptions.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, SharedRecordCard],
})
export class GetPrescriptions implements OnInit {
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(PrescriptionDecryptionService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  prescriptions: Prescription[] = [];
  isLoading = false;
  openingId: bigint | null = null;

  readonly Number = Number;

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  async loadPrescriptions(): Promise<void> {
    await this.web3Service.waitForInit();

    const address = this.web3Service.getAddressOrNull();
    if (!address) {
      this.notify.showError('Wallet not connected.');
      return;
    }

    this.isLoading = true;
    try {
      const ids = await this.blockchainService.getPatientPrescriptionIds(address);
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
      await this.decryptionService.decryptAndOpenForPatient(prescription);
    } catch {
      this.notify.showError('Failed to decrypt prescription. Please try again.');
    } finally {
      this.openingId = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  shortenAddress(address: string): string {
    if (!address || address === '0x0000000000000000000000000000000000000000') return '—';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
