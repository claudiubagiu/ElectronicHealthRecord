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

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly API_URL = 'http://auth.api.docker.localhost/api/Auth';
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
   * 1. Connect wallet (if not connected)
   * 2. Get nonce from backend
   * 3. Sign nonce with MetaMask
   * 4. Send signature to backend for verification
   * 5. Store JWT token
   * 6. Recover E2EE RSA private key from server (decrypt with wallet-derived AES key)
   * @throws {AuthError} If any step fails
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

    // Step 5: Recover E2EE RSA private key after login
    try {
      await this.e2eeService.recoverPrivateKey();
    } catch (error) {
      console.error('[Auth] Failed to recover E2EE private key during login:', error);
    }

    return response;
  }

  /**
   * Full register flow:
   * 1. Connect wallet (if not connected)
   * 2. Get nonce from backend
   * 3. Sign nonce with MetaMask
   * 4. Generate RSA key pair, encrypt private key with wallet-derived AES key
   * 5. Send registration payload (including E2EE keys) to backend for verification
   * 6. Store JWT token
   * @throws {AuthError} If any step fails
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
   * Logout: clear token, clear E2EE private key from memory, and disconnect wallet
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
   * Get nonce for a wallet address from the backend
   * @throws {AppError} If nonce fetch fails
   */
  private async getNonce(walletAddress: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<NonceResponse>(`${this.API_URL}/nonce/${walletAddress}`)
    );
    return response.nonce;
  }

  // ==================== Token Management ====================

  /**
   * Get stored token
   */
  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  /**
   * Get decoded token payload
   */
  getDecodedToken(): DecodedToken | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Get user roles from token
   */
  getRoles(): string[] {
    const user = this.getDecodedToken();
    if (!user) return [];
    return Array.isArray(user.role) ? user.role : [user.role];
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  // ==================== Private Helpers ====================

  /**
   * Store token in localStorage and update auth state
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
   * Load token from localStorage on service initialization
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
   * Decode JWT token payload
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
   * Check if a JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const expirationDate = new Date(decoded.exp * 1000);
    return expirationDate <= new Date();
  }

  /**
   * Watch for wallet address changes and auto-logout if wallet switches
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
