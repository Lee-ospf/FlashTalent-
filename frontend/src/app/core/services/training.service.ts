import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AssignEmployeesRequest,
  AssignEmployeesResponse,
  AssignmentListItem,
  AssignmentStatus,
  AwaitingConfirmationItem,
  ComplianceSummary,
  CreateIntakeRequest,
  IntakeListItem,
  IntakeResponse,
  IntakeState,
  MoveToIntakeRequest,
  MyTraining,
  NeedsResolutionItem,
  OverdueTrainingItem,
  ProgrammeListItem,
  ProgrammeResponse,
  SaveIntakeRequest,
  SaveProgrammeRequest,
  TrainingResolutionResponse,
  TrainingReviewResponse,
} from '../models';

// Counts shown on the HR training tabs
export interface TrainingBadges {
  review: number;
  resolve: number;
  overdue: number;
}

function params(o: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ── Tab badges (shared, so a page can refresh them after an action) ──
  badges = signal<TrainingBadges>({ review: 0, resolve: 0, overdue: 0 });

  refreshBadges(): void {
    forkJoin({
      summary: this.getSummary().pipe(catchError(() => of(null))),
      resolve: this.getNeedsResolution().pipe(catchError(() => of(null))),
    }).subscribe(({ summary, resolve }) =>
      this.badges.set({
        review: summary?.awaitingConfirmation ?? 0,
        overdue: summary?.overdueTraining ?? 0,
        resolve: resolve?.length ?? 0,
      }),
    );
  }

  // ── Programmes (HR, Admin) ──
  getProgrammes(): Observable<ProgrammeListItem[]> {
    return this.http.get<ProgrammeListItem[]>(`${this.api}/training-programmes`);
  }
  getProgramme(id: number): Observable<ProgrammeResponse> {
    return this.http.get<ProgrammeResponse>(`${this.api}/training-programmes/${id}`);
  }
  createProgramme(body: SaveProgrammeRequest): Observable<ProgrammeResponse> {
    return this.http.post<ProgrammeResponse>(`${this.api}/training-programmes`, body);
  }
  updateProgramme(id: number, body: SaveProgrammeRequest): Observable<ProgrammeResponse> {
    return this.http.put<ProgrammeResponse>(`${this.api}/training-programmes/${id}`, body);
  }
  retireProgramme(id: number): Observable<ProgrammeResponse> {
    return this.http.patch<ProgrammeResponse>(`${this.api}/training-programmes/${id}/retire`, {});
  }
  reactivateProgramme(id: number): Observable<ProgrammeResponse> {
    return this.http.patch<ProgrammeResponse>(`${this.api}/training-programmes/${id}/reactivate`, {});
  }

  // ── Intakes (HR, Admin) ──
  getIntakes(programmeId?: number, state?: IntakeState): Observable<IntakeListItem[]> {
    return this.http.get<IntakeListItem[]>(`${this.api}/training-intakes`, {
      params: params({ programmeId, state }),
    });
  }
  getIntake(id: number): Observable<IntakeResponse> {
    return this.http.get<IntakeResponse>(`${this.api}/training-intakes/${id}`);
  }
  createIntake(body: CreateIntakeRequest): Observable<IntakeResponse> {
    return this.http.post<IntakeResponse>(`${this.api}/training-intakes`, body);
  }
  updateIntake(id: number, body: SaveIntakeRequest): Observable<IntakeResponse> {
    return this.http.put<IntakeResponse>(`${this.api}/training-intakes/${id}`, body);
  }
  closeIntake(id: number): Observable<IntakeResponse> {
    return this.http.patch<IntakeResponse>(`${this.api}/training-intakes/${id}/close`, {});
  }

  // ── Assignments (HR, Admin) ──
  getAssignments(intakeId: number, status?: AssignmentStatus): Observable<AssignmentListItem[]> {
    return this.http.get<AssignmentListItem[]>(`${this.api}/training-intakes/${intakeId}/assignments`, {
      params: params({ status }),
    });
  }
  assign(intakeId: number, body: AssignEmployeesRequest): Observable<AssignEmployeesResponse> {
    return this.http.post<AssignEmployeesResponse>(`${this.api}/training-intakes/${intakeId}/assignments`, body);
  }
  setDueDate(assignmentId: number, dueDate: string): Observable<AssignmentListItem> {
    return this.http.patch<AssignmentListItem>(`${this.api}/training-assignments/${assignmentId}/due-date`, { dueDate });
  }

  // Reviewing
  getAwaitingConfirmation(): Observable<AwaitingConfirmationItem[]> {
    return this.http.get<AwaitingConfirmationItem[]>(`${this.api}/training-assignments/awaiting-confirmation`);
  }
  confirm(id: number): Observable<TrainingReviewResponse> {
    return this.http.post<TrainingReviewResponse>(`${this.api}/training-assignments/${id}/confirm`, {});
  }
  reject(id: number, reason: string): Observable<TrainingReviewResponse> {
    return this.http.post<TrainingReviewResponse>(`${this.api}/training-assignments/${id}/reject`, { reason });
  }

  // Resolving
  getNeedsResolution(): Observable<NeedsResolutionItem[]> {
    return this.http.get<NeedsResolutionItem[]>(`${this.api}/training-assignments/needs-resolution`);
  }
  markNotCompleted(id: number): Observable<TrainingResolutionResponse> {
    return this.http.post<TrainingResolutionResponse>(`${this.api}/training-assignments/${id}/mark-not-completed`, {});
  }
  moveToIntake(id: number, body: MoveToIntakeRequest): Observable<TrainingResolutionResponse> {
    return this.http.post<TrainingResolutionResponse>(`${this.api}/training-assignments/${id}/move-to-intake`, body);
  }

  // ── Compliance (HR, Admin) ──
  getSummary(): Observable<ComplianceSummary> {
    return this.http.get<ComplianceSummary>(`${this.api}/compliance/summary`);
  }
  getOverdue(): Observable<OverdueTrainingItem[]> {
    return this.http.get<OverdueTrainingItem[]>(`${this.api}/compliance/training/overdue`);
  }

  // ── Employee self-service ──
  getMine(): Observable<MyTraining[]> {
    return this.http.get<MyTraining[]>(`${this.api}/employees/me/trainings`);
  }
  updateProgress(id: number, progressPercent: number): Observable<MyTraining> {
    return this.http.put<MyTraining>(`${this.api}/employees/me/trainings/${id}/progress`, { progressPercent });
  }
  submit(id: number): Observable<MyTraining> {
    return this.http.post<MyTraining>(`${this.api}/employees/me/trainings/${id}/submit`, {});
  }
  withdraw(id: number): Observable<MyTraining> {
    return this.http.post<MyTraining>(`${this.api}/employees/me/trainings/${id}/withdraw`, {});
  }
}