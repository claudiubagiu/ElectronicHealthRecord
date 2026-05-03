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
import { LaboratoryTechnicianDto } from '../../../../core/models/lab-technician.model';
import { LabAnalysisSummary } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-lab-tech-profile',
  templateUrl: './lab-tech-profile.html',
  styleUrls: ['./lab-tech-profile.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe, CarouselSection, ProfileCard, MedicalCard],
})
export class LabTechProfile implements OnInit {
  private usersService = inject(UsersService);
  private blockchain = inject(BlockchainService);
  private notify = inject(NotificationService);

  labTech: LaboratoryTechnicianDto | null = null;
  isLoadingProfile = false;

  labAnalysisSummaries: LabAnalysisSummary[] = [];
  isLoadingAnalyses = false;

  get profileDetails(): ProfileDetailRow[] {
    if (!this.labTech) return [];
    return [
      { icon: 'biotech', label: 'Specialization', value: this.labTech.specialization },
      {
        icon: 'local_hospital',
        label: 'Affiliation',
        value: this.labTech.entityAffiliation ?? 'Not specified',
      },
      {
        icon: 'account_balance_wallet',
        label: 'Wallet',
        value: this.labTech.walletAddress,
        isWallet: true,
      },
    ];
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadProfile(), this.loadAnalyses()]);
  }

  private async loadProfile(): Promise<void> {
    this.isLoadingProfile = true;
    try {
      this.labTech = await this.usersService.getMyLabTechProfile();
    } catch {
      this.notify.showError('Failed to load profile.');
    } finally {
      this.isLoadingProfile = false;
    }
  }

  private async loadAnalyses(): Promise<void> {
    this.isLoadingAnalyses = true;
    try {
      this.labAnalysisSummaries = await this.blockchain.getLabTechAnalysesSummary();
    } catch {
      this.notify.showError('Failed to load lab analyses summary.');
    } finally {
      this.isLoadingAnalyses = false;
    }
  }

  formatTimestamp(ts: bigint): Date {
    return new Date(Number(ts) * 1000);
  }

  shortenAddress(addr: string): string {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
}
