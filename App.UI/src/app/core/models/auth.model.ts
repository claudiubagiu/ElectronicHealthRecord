export interface LoginRequest {
  walletAddress: string;
  signature: string;
  nonce: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  email: string;
  userName: string;
  phoneNumber: string;
  roles: string[];
  firstName: string;
  lastName: string;
  walletAddress: string;
  signature: string;
  // Patient fields
  dateOfBirth?: string;
  cnp?: string;
  // Doctor fields
  specialization?: string;
  licenseNumber?: string;
  hospitalAffiliation?: string;
}

export interface NonceResponse {
  nonce: string;
}

export interface DecodedToken {
  email: string;
  identityId: string;
  userId: string;
  username: string;
  walletAddress: string;
  role: string | string[];
  firstName: string;
  lastName: string;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: DecodedToken | null;
}
