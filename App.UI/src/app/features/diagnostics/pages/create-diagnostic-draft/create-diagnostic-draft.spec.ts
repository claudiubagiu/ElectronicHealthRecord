import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateDiagnosticDraft } from './create-diagnostic-draft';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { DiagnosticDraftService } from '../../services/diagnostic-draft.service';
import { MatDialog } from '@angular/material/dialog';

describe('CreateDiagnosticDraft', () => {
  let component: CreateDiagnosticDraft;
  let fixture: ComponentFixture<CreateDiagnosticDraft>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CreateDiagnosticDraft,
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
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        {
          provide: BlockchainService,
          useValue: {
            getPatientDiagnoses: () => Promise.resolve([]),
            getPatientLabAnalyses: () => Promise.resolve([]),
          },
        },
        {
          provide: DiagnosticDraftService,
          useValue: {
            getActiveByPatient: () => Promise.resolve(null),
            saveDraft: () => Promise.resolve(),
          },
        },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateDiagnosticDraft);
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
