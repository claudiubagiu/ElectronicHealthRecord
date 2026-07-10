import { Injectable, inject } from '@angular/core';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { PrescriptionDecryptionService } from './prescription-decryption.service';
import { AppError } from '../../../core/errors/app.error';
import { Prescription } from '../../../core/models/blockchain.model';

export interface DispenseLookupResult {
  prescription: Prescription;
}

@Injectable({ providedIn: 'root' })
export class PrescriptionDispenseService {
  private blockchainService = inject(BlockchainService);
  private decryptionService = inject(PrescriptionDecryptionService);

  async lookupByCode(shortCode: string): Promise<DispenseLookupResult> {
    const normalizedCode = shortCode.trim().toUpperCase();

    if (normalizedCode.length !== 6) {
      throw new AppError({
        message: 'Please enter the full 6-character prescription code.',
        status: 400,
        title: 'Invalid Code',
        type: 'INVALID_PRESCRIPTION_CODE',
      });
    }

    const codeHash = this.blockchainService.hashShortCode(normalizedCode);
    const prescription = await this.blockchainService.getPrescriptionByCodeHash(codeHash);

    return { prescription };
  }

  async decryptAndOpen(shortCode: string, prescription: Prescription): Promise<void> {
    const normalizedCode = shortCode.trim().toUpperCase();
    await this.decryptionService.decryptAndOpenForPharmacist(normalizedCode, prescription);
  }

  async dispense(shortCode: string): Promise<void> {
    const normalizedCode = shortCode.trim().toUpperCase();
    const codeHash = this.blockchainService.hashShortCode(normalizedCode);
    await this.blockchainService.dispensePrescription(codeHash);
  }
}
