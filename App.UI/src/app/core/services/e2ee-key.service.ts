import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CryptoService } from './crypto.service';
import { Web3Service } from './web3.service';
import { AppError } from '../errors/app.error';
import { environment } from '../../../environments/environment';

/**
 * Deterministic derivation message — must be identical every time
 * so the same wallet always produces the same wrapping key.
 */
const DERIVATION_MESSAGE = 'EHR-E2EE-key-derivation-v1';

export interface EncryptedPrivateKeyResponse {
  encryptedPrivateKey: string;
}

export interface PublicKeyResponse {
  userId: string;
  publicKey: string;
}

@Injectable({ providedIn: 'root' })
export class E2eeKeyService {
  private readonly API_URL = environment.apiUrls.users;
  private http = inject(HttpClient);
  private web3Service = inject(Web3Service);

  /**
   * RSA private key kept in memory for the duration of the session.
   * Never persisted to localStorage or sent to the server in plain text.
   */
  private rsaPrivateKey: CryptoKey | null = null;

  // ==================== Key Derivation ====================

  /**
   * Derives a 256-bit AES-GCM wrapping key from a MetaMask signature.
   *
   * Flow:
   * 1. Ask MetaMask to sign the deterministic derivation message.
   * 2. SHA-256 the signature bytes to produce 256-bit key material.
   * 3. Import the hash as an AES-GCM CryptoKey for encrypt/decrypt.
   *
   * Because the same wallet + message always produce the same signature,
   * this yields a deterministic wrapping key tied to the user's wallet.
   */
  async deriveWrappingKeyFromWallet(): Promise<CryptoKey> {
    try {
      const signature = await this.web3Service.signMessage(DERIVATION_MESSAGE);

      const sigBytes = CryptoService.hexToBytes(signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes.buffer as ArrayBuffer);

      return await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
      ]);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to derive wrapping key from wallet:', error);
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
   * Generates a fresh RSA-OAEP 2048-bit key pair, exports both keys as JWK,
   * encrypts the private key with a wallet-derived AES wrapping key, and
   * keeps the raw private key in memory for immediate use.
   */
  async generateKeysForRegistration(): Promise<{
    publicKey: string;
    encryptedPrivateKey: string;
  }> {
    try {
      const keyPair = await CryptoService.generateRSAKeyPair();
      const publicKeyJwk = await CryptoService.exportPublicKey(keyPair.publicKey);
      const privateKeyJwk = await CryptoService.exportPrivateKey(keyPair.privateKey);
      const wrappingKey = await this.deriveWrappingKeyFromWallet();
      const encryptedPrivateKey = await CryptoService.encryptString(privateKeyJwk, wrappingKey);

      this.rsaPrivateKey = keyPair.privateKey;

      return { publicKey: publicKeyJwk, encryptedPrivateKey };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to generate E2EE keys for registration:', error);
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
   * Called after every login to recover the RSA private key.
   *
   * 1. Download the encrypted private key blob from the server.
   * 2. Derive the same wrapping key from the wallet signature.
   * 3. Decrypt the blob, import the RSA private key, and store it in memory.
   *
   * If no encrypted key is found on the server (e.g., legacy account),
   * the method returns silently without throwing.
   */
  async recoverPrivateKey(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<EncryptedPrivateKeyResponse>(`${this.API_URL}/keys/private`)
      );

      if (!response?.encryptedPrivateKey) {
        console.warn('[E2EE] No encrypted private key found on server.');
        return;
      }

      const wrappingKey = await this.deriveWrappingKeyFromWallet();
      const privateKeyJwk = await CryptoService.decryptString(
        response.encryptedPrivateKey,
        wrappingKey
      );
      this.rsaPrivateKey = await CryptoService.importPrivateKey(privateKeyJwk);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to recover E2EE private key:', error);
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
   * Returns the in-memory RSA private key, or null if not yet recovered/generated.
   */
  getPrivateKey(): CryptoKey | null {
    return this.rsaPrivateKey;
  }

  /**
   * Returns true if the RSA private key is currently available in memory.
   */
  hasPrivateKey(): boolean {
    return this.rsaPrivateKey !== null;
  }

  /**
   * Clears the RSA private key from memory (e.g., on logout).
   */
  clearPrivateKey(): void {
    this.rsaPrivateKey = null;
  }

  // ==================== Public Key Retrieval ====================

  /**
   * Fetches the RSA public key for a given user from the server.
   */
  async getPublicKey(userId: string): Promise<PublicKeyResponse> {
    try {
      return await firstValueFrom(
        this.http.get<PublicKeyResponse>(`${this.API_URL}/keys/public/${userId}`)
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

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
   * Fetches RSA public keys for multiple users in a single request.
   */
  async getPublicKeysBulk(userIds: string[]): Promise<PublicKeyResponse[]> {
    try {
      return await firstValueFrom(
        this.http.post<PublicKeyResponse[]>(`${this.API_URL}/keys/public/bulk`, userIds)
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

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
