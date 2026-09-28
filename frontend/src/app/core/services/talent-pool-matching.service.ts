import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiTalentPoolMatchResponse,
  TalentPoolPullResponse,
  ApplicantRankingResponse,
  TalentPoolInviteSummaryResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TalentPoolMatchingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/talentpool`;

  // Phase 1 - AI-scores eligible talent pool candidates against a Draft
  // vacancy. Replaces any previous draft suggestions for this vacancy.
  pullDraftSuggestions(vacancyId: number): Observable<TalentPoolPullResponse> {
    return this.http
      .post<TalentPoolPullResponse>(`${this.base}/${vacancyId}/pull`, {})
      .pipe(catchError(this.handleError));
  }

  // Phase 2 - AI-scores everyone currently in the active pipeline for a
  // Published vacancy. Replaces any previous ranking for this vacancy.
  rankApplicants(vacancyId: number): Observable<ApplicantRankingResponse> {
    return this.http
      .post<ApplicantRankingResponse>(`${this.base}/${vacancyId}/rank-applicants`, {})
      .pipe(catchError(this.handleError));
  }

  // Reload either phase's persisted results without re-running AI.
  getMatches(vacancyId: number, stage: 'DraftSuggestion' | 'FullRanking'): Observable<AiTalentPoolMatchResponse[]> {
    return this.http
      .get<AiTalentPoolMatchResponse[]>(`${this.base}/${vacancyId}/ai-matches`, { params: { stage } })
      .pipe(catchError(this.handleError));
  }

  getInviteSummary(vacancyId: number): Observable<TalentPoolInviteSummaryResponse> {
  return this.http
    .get<TalentPoolInviteSummaryResponse>(`${this.base}/${vacancyId}/invite-summary`)
    .pipe(catchError(this.handleError));
}

  // Phase 1 action - notifies a suggested candidate. Does not create an
  // Application - the candidate still has to apply themselves.
  invite(vacancyId: number, matchId: number): Observable<AiTalentPoolMatchResponse> {
    return this.http
      .post<AiTalentPoolMatchResponse>(`${this.base}/${vacancyId}/matches/${matchId}/invite`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? 'Talent pool matching request failed.';
    return throwError(() => new Error(message));
  }
}