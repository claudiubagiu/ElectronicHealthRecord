import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CryptoService } from './crypto.service';
import { Web3Service } from './web3.service';

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
  private readonly API_URL = 'http://users.api.docker.localhost/api/Users';
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
   * 1. Ask MetaMask to sign the deterministic message.
   * 2. SHA-256 the signature bytes → 256-bit key material.
   * 3. Import as AES-GCM CryptoKey for wrap/unwrap.
   */
  async deriveWrappingKeyFromWallet(): Promise<CryptoKey> {
    const signature = await this.web3Service.signMessage(DERIVATION_MESSAGE);

    const sigBytes = this.hexToBytes(signature);
    const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes.buffer as ArrayBuffer);

    return await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  // ==================== Register Flow ====================

  /**
   * Called BEFORE sending the register request.
   * Generates RSA keys and encrypts the private key with wallet-derived AES.
   *
   * Returns { publicKey, encryptedPrivateKey } to be included in the register payload,
   * and stores the RSA private key in memory.
   */
  async generateKeysForRegistration(): Promise<{
    publicKey: string;
    encryptedPrivateKey: string;
  }> {
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
  }

  // ==================== Login Flow ====================

  /**
   * Called after every login to recover the RSA private key.
   *
   * 1. Download encrypted private key blob from server.
   * 2. Derive the same wrapping key from wallet signature.
   * 3. Decrypt → import RSA private key → store in memory.
   */
  async recoverPrivateKey(): Promise<void> {
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
  }

  // ==================== Key Access ====================

  getPrivateKey(): CryptoKey | null {
    return this.rsaPrivateKey;
  }

  hasPrivateKey(): boolean {
    return this.rsaPrivateKey !== null;
  }

  clearPrivateKey(): void {
    this.rsaPrivateKey = null;
  }

  // ==================== Public Key Retrieval ====================

  async getPublicKey(userId: string): Promise<PublicKeyResponse> {
    return firstValueFrom(
      this.http.get<PublicKeyResponse>(`${this.API_URL}/keys/public/${userId}`)
    );
  }

  async getPublicKeysBulk(userIds: string[]): Promise<PublicKeyResponse[]> {
    return firstValueFrom(
      this.http.post<PublicKeyResponse[]>(`${this.API_URL}/keys/public/bulk`, userIds)
    );
  }

  // ==================== Private Helpers ====================

  /**
   * Encrypts a string with AES-GCM.
   * Returns format: base64(iv) + ":" + base64(ciphertext)
   */
  private async encryptString(plaintext: string, aesKey: CryptoKey): Promise<string> {
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
  }

  /**
   * Decrypts a string previously encrypted with encryptString.
   * Expects format: base64(iv) + ":" + base64(ciphertext)
   */
  private async decryptString(combined: string, aesKey: CryptoKey): Promise<string> {
    const [ivBase64, encryptedBase64] = combined.split(':');
    const ivBytes = this.base64ToUint8Array(ivBase64);
    const encryptedBytes = this.base64ToUint8Array(encryptedBase64);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      aesKey,
      encryptedBytes.buffer as ArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
  }

  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
