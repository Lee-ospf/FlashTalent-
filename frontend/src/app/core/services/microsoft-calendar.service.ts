import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MicrosoftCalendarStatusResponse {
  connected: boolean;
}

export interface MicrosoftCalendarConnectResponse {
  authUrl: string;
}

// Talks to MicrosoftAuthController (api/auth/microsoft/*). Mirrors
// GoogleCalendarService so the Settings > Calendar screen can offer either
// provider the same way.
@Injectable({ providedIn: 'root' })
export class MicrosoftCalendarService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/microsoft`;

  // Fetches the Microsoft consent URL for the current recruiter. The caller
  // should do window.location.href = res.authUrl to start the flow; Microsoft
  // redirects back to /settings/calendar when done.
  getConnectUrl(): Observable<MicrosoftCalendarConnectResponse> {
    return this.http
      .get<MicrosoftCalendarConnectResponse>(`${this.base}/connect`)
      .pipe(catchError(this.handleError));
  }

  status(): Observable<MicrosoftCalendarStatusResponse> {
    return this.http
      .get<MicrosoftCalendarStatusResponse>(`${this.base}/status`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }
}
