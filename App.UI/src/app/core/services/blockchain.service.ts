import { Injectable } from '@angular/core';
import { BrowserProvider, Contract, ContractTransactionReceipt } from 'ethers';
import { Web3Service } from './web3.service';
import PatientRecords from '../contracts/PatientRecords.json'
import { Diagnosis } from '../models/blockchain.model';
import { AppError } from '../errors/app.error';

declare let window: any;

@Injectable({ providedIn: 'root' })
export class BlockchainService {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;

  constructor(private web3Service: Web3Service) {
    this.initProvider();
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  /**
   * Initializes the BrowserProvider and Contract instance.
   * Fails gracefully if MetaMask is not installed — methods that require
   * a provider will throw a descriptive AppError at call time instead
   * of crashing the entire application at bootstrap.
   */
  private initProvider(): void {
    if (!window.ethereum) {
      console.warn('[Blockchain] MetaMask not detected. Provider will be initialized on demand.');
      return;
    }

    this.provider = new BrowserProvider(window.ethereum);
    this.contract = new Contract(PatientRecords['address'], PatientRecords['abi'], this.provider);
  }

  /**
   * Ensures the provider and contract are initialized before any operation.
   * If MetaMask was not available at bootstrap time, retries initialization.
   *
   * @throws {AppError} If MetaMask is still not available.
   */
  private ensureProvider(): void {
    if (this.provider && this.contract) {
      return;
    }

    // Retry: MetaMask may have been installed/unlocked after bootstrap
    this.initProvider();

    if (!this.provider || !this.contract) {
      throw new AppError({
        message:
          'MetaMask is not installed. Please install the MetaMask browser extension to interact with the blockchain.',
        status: 400,
        title: 'MetaMask Not Installed',
        type: 'METAMASK_NOT_INSTALLED',
      });
    }
  }

  /**
   * Returns a contract instance connected to the current signer (for write calls).
   * The signer is retrieved from MetaMask each time to ensure it reflects
   * the currently active account.
   *
   * @throws {AppError} If MetaMask is not available or the signer cannot be obtained.
   */
  private async getSigned(): Promise<Contract> {
    this.ensureProvider();

    try {
      const signer = await this.provider!.getSigner();
      return this.contract!.connect(signer) as Contract;
    } catch (error) {
      console.error('Failed to get signer:', error);
      throw new AppError({
        message:
          'Failed to connect to your wallet for signing. Please ensure MetaMask is unlocked.',
        status: 500,
        title: 'Signer Unavailable',
        type: 'SIGNER_UNAVAILABLE',
      });
    }
  }

  // ── Access Control ─────────────────────────────────────────────────────────

  /**
   * Patient grants a doctor time-limited read-access to their records on-chain.
   *
   * @param doctorAddress - The Ethereum wallet address of the doctor to grant access to.
   * @param durationSeconds - How long the access is valid, in seconds (e.g. 604800 for 7 days).
   */
  async grantAccess(doctorAddress: string, durationSeconds: number): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['grantAccess'](doctorAddress, durationSeconds);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to grant access:', error);

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to grant access.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to grant access on the blockchain. Please try again.',
        status: 500,
        title: 'Grant Access Failed',
        type: 'GRANT_ACCESS_FAILED',
      });
    }
  }

  /**
   * Patient revokes a doctor's access to their records on-chain.
   *
   * @param doctorAddress - The Ethereum wallet address of the doctor to revoke access from.
   * @throws {AppError} If the user rejects the transaction, the transaction reverts, or a network error occurs.
   */
  async revokeAccess(doctorAddress: string): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['revokeAccess'](doctorAddress);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to revoke access:', error);

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to revoke access.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to revoke access on the blockchain. Please try again.',
        status: 500,
        title: 'Revoke Access Failed',
        type: 'REVOKE_ACCESS_FAILED',
      });
    }
  }

  /**
   * Checks whether a doctor currently has access to a patient's records.
   * This is a read-only call and does not require a signer.
   *
   * @param patientAddress - The patient's Ethereum wallet address.
   * @param doctorAddress - The doctor's Ethereum wallet address.
   * @returns True if the doctor has access, false otherwise.
   * @throws {AppError} If the contract call fails.
   */
  async hasAccess(patientAddress: string, doctorAddress: string): Promise<boolean> {
    this.ensureProvider();

    try {
      return await this.contract!['hasAccess'](patientAddress, doctorAddress);
    } catch (error) {
      console.error('Failed to check access:', error);
      throw new AppError({
        message: 'Failed to verify access permissions on the blockchain.',
        status: 500,
        title: 'Access Check Failed',
        type: 'ACCESS_CHECK_FAILED',
      });
    }
  }

  // ── Diagnosis Registry ─────────────────────────────────────────────────────

  /**
   * Doctor directly creates and stores a diagnosis on-chain for a patient.
   * The document must already be Lit-encrypted and uploaded to IPFS before calling this.
   *
   * @param title - Short title of the diagnosis (e.g., "MRI – Lumbar Spine").
   * @param ipfsCid - IPFS CID of the Lit-encrypted document.
   * @param patientAddr - Wallet address of the patient.
   * @param doctorName - Display name of the doctor.
   * @returns The on-chain diagnosis ID extracted from the DiagnosisAdded event.
   * @throws {AppError} If the user rejects the transaction, the transaction reverts,
   *         or the DiagnosisAdded event is not found in the receipt.
   */
  async addDiagnosis(
    title: string,
    ipfsCid: string,
    patientAddr: string,
    doctorName: string
  ): Promise<bigint> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['addDiagnosis'](title, ipfsCid, patientAddr, doctorName);
      const receipt: ContractTransactionReceipt = await tx.wait();

      const iface = this.contract!.interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'DiagnosisAdded') {
            return parsed.args['diagnosisId'] as bigint;
          }
        } catch {
          // Skip unrelated logs that don't match the contract ABI
        }
      }

      throw new AppError({
        message:
          'The diagnosis was submitted but the confirmation event was not found. Please verify the transaction on the blockchain.',
        status: 500,
        title: 'Event Not Found',
        type: 'DIAGNOSIS_EVENT_NOT_FOUND',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to add diagnosis:', error);

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to add the diagnosis.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to store the diagnosis on the blockchain. Please try again.',
        status: 500,
        title: 'Add Diagnosis Failed',
        type: 'ADD_DIAGNOSIS_FAILED',
      });
    }
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /**
   * Fetches a single diagnosis by its on-chain ID.
   * The caller must be the patient or an authorized doctor.
   *
   * @param diagnosisId - The on-chain diagnosis ID.
   * @returns The parsed Diagnosis object.
   * @throws {AppError} If the contract call fails or the caller is not authorized.
   */
  async getDiagnosis(diagnosisId: bigint): Promise<Diagnosis> {
    try {
      const signed = await this.getSigned();
      const raw = await signed['getDiagnosis'](diagnosisId);
      return this.mapDiagnosis(raw);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error(`Failed to get diagnosis ${diagnosisId}:`, error);
      throw new AppError({
        message: 'Failed to retrieve the diagnosis from the blockchain.',
        status: 500,
        title: 'Get Diagnosis Failed',
        type: 'GET_DIAGNOSIS_FAILED',
      });
    }
  }

  /**
   * Fetches all diagnoses for a given patient.
   * The caller must be the patient or an authorized doctor.
   *
   * @param patientAddress - The patient's Ethereum wallet address.
   * @returns An array of Diagnosis objects.
   * @throws {AppError} If the contract call fails or the caller is not authorized.
   */
  async getPatientDiagnoses(patientAddress: string): Promise<Diagnosis[]> {
    try {
      const signed = await this.getSigned();
      const ids: bigint[] = await signed['getPatientDiagnosisIds'](patientAddress);
      return await Promise.all(ids.map((id) => this.getDiagnosis(id)));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to get patient diagnoses:', error);
      throw new AppError({
        message: 'Failed to retrieve patient diagnoses from the blockchain.',
        status: 500,
        title: 'Get Patient Diagnoses Failed',
        type: 'GET_PATIENT_DIAGNOSES_FAILED',
      });
    }
  }

  /**
   * Fetches all diagnoses where the connected wallet is the proposing doctor.
   *
   * @returns An array of Diagnosis objects.
   * @throws {AppError} If the contract call fails.
   */
  async getDoctorDiagnoses(): Promise<Diagnosis[]> {
    this.ensureProvider();

    try {
      const ids: bigint[] = await this.contract!['getDoctorDiagnosisIds']();
      return await Promise.all(ids.map((id) => this.getDiagnosis(id)));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('Failed to get doctor diagnoses:', error);
      throw new AppError({
        message: 'Failed to retrieve your diagnoses from the blockchain.',
        status: 500,
        title: 'Get Doctor Diagnoses Failed',
        type: 'GET_DOCTOR_DIAGNOSES_FAILED',
      });
    }
  }

  /**
   * Returns the total number of diagnoses ever stored across all patients.
   *
   * @throws {AppError} If the contract call fails.
   */
  async totalDiagnoses(): Promise<bigint> {
    this.ensureProvider();

    try {
      return await this.contract!['totalDiagnoses']();
    } catch (error) {
      console.error('Failed to get total diagnoses:', error);
      throw new AppError({
        message: 'Failed to retrieve the total diagnosis count from the blockchain.',
        status: 500,
        title: 'Total Diagnoses Failed',
        type: 'TOTAL_DIAGNOSES_FAILED',
      });
    }
  }

  // ── Mapper ─────────────────────────────────────────────────────────────────

  /**
   * Maps the raw contract return value to a typed Diagnosis object.
   */
  private mapDiagnosis(raw: any): Diagnosis {
    return {
      id: raw.id as bigint,
      title: raw.title as string,
      ipfsCid: raw.ipfsCid as string,
      timestamp: raw.timestamp as bigint,
      doctorAddr: raw.doctorAddr as string,
      doctorName: raw.doctorName as string,
      patientAddr: raw.patientAddr as string,
      exists: raw.exists as boolean,
    };
  }
}
