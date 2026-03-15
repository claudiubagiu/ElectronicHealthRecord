import { Injectable } from '@angular/core';
import { BrowserProvider, Contract, ContractTransactionReceipt } from 'ethers';
import { Web3Service } from './web3.service';
import PatientRecords from '../../shared/contracts/PatientRecords.json';
import { Diagnosis } from '../models/blockchain.model';

declare let window: any;

@Injectable({ providedIn: 'root' })
export class BlockchainService {
  private provider!: BrowserProvider;
  private contract!: Contract;

  constructor(private web3Service: Web3Service) {
    this.provider = new BrowserProvider(window.ethereum);
    this.contract = new Contract(PatientRecords['address'], PatientRecords['abi'], this.provider);
  }

  /** Returns a contract instance connected to the signer (for write calls) */
  private async getSigned(): Promise<Contract> {
    const signer = await this.provider.getSigner();
    return this.contract.connect(signer) as Contract;
  }

  // ── Access Control ───────────────────────────────────────────────────────────

  /**
   * Patient grants a doctor read-access to their records.
   * Called after doctor requests access off-chain and patient clicks "Approve".
   */
  async grantAccess(doctorAddress: string): Promise<void> {
    const signed = await this.getSigned();
    const tx = await signed['grantAccess'](doctorAddress);
    await tx.wait();
  }

  /**
   * Patient revokes a doctor's access at any time.
   */
  async revokeAccess(doctorAddress: string): Promise<void> {
    const signed = await this.getSigned();
    const tx = await signed['revokeAccess'](doctorAddress);
    await tx.wait();
  }

  /**
   * Check if a doctor has access to a patient's records.
   * Also called by Lit Protocol ACC: hasAccess(patientAddress, :userAddress)
   */
  async hasAccess(patientAddress: string, doctorAddress: string): Promise<boolean> {
    return this.contract['hasAccess'](patientAddress, doctorAddress);
  }

  // ── Diagnosis Registry ───────────────────────────────────────────────────────

  /**
   * Patient approves a doctor's off-chain proposal and stores it on-chain.
   * Document must already be Lit-encrypted and uploaded to IPFS before calling this.
   *
   * @param title      Short title (e.g. "MRI – Lumbar Spine")
   * @param ipfsCid    IPFS CID of the Lit-encrypted document
   * @param doctorAddr Wallet address of the proposing doctor (from off-chain proposal)
   * @param doctorName Display name of the doctor
   * @returns          On-chain diagnosis ID
   */
  async addDiagnosis(
    title: string,
    ipfsCid: string,
    doctorAddr: string,
    doctorName: string
  ): Promise<bigint> {
    const signed = await this.getSigned();
    const tx = await signed['addDiagnosis'](title, ipfsCid, doctorAddr, doctorName);
    const receipt: ContractTransactionReceipt = await tx.wait();

    // Parse DiagnosisAdded event to extract the on-chain ID
    const iface = this.contract.interface;
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

    throw new Error('DiagnosisAdded event not found in receipt');
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  /**
   * Fetch a single diagnosis by ID.
   * Caller must be the patient or an authorized doctor.
   */
  async getDiagnosis(diagnosisId: bigint): Promise<Diagnosis> {
    const raw = await this.contract['getDiagnosis'](diagnosisId);
    return this.mapDiagnosis(raw);
  }

  /**
   * Get all diagnoses for a patient (full objects).
   * Caller must be the patient or an authorized doctor.
   */
  async getPatientDiagnoses(patientAddress: string): Promise<Diagnosis[]> {
    const ids: bigint[] = await this.contract['getPatientDiagnosisIds'](patientAddress);
    return Promise.all(ids.map((id) => this.getDiagnosis(id)));
  }

  /**
   * Get all diagnoses where the connected wallet is the proposing doctor.
   */
  async getDoctorDiagnoses(): Promise<Diagnosis[]> {
    const ids: bigint[] = await this.contract['getDoctorDiagnosisIds']();
    return Promise.all(ids.map((id) => this.getDiagnosis(id)));
  }

  /**
   * Total number of diagnoses ever stored across all patients.
   */
  async totalDiagnoses(): Promise<bigint> {
    return this.contract['totalDiagnoses']();
  }

  // ── Mapper ───────────────────────────────────────────────────────────────────

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
