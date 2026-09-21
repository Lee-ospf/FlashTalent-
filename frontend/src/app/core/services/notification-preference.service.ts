// core/services/notification-preference.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationPreference {
  notificationType: string | null; // null = global default
  channel: string; // 'Email' | 'InApp' | 'None'
}

@Injectable({ providedIn: 'root' })
export class NotificationPreferenceService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notification-preferences`;

  getMine(): Observable<NotificationPreference[]> {
    return this.http
      .get<NotificationPreference[]>(this.base)
      .pipe(catchError(this.handleError));
  }

  setPreference(
    notificationType: string | null,
    channel: string,
  ): Observable<void> {
    return this.http
      .put<void>(this.base, { notificationType, channel })
      .pipe(catchError(this.handleError));
  }

  deletePreference(notificationType: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${notificationType}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    let message = err.error?.message as string | undefined;

    if (!message && err.error?.errors) {
      const fieldErrors = Object.values(
        err.error.errors as Record<string, string[]>,
      ).flat();
      if (fieldErrors.length) message = fieldErrors.join(' ');
    }

    return throwError(
      () => new Error(message ?? 'An unexpected error occurred.'),
    );
  }
}
