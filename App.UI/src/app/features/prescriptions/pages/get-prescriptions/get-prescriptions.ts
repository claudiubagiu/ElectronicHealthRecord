import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { PrescriptionDecryptionService } from '../../services/prescription-decryption.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Prescription } from '../../../../core/models/blockchain.model';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-my-prescriptions',
  templateUrl: './get-prescriptions.html',
  styleUrls: ['./get-prescriptions.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class GetPrescriptions implements OnInit {
  private blockchainService = inject(BlockchainService);
  private web3Service = inject(Web3Service);
  private decryptionService = inject(PrescriptionDecryptionService);
  private notify = inject(NotificationService);

  prescriptions: Prescription[] = [];
  isLoading = false;
  openingId: bigint | null = null;

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
      this.prescriptions = await Promise.all(
        ids.map((id) => this.blockchainService.getPrescription(id))
      );
      // Most recent first
      this.prescriptions.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    } catch (error: any) {
      console.error('[MyPrescriptions] error:', error);
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

  formatTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
  }

  shortenAddress(address: string): string {
    if (!address || address === '0x0000000000000000000000000000000000000000') return '—';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
