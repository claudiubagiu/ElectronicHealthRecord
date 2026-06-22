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

  private initProvider(): void {
    if (!window.ethereum) {
      console.warn('[Blockchain] MetaMask not detected. Provider will be initialized on demand.');
      return;
    }

    this.provider = new BrowserProvider(window.ethereum);
    this.contract = new Contract(PatientRecords['address'], PatientRecords['abi'], this.provider);
  }

  private ensureProvider(): void {
    if (this.provider && this.contract) {
      return;
    }

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

  // ── Access Control (ABAC) ──────────────────────────────────────────────────

  async grantAccess(doctorAddress: string, durationSeconds: number): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['grantAccess'](doctorAddress, durationSeconds);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) throw error;

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

  async revokeAccess(doctorAddress: string): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['revokeAccess'](doctorAddress);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) throw error;

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

  async hasAccess(patientAddress: string, doctorAddress: string): Promise<boolean> {
    this.ensureProvider();

    try {
      return await this.contract!['hasAccessView'](patientAddress, doctorAddress);
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

  // ── Admin (RBAC) ───────────────────────────────────────────────────────────

  /**
   * Assigns a role to a medic on-chain.
   * Replaces the old approveMedic.
   *
   * Role enum: NONE=0, DOCTOR=1, LAB_TECH=2, PHARMACIST=3, MEDICAL_ASSISTANT=4
   */
  async assignRole(medicAddress: string, role: number): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['assignRole'](medicAddress, role);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to assign the role.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to assign role on the blockchain. Please try again.',
        status: 500,
        title: 'Assign Role Failed',
        type: 'ASSIGN_ROLE_FAILED',
      });
    }
  }

  /**
   * Revokes a medic's role on-chain (sets to NONE).
   * Replaces the old revokeMedic.
   */
  async revokeRole(medicAddress: string): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['revokeRole'](medicAddress);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to revoke the role.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to revoke role on the blockchain. Please try again.',
        status: 500,
        title: 'Revoke Role Failed',
        type: 'REVOKE_ROLE_FAILED',
      });
    }
  }

  /**
   * Returns the numeric role of an address on-chain.
   * Replaces the old isApprovedMedic.
   * 0=NONE, 1=DOCTOR, 2=LAB_TECH, 3=PHARMACIST, 4=MEDICAL_ASSISTANT
   */
  async getRole(address: string): Promise<number> {
    this.ensureProvider();

    try {
      const role = await this.contract!['getRole'](address);
      return Number(role);
    } catch (error) {
      console.error('Failed to get role:', error);
      throw new AppError({
        message: 'Failed to retrieve role from the blockchain.',
        status: 500,
        title: 'Get Role Failed',
        type: 'GET_ROLE_FAILED',
      });
    }
  }

  // ── Diagnosis Registry ─────────────────────────────────────────────────────

  async addDiagnosis(
    title: string,
    ipfsCid: string,
    patientAddr: string,
    doctorName: string,
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

  async getDiagnosis(diagnosisId: bigint): Promise<Diagnosis> {
    try {
      const signed = await this.getSigned();
      const raw = await signed['getDiagnosis'](diagnosisId);
      return this.mapDiagnosis(raw);
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError({
        message: 'Failed to retrieve the diagnosis from the blockchain.',
        status: 500,
        title: 'Get Diagnosis Failed',
        type: 'GET_DIAGNOSIS_FAILED',
      });
    }
  }

  async getPatientDiagnoses(patientAddress: string): Promise<Diagnosis[]> {
    try {
      const signed = await this.getSigned();
      const ids: bigint[] = await signed['getPatientDiagnosisIds'](patientAddress);
      return await Promise.all(ids.map((id) => this.getDiagnosis(id)));
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError({
        message: 'Failed to retrieve patient diagnoses from the blockchain.',
        status: 500,
        title: 'Get Patient Diagnoses Failed',
        type: 'GET_PATIENT_DIAGNOSES_FAILED',
      });
    }
  }

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

  async getDoctorDiagnosesSummary(): Promise<DiagnosisSummary[]> {
    this.ensureProvider();

    try {
      const signed = await this.getSigned();
      const raw: any[] = await signed['getDoctorDiagnosesSummary']();
      return raw.map((r) => this.mapDiagnosisSummary(r));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve diagnosis summaries from the blockchain.',
        status: 500,
        title: 'Get Diagnoses Summary Failed',
        type: 'GET_DIAGNOSES_SUMMARY_FAILED',
      });
    }
  }

  async totalDiagnoses(): Promise<bigint> {
    this.ensureProvider();

    try {
      return await this.contract!['totalDiagnoses']();
    } catch (error) {
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
    labTechName: string,
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
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve patient lab analyses from the blockchain.',
        status: 500,
        title: 'Get Patient Lab Analyses Failed',
        type: 'GET_PATIENT_LAB_ANALYSES_FAILED',
      });
    }
  }

  async getLabTechAnalysesSummary(): Promise<LabAnalysisSummary[]> {
    this.ensureProvider();

    try {
      const signed = await this.getSigned();
      const raw: any[] = await signed['getLabTechAnalysesSummary']();
      return raw.map((r) => this.mapLabAnalysisSummary(r));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve lab analysis summaries from the blockchain.',
        status: 500,
        title: 'Get Lab Analyses Summary Failed',
        type: 'GET_LAB_ANALYSES_SUMMARY_FAILED',
      });
    }
  }

  async totalLabAnalyses(): Promise<bigint> {
    this.ensureProvider();

    try {
      return await this.contract!['totalLabAnalyses']();
    } catch (error) {
      throw new AppError({
        message: 'Failed to retrieve the total lab analysis count from the blockchain.',
        status: 500,
        title: 'Total Lab Analyses Failed',
        type: 'TOTAL_LAB_ANALYSES_FAILED',
      });
    }
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  async addPrescription(
    title: string,
    ipfsCid: string,
    patientAddr: string,
    doctorName: string,
    codeHash: string,
    salt: string,
  ): Promise<bigint> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['addPrescription'](
        title,
        ipfsCid,
        patientAddr,
        doctorName,
        codeHash,
        salt,
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

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to add the prescription.',
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

  async dispensePrescription(codeHash: string): Promise<void> {
    try {
      const signed = await this.getSigned();
      const tx = await signed['dispensePrescription'](codeHash);
      await tx.wait();
    } catch (error: any) {
      if (error instanceof AppError) throw error;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'You rejected the transaction to dispense the prescription.',
          status: 403,
          title: 'Transaction Rejected',
          type: 'TX_REJECTED',
        });
      }

      throw new AppError({
        message: 'Failed to dispense the prescription on the blockchain. Please try again.',
        status: 500,
        title: 'Dispense Prescription Failed',
        type: 'DISPENSE_PRESCRIPTION_FAILED',
      });
    }
  }

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

  async getPrescriptionByCodeHash(codeHash: string): Promise<Prescription> {
    try {
      const signed = await this.getSigned();
      const raw = await signed['getPrescriptionByCodeHash'](codeHash);
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

  async getPatientPrescriptions(patientAddress: string): Promise<Prescription[]> {
    try {
      const signed = await this.getSigned();
      const ids: bigint[] = await signed['getPatientPrescriptionIds'](patientAddress);
      return await Promise.all(ids.map((id) => this.getPrescription(id)));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve patient prescriptions from the blockchain.',
        status: 500,
        title: 'Get Patient Prescriptions Failed',
        type: 'GET_PATIENT_PRESCRIPTIONS_FAILED',
      });
    }
  }

  async getDoctorPrescriptionsSummary(): Promise<PrescriptionSummary[]> {
    this.ensureProvider();

    try {
      const signed = await this.getSigned();
      const raw: any[] = await signed['getDoctorPrescriptionsSummary']();
      return raw.map((r) => this.mapPrescriptionSummary(r));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve prescription summaries from the blockchain.',
        status: 500,
        title: 'Get Prescriptions Summary Failed',
        type: 'GET_PRESCRIPTIONS_SUMMARY_FAILED',
      });
    }
  }

  async getPharmacistDispensedSummary(): Promise<PrescriptionSummary[]> {
    this.ensureProvider();

    try {
      const signed = await this.getSigned();
      const raw: any[] = await signed['getPharmacistDispensedSummary']();
      return raw.map((r) => this.mapPrescriptionSummary(r));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve dispensed prescription summaries from the blockchain.',
        status: 500,
        title: 'Get Dispensed Summary Failed',
        type: 'GET_DISPENSED_SUMMARY_FAILED',
      });
    }
  }

  // ── Backward-compatibility aliases ─────────────────────────────────────────

  /**
   * Kept for backward compatibility — components that call getPatientPrescriptionIds
   * expect bigint[] so they can fetch each prescription individually.
   */
  async getPatientPrescriptionIds(patientAddress: string): Promise<bigint[]> {
    try {
      const signed = await this.getSigned();
      return await signed['getPatientPrescriptionIds'](patientAddress);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        message: 'Failed to retrieve patient prescription IDs from the blockchain.',
        status: 500,
        title: 'Get Prescription IDs Failed',
        type: 'GET_PRESCRIPTION_IDS_FAILED',
      });
    }
  }

  /**
   * Hashes a short prescription code using keccak256.
   * Used by pharmacist lookup and dispense flows.
   */
  hashShortCode(shortCode: string): string {
    return keccak256(toUtf8Bytes(shortCode));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  generatePrescriptionCode(): { code: string; codeHash: string; salt: string } {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const salt = keccak256(toUtf8Bytes(Math.random().toString()));
    const codeHash = keccak256(toUtf8Bytes(code + salt));
    return { code, codeHash, salt };
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  private mapDiagnosis(raw: any): Diagnosis {
    return {
      id: raw.id,
      title: raw.title,
      ipfsCid: raw.ipfsCid,
      timestamp: raw.timestamp,
      doctorAddr: raw.doctorAddr,
      doctorName: raw.doctorName,
      patientAddr: raw.patientAddr,
      exists: raw.exists,
    };
  }

  private mapDiagnosisSummary(raw: any): DiagnosisSummary {
    return {
      id: raw.id,
      title: raw.title,
      timestamp: raw.timestamp,
      patientAddr: raw.patientAddr,
      doctorAddr: raw.doctorAddr,
      doctorName: raw.doctorName,
    };
  }

  private mapLabAnalysis(raw: any): LabAnalysis {
    return {
      id: raw.id,
      title: raw.title,
      ipfsCid: raw.ipfsCid,
      timestamp: raw.timestamp,
      labTechAddr: raw.labTechAddr,
      labTechName: raw.labTechName,
      patientAddr: raw.patientAddr,
      exists: raw.exists,
    };
  }

  private mapLabAnalysisSummary(raw: any): LabAnalysisSummary {
    return {
      id: raw.id,
      title: raw.title,
      timestamp: raw.timestamp,
      patientAddr: raw.patientAddr,
      labTechAddr: raw.labTechAddr,
      labTechName: raw.labTechName,
    };
  }

  private mapPrescription(raw: any): Prescription {
    return {
      id: raw.id,
      title: raw.title,
      ipfsCid: raw.ipfsCid,
      patientAddr: raw.patientAddr,
      doctorAddr: raw.doctorAddr,
      doctorName: raw.doctorName,
      timestamp: raw.timestamp,
      codeHash: raw.codeHash,
      salt: raw.salt,
      dispensed: raw.dispensed,
      dispensedTimestamp: raw.dispensedTimestamp,
      dispensedBy: raw.dispensedBy,
      exists: raw.exists,
    };
  }

  private mapPrescriptionSummary(raw: any): PrescriptionSummary {
    return {
      id: raw.id,
      title: raw.title,
      timestamp: raw.timestamp,
      patientAddr: raw.patientAddr,
      doctorAddr: raw.doctorAddr,
      doctorName: raw.doctorName,
      dispensed: raw.dispensed,
      dispensedTimestamp: raw.dispensedTimestamp,
      dispensedBy: raw.dispensedBy,
    };
  }
}
