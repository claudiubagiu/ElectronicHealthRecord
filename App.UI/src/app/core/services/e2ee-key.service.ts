import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Web3Service } from './web3.service';
import { AppError } from '../errors/app.error';
import { PublicKeyResponse } from '../models/e2ee-key.model';
import { environment } from '../../../environments/environment';
import { SigningKey } from 'ethers';
import { CryptoService } from './crypto.service';

/**
 * Deterministic derivation message — must be identical every time
 * so the same wallet always produces the same derived private key.
 */
const DERIVATION_MESSAGE = 'EHR-E2EE-key-derivation-v1';

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
   * Derives a deterministic secp256k1 private key from a MetaMask signature.
   *
   * Flow:
   * 1. Ask MetaMask to sign the deterministic derivation message.
   * 2. SHA-256 the signature bytes to produce 32 bytes of key material.
   * 3. Use those 32 bytes as a secp256k1 private key.
   * 4. Derive the corresponding uncompressed public key.
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

  // ==================== Login Flow ====================

  /**
   * Called after every login to recover the ECC private key.
   *
   * Derives the same deterministic secp256k1 key pair from the wallet
   * signature. No server round-trip needed — the key is derived purely
   * from the MetaMask signature of the deterministic message.
   */
  async recoverPrivateKey(): Promise<void> {
    try {
      const { privateKey, publicKey } = await this.deriveEccKeyPairFromWallet();
      this.eccPrivateKey = privateKey;
      this.eccPublicKey = publicKey;
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

  /**
   * Returns the in-memory ECC private key (hex), or null if not yet derived.
   */
  getPrivateKey(): string | null {
    return this.eccPrivateKey;
  }

  /**
   * Returns the in-memory ECC public key (hex), or null if not yet derived.
   */
  getPublicKey(): string | null {
    return this.eccPublicKey;
  }

  /**
   * Returns true if the ECC private key is currently available in memory.
   */
  hasPrivateKey(): boolean {
    return this.eccPrivateKey !== null;
  }

  /**
   * Clears the ECC key pair from memory (e.g., on logout).
   */
  clearPrivateKey(): void {
    this.eccPrivateKey = null;
    this.eccPublicKey = null;
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
