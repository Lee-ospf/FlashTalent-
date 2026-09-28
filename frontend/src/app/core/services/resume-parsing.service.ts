import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParsedResumeResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ResumeParsingService {
  private http = inject(HttpClient);
  private base(candidateId: number) { return `${environment.apiUrl}/candidates/${candidateId}/resume-parsing`; }

  /** Reuses whichever CV the candidate already uploaded via the normal
   *  Documents step — no file is sent here, the backend reads it straight
   *  off disk. Returns structured, UNSAVED data; the caller is responsible
   *  for letting the candidate review/edit it before actually saving via the
   *  normal skill/experience/qualification endpoints. */
  parseCv(candidateId: number): Observable<ParsedResumeResponse> {
    return this.http.post<ParsedResumeResponse>(`${this.base(candidateId)}/parse-cv`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? 'Could not parse your CV — please fill in your details manually.';
    return throwError(() => new Error(message));
  }
}