import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DispensePrescription } from './dispense-prescription';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NotificationService } from '../../../../core/services/notification.service';
import { PrescriptionDispenseService } from '../../services/prescription-dispense.service';
import { Prescription } from '../../../../core/models/blockchain.model';

const mockPrescription: Prescription = {
  id: BigInt(1),
  title: 'Test Prescription',
  ipfsCid: 'QmTest',
  patientAddr: '0x123',
  doctorAddr: '0x456',
  doctorName: 'Dr. Test',
  timestamp: BigInt(1700000000),
  codeHash: '0xabc',
  salt: '0xdef',
  dispensed: false,
  dispensedTimestamp: BigInt(0),
  dispensedBy: '0x000',
  exists: true,
};

describe('DispensePrescription', () => {
  let component: DispensePrescription;
  let fixture: ComponentFixture<DispensePrescription>;
  let dispenseServiceMock: jasmine.SpyObj<PrescriptionDispenseService>;

  beforeEach(async () => {
    dispenseServiceMock = jasmine.createSpyObj('PrescriptionDispenseService', [
      'lookupByCode',
      'dispense',
      'decryptAndOpen',
    ]);

    await TestBed.configureTestingModule({
      imports: [DispensePrescription, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        { provide: PrescriptionDispenseService, useValue: dispenseServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DispensePrescription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should return uppercase code value', () => {
    component.form.get('code')?.setValue('abc123');
    expect(component.codeValue).toBe('ABC123');
  });

  it('should not search if form is invalid', async () => {
    component.form.get('code')?.setValue('');
    await component.onSearch();
    expect(component.isSearching).toBeFalse();
    expect(component.prescription).toBeNull();
  });

  it('should set prescription after successful search', async () => {
    dispenseServiceMock.lookupByCode.and.returnValue(
      Promise.resolve({ prescription: mockPrescription }),
    );
    component.form.get('code')?.setValue('ABC123');
    await component.onSearch();
    expect(component.prescription).toEqual(mockPrescription);
    expect(component.lookupError).toBeNull();
  });

  it('should set lookupError when search fails', async () => {
    dispenseServiceMock.lookupByCode.and.returnValue(Promise.reject(new Error('Not found')));
    component.form.get('code')?.setValue('XYZ999');
    await component.onSearch();
    expect(component.prescription).toBeNull();
    expect(component.lookupError).toBeTruthy();
  });

  it('should set dispensedSuccess to true after dispense', async () => {
    dispenseServiceMock.dispense.and.returnValue(Promise.resolve());
    dispenseServiceMock.lookupByCode.and.returnValue(
      Promise.resolve({ prescription: mockPrescription }),
    );
    component.prescription = mockPrescription;
    await component.onDispense();
    expect(component.dispensedSuccess).toBeTrue();
  });

  it('should reset state when onCodeInput is called', () => {
    component.prescription = mockPrescription;
    component.lookupError = 'some error';
    component.dispensedSuccess = true;
    component.form.get('code')?.setValue('A');
    component.onCodeInput();
    expect(component.prescription).toBeNull();
    expect(component.lookupError).toBeNull();
    expect(component.dispensedSuccess).toBeFalse();
  });

  it('should convert timestamp bigint to Date correctly', () => {
    const result = component.formatTimestamp(BigInt(1700000000));
    expect(result instanceof Date).toBeTrue();
  });
});
