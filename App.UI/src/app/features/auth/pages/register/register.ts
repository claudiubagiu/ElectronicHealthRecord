import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppError } from '../../../../core/errors/app.error';
import { MAT_FORM_IMPORTS } from '../../../../shared/imports/material.imports';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [...MAT_FORM_IMPORTS, RouterLink],
})
export class Register implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  registerForm!: FormGroup;
  selectedRole: 'Patient' | 'Doctor' | 'LaboratoryTechnician' | 'Pharmacist' = 'Patient';
  isLoading = false;

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      // Patient fields
      dateOfBirth: [''],
      cnp: [''],
      // Doctor / Pharmacist fields
      licenseNumber: [''],
      // Doctor / LaboratoryTechnician fields
      specialization: [''],
      // Doctor / LaboratoryTechnician / Pharmacist fields
      entityAffiliation: [''],
    });

    this.updateValidators();
  }

  selectRole(role: 'Patient' | 'Doctor' | 'LaboratoryTechnician' | 'Pharmacist'): void {
    this.selectedRole = role;
    this.updateValidators();
  }

  updateValidators(): void {
    const allConditionalFields = [
      'dateOfBirth',
      'cnp',
      'licenseNumber',
      'specialization',
      'entityAffiliation',
    ];

    allConditionalFields.forEach((field) => {
      const control = this.registerForm.get(field);
      control?.clearValidators();
      control?.reset('');
      control?.updateValueAndValidity();
    });

    if (this.selectedRole === 'Patient') {
      ['dateOfBirth', 'cnp'].forEach((field) => {
        const control = this.registerForm.get(field);
        control?.setValidators(Validators.required);
        control?.updateValueAndValidity();
      });
    } else if (this.selectedRole === 'Doctor') {
      ['specialization', 'licenseNumber', 'entityAffiliation'].forEach((field) => {
        const control = this.registerForm.get(field);
        control?.setValidators(Validators.required);
        control?.updateValueAndValidity();
      });
    } else if (this.selectedRole === 'LaboratoryTechnician') {
      ['specialization', 'entityAffiliation'].forEach((field) => {
        const control = this.registerForm.get(field);
        control?.setValidators(Validators.required);
        control?.updateValueAndValidity();
      });
    } else if (this.selectedRole === 'Pharmacist') {
      ['licenseNumber', 'entityAffiliation'].forEach((field) => {
        const control = this.registerForm.get(field);
        control?.setValidators(Validators.required);
        control?.updateValueAndValidity();
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.isLoading = true;

    try {
      const payload: RegisterRequest = {
        ...this.registerForm.value,
        roles: [this.selectedRole],
        walletAddress: '',
        signature: '',
        publicKey: '',
        encryptedPrivateKey: '',
        dateOfBirth:
          this.selectedRole === 'Patient' ? this.registerForm.value.dateOfBirth : undefined,
        cnp: this.selectedRole === 'Patient' ? this.registerForm.value.cnp : undefined,
        specialization:
          this.selectedRole === 'Doctor' || this.selectedRole === 'LaboratoryTechnician'
            ? this.registerForm.value.specialization
            : undefined,
        licenseNumber:
          this.selectedRole === 'Doctor' || this.selectedRole === 'Pharmacist'
            ? this.registerForm.value.licenseNumber
            : undefined,
        entityAffiliation:
          this.selectedRole === 'Doctor' ||
          this.selectedRole === 'LaboratoryTechnician' ||
          this.selectedRole === 'Pharmacist'
            ? this.registerForm.value.entityAffiliation
            : undefined,
      };

      await this.authService.register(payload);

      this.notify.showSuccess('Account created successfully!', 1000);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      console.error('Register failed:', error);

      const message =
        error instanceof AppError ? error.message : 'Registration failed. Please try again.';
      this.notify.showError(message);
    } finally {
      this.isLoading = false;
    }
  }
}
