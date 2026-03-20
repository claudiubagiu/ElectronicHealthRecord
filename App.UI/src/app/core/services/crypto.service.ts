import { Injectable } from '@angular/core';
import { AppError } from '../errors/app.error';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  /**
   * Generates a 256-bit AES-GCM symmetric encryption key.
   * The key can be used for both encryption and decryption.
   * @throws {AppError} If the browser's Web Crypto API fails to generate the key.
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
   * Generates an RSA-OAEP key pair (2048-bit) for asymmetric encryption.
   * The public key is used for encryption and the private key for decryption.
   * @throws {AppError} If the browser's Web Crypto API fails to generate the key pair.
   */
  static async generateRSAKeyPair(): Promise<CryptoKeyPair> {
    try {
      return await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to generate RSA key pair:', error);
      throw new AppError({
        message:
          'Failed to generate RSA key pair. Your browser may not support the required cryptographic operations.',
        status: 500,
        title: 'RSA Key Generation Failed',
        type: 'RSA_KEY_GENERATION_FAILED',
      });
    }
  }

  /**
   * Exports an RSA public key as a JSON Web Key (JWK) string.
   * @param publicKey - The RSA public CryptoKey to export.
   * @throws {AppError} If the key export operation fails.
   */
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey('jwk', publicKey);
      return JSON.stringify(exported);
    } catch (error) {
      console.error('Failed to export public key:', error);
      throw new AppError({
        message: 'Failed to export RSA public key.',
        status: 500,
        title: 'Public Key Export Failed',
        type: 'PUBLIC_KEY_EXPORT_FAILED',
      });
    }
  }

  /**
   * Imports an RSA public key from a JWK string.
   * The imported key can be used for encryption.
   * @param keyString - The JWK string representation of the RSA public key.
   * @throws {AppError} If the key string is malformed or the import operation fails.
   */
  static async importPublicKey(keyString: string): Promise<CryptoKey> {
    try {
      const jwk = JSON.parse(keyString);
      return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new AppError({
        message: 'Failed to import RSA public key. The key data may be corrupted or invalid.',
        status: 500,
        title: 'Public Key Import Failed',
        type: 'PUBLIC_KEY_IMPORT_FAILED',
      });
    }
  }

  /**
   * Imports an RSA private key from a JWK string.
   * The imported key can be used for decryption.
   * @param keyString - The JWK string representation of the RSA private key.
   * @throws {AppError} If the key string is malformed or the import operation fails.
   */
  static async importPrivateKey(keyString: string): Promise<CryptoKey> {
    try {
      const jwk = JSON.parse(keyString);
      return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt']
      );
    } catch (error) {
      console.error('Failed to import private key:', error);
      throw new AppError({
        message: 'Failed to import RSA private key. The key data may be corrupted or invalid.',
        status: 500,
        title: 'Private Key Import Failed',
        type: 'PRIVATE_KEY_IMPORT_FAILED',
      });
    }
  }

  /**
   * Exports an RSA private key as a JSON Web Key (JWK) string.
   * @param privateKey - The RSA private CryptoKey to export.
   * @throws {AppError} If the key export operation fails.
   */
  static async exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey('jwk', privateKey);
      return JSON.stringify(exported);
    } catch (error) {
      console.error('Failed to export private key:', error);
      throw new AppError({
        message: 'Failed to export RSA private key.',
        status: 500,
        title: 'Private Key Export Failed',
        type: 'PRIVATE_KEY_EXPORT_FAILED',
      });
    }
  }

  /**
   * Encrypts a file (ArrayBuffer) using AES-GCM.
   * A random 12-byte IV is generated for each encryption to ensure uniqueness.
   * @param file - The raw file data to encrypt.
   * @param aesKey - The AES-GCM CryptoKey used for encryption.
   * @returns The encrypted data and the IV used.
   * @throws {AppError} If the encryption operation fails.
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
   * Exports an AES key as raw bytes (ArrayBuffer).
   * This is required before encrypting the AES key with RSA for secure sharing.
   * @param aesKey - The AES CryptoKey to export.
   * @throws {AppError} If the key export operation fails.
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
   * Encrypts a raw AES key using an RSA public key (RSA-OAEP).
   * Used for securely sharing the symmetric AES key with another party.
   * @param aesKeyRaw - The raw AES key bytes to encrypt.
   * @param rsaPublicKey - The recipient's RSA public key.
   * @throws {AppError} If the RSA encryption operation fails.
   */
  static async encryptAESKeyWithRSA(
    aesKeyRaw: ArrayBuffer,
    rsaPublicKey: CryptoKey
  ): Promise<ArrayBuffer> {
    try {
      return await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, aesKeyRaw);
    } catch (error) {
      console.error('Failed to encrypt AES key with RSA:', error);
      throw new AppError({
        message: "Failed to encrypt the AES key with the recipient's public key.",
        status: 500,
        title: 'RSA Encryption Failed',
        type: 'RSA_KEY_ENCRYPTION_FAILED',
      });
    }
  }

  /**
   * Decrypts an AES key using an RSA private key (RSA-OAEP).
   * Used to recover the original AES key for file decryption.
   * @param encryptedAesKey - The RSA-encrypted AES key bytes.
   * @param rsaPrivateKey - The RSA private key used for decryption.
   * @throws {AppError} If the RSA decryption operation fails (e.g., wrong key or corrupted data).
   */
  static async decryptAESKeyWithRSA(
    encryptedAesKey: ArrayBuffer,
    rsaPrivateKey: CryptoKey
  ): Promise<ArrayBuffer> {
    try {
      return await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        rsaPrivateKey,
        encryptedAesKey
      );
    } catch (error) {
      console.error('Failed to decrypt AES key with RSA:', error);
      throw new AppError({
        message: 'Failed to decrypt the AES key. The private key may not match the encryption key.',
        status: 500,
        title: 'RSA Decryption Failed',
        type: 'RSA_KEY_DECRYPTION_FAILED',
      });
    }
  }

  /**
   * Imports a decrypted raw AES key back into a CryptoKey object.
   * The key is configured for decryption usage only.
   * @param rawKey - The raw AES key bytes to import.
   * @throws {AppError} If the key import operation fails (e.g., invalid key length).
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

  /**
   * Decrypts an AES-GCM encrypted file using the provided key and IV.
   * @param encryptedFile - The encrypted file data.
   * @param aesKey - The AES-GCM CryptoKey used for decryption.
   * @param iv - The initialization vector used during encryption.
   * @throws {AppError} If decryption fails (e.g., wrong key, corrupted data, or tampered ciphertext).
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
}
