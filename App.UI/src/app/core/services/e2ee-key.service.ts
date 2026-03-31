import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Web3Service } from './web3.service';
import { AppError } from '../errors/app.error';
import { PublicKeyResponse } from '../models/e2ee-key.model';
import { environment } from '../../../environments/environment';
import { SigningKey, hashMessage } from 'ethers';
import { CryptoService } from './crypto.service';

/**
 * Deterministic derivation message — must be identical every time
 * so the same wallet always produces the same derived private key.
 */
const DERIVATION_MESSAGE = 'EHR-E2EE-key-derivation-v1';
const LS_PRIVATE_KEY = 'ecc_private_key';
const LS_PUBLIC_KEY = 'ecc_public_key';

@Injectable({ providedIn: 'root' })
export class E2eeKeyService {
  private readonly API_URL = environment.apiUrls.users;
  private http = inject(HttpClient);
  private web3Service = inject(Web3Service);

  /**
   * The wallet's secp256k1 private key derived from a deterministic MetaMask
   * signature. Kept in memory for the session duration.
   * Never persisted to localStorage or sent to the server.
   */
  private eccPrivateKey: string | null = null;

  /**
   * The wallet's uncompressed secp256k1 public key (hex, 0x04...).
   * Derived alongside the private key from the same signature.
   */
  private eccPublicKey: string | null = null;

  // ==================== Key Derivation ====================

  /**
   * Derives a deterministic secp256k1 key pair from a single MetaMask signature.
   *
   * This is the only MetaMask popup in the entire authentication flow.
   * The user signs a fixed derivation message, producing a deterministic
   * signature that is then hashed (SHA-256) to produce 32 bytes of key
   * material used as a secp256k1 private key.
   *
   * Because the same wallet + message always produce the same signature,
   * this yields a deterministic ECC key pair tied to the user's wallet.
   * The private key never leaves memory and is never sent to any server.
   *
   * @returns An object with the hex-encoded privateKey and publicKey.
   */
  async deriveEccKeyPairFromWallet(): Promise<{ privateKey: string; publicKey: string }> {
    try {
      const signature = await this.web3Service.signMessage(DERIVATION_MESSAGE);

      // Hash the signature to get 32 bytes suitable as a secp256k1 private key
      const sigBytes = CryptoService.hexToBytes(signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes.buffer as ArrayBuffer);

      // Use the 32-byte hash as the private key
      const privateKeyHex =
        '0x' +
        Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      // Derive the corresponding public key
      const signingKey = new SigningKey(privateKeyHex);
      const publicKeyHex = signingKey.publicKey; // uncompressed, 0x04...

      return { privateKey: privateKeyHex, publicKey: publicKeyHex };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Failed to derive ECC key pair from wallet:', error);
      throw new AppError({
        message: 'Failed to derive encryption key from your wallet. Please try again.',
        status: 500,
        title: 'Key Derivation Failed',
        type: 'E2EE_KEY_DERIVATION_FAILED',
      });
    }
  }

  // ==================== Login Flow ====================

  async recoverPrivateKey(): Promise<void> {
    try {
      const cachedPrivateKey = localStorage.getItem(LS_PRIVATE_KEY);
      const cachedPublicKey = localStorage.getItem(LS_PUBLIC_KEY);

      if (cachedPrivateKey && cachedPublicKey) {
        this.eccPrivateKey = cachedPrivateKey;
        this.eccPublicKey = cachedPublicKey;
        return;
      }

      const { privateKey, publicKey } = await this.deriveEccKeyPairFromWallet();
      this.eccPrivateKey = privateKey;
      this.eccPublicKey = publicKey;

      localStorage.setItem(LS_PRIVATE_KEY, privateKey);
      localStorage.setItem(LS_PUBLIC_KEY, publicKey);
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Failed to recover ECC private key:', error);
      throw new AppError({
        message:
          'Failed to recover your encryption private key. You may not be able to decrypt existing data.',
        status: 500,
        title: 'Private Key Recovery Failed',
        type: 'E2EE_PRIVATE_KEY_RECOVERY_FAILED',
      });
    }
  }

  // ==================== Key Access ====================

  getPrivateKey(): string | null {
    if (!this.eccPrivateKey) {
      this.eccPrivateKey = localStorage.getItem(LS_PRIVATE_KEY);
    }
    return this.eccPrivateKey;
  }

  getPublicKey(): string | null {
    if (!this.eccPublicKey) {
      this.eccPublicKey = localStorage.getItem(LS_PUBLIC_KEY);
    }
    return this.eccPublicKey;
  }

  hasPrivateKey(): boolean {
    return !!(this.eccPrivateKey ?? localStorage.getItem(LS_PRIVATE_KEY));
  }

  clearPrivateKey(): void {
    this.eccPrivateKey = null;
    this.eccPublicKey = null;
    localStorage.removeItem(LS_PRIVATE_KEY);
    localStorage.removeItem(LS_PUBLIC_KEY);
  }

  // ==================== Challenge Signing ====================

  /**
   * Signs a challenge string using the derived ECC private key, entirely in
   * JavaScript (no MetaMask popup). The challenge is hashed with keccak256
   * before signing, producing a compact secp256k1 signature.
   *
   * This is used for the challenge-response authentication flow where the
   * backend verifies the signature against the stored ECC public key.
   *
   * @param challenge - The challenge string received from the backend.
   * @returns The hex-encoded secp256k1 signature of the challenge.
   * @throws {AppError} If the ECC private key is not available in memory.
   */
  signChallenge(challenge: string): string {
    const privateKey = this.getPrivateKey();
    if (!privateKey) {
      throw new AppError({
        message: 'ECC private key is not available. Please connect your wallet first.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }

    try {
      const signingKey = new SigningKey(privateKey);
      const digest = hashMessage(challenge);
      const sig = signingKey.sign(digest);
      return sig.serialized;
    } catch (error) {
      console.error('Failed to sign challenge with ECC key:', error);
      throw new AppError({
        message: 'Failed to sign the authentication challenge.',
        status: 500,
        title: 'Challenge Signing Failed',
        type: 'CHALLENGE_SIGNING_FAILED',
      });
    }
  }

  // ==================== Register Flow ====================

  /**
   * Called BEFORE sending the register request.
   *
   * Derives a deterministic secp256k1 key pair from the wallet signature,
   * stores the private key in memory, and returns the public key to be
   * sent to the backend for storage.
   *
   * No encrypted private key is generated or sent — the private key lives
   * only in memory and is re-derived from the wallet on each login.
   *
   * @returns The hex-encoded uncompressed ECC public key for registration.
   */
  async getPublicKeyForRegistration(): Promise<string> {
    try {
      const { privateKey, publicKey } = await this.deriveEccKeyPairFromWallet();
      this.eccPrivateKey = privateKey;
      this.eccPublicKey = publicKey;

      localStorage.setItem(LS_PRIVATE_KEY, privateKey);
      localStorage.setItem(LS_PUBLIC_KEY, publicKey);

      return publicKey;
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Failed to generate ECC public key for registration:', error);
      throw new AppError({
        message: 'Failed to generate encryption keys for registration. Please try again.',
        status: 500,
        title: 'E2EE Key Generation Failed',
        type: 'E2EE_KEY_GENERATION_FAILED',
      });
    }
  }

  // ==================== Public Key Retrieval ====================

  /**
   * Fetches the ECC public key for a given user from the server.
   */
  async getPublicKey_remote(userId: string): Promise<PublicKeyResponse> {
    try {
      return await firstValueFrom(
        this.http.get<PublicKeyResponse>(`${this.API_URL}/keys/public/${userId}`)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error(`Failed to fetch public key for user ${userId}:`, error);
      throw new AppError({
        message: 'Failed to retrieve the encryption public key for the specified user.',
        status: 500,
        title: 'Public Key Fetch Failed',
        type: 'E2EE_PUBLIC_KEY_FETCH_FAILED',
      });
    }
  }

  /**
   * Fetches ECC public keys for multiple users in a single request.
   */
  async getPublicKeysBulk(userIds: string[]): Promise<PublicKeyResponse[]> {
    try {
      return await firstValueFrom(
        this.http.post<PublicKeyResponse[]>(`${this.API_URL}/keys/public/bulk`, userIds)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Failed to fetch public keys in bulk:', error);
      throw new AppError({
        message: 'Failed to retrieve encryption public keys for the specified users.',
        status: 500,
        title: 'Bulk Public Key Fetch Failed',
        type: 'E2EE_BULK_PUBLIC_KEY_FETCH_FAILED',
      });
    }
  }
}
