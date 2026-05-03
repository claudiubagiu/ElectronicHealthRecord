import { Injectable } from '@angular/core';
import { createLitClient } from '@lit-protocol/lit-client';
import { createAuthManager, storagePlugins } from '@lit-protocol/auth';
import { createAccBuilder } from '@lit-protocol/access-control-conditions';
import { nagaDev } from '@lit-protocol/networks';
import { AppError } from '../errors/app.error';

/**
 * Service responsible for interacting with the Lit Protocol network
 * to encrypt and decrypt data using on-chain access control conditions.
 *
 * The Lit client and auth manager are lazily initialised on the first
 * call to {@link connect} and reused for subsequent operations, avoiding
 * the overhead of establishing a new network connection every time.
 */
@Injectable({ providedIn: 'root' })
export class LitProtocolService {
  private litClient: any = null;
  private authManager: any = null;

  /** In-flight connection promise used to prevent duplicate initialisations. */
  private connectingPromise: Promise<void> | null = null;

  /** Address of the deployed PatientRecords smart contract used in ACCs. */
  private readonly ACCESS_CONTRACT = '0xe487376ce73a1E8095Ce933622Ad0401a50CeD92';

  /**
   * Establishes a connection to the Lit Protocol network and initialises
   * the auth manager. If a connection already exists, this is a no-op.
   * If a connection attempt is already in progress, the same promise is
   * returned to avoid duplicate initialisations.
   *
   * @throws {AppError} If the Lit network is unreachable or client creation fails.
   */
  async connect(): Promise<void> {
    // Already connected — nothing to do
    if (this.litClient && this.authManager) {
      return;
    }

    // Connection already in progress — wait for it instead of starting a new one
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = this.initConnection();

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  /**
   * Builds unified access control conditions (ACCs) for a given patient.
   *
   * The conditions allow decryption if EITHER:
   *   1. The requesting wallet IS the patient (owner), OR
   *   2. The smart contract's `hasAccess(patient, doctor)` returns true.
   *
   * @param patientAddress - The checksummed Ethereum address of the patient.
   * @returns The built ACC array ready to pass to encrypt/decrypt calls.
   */
  createAccsBuilder(patientAddress: string) {
    return (
      createAccBuilder()
        // Condition 1: The user IS the patient (wallet owner)
        .requireWalletOwnership(patientAddress)
        .on('sepolia')
        .or()
        // Condition 2: The smart contract grants access to this doctor
        .unifiedAccs({
          conditionType: 'evmContract',
          contractAddress: this.ACCESS_CONTRACT,
          functionName: 'hasAccess',
          functionParams: [patientAddress, ':userAddress'],
          functionAbi: {
            name: 'hasAccess',
            inputs: [
              { name: 'patient', type: 'address' },
              { name: 'doctor', type: 'address' },
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'view',
            type: 'function',
          },
          chain: 'sepolia',
          returnValueTest: {
            key: '',
            comparator: '=',
            value: 'true',
          },
        })
        .build()
    );
  }

  /**
   * Encrypts a string using Lit Protocol with the provided access control conditions.
   * The data can only be decrypted by wallets that satisfy the ACCs.
   *
   * @param dataToEncrypt - The plaintext string to encrypt (typically a Base64-encoded AES key).
   * @param accs - Unified access control conditions built via {@link createAccsBuilder}.
   * @returns An object containing the `ciphertext` and `dataToEncryptHash` needed for decryption.
   * @throws {AppError} If the Lit client is not connected or encryption fails.
   */
  async encrypt(dataToEncrypt: string, accs: any) {
    this.ensureConnected();

    try {
      return await this.litClient.encrypt({
        dataToEncrypt,
        unifiedAccessControlConditions: accs,
        chain: 'sepolia',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Lit Protocol encryption failed:', error);
      throw new AppError({
        message: 'Failed to encrypt data with Lit Protocol. Please try again.',
        status: 500,
        title: 'Lit Encryption Failed',
        type: 'LIT_ENCRYPTION_FAILED',
      });
    }
  }

  /**
   * Decrypts data previously encrypted via Lit Protocol.
   * Requires the user to sign a SIWE (Sign-In with Ethereum) message
   * to prove wallet ownership before Lit nodes release decryption shares.
   *
   * @param encryptedData - Object containing `ciphertext` and `dataToEncryptHash` from a prior encrypt call.
   * @param accs - The same unified access control conditions used during encryption.
   * @param walletClient - A viem WalletClient instance for creating the SIWE auth context.
   * @returns The decryption result containing `decryptedData` as a Uint8Array.
   * @throws {AppError} If the Lit client is not connected, the wallet signature is rejected,
   *         or the caller does not satisfy the access control conditions.
   */
  async decrypt(encryptedData: any, accs: any, walletClient: any) {
    this.ensureConnected();

    try {
      const authContext = await this.authManager.createEoaAuthContext({
        config: { account: walletClient },
        authConfig: {
          domain: window.location.host,
          statement: 'Decrypt patient data',
          expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          resources: [['access-control-condition-decryption', '*']],
        },
        litClient: this.litClient,
      });

      return await this.litClient.decrypt({
        data: encryptedData,
        unifiedAccessControlConditions: accs,
        authContext,
        chain: 'sepolia',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Lit Protocol decryption failed:', error);
      throw new AppError({
        message:
          'Failed to decrypt data with Lit Protocol. You may not have the required access permissions.',
        status: 403,
        title: 'Lit Decryption Failed',
        type: 'LIT_DECRYPTION_FAILED',
      });
    }
  }

  /**
   * Tears down the Lit client connection and resets internal state.
   * Useful when the user logs out or switches wallets.
   */
  disconnect(): void {
    if (this.litClient?.disconnect) {
      this.litClient.disconnect();
    }
    this.litClient = null;
    this.authManager = null;
    this.connectingPromise = null;
  }

  /**
   * Creates the Lit client and auth manager instances.
   * Called internally by {@link connect} and guarded against concurrent calls.
   *
   * @throws {AppError} If the Lit network is unreachable or initialisation fails.
   */
  private async initConnection(): Promise<void> {
    try {
      this.litClient = await createLitClient({ network: nagaDev });
      this.authManager = createAuthManager({
        storage: storagePlugins.localStorage({
          appName: 'ehr-app',
          networkName: 'naga-test',
        }),
      });
    } catch (error) {
      // Reset state so the next connect() attempt starts fresh
      this.litClient = null;
      this.authManager = null;

      console.error('Failed to connect to Lit Protocol network:', error);
      throw new AppError({
        message:
          'Failed to connect to the Lit Protocol network. Please check your internet connection and try again.',
        status: 503,
        title: 'Lit Connection Failed',
        type: 'LIT_CONNECTION_FAILED',
      });
    }
  }

  /**
   * Throws a descriptive error if the Lit client has not been initialised.
   * Called at the start of encrypt/decrypt to fail fast with a clear message.
   *
   * @throws {AppError} If the Lit client or auth manager is not initialised.
   */
  private ensureConnected(): void {
    if (!this.litClient || !this.authManager) {
      throw new AppError({
        message:
          'Lit Protocol is not connected. Please wait for the connection to be established before encrypting or decrypting.',
        status: 500,
        title: 'Lit Not Connected',
        type: 'LIT_NOT_CONNECTED',
      });
    }
  }
}
