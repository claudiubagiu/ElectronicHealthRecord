import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Web3Service } from './web3.service';
import { AppError } from '../errors/app.error';
import { PublicKeyResponse } from '../models/e2ee-key.model';
import { environment } from '../../../environments/environment';
import { SigningKey, hashMessage } from 'ethers';
import { CryptoService } from './crypto.service';

const DERIVATION_MESSAGE = 'EHR-E2EE-key-derivation-v1';
const LS_PRIVATE_KEY = 'ecc_private_key';
const LS_PUBLIC_KEY = 'ecc_public_key';

@Injectable({ providedIn: 'root' })
export class E2eeKeyService {
  private readonly API_URL = environment.apiUrls.users;
  private http = inject(HttpClient);
  private web3Service = inject(Web3Service);

  private eccPrivateKey: string | null = null;
  private eccPublicKey: string | null = null;

  async deriveEccKeyPairFromWallet(): Promise<{ privateKey: string; publicKey: string }> {
    try {
      const signature = await this.web3Service.signMessage(DERIVATION_MESSAGE);

      const sigBytes = CryptoService.hexToBytes(signature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes.buffer as ArrayBuffer);

      const privateKeyHex =
        '0x' +
        Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

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

  async recoverPrivateKey(): Promise<void> {
    try {
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

  async generateEncryptedAesKeyForRegistration(): Promise<string> {
    const publicKey = this.getPublicKey();
    if (!publicKey) {
      throw new AppError({
        message: 'ECC public key is not available. Please derive your encryption keys first.',
        status: 401,
        title: 'Key Not Available',
        type: 'E2EE_KEY_NOT_AVAILABLE',
      });
    }

    try {
      const aesKey = await CryptoService.generateAESKey();
      const aesKeyRaw = await CryptoService.exportAESKey(aesKey);
      const encryptedAesKey = CryptoService.encryptAESKeyWithECIES(aesKeyRaw, publicKey);
      return CryptoService.arrayBufferToBase64(encryptedAesKey.buffer as ArrayBuffer);
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Failed to generate encrypted AES key for registration:', error);
      throw new AppError({
        message: 'Failed to generate your personal encryption key. Please try again.',
        status: 500,
        title: 'AES Key Generation Failed',
        type: 'AES_KEY_GENERATION_FAILED',
      });
    }
  }

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
