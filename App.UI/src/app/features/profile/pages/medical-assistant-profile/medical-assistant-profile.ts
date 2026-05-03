import { Component, OnInit, inject } from '@angular/core';
import { MAT_COMMON_IMPORTS } from '../../../../shared/imports/material.imports';
import {
  ProfileCard,
  ProfileDetailRow,
} from '../../../../shared/components/profile-card/profile-card';
import { UsersService } from '../../../../core/services/users.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MedicalAssistantDto } from '../../../../core/models/medical-assistant.model';

@Component({
  selector: 'app-medical-assistant-profile',
  templateUrl: './medical-assistant-profile.html',
  styleUrls: ['./medical-assistant-profile.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS, ProfileCard],
})
export class MedicalAssistantProfile implements OnInit {
  private usersService = inject(UsersService);
  private notify = inject(NotificationService);

  assistant: MedicalAssistantDto | null = null;
  isLoadingProfile = false;

  get profileDetails(): ProfileDetailRow[] {
    if (!this.assistant) return [];
    return [
      {
        icon: 'local_hospital',
        label: 'Affiliation',
        value: this.assistant.entityAffiliation ?? 'Not specified',
      },
      {
        icon: 'account_balance_wallet',
        label: 'Wallet',
        value: this.assistant.walletAddress,
        isWallet: true,
      },
    ];
  }

  async ngOnInit(): Promise<void> {
    this.isLoadingProfile = true;
    try {
      this.assistant = await this.usersService.getMyMedicalAssistantProfile();
    } catch {
      this.notify.showError('Failed to load profile.');
    } finally {
      this.isLoadingProfile = false;
    }
  }
}
