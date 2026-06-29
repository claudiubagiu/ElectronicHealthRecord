import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinalizeDiagnosticDraft } from './finalize-diagnostic-draft';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticSubmissionService } from '../../services/diagnostic-submission.service';
import { DiagnosticDraftService } from '../../services/diagnostic-draft.service';
import { MatDialog } from '@angular/material/dialog';

describe('FinalizeDiagnosticDraft', () => {
  let component: FinalizeDiagnosticDraft;
  let fixture: ComponentFixture<FinalizeDiagnosticDraft>;
  let draftServiceMock: jasmine.SpyObj<DiagnosticDraftService>;

  beforeEach(async () => {
    draftServiceMock = jasmine.createSpyObj('DiagnosticDraftService', [
      'getActiveByPatient',
      'decrypt',
      'saveDraft',
      'deleteDraft',
    ]);
    draftServiceMock.getActiveByPatient.and.returnValue(Promise.resolve(null));

    await TestBed.configureTestingModule({
      imports: [
        FinalizeDiagnosticDraft,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getDecodedToken: () => ({ firstName: 'Dr', lastName: 'Test', userId: '123' }),
          },
        },
        {
          provide: NotificationService,
          useValue: { showError: () => {}, showSuccess: () => {} },
        },
        {
          provide: BlockchainService,
          useValue: {
            getPatientDiagnoses: () => Promise.resolve([]),
            getPatientLabAnalyses: () => Promise.resolve([]),
          },
        },
        {
          provide: DiagnosticSubmissionService,
          useValue: { submit: () => Promise.resolve() },
        },
        { provide: DiagnosticDraftService, useValue: draftServiceMock },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinalizeDiagnosticDraft);
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

  it('should set draftNotFound to true when no active draft exists', async () => {
    draftServiceMock.getActiveByPatient.and.returnValue(Promise.resolve(null));
    await component.loadExistingDraftAndPrefill();
    expect(component.draftNotFound).toBeTrue();
  });

  it('should set isFormReady to false when primaryDiagnosis and treatment are empty', () => {
    component.buildForm();
    component['selectedPatient'] = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      walletAddress: '0x123',
      cnp: '',
      identityId: '',
      dateOfBirth: '',
    };
    component.form.patchValue({
      title: 'Test',
      consultationDate: '2024-01-01',
      chiefComplaint: 'Headache',
      primaryDiagnosis: '',
      treatment: '',
    });
    expect(component.isFormReady).toBeFalse();
  });

  it('should return true for isCategoryDiagnosisValid when required fields are filled', () => {
    component.buildForm();
    component.form.patchValue({
      primaryDiagnosis: 'Hypertension',
      treatment: 'Rest and medication',
    });
    expect(component.isCategoryDiagnosisValid).toBeTrue();
  });
});
