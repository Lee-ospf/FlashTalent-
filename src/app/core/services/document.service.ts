import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CandidateDocumentResponse, MandatoryDocumentsStatusResponse } from '../models';

// ── Matches the backend DocumentType enum exactly ─────────────────
export type DocumentTypeKey =
  | 'CV'
  | 'MatricCertificate'
  | 'Qualification'
  | 'Certification'
  | 'Other';

export const ALL_DOC_TYPES: DocumentTypeKey[] = [
  'CV', 'MatricCertificate', 'Qualification', 'Certification', 'Other'
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
  CV:                'Curriculum Vitae (CV)',
  MatricCertificate: 'Matric Certificate',
  Qualification:     'Tertiary Qualification',
  Certification:     'Certification',
  Other:             'Other Document'
};

// System-wide mandatory docs (always required, regardless of vacancy)
export const GLOBAL_MANDATORY: DocumentTypeKey[] = ['CV', 'MatricCertificate'];

// Client-side file validation — mirrors backend AllowedExtensions + MaxFileSizeBytes
const ALLOWED_EXT   = ['.pdf', '.doc', '.docx'];
const MAX_BYTES     = 5 * 1024 * 1024;

export function validateFileClient(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext))
    return `"${file.name}" — unsupported type. Accepted: PDF, DOC, DOCX.`;
  if (file.size > MAX_BYTES)
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — max 5 MB.`;
  return null;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);

  private base(candidateId: number): string {
    return `${environment.apiUrl}/candidates/${candidateId}/documents`;
  }

  upload(candidateId: number, documentType: DocumentTypeKey, file: File): Observable<CandidateDocumentResponse> {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file, file.name);
    return this.http.post<CandidateDocumentResponse>(this.base(candidateId), form)
      .pipe(catchError(this.handleError));
  }

  getAll(candidateId: number): Observable<CandidateDocumentResponse[]> {
    return this.http.get<CandidateDocumentResponse[]>(this.base(candidateId))
      .pipe(catchError(this.handleError));
  }

  getMandatoryStatus(candidateId: number): Observable<MandatoryDocumentsStatusResponse> {
    return this.http.get<MandatoryDocumentsStatusResponse>(`${this.base(candidateId)}/mandatory-status`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Upload failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}
