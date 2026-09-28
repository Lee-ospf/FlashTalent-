import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoogleCalendarStatusResponse {
  connected: boolean;
}

export interface GoogleCalendarConnectResponse {
  authUrl: string;
}

// Talks to GoogleAuthController (api/auth/google/*). Used by the recruiter/admin
// Settings > Calendar screen to connect a Google account and show whether one
// is already linked, so interview scheduling can sync to it.
@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/google`;

  // Fetches the Google OAuth consent URL for the current recruiter. The
  // caller should do window.location.href = res.authUrl to start the flow;
  // Google redirects back to /settings/calendar when done.
  getConnectUrl(): Observable<GoogleCalendarConnectResponse> {
    return this.http
      .get<GoogleCalendarConnectResponse>(`${this.base}/connect`)
      .pipe(catchError(this.handleError));
  }

  status(): Observable<GoogleCalendarStatusResponse> {
    return this.http
      .get<GoogleCalendarStatusResponse>(`${this.base}/status`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }
}
