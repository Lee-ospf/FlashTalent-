import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models';

export interface SessionUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  private _session = signal<SessionUser | null>(this.loadSession());

  isLoggedIn = computed(() => !!this._session());
  currentUser = computed(() => this._session());

  register(req: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, req).pipe(
      catchError(this.handleError)
    );
  }

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, req).pipe(
      tap(res => this.persistSession(res)),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_auth');
    this._session.set(null);
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem('rms_token', res.token);
    const session: SessionUser = {
      userId: res.userId,
      firstName: res.firstName,
      lastName: res.lastName,
      email: res.email,
      role: res.role
    };
    localStorage.setItem('rms_auth', JSON.stringify(session));
    this._session.set(session);
  }

  private loadSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem('rms_auth');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
