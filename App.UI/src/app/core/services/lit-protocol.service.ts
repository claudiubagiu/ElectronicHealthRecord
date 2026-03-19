import { Injectable } from '@angular/core';
import { createLitClient } from '@lit-protocol/lit-client';
import { createAuthManager, storagePlugins } from '@lit-protocol/auth';
import { createAccBuilder } from '@lit-protocol/access-control-conditions';
import { nagaDev } from '@lit-protocol/networks';

@Injectable({ providedIn: 'root' })
export class LitProtocolService {
  private litClient: any;
  private authManager: any;

  // Replace with your deployed contract address
  private readonly ACCESS_CONTRACT = '0xfdac527b70F2Ef6B6f03ff5F6d688d76C1402bbA';

  async connect() {
    this.litClient = await createLitClient({ network: nagaDev });
    this.authManager = createAuthManager({
      storage: storagePlugins.localStorage({
        appName: 'my-app',
        networkName: 'naga-test',
      }),
    });
  }

  /**
   * Build ACCs: patient owner OR doctor authorized via smart contract
   */
  createAccsBuilder(patientAddress: string) {
    return (
      createAccBuilder()
        // Condition 1: The user IS the patient (owner)
        .requireWalletOwnership(patientAddress)
        .on('sepolia')
        .or()
        // Condition 2: The smart contract says this user has access
        // Your contract must have a function like:
        //   function hasAccess(address patient, address doctor) returns (bool)
        .unifiedAccs({
          conditionType: 'evmContract',
          contractAddress: this.ACCESS_CONTRACT,
          functionName: 'hasAccess',
          functionParams: [patientAddress, ':userAddress'], // :userAddress = whoever is trying to decrypt
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

  async encrypt(dataToEncrypt: string, accs: any) {
    return await this.litClient.encrypt({
      dataToEncrypt,
      unifiedAccessControlConditions: accs,
      chain: 'sepolia',
    });
  }

  async decrypt(encryptedData: any, accs: any, walletClient: any) {
    const authContext = await this.authManager.createEoaAuthContext({
      config: { account: walletClient },
      authConfig: {
        domain: 'localhost',
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
  }
}
