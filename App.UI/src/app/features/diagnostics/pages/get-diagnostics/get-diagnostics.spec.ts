import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GetDiagnostics } from './get-diagnostics';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { DiagnosticDecryptionService } from '../../services/diagnostic-decryption.service';
import { Diagnosis } from '../../../../core/models/blockchain.model';

const mockDiagnosis: Diagnosis = {
  id: BigInt(1),
  title: 'Test Diagnosis',
  ipfsCid: 'QmTest',
  patientAddr: '0x123',
  doctorAddr: '0x456',
  doctorName: 'Dr. Test',
  timestamp: BigInt(1700000000),
  exists: true,
};

describe('GetDiagnostics', () => {
  let component: GetDiagnostics;
  let fixture: ComponentFixture<GetDiagnostics>;
  let blockchainServiceMock: jasmine.SpyObj<BlockchainService>;
  let web3ServiceMock: jasmine.SpyObj<Web3Service>;
  let decryptionServiceMock: jasmine.SpyObj<DiagnosticDecryptionService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    blockchainServiceMock = jasmine.createSpyObj('BlockchainService', ['getPatientDiagnoses']);
    web3ServiceMock = jasmine.createSpyObj('Web3Service', ['waitForInit', 'getAddressOrNull']);
    decryptionServiceMock = jasmine.createSpyObj('DiagnosticDecryptionService', ['decryptAndOpen']);
    authServiceMock = jasmine.createSpyObj('AuthService', ['getDecodedToken']);

    web3ServiceMock.waitForInit.and.returnValue(Promise.resolve());
    web3ServiceMock.getAddressOrNull.and.returnValue('0xWallet');
    blockchainServiceMock.getPatientDiagnoses.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [GetDiagnostics, HttpClientTestingModule, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        { provide: BlockchainService, useValue: blockchainServiceMock },
        { provide: Web3Service, useValue: web3ServiceMock },
        { provide: DiagnosticDecryptionService, useValue: decryptionServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GetDiagnostics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load and sort diagnoses by timestamp descending', async () => {
    const older: Diagnosis = { ...mockDiagnosis, id: BigInt(1), timestamp: BigInt(1000) };
    const newer: Diagnosis = { ...mockDiagnosis, id: BigInt(2), timestamp: BigInt(2000) };

    blockchainServiceMock.getPatientDiagnoses.and.returnValue(Promise.resolve([older, newer]));
    blockchainServiceMock.getPatientDiagnoses.calls.reset();

    await component.loadDiagnoses();

    expect(component.diagnoses[0].id).toBe(BigInt(2));
    expect(component.diagnoses[1].id).toBe(BigInt(1));
  });

  it('should not load diagnoses if wallet is not connected', async () => {
    web3ServiceMock.getAddressOrNull.and.returnValue(null);
    blockchainServiceMock.getPatientDiagnoses.calls.reset();

    await component.loadDiagnoses();

    expect(blockchainServiceMock.getPatientDiagnoses).not.toHaveBeenCalled();
  });

  it('should reset downloadingId after openFile completes', async () => {
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
    decryptionServiceMock.decryptAndOpen.and.returnValue(Promise.resolve());

    await component.openFile(mockDiagnosis);

    expect(component.downloadingId).toBeNull();
  });
});
