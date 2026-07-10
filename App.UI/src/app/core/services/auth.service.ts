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

  async login(): Promise<LoginResponse> {
    const walletAddress =
      this.web3Service.getAddressOrNull() ?? (await this.web3Service.connectWallet());

    await this.e2eeService.recoverPrivateKey();

    const challenge = await this.getChallenge(walletAddress);

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

  async register(registerRequest: RegisterRequest): Promise<LoginResponse> {
    const walletAddress =
      this.web3Service.getAddressOrNull() ?? (await this.web3Service.connectWallet());

    const eccPublicKey = await this.e2eeService.getPublicKeyForRegistration();

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

  async rotateAesKey(encryptedAesKey: string): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${this.API_URL}/me/aes-key`, { encryptedAesKey }));
  }

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

  private async getChallenge(walletAddress: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<ChallengeResponse>(`${this.API_URL}/challenge/${walletAddress}`)
    );
    return response.challenge;
  }

  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  getDecodedToken(): DecodedToken | null {
    return this.authStateSubject.value.user;
  }

  getRoles(): string[] {
    const user = this.getDecodedToken();
    if (!user) return [];
    return Array.isArray(user.role) ? user.role : [user.role];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    const decoded = this.decodeToken(token);
    this.authStateSubject.next({
      token,
      isAuthenticated: true,
      user: decoded,
    });
  }

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

  private isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    const expirationDate = new Date(decoded.exp * 1000);
    return expirationDate <= new Date();
  }

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
