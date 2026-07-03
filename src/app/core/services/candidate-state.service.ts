import { Injectable, signal, inject, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CandidateResponse } from '../models';
import { CandidateService } from './candidate.service';
import { AuthService } from './auth.service';

/**
 * Thin reactive cache layer over CandidateService.
 * Components inject this instead of CandidateService directly so they
 * get a signal-based profile without triggering duplicate HTTP calls.
 */
@Injectable({ providedIn: 'root' })
export class CandidateStateService {
  private candidateService = inject(CandidateService);
  private auth = inject(AuthService);

  private _profile = signal<CandidateResponse | null>(null);
  private _loaded = signal(false);

  profile = computed(() => this._profile());
  loaded = computed(() => this._loaded());

  /** Call once on login / app init to resolve and cache the profile. */
  loadMyProfile(): Observable<CandidateResponse[]> {
    return this.candidateService.getAll().pipe(
      tap(candidates => {
        const userId = this.auth.currentUser()?.userId;
        const mine = candidates.find(c => c.userId === userId) ?? null;
        this._profile.set(mine);
        this._loaded.set(true);
      })
    );
  }

  /** Refresh after create / update. */
  refresh(): Observable<CandidateResponse[]> {
    return this.loadMyProfile();
  }

  setProfile(p: CandidateResponse): void {
    this._profile.set(p);
    this._loaded.set(true);
  }

  clear(): void {
    this._profile.set(null);
    this._loaded.set(false);
  }
}
