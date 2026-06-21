import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CreateDocumentKeyDto,
  DocumentKeyDto,
  RotateDocumentKeysDto,
} from '../models/document-key.model';
import { environment } from '../../../environments/environment';

/**
 * Talks to AccessRequests.Api's DocumentKeys endpoints. Manages the
 * per-document DocumentKey (wrapped with the patient's PatientMasterKey)
 * for files stored on IPFS — diagnoses, lab analyses, prescriptions.
 *
 * Hosted on the same backend as AccessRequests.Api (AccessRequests
 * controller), but under its own DocumentKeys controller — so the base
 * URL is derived from environment.apiUrls.accessRequest's host, not
 * reused directly (that one already points at /api/AccessRequests).
 */
@Injectable({ providedIn: 'root' })
export class DocumentKeyService {
  private readonly API = environment.apiUrls.accessRequest.replace(
    '/api/AccessRequests',
    '/api/DocumentKeys'
  );
  private http = inject(HttpClient);

  /**
   * Registers a new DocumentKey right after a file has been encrypted
   * client-side and uploaded to IPFS.
   */
  create(dto: CreateDocumentKeyDto): Promise<DocumentKeyDto> {
    return firstValueFrom(this.http.post<DocumentKeyDto>(this.API, dto));
  }

  /**
   * Fetches the DocumentKey for a single IPFS CID. The caller must be the
   * patient, or hold an active Envelope for the patient.
   */
  getByIpfsCid(ipfsCid: string): Promise<DocumentKeyDto> {
    return firstValueFrom(this.http.get<DocumentKeyDto>(`${this.API}/${ipfsCid}`));
  }

  /**
   * Lists every DocumentKey owned by the given patient. Only the patient
   * themselves may call this — used to drive PatientMasterKey rotation.
   */
  getByPatientId(patientId: string): Promise<DocumentKeyDto[]> {
    return firstValueFrom(this.http.get<DocumentKeyDto[]>(`${this.API}/patient/${patientId}`));
  }

  /**
   * Batch-rotates EncryptedDocumentKey for the caller's own documents.
   */
  rotate(dto: RotateDocumentKeysDto): Promise<{ updatedCount: number }> {
    return firstValueFrom(this.http.patch<{ updatedCount: number }>(`${this.API}/rotate`, dto));
  }
}
