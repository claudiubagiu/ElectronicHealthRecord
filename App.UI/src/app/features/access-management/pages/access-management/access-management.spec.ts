import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessManagement } from './access-management';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AccessManagementService } from '../../services/access-management.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { E2eeKeyService } from '../../../../core/services/e2ee-key.service';
import { UsersService } from '../../../../core/services/users.service';
import { AccessRequestDto } from '../../../../core/models/access-request.model';

const mockRequest = (id: string, status: 'Pending' | 'Approved'): AccessRequestDto => ({
  id,
  status,
  doctorId: 'doctor-1',
  doctorName: 'Dr. Test',
  doctorWalletAddress: '0xDoctor',
  patientId: 'patient-1',
  patientName: 'John Doe',
  patientWalletAddress: '0xPatient',
  createdAt: new Date().toISOString(),
  approvedAt: undefined,
  expiresAt: undefined,
});

describe('AccessManagement', () => {
  let component: AccessManagement;
  let fixture: ComponentFixture<AccessManagement>;
  let accessServiceMock: jasmine.SpyObj<AccessManagementService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    accessServiceMock = jasmine.createSpyObj('AccessManagementService', [
      'getMyRequests',
      'getMyHistory',
      'approve',
      'reject',
      'revoke',
    ]);
    authServiceMock = jasmine.createSpyObj('AuthService', ['getDecodedToken']);

    authServiceMock.getDecodedToken.and.returnValue({
      userId: 'patient-1',
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

    accessServiceMock.getMyRequests.and.returnValue(Promise.resolve([]));
    accessServiceMock.getMyHistory.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [
        AccessManagement,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: { showError: () => {}, showSuccess: () => {} } },
        { provide: AccessManagementService, useValue: accessServiceMock },
        {
          provide: BlockchainService,
          useValue: { grantAccess: () => Promise.resolve(), revokeAccess: () => Promise.resolve() },
        },
        { provide: E2eeKeyService, useValue: { getPrivateKey: () => Promise.resolve(null) } },
        { provide: UsersService, useValue: { getUserPublicKey: () => Promise.resolve('') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should filter pending requests correctly', () => {
    component.allRequests = [
      mockRequest('1', 'Pending'),
      mockRequest('2', 'Approved'),
      mockRequest('3', 'Pending'),
    ];
    expect(component.pending.length).toBe(2);
    expect(component.pending.every((r) => r.status === 'Pending')).toBeTrue();
  });

  it('should filter active requests correctly', () => {
    component.allRequests = [
      mockRequest('1', 'Pending'),
      mockRequest('2', 'Approved'),
      mockRequest('3', 'Approved'),
    ];
    expect(component.active.length).toBe(2);
    expect(component.active.every((r) => r.status === 'Approved')).toBeTrue();
  });
});
