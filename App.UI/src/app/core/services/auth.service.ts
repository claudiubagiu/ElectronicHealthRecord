import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, firstValueFrom } from 'rxjs';
import { filter, map, pairwise, tap } from 'rxjs/operators';
import { Web3Service } from './web3.service';
import {
  AuthState,
  DecodedToken,
  LoginRequest,
  LoginResponse,
  NonceResponse,
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
   * Full login flow:
   * 1. Connect wallet (if not connected).
   * 2. Get nonce from backend.
   * 3. Sign nonce with MetaMask.
   * 4. Send signature to backend for verification.
   * 5. Store JWT token.
   * 6. Recover E2EE RSA private key from server (decrypt with wallet-derived AES key).
   *
   * The E2EE key recovery is non-blocking: if it fails, the user is still
   * logged in but will not be able to decrypt existing encrypted data until
   * the key is recovered successfully.
   *
   * @returns The login response containing the JWT token.
   * @throws {AppError} If wallet connection, nonce retrieval, signing, or backend verification fails.
   */
  async login(): Promise<LoginResponse> {
    // Step 1: Ensure wallet is connected
    const walletAddress =
      this.web3Service.getAddressOrNull() ?? (await this.web3Service.connectWallet());

    // Step 2: Get nonce from backend
    const nonce = await this.getNonce(walletAddress);

    // Step 3: Sign the nonce with MetaMask
    const signature = await this.web3Service.signMessage(nonce);

    // Step 4: Send to backend for verification
    const loginRequest: LoginRequest = {
      walletAddress,
      signature,
      nonce,
    };

    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.API_URL}/login`, loginRequest).pipe(
        tap((res) => {
          this.setToken(res.token);
        })
      )
    );

    // Step 5: Recover E2EE RSA private key after login (non-blocking)
    try {
      await this.e2eeService.recoverPrivateKey();
    } catch (error) {
      if (error instanceof AppError) {
        console.error(`[Auth] E2EE key recovery failed [${error.type}]:`, error.message);
      } else {
        console.error('[Auth] Unexpected error during E2EE key recovery:', error);
      }
    }

    return response;
  }

  /**
   * Full register flow:
   * 1. Connect wallet (if not connected).
   * 2. Get nonce from backend.
   * 3. Sign nonce with MetaMask.
   * 4. Generate RSA key pair, encrypt private key with wallet-derived AES key.
   * 5. Send registration payload (including E2EE keys) to backend for verification.
   * 6. Store JWT token.
   *
   * @param registerRequest - The registration form data (personal info, role, etc.).
   * @returns The login response containing the JWT token.
   * @throws {AppError} If any step in the registration flow fails.
   */
  async register(registerRequest: RegisterRequest): Promise<LoginResponse> {
    // Step 1: Ensure wallet is connected
    const walletAddress =
      this.web3Service.getAddressOrNull() ?? (await this.web3Service.connectWallet());

    // Step 2: Get nonce from backend
    const nonce = await this.getNonce(walletAddress);

    // Step 3: Sign the nonce with MetaMask
    const signature = await this.web3Service.signMessage(nonce);

    // Step 4: Generate E2EE RSA keys and encrypt private key with wallet
    const { publicKey, encryptedPrivateKey } = await this.e2eeService.generateKeysForRegistration();

    // Step 5: Send payload to backend (keys included)
    const payload = {
      ...registerRequest,
      walletAddress,
      signature,
      publicKey,
      encryptedPrivateKey,
    };

    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.API_URL}/register`, payload).pipe(
        tap((res) => {
          if (res?.token) {
            this.setToken(res.token);
          }
        })
      )
    );

    return response;
  }

  /**
   * Logout: clear token, clear E2EE private key from memory, and disconnect wallet.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.authStateSubject.next({
      token: null,
      isAuthenticated: false,
      user: null,
    });
    this.e2eeService.clearPrivateKey();
    this.web3Service.disconnectWallet();
  }

  // ==================== Nonce ====================

  /**
   * Get nonce for a wallet address from the backend.
   * The nonce is a one-time challenge used to verify wallet ownership.
   *
   * @param walletAddress - The Ethereum wallet address to get a nonce for.
   * @returns The nonce string to be signed by the wallet.
   * @throws {AppError} If the HTTP request fails (propagated from errorInterceptor).
   */
  private async getNonce(walletAddress: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<NonceResponse>(`${this.API_URL}/nonce/${walletAddress}`)
    );
    return response.nonce;
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
      // Token expired, clean up
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
