import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationTemplate {
  notificationTemplateId: number;
  notificationType: string;
  channel: string;
  subject: string | null;
  bodyTemplate: string;
}

export interface AvailableCombination {
  notificationType: string;
  channel: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationTemplateService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notification-templates`;

  getAll(): Observable<NotificationTemplate[]> {
    return this.http
      .get<NotificationTemplate[]>(this.base)
      .pipe(catchError(this.handleError));
  }

  update(id: number, subject: string | null, bodyTemplate: string): Observable<void> {
    return this.http
      .put<void>(`${this.base}/${id}`, { subject, bodyTemplate })
      .pipe(catchError(this.handleError));
  }

  create(notificationType: string, channel: string, subject: string | null, bodyTemplate: string): Observable<NotificationTemplate> {
    return this.http
      .post<NotificationTemplate>(this.base, { notificationType, channel, subject, bodyTemplate })
      .pipe(catchError(this.handleError));
  }

  getAvailableCombinations(): Observable<AvailableCombination[]> {
    return this.http
      .get<AvailableCombination[]>(`${this.base}/available-combinations`)
      .pipe(catchError(this.handleError));
  }

  getPlaceholders(): Observable<Record<string, string[]>> {
    return this.http
      .get<Record<string, string[]>>(`${this.base}/placeholders`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    let message = err.error?.message as string | undefined;
    if (!message && err.error?.errors) {
      const fieldErrors = Object.values(err.error.errors as Record<string, string[]>).flat();
      if (fieldErrors.length) message = fieldErrors.join(' ');
    }
    return throwError(() => new Error(message ?? 'An unexpected error occurred.'));
  }
}