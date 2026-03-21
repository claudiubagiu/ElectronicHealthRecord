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
   *
   * @returns A 256-bit AES-GCM CryptoKey derived from the wallet signature.
   * @throws {AppError} If the wallet signature fails or the key derivation encounters a crypto error.
   */
  async deriveWrappingKeyFromWallet(): Promise<CryptoKey> {
    try {
      const signature = await this.web3Service.signMessage(DERIVATION_MESSAGE);

      const sigBytes = this.hexToBytes(signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes.buffer as ArrayBuffer);

      return await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
      ]);
    } catch (error) {
      // Let AppErrors from web3Service.signMessage propagate as-is
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
   *
   * @returns An object containing the public key (JWK string) and the
   *          AES-encrypted private key blob, ready to be sent to the backend.
   * @throws {AppError} If RSA key generation, export, wallet derivation, or encryption fails.
   */
  async generateKeysForRegistration(): Promise<{
    publicKey: string;
    encryptedPrivateKey: string;
  }> {
    try {
      // 1. Generate RSA-OAEP 2048-bit key pair
      const keyPair = await CryptoService.generateRSAKeyPair();

      // 2. Export public key as JWK string
      const publicKeyJwk = await CryptoService.exportPublicKey(keyPair.publicKey);

      // 3. Export private key as JWK string
      const privateKeyJwk = await CryptoService.exportPrivateKey(keyPair.privateKey);

      // 4. Derive wrapping key from wallet
      const wrappingKey = await this.deriveWrappingKeyFromWallet();

      // 5. Encrypt private key JWK with AES wrapping key
      const encryptedPrivateKey = await this.encryptString(privateKeyJwk, wrappingKey);

      // 6. Keep private key in memory
      this.rsaPrivateKey = keyPair.privateKey;

      return { publicKey: publicKeyJwk, encryptedPrivateKey };
    } catch (error) {
      // Let AppErrors from CryptoService or deriveWrappingKeyFromWallet propagate as-is
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
   *
   * @throws {AppError} If the HTTP request, wallet derivation, decryption, or key import fails.
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
      const privateKeyJwk = await this.decryptString(response.encryptedPrivateKey, wrappingKey);
      this.rsaPrivateKey = await CryptoService.importPrivateKey(privateKeyJwk);
    } catch (error) {
      // Let AppErrors from inner calls propagate as-is
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
   * @param userId - The ID of the user whose public key to retrieve.
   * @throws {AppError} If the HTTP request fails or the user has no public key.
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
   * @param userIds - An array of user IDs whose public keys to retrieve.
   * @throws {AppError} If the HTTP request fails.
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

  // ==================== Private Helpers ====================

  /**
   * Encrypts a plaintext string with AES-GCM using the provided key.
   * A random 12-byte IV is generated per call to ensure uniqueness.
   *
   * @param plaintext - The string to encrypt.
   * @param aesKey - The AES-GCM CryptoKey to use for encryption.
   * @returns A combined string in the format: base64(iv) + ":" + base64(ciphertext).
   * @throws {AppError} If the AES-GCM encryption operation fails.
   */
  private async encryptString(plaintext: string, aesKey: CryptoKey): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        aesKey,
        data.buffer as ArrayBuffer
      );

      const ivBase64 = this.arrayBufferToBase64(iv.buffer as ArrayBuffer);
      const encryptedBase64 = this.arrayBufferToBase64(encrypted);

      return `${ivBase64}:${encryptedBase64}`;
    } catch (error) {
      console.error('Failed to encrypt string:', error);
      throw new AppError({
        message: 'Failed to encrypt data with AES-GCM.',
        status: 500,
        title: 'Encryption Failed',
        type: 'E2EE_ENCRYPTION_FAILED',
      });
    }
  }

  /**
   * Decrypts a string previously encrypted with {@link encryptString}.
   *
   * @param combined - The combined string in the format: base64(iv) + ":" + base64(ciphertext).
   * @param aesKey - The AES-GCM CryptoKey to use for decryption (must match the encryption key).
   * @returns The original plaintext string.
   * @throws {AppError} If the format is invalid, the key doesn't match, or the data is corrupted.
   */
  private async decryptString(combined: string, aesKey: CryptoKey): Promise<string> {
    try {
      const [ivBase64, encryptedBase64] = combined.split(':');

      if (!ivBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted string format: expected "iv:ciphertext".');
      }

      const ivBytes = this.base64ToUint8Array(ivBase64);
      const encryptedBytes = this.base64ToUint8Array(encryptedBase64);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
        aesKey,
        encryptedBytes.buffer as ArrayBuffer
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to decrypt string:', error);
      throw new AppError({
        message:
          'Failed to decrypt data. The decryption key may not match or the data may be corrupted.',
        status: 500,
        title: 'Decryption Failed',
        type: 'E2EE_DECRYPTION_FAILED',
      });
    }
  }

  /**
   * Converts a hex string (with or without "0x" prefix) to a Uint8Array.
   */
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  /**
   * Converts an ArrayBuffer to a base64-encoded string.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  /**
   * Converts a base64-encoded string back to a Uint8Array.
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
