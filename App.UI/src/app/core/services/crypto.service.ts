import { Injectable } from '@angular/core';
import { encrypt, decrypt } from 'eciesjs';
import { AppError } from '../errors/app.error';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  // ==================== AES Key Management ====================

  /**
   * Generates a 256-bit AES-GCM symmetric encryption key.
   */
  static async generateAESKey(): Promise<CryptoKey> {
    try {
      return await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ]);
    } catch (error) {
      console.error('Failed to generate AES key:', error);
      throw new AppError({
        message:
          'Failed to generate AES encryption key. Your browser may not support the required cryptographic operations.',
        status: 500,
        title: 'AES Key Generation Failed',
        type: 'AES_KEY_GENERATION_FAILED',
      });
    }
  }

  /**
   * Exports an AES key as raw bytes (ArrayBuffer).
   */
  static async exportAESKey(aesKey: CryptoKey): Promise<ArrayBuffer> {
    try {
      return await window.crypto.subtle.exportKey('raw', aesKey);
    } catch (error) {
      console.error('Failed to export AES key:', error);
      throw new AppError({
        message: 'Failed to export AES key.',
        status: 500,
        title: 'AES Key Export Failed',
        type: 'AES_KEY_EXPORT_FAILED',
      });
    }
  }

  /**
   * Imports a decrypted raw AES key back into a CryptoKey object.
   * The key is configured for decryption usage only.
   */
  static async importAESKey(rawKey: ArrayBuffer): Promise<CryptoKey> {
    try {
      return await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, [
        'decrypt',
      ]);
    } catch (error) {
      console.error('Failed to import AES key:', error);
      throw new AppError({
        message: 'Failed to import AES decryption key. The key data may be corrupted.',
        status: 500,
        title: 'AES Key Import Failed',
        type: 'AES_KEY_IMPORT_FAILED',
      });
    }
  }

  // ==================== AES File Encryption/Decryption ====================

  /**
   * Encrypts a file (ArrayBuffer) using AES-GCM.
   * A random 12-byte IV is generated for each encryption to ensure uniqueness.
   */
  static async encryptFileWithAES(
    file: ArrayBuffer,
    aesKey: CryptoKey
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        file
      );

      return { encrypted, iv };
    } catch (error) {
      console.error('Failed to encrypt file with AES:', error);
      throw new AppError({
        message: 'Failed to encrypt file. Please try again.',
        status: 500,
        title: 'File Encryption Failed',
        type: 'AES_FILE_ENCRYPTION_FAILED',
      });
    }
  }

  /**
   * Decrypts an AES-GCM encrypted file using the provided key and IV.
   */
  static async decryptFileWithAES(
    encryptedFile: ArrayBuffer,
    aesKey: CryptoKey,
    iv: BufferSource
  ): Promise<ArrayBuffer> {
    try {
      return await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, encryptedFile);
    } catch (error) {
      console.error('Failed to decrypt file with AES:', error);
      throw new AppError({
        message:
          'Failed to decrypt file. The decryption key may be incorrect or the data may be corrupted.',
        status: 500,
        title: 'File Decryption Failed',
        type: 'AES_FILE_DECRYPTION_FAILED',
      });
    }
  }

  // ==================== AES String Encryption/Decryption ====================

  /**
   * Encrypts a plaintext string with AES-GCM using the provided key.
   * A random 12-byte IV is generated per call to ensure uniqueness.
   *
   * @param plaintext - The string to encrypt.
   * @param aesKey - The AES-GCM CryptoKey to use for encryption.
   * @returns A combined string in the format: base64(iv) + ":" + base64(ciphertext).
   */
  static async encryptString(plaintext: string, aesKey: CryptoKey): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        aesKey,
        data.buffer as ArrayBuffer
      );

      const ivBase64 = CryptoService.arrayBufferToBase64(iv.buffer as ArrayBuffer);
      const encryptedBase64 = CryptoService.arrayBufferToBase64(encrypted);

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
   */
  static async decryptString(combined: string, aesKey: CryptoKey): Promise<string> {
    try {
      const [ivBase64, encryptedBase64] = combined.split(':');

      if (!ivBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted string format: expected "iv:ciphertext".');
      }

      const ivBytes = CryptoService.base64ToUint8Array(ivBase64);
      const encryptedBytes = CryptoService.base64ToUint8Array(encryptedBase64);

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

  // ==================== ECC Envelope Operations (secp256k1 via eciesjs) ====================

  /**
   * Encrypts a raw AES key using ECIES with a recipient's secp256k1 public key.
   *
   * Uses the eciesjs library which internally handles:
   * - Ephemeral key pair generation
   * - ECDH shared secret computation
   * - HKDF key derivation
   * - AES-256-GCM encryption
   *
   * @param aesKeyRaw - The raw AES key bytes to encrypt (typically 32 bytes).
   * @param recipientPublicKeyHex - The recipient's secp256k1 public key (hex string, with or without 0x prefix).
   * @returns A Uint8Array containing the ECIES ciphertext (ephemeral pubkey + encrypted data).
   */
  static encryptAESKeyWithECIES(aesKeyRaw: ArrayBuffer, recipientPublicKeyHex: string): Uint8Array {
    try {
      const cleanHex = recipientPublicKeyHex.startsWith('0x')
        ? recipientPublicKeyHex.slice(2)
        : recipientPublicKeyHex;
      return encrypt(cleanHex, new Uint8Array(aesKeyRaw));
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Failed to encrypt AES key with ECIES:', error);
      throw new AppError({
        message: "Failed to encrypt the AES key with the recipient's ECC public key.",
        status: 500,
        title: 'ECIES Encryption Failed',
        type: 'ECIES_ENCRYPTION_FAILED',
      });
    }
  }

  /**
   * Decrypts an ECIES-encrypted AES key using the wallet's secp256k1 private key.
   *
   * Uses the eciesjs library which internally handles:
   * - Parsing the ephemeral public key from the ciphertext
   * - ECDH shared secret computation
   * - HKDF key derivation
   * - AES-256-GCM decryption
   *
   * @param encryptedEnvelope - The ECIES ciphertext (as produced by encryptAESKeyWithECIES).
   * @param walletPrivateKeyHex - The user's secp256k1 private key (hex string, with or without 0x prefix).
   * @returns The decrypted raw AES key bytes as a Uint8Array.
   */
  static decryptAESKeyWithECIES(
    encryptedEnvelope: ArrayBuffer,
    walletPrivateKeyHex: string
  ): Uint8Array {
    try {
      const cleanHex = walletPrivateKeyHex.startsWith('0x')
        ? walletPrivateKeyHex.slice(2)
        : walletPrivateKeyHex;
      return decrypt(cleanHex, new Uint8Array(encryptedEnvelope));
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Failed to decrypt AES key with ECIES:', error);
      throw new AppError({
        message: 'Failed to decrypt the AES key. Your wallet key may not match the encryption key.',
        status: 500,
        title: 'ECIES Decryption Failed',
        type: 'ECIES_DECRYPTION_FAILED',
      });
    }
  }

  // ==================== Encoding Utilities ====================

  /**
   * Converts an ArrayBuffer to a base64-encoded string.
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  /**
   * Converts a base64-encoded string back to a Uint8Array.
   */
  static base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Converts a hex string (with or without "0x" prefix) to a Uint8Array.
   */
  static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
