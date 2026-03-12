import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../../../core/models/auth.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';
import { AppError } from '../../../../core/errors/app.error';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class Register implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  registerForm!: FormGroup;
  selectedRole: 'Patient' | 'Doctor' = 'Patient';
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
      // Doctor fields
      specialization: [''],
      licenseNumber: [''],
      hospitalAffiliation: [''],
    });

    // Apply initial validators for the default role
    this.updatePatientValidators();
    this.updateDoctorValidators();
  }

  selectRole(role: 'Patient' | 'Doctor'): void {
    this.selectedRole = role;
    this.updatePatientValidators();
    this.updateDoctorValidators();
  }

  updatePatientValidators(): void {
    const patientFields = ['dateOfBirth', 'cnp'];

    patientFields.forEach((field) => {
      const control = this.registerForm.get(field);
      if (this.selectedRole === 'Patient') {
        control?.setValidators(Validators.required);
      } else {
        control?.clearValidators();
        control?.reset('');
      }
      control?.updateValueAndValidity();
    });
  }

  updateDoctorValidators(): void {
    const doctorFields = ['specialization', 'licenseNumber', 'hospitalAffiliation'];

    doctorFields.forEach((field) => {
      const control = this.registerForm.get(field);
      if (this.selectedRole === 'Doctor') {
        control?.setValidators(Validators.required);
      } else {
        control?.clearValidators();
        control?.reset('');
      }
      control?.updateValueAndValidity();
    });
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
        // Patient fields
        dateOfBirth:
          this.selectedRole === 'Patient' ? this.registerForm.value.dateOfBirth : undefined,
        cnp: this.selectedRole === 'Patient' ? this.registerForm.value.cnp : undefined,
        // Doctor fields
        specialization:
          this.selectedRole === 'Doctor' ? this.registerForm.value.specialization : undefined,
        licenseNumber:
          this.selectedRole === 'Doctor' ? this.registerForm.value.licenseNumber : undefined,
        hospitalAffiliation:
          this.selectedRole === 'Doctor' ? this.registerForm.value.hospitalAffiliation : undefined,
      };

      await this.authService.register(payload);

      this.snackBar.open('Account created successfully!', 'OK', {
        duration: 1000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });

      this.router.navigate(['/']);
    } catch (error: unknown) {
      console.error('Register failed:', error);

      if (error instanceof AppError) {
        this.snackBar.open(error.message, 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: 'snackbar-error',
        });
      } else {
        this.snackBar.open('Registration failed. Please try again.', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: 'snackbar-error',
        });
      }
    } finally {
      this.isLoading = false;
    }
  }
}
