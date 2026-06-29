import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GetPrescriptions } from './get-prescriptions';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { PrescriptionDecryptionService } from '../../services/prescription-decryption.service';
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

describe('GetPrescriptions', () => {
  let component: GetPrescriptions;
  let fixture: ComponentFixture<GetPrescriptions>;
  let blockchainServiceMock: jasmine.SpyObj<BlockchainService>;
  let web3ServiceMock: jasmine.SpyObj<Web3Service>;
  let decryptionServiceMock: jasmine.SpyObj<PrescriptionDecryptionService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    blockchainServiceMock = jasmine.createSpyObj('BlockchainService', [
      'getPatientPrescriptionIds',
      'getPrescription',
    ]);
    web3ServiceMock = jasmine.createSpyObj('Web3Service', ['waitForInit', 'getAddressOrNull']);
    decryptionServiceMock = jasmine.createSpyObj('PrescriptionDecryptionService', [
      'decryptAndOpenForPatient',
    ]);
    authServiceMock = jasmine.createSpyObj('AuthService', ['getDecodedToken']);

    web3ServiceMock.waitForInit.and.returnValue(Promise.resolve());
    web3ServiceMock.getAddressOrNull.and.returnValue('0xWalletAddress');
    blockchainServiceMock.getPatientPrescriptionIds.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [
        GetPrescriptions,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        { provide: BlockchainService, useValue: blockchainServiceMock },
        { provide: Web3Service, useValue: web3ServiceMock },
        { provide: PrescriptionDecryptionService, useValue: decryptionServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GetPrescriptions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an empty prescriptions list', () => {
    expect(component.prescriptions).toEqual([]);
  });

  it('should set isLoading to false after loadPrescriptions completes', async () => {
    blockchainServiceMock.getPatientPrescriptionIds.and.returnValue(Promise.resolve([]));
    await component.loadPrescriptions();
    expect(component.isLoading).toBeFalse();
  });

  it('should load and sort prescriptions by timestamp descending', async () => {
    const older: Prescription = { ...mockPrescription, id: BigInt(1), timestamp: BigInt(1000) };
    const newer: Prescription = { ...mockPrescription, id: BigInt(2), timestamp: BigInt(2000) };

    blockchainServiceMock.getPatientPrescriptionIds.and.returnValue(
      Promise.resolve([BigInt(1), BigInt(2)]),
    );
    blockchainServiceMock.getPrescription.and.callFake((id: bigint) =>
      Promise.resolve(id === BigInt(1) ? older : newer),
    );

    await component.loadPrescriptions();

    expect(component.prescriptions.length).toBe(2);
    expect(component.prescriptions[0].id).toBe(BigInt(2));
    expect(component.prescriptions[1].id).toBe(BigInt(1));
  });

  it('should not load prescriptions if wallet is not connected', async () => {
    web3ServiceMock.getAddressOrNull.and.returnValue(null);
    blockchainServiceMock.getPatientPrescriptionIds.calls.reset();

    await component.loadPrescriptions();

    expect(blockchainServiceMock.getPatientPrescriptionIds).not.toHaveBeenCalled();
  });

  it('should set openingId during openPrescription and reset it after', async () => {
    authServiceMock.getDecodedToken.and.returnValue({
      userId: 'user-123',
      email: '',
      identityId: '',
      username: '',
      walletAddress: '',
      role: 'Patient',
      firstName: '',
      lastName: '',
      exp: 9999999999,
      iss: '',
      aud: '',
    });
    decryptionServiceMock.decryptAndOpenForPatient.and.returnValue(Promise.resolve());

    await component.openPrescription(mockPrescription);

    expect(component.openingId).toBeNull();
    expect(decryptionServiceMock.decryptAndOpenForPatient).toHaveBeenCalledWith(
      mockPrescription,
      'user-123',
    );
  });

  it('should reset openingId even when decryption fails', async () => {
    authServiceMock.getDecodedToken.and.returnValue({
      userId: 'user-123',
      email: '',
      identityId: '',
      username: '',
      walletAddress: '',
      role: 'Patient',
      firstName: '',
      lastName: '',
      exp: 9999999999,
      iss: '',
      aud: '',
    });
    decryptionServiceMock.decryptAndOpenForPatient.and.returnValue(
      Promise.reject(new Error('decrypt failed')),
    );

    await component.openPrescription(mockPrescription);

    expect(component.openingId).toBeNull();
  });
});
