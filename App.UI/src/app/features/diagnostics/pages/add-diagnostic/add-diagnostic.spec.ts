import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddDiagnostic } from './add-diagnostic';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticSubmissionService } from '../../services/diagnostic-submission.service';
import { UsersService } from '../../../../core/services/users.service';
import { MatDialog } from '@angular/material/dialog';

describe('AddDiagnostic', () => {
  let component: AddDiagnostic;
  let fixture: ComponentFixture<AddDiagnostic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDiagnostic, HttpClientTestingModule, RouterTestingModule, NoopAnimationsModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getDecodedToken: () => ({ firstName: 'Dr', lastName: 'Test', userId: '123' }),
          },
        },
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        {
          provide: BlockchainService,
          useValue: { getPatientDiagnoses: () => Promise.resolve([]) },
        },
        { provide: DiagnosticSubmissionService, useValue: { submit: () => Promise.resolve() } },
        { provide: UsersService, useValue: { getPatientById: () => Promise.resolve({ cnp: '' }) } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddDiagnostic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should mark form as invalid when required fields are empty', () => {
    component.buildForm();
    expect(component.form.valid).toBeFalse();
  });

  it('should set isFormReady to false when no patient is selected', () => {
    component.buildForm();
    component['selectedPatient'] = null;
    expect(component.isFormReady).toBeFalse();
  });
});
