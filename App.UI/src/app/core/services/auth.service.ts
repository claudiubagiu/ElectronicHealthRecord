import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, firstValueFrom } from 'rxjs';
import { filter, map, pairwise, tap } from 'rxjs/operators';
import { Web3Service } from './web3.service';
import {
  AuthState,
  ChallengeResponse,
  DecodedToken,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../models/auth.model';
import { E2eeKeyService } from './e2ee-key.service';
import { AppError } from '../errors/app.error';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly API_URL = environment.apiUrls.auth;
  private readonly TOKEN_KEY = 'auth_token';
  private walletSubscription?: Subscription;

  private authStateSubject = new BehaviorSubject<AuthState>({
    token: null,
    isAuthenticated: false,
    user: null,
  });

  public authState$: Observable<AuthState> = this.authStateSubject.asObservable();

  public isAuthenticated$: Observable<boolean> = this.authState$.pipe(
    map((state) => state.isAuthenticated)
  );

  public user$: Observable<DecodedToken | null> = this.authState$.pipe(map((state) => state.user));

  public roles$: Observable<string[]> = this.user$.pipe(
    map((user) => {
      if (!user) return [];
      return Array.isArray(user.role) ? user.role : [user.role];
    })
  );

  constructor(
    private http: HttpClient,
    private web3Service: Web3Service,
    private e2eeService: E2eeKeyService
  ) {
    this.loadTokenFromStorage();
    this.watchWalletChanges();
  }

  ngOnDestroy(): void {
    this.walletSubscription?.unsubscribe();
  }

  // ==================== Authentication Flow ====================

  /**
   * Full login flow with a single MetaMask popup:
   * 1. Connect wallet (if not connected).
   * 2. Derive ECC key pair from a single MetaMask signature (the only popup).
   * 3. Request a challenge from the backend.
   * 4. Sign the challenge with the derived ECC key (no MetaMask popup).
   * 5. Send the ECC signature + challenge to the backend for verification.
   * 6. Store the returned JWT token.
   *
   * The ECC key pair remains in memory for E2EE operations (encrypting/decrypting
   * medical data). If derivation fails, the user cannot proceed with login since
   * the ECC key is now integral to the authentication flow.
   *
   * @returns The login response containing the JWT token.
   * @throws {AppError} If wallet connection, key derivation, challenge retrieval,
   *         signing, or backend verification fails.
   */
  async login(): Promise<LoginResponse> {
    const walletAddress =
      this.web3Service.getAddressOrNull() ?? (await this.web3Service.connectWallet());

    // Derive ECC key pair — this is the single MetaMask popup
    await this.e2eeService.recoverPrivateKey();

    // Request a challenge from the backend
    const challenge = await this.getChallenge(walletAddress);

    // Sign the challenge with the derived ECC private key (no popup)
    const eccSignature = this.e2eeService.signChallenge(challenge);

    const loginRequest: LoginRequest = { walletAddress, eccSignature, challenge };

    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.API_URL}/login`, loginRequest).pipe(
        tap((res) => {
          this.setToken(res.token);
        })
      )
    );

    return response;
  }

  /**
   * Full register flow with a single MetaMask popup:
   * 1. Connect wallet (if not connected).
   * 2. Derive ECC key pair from a single MetaMask signature (the only popup).
   * 3. Generate the user's personal AES data key, encrypted with their own ECC public key.
   * 4. Request a challenge from the backend.
   * 5. Sign the challenge with the derived ECC key (no popup).
   * 6. Send registration data + ECC public key + encrypted AES key + signed challenge to backend.
   * 7. Store the returned JWT token.
   *
   * The ECC public key is stored by the backend for future challenge-response
   * authentication and for E2EE envelope creation by other users. The encrypted
   * AES key is the user's personal data-encryption key, recoverable only by
   * the user themself (via their wallet-derived private key).
   *
   * @param registerRequest - The registration form data (personal info, role, etc.).
   * @returns The login response containing the JWT token.
   * @throws {AppError} If any step in the registration flow fails.
   */
  async register(registerRequest: RegisterRequest): Promise<LoginResponse> {
    const walletAddress =
      this.web3Service.getAddressOrNull() ?? (await this.web3Service.connectWallet());

    const eccPublicKey = await this.e2eeService.getPublicKeyForRegistration();

    // Only patients get a personal AES data key
    const encryptedAesKey = registerRequest.roles.includes('Patient')
      ? await this.e2eeService.generateEncryptedAesKeyForRegistration()
      : undefined;

    const challenge = await this.getChallenge(walletAddress);
    const eccSignature = this.e2eeService.signChallenge(challenge);

    const payload: RegisterRequest = {
      ...registerRequest,
      walletAddress,
      eccSignature,
      eccPublicKey,
      encryptedAesKey,
    };

    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.API_URL}/register`, payload)
    );

    return response;
  }

  /**
   * Logout: clear token, clear ECC private key from memory, and disconnect wallet.
   */
  logout(): void {
    localStorage.clear();
    this.authStateSubject.next({
      token: null,
      isAuthenticated: false,
      user: null,
    });
    this.e2eeService.clearPrivateKey();
    this.web3Service.disconnectWallet();
  }

  // ==================== Challenge ====================

  /**
   * Requests a one-time challenge from the backend for the given wallet address.
   * The challenge is a cryptographically secure random hex string that must be
   * signed with the user's ECC private key to prove identity.
   *
   * @param walletAddress - The Ethereum wallet address requesting authentication.
   * @returns The challenge string to be signed with the ECC key.
   * @throws {AppError} If the HTTP request fails (propagated from errorInterceptor).
   */
  private async getChallenge(walletAddress: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<ChallengeResponse>(`${this.API_URL}/challenge/${walletAddress}`)
    );
    return response.challenge;
  }

  // ==================== Token Management ====================

  /**
   * Get the stored JWT token, or null if not authenticated.
   */
  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  /**
   * Check if user is authenticated (has a valid, non-expired token).
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  /**
   * Get the decoded JWT token payload, or null if not authenticated.
   */
  getDecodedToken(): DecodedToken | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Get user roles from the decoded token.
   * @returns An array of role strings, or an empty array if not authenticated.
   */
  getRoles(): string[] {
    const user = this.getDecodedToken();
    if (!user) return [];
    return Array.isArray(user.role) ? user.role : [user.role];
  }

  /**
   * Check if the current user has a specific role.
   * @param role - The role name to check for.
   */
  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  // ==================== Private Helpers ====================

  /**
   * Store token in localStorage and update the auth state subject.
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    const decoded = this.decodeToken(token);
    this.authStateSubject.next({
      token,
      isAuthenticated: true,
      user: decoded,
    });
  }

  /**
   * Load token from localStorage on service initialization.
   * If the token is expired, it is removed from storage.
   */
  private loadTokenFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token && !this.isTokenExpired(token)) {
      const decoded = this.decodeToken(token);
      this.authStateSubject.next({
        token,
        isAuthenticated: true,
        user: decoded,
      });
    } else if (token) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /**
   * Decode JWT token payload (base64 → JSON).
   * @returns The decoded token or null if decoding fails.
   */
  private decodeToken(token: string): DecodedToken | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded as DecodedToken;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if a JWT token is expired by comparing its `exp` claim to the current time.
   */
  private isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    const expirationDate = new Date(decoded.exp * 1000);
    return expirationDate <= new Date();
  }

  /**
   * Watch for wallet address changes and auto-logout if the wallet switches.
   * This prevents stale authentication when the user changes MetaMask accounts.
   */
  private watchWalletChanges(): void {
    this.walletSubscription = this.web3Service.walletAddress$
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev !== null && prev !== curr && this.isAuthenticated())
      )
      .subscribe(([prev, curr]) => {
        this.logout();
      });
  }
}
