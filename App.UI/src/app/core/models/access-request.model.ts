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

/**
 * The patient's AES data key, ECIES-encrypted for a specific authorized
 * user (doctor, lab technician, pharmacist, medical assistant, etc.).
 * One envelope per (patient, user) pair — created on approve, removed on
 * revoke/expiry. Lives in AccessRequests.Api.
 */
export interface EnvelopeDto {
  id: string;
  patientId: string;
  userId: string;
  encryptedAesKey: string;
  createdAt: string;
}

/**
 * Sent together with the approve call — the patient's AES key, ECIES-encrypted
 * client-side with the requesting user's public key. The backend never sees
 * the plaintext key.
 */
export interface CreateEnvelopeDto {
  encryptedAesKey: string;
}
