export interface Diagnosis {
  id: bigint;
  title: string;
  ipfsCid: string;
  timestamp: bigint;
  doctorAddr: string;
  doctorName: string;
  patientAddr: string;
  exists: boolean;
}

export interface LabAnalysis {
  id: bigint;
  title: string;
  ipfsCid: string;
  timestamp: bigint;
  labTechAddr: string;
  labTechName: string;
  patientAddr: string;
  exists: boolean;
}

export interface Prescription {
  id: bigint;
  title: string;
  ipfsCid: string;
  patientAddr: string;
  doctorAddr: string;
  doctorName: string;
  timestamp: bigint;
  codeHash: string;
  salt: string;
  dispensed: boolean;
  dispensedTimestamp: bigint;
  dispensedBy: string;
  exists: boolean;
}
