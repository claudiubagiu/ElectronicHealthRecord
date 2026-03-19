import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { IpfsService, EncryptedPayload } from '../../../../core/services/ipfs.service';
import { LitProtocolService } from '../../../../core/services/lit-protocol.service';
import { CryptoService } from '../../../../core/services/crypto.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PatientDto } from '../../models/diagnostic.model';
import { AppError } from '../../../../core/errors/app.error';
import { getAddress } from 'ethers';

@Component({
  selector: 'app-add-diagnostic',
  templateUrl: './add-diagnostic.html',
  styleUrls: ['./add-diagnostic.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatTooltipModule,
  ],
})
export class AddDiagnostic implements OnInit, OnDestroy {
  private diagnosticsService = inject(DiagnosticsService);
  private blockchainService = inject(BlockchainService);
  private ipfsService = inject(IpfsService);
  private litService = inject(LitProtocolService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  diagnosticForm!: FormGroup;
  filteredPatients: PatientDto[] = [];
  selectedPatient: PatientDto | null = null;
  selectedFile: File | null = null;
  isLoading = false;
  isSearching = false;
  searchPerformed = false;
  isDragOver = false;
  fileError: string | null = null;

  ngOnInit(): void {
    this.buildForm();
    this.setupPatientSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm(): void {
    this.diagnosticForm = this.fb.group({
      patientSearch: ['', [Validators.required, this.patientSelectedValidator.bind(this)]],
      description: ['', Validators.required],
    });
  }

  patientSelectedValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    if (typeof control.value === 'string' && !this.selectedPatient) {
      return { invalidPatient: true };
    }
    return null;
  }

  setupPatientSearch(): void {
    this.diagnosticForm
      .get('patientSearch')!
      .valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap((value) => {
          if (typeof value === 'string') {
            this.selectedPatient = null;
          }
          if (typeof value !== 'string' || value.trim().length < 2) {
            this.filteredPatients = [];
            this.searchPerformed = false;
            return of([]);
          }
          this.isSearching = true;
          this.searchPerformed = true;
          return this.diagnosticsService.searchPatients(value.trim());
        })
      )
      .subscribe({
        next: (patients) => {
          this.filteredPatients = patients;
          this.isSearching = false;
        },
        error: () => {
          this.filteredPatients = [];
          this.isSearching = false;
        },
      });
  }

  displayPatient(patient: PatientDto | string): string {
    if (!patient) return '';
    if (typeof patient === 'string') return patient;
    return `${patient.firstName} ${patient.lastName}`;
  }

  onPatientSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedPatient = event.option.value as PatientDto;
    this.diagnosticForm.get('patientSearch')!.updateValueAndValidity();
  }

  clearPatient(event: Event): void {
    event.stopPropagation();
    this.selectedPatient = null;
    this.diagnosticForm.get('patientSearch')!.setValue('');
    this.filteredPatients = [];
    this.searchPerformed = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.setFile(files[0]);
    }
  }

  setFile(file: File): void {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    if (!allowed.includes(file.type)) {
      this.fileError = 'File type not supported. Please upload PDF, DOC, DOCX, JPG or PNG.';
      this.selectedFile = null;
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.fileError = 'File size exceeds 20MB limit.';
      this.selectedFile = null;
      return;
    }
    this.fileError = null;
    this.selectedFile = file;
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.fileError = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async onSubmit(): Promise<void> {
    if (this.diagnosticForm.invalid || !this.selectedFile || !this.selectedPatient) return;

    this.isLoading = true;

    try {
      const fileBuffer = await this.selectedFile.arrayBuffer();

      const aesKey = await CryptoService.generateAESKey();
      const { encrypted, iv } = await CryptoService.encryptFileWithAES(fileBuffer, aesKey);

      const aesKeyRaw = await CryptoService.exportAESKey(aesKey);
      const aesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(aesKeyRaw)));

      const patientAddress = getAddress(this.selectedPatient.walletAddress);
      await this.litService.connect();
      const accs = this.litService.createAccsBuilder(patientAddress);
      const litResult = await this.litService.encrypt(aesKeyBase64, accs);

      const payload: EncryptedPayload = {
        encryptedFile: Array.from(new Uint8Array(encrypted)),
        encryptedAesKey: [],
        litMetadata: {
          ciphertext: litResult.ciphertext,
          dataToEncryptHash: litResult.dataToEncryptHash,
        },
        iv: Array.from(iv),
        fileName: this.selectedFile.name,
        timestamp: Date.now(),
      };

      const ipfsCid = await this.ipfsService.uploadEncryptedData(payload);

      const user = this.authService.getDecodedToken();
      const doctorName = user ? `${user.firstName} ${user.lastName}` : 'Doctor';

      await this.blockchainService.addDiagnosis(
        this.diagnosticForm.value.description,
        ipfsCid,
        patientAddress,
        doctorName
      );

      this.snackBar.open('Diagnostic submitted successfully!', 'OK', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });

      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Failed to submit diagnostic. Please try again.';
      this.snackBar.open(message, 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'snackbar-error',
      });
    } finally {
      this.isLoading = false;
    }
  }
}
