export interface AccessRequestHistoryDto {
  id: string;
  accessRequestId: string;
  action: string; // 'Requested' | 'Approved' | 'Rejected' | 'Revoked'
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  timestamp: string;
}
