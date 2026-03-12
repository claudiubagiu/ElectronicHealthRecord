import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  /**
   * Generates a 256-bit AES-GCM symmetric encryption key.
   * The key can be used for both encryption and decryption.
   */
  static async generateAESKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
  }

  /**
   * Generates an RSA-OAEP key pair (2048-bit) for asymmetric encryption.
   * The public key is used for encryption and the private key for decryption.
   */
  static async generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Exports an RSA public key as a JSON Web Key (JWK) string.
   */
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', publicKey);
    return JSON.stringify(exported);
  }

  /**
   * Imports an RSA public key from a JWK string.
   * The imported key can be used for encryption.
   */
  static async importPublicKey(keyString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyString);
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt'],
    );
  }

  /**
   * Imports an RSA private key from a JWK string.
   * The imported key can be used for decryption.
   */
  static async importPrivateKey(keyString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(keyString);
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt'],
    );
  }

  /**
   * Exports an RSA private key as a JSON Web Key (JWK) string.
   */
  static async exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', privateKey);
    return JSON.stringify(exported);
  }

  /**
   * Encrypts a file (ArrayBuffer) using AES-GCM.
   * A random 12-byte IV is generated for each encryption.
   * Returns the encrypted data and the IV used.
   */
  static async encryptFileWithAES(
    file: ArrayBuffer,
    aesKey: CryptoKey,
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, file);

    return { encrypted, iv };
  }

  /**
   * Exports an AES key as raw bytes (ArrayBuffer).
   * This is required before encrypting it with RSA.
   */
  static async exportAESKey(aesKey: CryptoKey): Promise<ArrayBuffer> {
    return await window.crypto.subtle.exportKey('raw', aesKey);
  }

  /**
   * Encrypts a raw AES key using an RSA public key.
   * Used for securely sharing the AES key.
   */
  static async encryptAESKeyWithRSA(
    aesKeyRaw: ArrayBuffer,
    rsaPublicKey: CryptoKey,
  ): Promise<ArrayBuffer> {
    return await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, aesKeyRaw);
  }

  /**
   * Decrypts an AES key using an RSA private key.
   * Used to recover the original AES key for file decryption.
   */
  static async decryptAESKeyWithRSA(
    encryptedAesKey: ArrayBuffer,
    rsaPrivateKey: CryptoKey,
  ): Promise<ArrayBuffer> {
    return await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, rsaPrivateKey, encryptedAesKey);
  }

  /**
   * Imports a decrypted raw AES key back into a CryptoKey object.
   * The key is configured for decryption usage.
   */
  static async importAESKey(rawKey: ArrayBuffer): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, [
      'decrypt',
    ]);
  }

  /**
   * Decrypts an AES-GCM encrypted file using the provided key and IV.
   */
  static async decryptFileWithAES(
    encryptedFile: ArrayBuffer,
    aesKey: CryptoKey,
    iv: BufferSource,
  ): Promise<ArrayBuffer> {
    return await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, encryptedFile);
  }
}
