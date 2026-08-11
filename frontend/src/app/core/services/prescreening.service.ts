import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrescreeningResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class PrescreeningService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/prescreening`;

  getByApplication(applicationId: number): Observable<PrescreeningResponse> {
    return this.http
      .get<PrescreeningResponse>(`${this.base}/${applicationId}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }
}
