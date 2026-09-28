import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InterviewResponse,
  ScheduleInterviewRequest,
  RescheduleInterviewRequest,
  SetInterviewOutcomeRequest,
  InterviewRescheduleResponse,
  CalendarAvailabilityResponse,
  CalendarConflictErrorBody,
} from '../models';

// Thrown instead of a plain Error when the backend returns 409 because the
// scheduling recruiter's connected calendar has a conflicting event at the
// requested time (see InterviewsController.Schedule/Reschedule). Carries the
// conflict windows so the component can show them and offer "schedule anyway"
// (which resubmits with ignoreCalendarConflicts: true).
export class CalendarConflictError extends Error {
  constructor(public body: CalendarConflictErrorBody) {
    super(body.message);
  }
}

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/interviews`;

  schedule(
    applicationId: number,
    req: ScheduleInterviewRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .post<InterviewResponse>(`${this.base}/${applicationId}/schedule`, req)
      .pipe(catchError(this.handleScheduleError));
  }

  reschedule(
    interviewId: number,
    req: RescheduleInterviewRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .put<InterviewResponse>(`${this.base}/${interviewId}/reschedule`, req)
      .pipe(catchError(this.handleScheduleError));
  }

  cancel(interviewId: number): Observable<InterviewResponse> {
    return this.http
      .put<InterviewResponse>(`${this.base}/${interviewId}/cancel`, {})
      .pipe(catchError(this.handleError));
  }

  setOutcome(
    interviewId: number,
    req: SetInterviewOutcomeRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .put<InterviewResponse>(`${this.base}/${interviewId}/outcome`, req)
      .pipe(catchError(this.handleError));
  }

  getById(interviewId: number): Observable<InterviewResponse> {
    return this.http
      .get<InterviewResponse>(`${this.base}/${interviewId}`)
      .pipe(catchError(this.handleError));
  }

  getByApplication(applicationId: number): Observable<InterviewResponse[]> {
    return this.http
      .get<
        InterviewResponse[]
      >(`${environment.apiUrl}/applications/${applicationId}/interviews`)
      .pipe(catchError(this.handleError));
  }

  getRescheduleHistory(
    interviewId: number,
  ): Observable<InterviewRescheduleResponse[]> {
    return this.http
      .get<
        InterviewRescheduleResponse[]
      >(`${this.base}/${interviewId}/reschedules`)
      .pipe(catchError(this.handleError));
  }

  // Lets Angular pre-check the recruiter's connected calendar before submitting
  // schedule/reschedule, so the time picker can flag a clash before the user
  // even hits save.
  checkAvailability(
    scheduledAt: string,
    durationMinutes = 60,
  ): Observable<CalendarAvailabilityResponse> {
    return this.http
      .get<CalendarAvailabilityResponse>(`${this.base}/availability`, {
        params: { scheduledAt, durationMinutes },
      })
      .pipe(catchError(this.handleError));
  }

  // Retries syncing a single interview to the recruiter's calendar after a previous
  // failure (interview.calendarIntegrationStatus === 'Failed'), without
  // creating a duplicate event.
  retryCalendarSync(interviewId: number): Observable<InterviewResponse> {
    return this.http
      .post<InterviewResponse>(`${this.base}/${interviewId}/calendar/retry`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }

  // Same as handleError, but on a 409 (calendar conflict) it throws a
  // CalendarConflictError carrying the conflict windows instead of a plain
  // Error, so schedule/reschedule callers can render them and offer a
  // "schedule anyway" retry.
  private handleScheduleError(err: HttpErrorResponse) {
    if (err.status === 409 && err.error?.conflicts) {
      return throwError(() => new CalendarConflictError(err.error));
    }
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }
}
