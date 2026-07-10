export type AccessRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revoked' | 'Expired';

export interface AccessRequestDto {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorWalletAddress: string;
  patientId: string;
  patientName: string;
  patientWalletAddress: string;
  status: AccessRequestStatus;
  createdAt: string;
  approvedAt?: string;
  expiresAt?: string;
}

export interface CreateAccessRequestDto {
  patientId: string;
}

export interface EnvelopeDto {
  id: string;
  patientId: string;
  userId: string;
  encryptedAesKey: string;
  createdAt: string;
}

export interface CreateEnvelopeDto {
  encryptedAesKey: string;
}
