import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import { CarouselSection } from '../../../../shared/components/carousel-section/carousel-section';
import {
  ProfileCard,
  ProfileDetailRow,
} from '../../../../shared/components/profile-card/profile-card';
import { MedicalCard } from '../../../../shared/components/medical-card/medical-card';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { UsersService } from '../../../../core/services/users.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PharmacistDto } from '../../../../core/models/pharmacist.model';
import { PrescriptionSummary } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-pharmacist-profile',
  templateUrl: './pharmacist-profile.html',
  styleUrls: ['./pharmacist-profile.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe, CarouselSection, ProfileCard, MedicalCard],
})
export class PharmacistProfile implements OnInit {
  private usersService = inject(UsersService);
  private blockchain = inject(BlockchainService);
  private notify = inject(NotificationService);

  pharmacist: PharmacistDto | null = null;
  isLoadingProfile = false;

  dispensedSummaries: PrescriptionSummary[] = [];
  isLoadingDispensed = false;

  get profileDetails(): ProfileDetailRow[] {
    if (!this.pharmacist) return [];
    return [
      { icon: 'badge', label: 'License', value: this.pharmacist.licenseNumber },
      {
        icon: 'local_pharmacy',
        label: 'Pharmacy',
        value: this.pharmacist.entityAffiliation ?? 'Not specified',
      },
      {
        icon: 'account_balance_wallet',
        label: 'Wallet',
        value: this.pharmacist.walletAddress,
        isWallet: true,
      },
    ];
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadProfile(), this.loadDispensed()]);
  }

  private async loadProfile(): Promise<void> {
    this.isLoadingProfile = true;
    try {
      this.pharmacist = await this.usersService.getMyPharmacistProfile();
    } catch {
      this.notify.showError('Failed to load profile.');
    } finally {
      this.isLoadingProfile = false;
    }
  }

  private async loadDispensed(): Promise<void> {
    this.isLoadingDispensed = true;
    try {
      this.dispensedSummaries = await this.blockchain.getPharmacistDispensedSummary();
    } catch {
      this.notify.showError('Failed to load dispensed prescriptions.');
    } finally {
      this.isLoadingDispensed = false;
    }
  }

  formatTimestamp(ts: bigint): Date {
    return new Date(Number(ts) * 1000);
  }

  shortenAddress(addr: string): string {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  formatDispensedDate(ts: bigint): Date {
    return new Date(Number(ts) * 1000);
  }
}
