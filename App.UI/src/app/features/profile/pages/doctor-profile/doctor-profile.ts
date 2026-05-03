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
import { DoctorDto } from '../../../../core/models/doctor.model';
import { DiagnosisSummary, PrescriptionSummary } from '../../../../core/models/blockchain.model';

@Component({
  selector: 'app-doctor-profile',
  templateUrl: './doctor-profile.html',
  styleUrls: ['./doctor-profile.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, DatePipe, CarouselSection, ProfileCard, MedicalCard],
})
export class DoctorProfile implements OnInit {
  private usersService = inject(UsersService);
  private blockchain = inject(BlockchainService);
  private notify = inject(NotificationService);

  doctor: DoctorDto | null = null;
  isLoadingProfile = false;

  diagnosisSummaries: DiagnosisSummary[] = [];
  isLoadingDiagnoses = false;

  prescriptionSummaries: PrescriptionSummary[] = [];
  isLoadingPrescriptions = false;

  get profileDetails(): ProfileDetailRow[] {
    if (!this.doctor) return [];
    return [
      { icon: 'badge', label: 'License', value: this.doctor.licenseNumber },
      { icon: 'local_hospital', label: 'Hospital', value: this.doctor.entityAffiliation },
      { icon: 'medical_services', label: 'Specialization', value: this.doctor.specialization },
      {
        icon: 'account_balance_wallet',
        label: 'Wallet',
        value: this.doctor.walletAddress,
        isWallet: true,
      },
    ];
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadProfile(), this.loadDiagnoses(), this.loadPrescriptions()]);
  }

  private async loadProfile(): Promise<void> {
    this.isLoadingProfile = true;
    try {
      this.doctor = await this.usersService.getMyDoctorProfile();
    } catch {
      this.notify.showError('Failed to load doctor profile.');
    } finally {
      this.isLoadingProfile = false;
    }
  }

  private async loadDiagnoses(): Promise<void> {
    this.isLoadingDiagnoses = true;
    try {
      this.diagnosisSummaries = await this.blockchain.getDoctorDiagnosesSummary();
    } catch {
      this.notify.showError('Failed to load diagnoses summary.');
    } finally {
      this.isLoadingDiagnoses = false;
    }
  }

  private async loadPrescriptions(): Promise<void> {
    this.isLoadingPrescriptions = true;
    try {
      this.prescriptionSummaries = await this.blockchain.getDoctorPrescriptionsSummary();
    } catch {
      this.notify.showError('Failed to load prescriptions summary.');
    } finally {
      this.isLoadingPrescriptions = false;
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
