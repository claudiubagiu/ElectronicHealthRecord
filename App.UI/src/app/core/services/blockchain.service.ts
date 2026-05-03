import { Injectable } from '@angular/core';
import {
  BrowserProvider,
  Contract,
  ContractTransactionReceipt,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import { Web3Service } from './web3.service';
import PatientRecords from '../contracts/PatientRecords.json';
import {
  Diagnosis,
  DiagnosisSummary,
  LabAnalysis,
  LabAnalysisSummary,
  Prescription,
  PrescriptionSummary,
} from '../models/blockchain.model';
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
        status: 401,
        title: 'Wallet Not Connected',
        type: 'WALLET_NOT_CONNECTED',
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
      if (error instanceof AppError) throw error;

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
      if (error instanceof AppError) throw error;

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
          // skip unrelated logs
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
      if (error instanceof AppError) throw error;

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
      if (error instanceof AppError) throw error;

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
      if (error instanceof AppError) throw error;

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
      if (error instanceof AppError) throw error;
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

  // ── Lab Analyses ───────────────────────────────────────────────────────────

  async addLabAnalysis(
    title: string,
    ipfsCid: string,
    patientAddr: string,
    labTechName: string
  ): Promise<bigint> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['addLabAnalysis'](title, ipfsCid, patientAddr, labTechName);
      const receipt: ContractTransactionReceipt = await tx.wait();

      const iface = this.contract!.interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'LabAnalysisAdded') {
            return parsed.args['labAnalysisId'] as bigint;
          }
        } catch {
          // skip unrelated logs
        }
      }

      throw new AppError({
        message: 'The analysis was submitted but the confirmation event was not found.',
        status: 500,
        title: 'Event Not Found',
        type: 'LAB_ANALYSIS_EVENT_NOT_FOUND',
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to add the lab analysis.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to store the lab analysis on the blockchain. Please try again.',
        status: 500,
        title: 'Add Lab Analysis Failed',
        type: 'ADD_LAB_ANALYSIS_FAILED',
      });
    }
  }

  async getLabAnalysis(labAnalysisId: bigint): Promise<LabAnalysis> {
    try {
      const signed = await this.getSigned();
      const raw = await signed['getLabAnalysis'](labAnalysisId);
      return this.mapLabAnalysis(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve the lab analysis from the blockchain.',
        status: 500,
        title: 'Get Lab Analysis Failed',
        type: 'GET_LAB_ANALYSIS_FAILED',
      });
    }
  }

  async getPatientLabAnalyses(patientAddress: string): Promise<LabAnalysis[]> {
    try {
      const signed = await this.getSigned();
      const ids: bigint[] = await signed['getPatientLabAnalysisIds'](patientAddress);
      return await Promise.all(ids.map((id) => this.getLabAnalysis(id)));
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw error;
    }
  }

  async getLabTechAnalyses(): Promise<LabAnalysis[]> {
    this.ensureProvider();
    try {
      const ids: bigint[] = await this.contract!['getLabTechAnalysisIds']();
      return await Promise.all(ids.map((id) => this.getLabAnalysis(id)));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve your lab analyses from the blockchain.',
        status: 500,
        title: 'Get Lab Tech Analyses Failed',
        type: 'GET_LAB_TECH_ANALYSES_FAILED',
      });
    }
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  /**
   * Doctor records a new prescription on-chain.
   * The IPFS payload must already be uploaded before calling this.
   *
   * @param title       Short title for the prescription (e.g., "Respiratory infection treatment")
   * @param ipfsCid     IPFS CID of the encrypted prescription payload
   * @param patientAddr Patient's wallet address
   * @param doctorName  Doctor's display name
   * @param codeHash    keccak256 of the 6-char short code (bytes32 hex string)
   * @param salt        32-byte random salt used for PBKDF2 key derivation (bytes32 hex string)
   * @returns The on-chain prescription ID extracted from the PrescriptionAdded event
   */
  async addPrescription(
    title: string,
    ipfsCid: string,
    patientAddr: string,
    doctorName: string,
    codeHash: string,
    salt: string
  ): Promise<bigint> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['addPrescription'](
        title,
        ipfsCid,
        patientAddr,
        doctorName,
        codeHash,
        salt
      );
      const receipt: ContractTransactionReceipt = await tx.wait();

      const iface = this.contract!.interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'PrescriptionAdded') {
            return parsed.args['prescriptionId'] as bigint;
          }
        } catch {
          // skip unrelated logs
        }
      }

      throw new AppError({
        message:
          'The prescription was submitted but the confirmation event was not found. Please verify the transaction on the blockchain.',
        status: 500,
        title: 'Event Not Found',
        type: 'PRESCRIPTION_EVENT_NOT_FOUND',
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      console.error('Failed to add prescription:', error);

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to create the prescription.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to store the prescription on the blockchain. Please try again.',
        status: 500,
        title: 'Add Prescription Failed',
        type: 'ADD_PRESCRIPTION_FAILED',
      });
    }
  }

  /**
   * Fetches a prescription by the keccak256 hash of the short code.
   * Intentionally public — no wallet auth required, the code IS the credential.
   * Returns the full struct including dispensed status and salt.
   *
   * @param codeHash keccak256 of the 6-char short code (bytes32 hex string)
   */
  async getPrescriptionByCodeHash(codeHash: string): Promise<Prescription> {
    this.ensureProvider();

    try {
      const raw = await this.contract!['getPrescriptionByCodeHash'](codeHash);
      return this.mapPrescription(raw);
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      console.error('Failed to get prescription by code hash:', error);

      const reason: string = (
        error?.reason ??
        error?.data?.message ??
        error?.message ??
        ''
      ).toLowerCase();

      if (reason.includes('not found')) {
        throw new AppError({
          message: 'No prescription found for this code. Please check the code and try again.',
          status: 404,
          title: 'Prescription Not Found',
          type: 'PRESCRIPTION_NOT_FOUND',
        });
      }

      throw new AppError({
        message: 'Failed to look up the prescription on the blockchain.',
        status: 500,
        title: 'Get Prescription Failed',
        type: 'GET_PRESCRIPTION_FAILED',
      });
    }
  }

  /**
   * Pharmacist marks a prescription as dispensed on-chain.
   * Irreversible — reverts if already dispensed.
   *
   * @param codeHash keccak256 of the 6-char short code (bytes32 hex string)
   */
  async dispensePrescription(codeHash: string): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['dispensePrescription'](codeHash);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      console.error('Failed to dispense prescription:', error);

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the dispense transaction.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      const reason: string = (
        error?.reason ??
        error?.data?.message ??
        error?.message ??
        ''
      ).toLowerCase();

      if (reason.includes('already dispensed')) {
        throw new AppError({
          message: 'This prescription has already been dispensed.',
          status: 409,
          title: 'Already Dispensed',
          type: 'PRESCRIPTION_ALREADY_DISPENSED',
        });
      }

      throw new AppError({
        message: 'Failed to dispense the prescription on the blockchain. Please try again.',
        status: 500,
        title: 'Dispense Failed',
        type: 'DISPENSE_PRESCRIPTION_FAILED',
      });
    }
  }

  /**
   * Returns all prescription IDs for a given patient.
   * Caller must be the patient or have active on-chain access.
   *
   * @param patientAddress Patient's wallet address
   */
  async getPatientPrescriptionIds(patientAddress: string): Promise<bigint[]> {
    try {
      const signed = await this.getSigned();
      return await signed['getPatientPrescriptionIds'](patientAddress);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw error;
    }
  }

  /**
   * Fetches a full prescription struct by on-chain ID.
   * Caller must be the patient or have active on-chain access.
   *
   * @param prescriptionId On-chain prescription ID
   */
  async getPrescription(prescriptionId: bigint): Promise<Prescription> {
    try {
      const signed = await this.getSigned();
      const raw = await signed['getPrescription'](prescriptionId);
      return this.mapPrescription(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve the prescription from the blockchain.',
        status: 500,
        title: 'Get Prescription Failed',
        type: 'GET_PRESCRIPTION_FAILED',
      });
    }
  }

  /**
   * Returns all prescription IDs written by the calling doctor.
   */
  async getDoctorPrescriptionIds(): Promise<bigint[]> {
    this.ensureProvider();

    try {
      return await this.contract!['getDoctorPrescriptionIds']();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve your prescription IDs from the blockchain.',
        status: 500,
        title: 'Get Doctor Prescriptions Failed',
        type: 'GET_DOCTOR_PRESCRIPTIONS_FAILED',
      });
    }
  }

  /**
   * Utility: computes keccak256 of the short code string.
   * Used by both the doctor (on create) and the pharmacist (on lookup).
   *
   * @param shortCode 6-character alphanumeric short code
   * @returns bytes32 hex string suitable for passing to the contract
   */
  hashShortCode(shortCode: string): string {
    return keccak256(toUtf8Bytes(shortCode));
  }

  /**
   * Fetches lightweight summaries of all diagnoses issued by the calling doctor.
   * Uses getDoctorDiagnosesSummary — no IPFS CID, no decryption needed.
   */
  async getDoctorDiagnosesSummary(): Promise<DiagnosisSummary[]> {
    try {
      const signed = await this.getSigned();
      const raws = await signed['getDoctorDiagnosesSummary']();
      return raws.map((r: any) => ({
        id: r.id as bigint,
        title: r.title as string,
        timestamp: r.timestamp as bigint,
        patientAddr: r.patientAddr as string,
        doctorAddr: r.doctorAddr as string,
        doctorName: r.doctorName as string,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve your diagnosis summary from the blockchain.',
        status: 500,
        title: 'Get Doctor Diagnoses Summary Failed',
        type: 'GET_DOCTOR_DIAGNOSES_SUMMARY_FAILED',
      });
    }
  }

  /**
   * Fetches lightweight summaries of all prescriptions issued by the calling doctor.
   * Uses getDoctorPrescriptionsSummary — no IPFS CID, no decryption needed.
   */
  async getDoctorPrescriptionsSummary(): Promise<PrescriptionSummary[]> {
    try {
      const signed = await this.getSigned();
      const raws = await signed['getDoctorPrescriptionsSummary']();
      return raws.map((r: any) => ({
        id: r.id as bigint,
        title: r.title as string,
        timestamp: r.timestamp as bigint,
        patientAddr: r.patientAddr as string,
        doctorAddr: r.doctorAddr as string,
        doctorName: r.doctorName as string,
        dispensed: r.dispensed as boolean,
        dispensedTimestamp: r.dispensedTimestamp as bigint,
        dispensedBy: r.dispensedBy as string,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve your prescription summary from the blockchain.',
        status: 500,
        title: 'Get Doctor Prescriptions Summary Failed',
        type: 'GET_DOCTOR_PRESCRIPTIONS_SUMMARY_FAILED',
      });
    }
  }

  /**
   * Fetches lightweight summaries of all lab analyses uploaded by the calling lab technician.
   * Uses getLabTechAnalysesSummary — no IPFS CID, no decryption needed.
   */
  async getLabTechAnalysesSummary(): Promise<LabAnalysisSummary[]> {
    try {
      const signed = await this.getSigned();
      const raws = await signed['getLabTechAnalysesSummary']();
      return raws.map((r: any) => ({
        id: r.id as bigint,
        title: r.title as string,
        timestamp: r.timestamp as bigint,
        patientAddr: r.patientAddr as string,
        labTechAddr: r.labTechAddr as string,
        labTechName: r.labTechName as string,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve your lab analysis summary from the blockchain.',
        status: 500,
        title: 'Get Lab Tech Analyses Summary Failed',
        type: 'GET_LAB_TECH_ANALYSES_SUMMARY_FAILED',
      });
    }
  }

  /**
   * Fetches lightweight summaries of all prescriptions dispensed by the calling pharmacist.
   * Uses getPharmacistDispensedSummary — no IPFS CID, no decryption needed.
   */
  async getPharmacistDispensedSummary(): Promise<PrescriptionSummary[]> {
    try {
      const signed = await this.getSigned();
      const raws = await signed['getPharmacistDispensedSummary']();
      return raws.map((r: any) => ({
        id: r.id as bigint,
        title: r.title as string,
        timestamp: r.timestamp as bigint,
        patientAddr: r.patientAddr as string,
        doctorAddr: r.doctorAddr as string,
        doctorName: r.doctorName as string,
        dispensed: r.dispensed as boolean,
        dispensedTimestamp: r.dispensedTimestamp as bigint,
        dispensedBy: r.dispensedBy as string,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve your dispensed prescriptions from the blockchain.',
        status: 500,
        title: 'Get Pharmacist Dispensed Summary Failed',
        type: 'GET_PHARMACIST_DISPENSED_SUMMARY_FAILED',
      });
    }
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

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

  private mapLabAnalysis(raw: any): LabAnalysis {
    return {
      id: raw.id as bigint,
      title: raw.title as string,
      ipfsCid: raw.ipfsCid as string,
      timestamp: raw.timestamp as bigint,
      labTechAddr: raw.labTechAddr as string,
      labTechName: raw.labTechName as string,
      patientAddr: raw.patientAddr as string,
      exists: raw.exists as boolean,
    };
  }

  private mapPrescription(raw: any): Prescription {
    return {
      id: raw.id as bigint,
      title: raw.title as string,
      ipfsCid: raw.ipfsCid as string,
      patientAddr: raw.patientAddr as string,
      doctorAddr: raw.doctorAddr as string,
      doctorName: raw.doctorName as string,
      timestamp: raw.timestamp as bigint,
      codeHash: raw.codeHash as string,
      salt: raw.salt as string,
      dispensed: raw.dispensed as boolean,
      dispensedTimestamp: raw.dispensedTimestamp as bigint,
      dispensedBy: raw.dispensedBy as string,
      exists: raw.exists as boolean,
    };
  }
}
