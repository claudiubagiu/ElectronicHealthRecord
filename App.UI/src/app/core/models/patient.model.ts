export interface PatientDto {
  id: string;
  identityId: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
  cnp: string;
  dateOfBirth: string;
  publicKey?: string;
  encryptedAesKey?: string;
}
