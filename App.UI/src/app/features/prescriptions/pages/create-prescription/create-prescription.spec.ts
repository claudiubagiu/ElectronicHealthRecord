import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreatePrescription } from './create-prescription';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PrescriptionSubmissionService } from '../../services/prescription-submission.service';

describe('CreatePrescription', () => {
  let component: CreatePrescription;
  let fixture: ComponentFixture<CreatePrescription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CreatePrescription,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AuthService, useValue: { getDecodedToken: () => null } },
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        { provide: PrescriptionSubmissionService, useValue: { submit: () => Promise.resolve() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePrescription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should mark form as invalid when title is empty', () => {
    component.buildForm();
    expect(component.form.valid).toBeFalse();
  });

  it('should add a new medication row when addMedication is called', () => {
    component.buildForm();
    const initialCount = component.medications.length;
    component.addMedication();
    expect(component.medications.length).toBe(initialCount + 1);
  });

  it('should not remove the last medication row', () => {
    component.buildForm();
    expect(component.medications.length).toBe(1);
    component.removeMedication(0);
    expect(component.medications.length).toBe(1);
  });

  it('should remove a medication row when there are multiple', () => {
    component.buildForm();
    component.addMedication();
    expect(component.medications.length).toBe(2);
    component.removeMedication(0);
    expect(component.medications.length).toBe(1);
  });
});
