import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MedicDto } from '../models/medic.model';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { environment } from '../../../../environments/environment';

// Must match the Role enum in the smart contract:
// enum Role { NONE, DOCTOR, LAB_TECH, PHARMACIST, MEDICAL_ASSISTANT }
const ROLE_ENUM: Record<string, number> = {
  Doctor: 1,
  LaboratoryTechnician: 2,
  Pharmacist: 3,
  MedicalAssistant: 4,
};

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API_URL = `${environment.apiUrls.auth.replace('/api/Auth', '/api/Admin')}`;
  private http = inject(HttpClient);
  private blockchainService = inject(BlockchainService);

  getPendingMedics(): Promise<MedicDto[]> {
    return firstValueFrom(this.http.get<MedicDto[]>(`${this.API_URL}/medics/pending`));
  }

  getApprovedMedics(): Promise<MedicDto[]> {
    return firstValueFrom(this.http.get<MedicDto[]>(`${this.API_URL}/medics/approved`));
  }

  /**
   * Approves a medic in two steps:
   * 1. Calls assignRole(walletAddress, roleEnum) on the smart contract (admin signs with MetaMask).
   * 2. Sets IsApproved = true in the Auth.Api database.
   *
   * Both must succeed — if the blockchain call fails, the DB call is not made.
   */
  async approveMedic(medic: MedicDto): Promise<MedicDto> {
    const role = medic.roles?.[0];
    const roleEnum = ROLE_ENUM[role];
    if (roleEnum === undefined) {
      throw new Error(`Unknown role: ${role}. Cannot assign role on-chain.`);
    }
    await this.blockchainService.assignRole(medic.walletAddress, roleEnum);
    return firstValueFrom(
      this.http.post<MedicDto>(`${this.API_URL}/medics/${medic.id}/approve`, {}),
    );
  }

  /**
   * Revokes a medic in two steps:
   * 1. Calls revokeRole(walletAddress) on the smart contract (admin signs with MetaMask).
   * 2. Sets IsApproved = false in the Auth.Api database.
   *
   * Both must succeed — if the blockchain call fails, the DB call is not made.
   */
  async revokeMedic(medic: MedicDto): Promise<MedicDto> {
    await this.blockchainService.revokeRole(medic.walletAddress);
    return firstValueFrom(
      this.http.post<MedicDto>(`${this.API_URL}/medics/${medic.id}/revoke`, {}),
    );
  }
}
