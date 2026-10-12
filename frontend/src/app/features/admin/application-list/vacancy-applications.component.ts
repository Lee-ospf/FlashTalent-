import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApplicationService } from '../../../core/services/application.service';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { PrescreeningService } from '../../../core/services/prescreening.service';
import { InterviewService } from '../../../core/services/interview.service';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import { ToastService } from '../../../core/services/toast.service';
import { TalentPoolMatchingService } from '../../../core/services/talent-pool-matching.service';
import {
  ApplicationResponse,
  VacancyResponse,
  InterviewResponse,
  AiTalentPoolMatchResponse,
} from '../../../core/models';
import {
  statusLabel as sharedStatusLabel,
  statusClass as sharedStatusClass,
} from '../../../core/utils/application-status';

const MAX_INTERVIEW_ROUNDS = 5;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type TabKey = 'all' | 'review' | 'prescreen' | 'interview' | 'offer' | 'hired';
interface InterviewSubState {
  label: string;
  detail: string;
}

interface OnboardingCompleteResponse {
  employeeId: number;
  userId: number;
  loginEmail: string;
  personalEmail?: string | null;
  role: string;
  mustChangePassword: boolean;
  alreadyOnboarded: boolean;
  message: string;
  profileCopied?: {
    skills: number;
    qualifications: number;
    experiences: number;
  } | null;
}
interface DepartmentOption {
  id: number;
  name: string;
}
// GET api/employees/awaiting-onboarding: Hired applications with no Employee yet
interface AwaitingOnboardingItem {
  applicationId: number;
  candidateId: number;
  candidateName: string;
  email: string;
  vacancyTitle: string;
  hiredAt?: string | null;
}
type OnboardField =
  | 'externalEmployeeId'
  | 'hireDate'
  | 'jobTitle'
  | 'departmentId'
  | 'workEmail';

// Lets the page read employeeId before it is added to the shared
// ApplicationResponse model (the backend must return it - see notes).
type ApplicationWithEmployee = ApplicationResponse & {
  employeeId?: number | null;
};

@Component({
  selector: 'app-vacancy-applications',
  standalone: true,
  host: { '(document:keydown.escape)': 'closeOnboardModal()' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <a (click)="goBack()" class="back-link" style="cursor:pointer">
        <i class="ti ti-arrow-left"></i> Back
      </a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (vacancy()) {
        <div class="vp-header">
          <div>
            <div class="vp-title">{{ vacancy()!.title }}</div>
            <div class="vp-sub">
              {{ applications().length }} application{{
                applications().length !== 1 ? 's' : ''
              }}
              &middot; {{ vacancy()!.status }}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            @if (vacancy()!.status === 'Published') {
              <button
                class="btn-primary"
                (click)="rankCandidates()"
                [disabled]="ranking() || !appliedCount()"
              >
                @if (ranking()) {
                  <mat-spinner
                    diameter="14"
                    style="display:inline-block;margin-right:6px"
                  ></mat-spinner>
                  Ranking…
                } @else {
                  <i class="ti ti-sparkles"></i> Rank new applicants
                }
              </button>
            }
            <span
              class="status-pill s-{{
                vacancy()!.status === 'Published' ? 'offer' : 'applied'
              }}"
            >
              {{ vacancy()!.status }}
            </span>
          </div>
        </div>

        @if (rankedMatches().size > 0) {
          <p class="form-note" style="margin-bottom:12px">
            <i class="ti ti-sparkles"></i> Applied candidates sorted by AI fit
            score{{
              lastRankedAt()
                ? ' — ranked ' + formatDateTime(lastRankedAt()!)
                : ''
            }}.
          </p>
        }

        <div class="vp-filters">
          <div class="search-wrap" style="flex:1;min-width:220px">
            <i class="ti ti-search search-icon"></i>
            <input
              [(ngModel)]="searchQ"
              type="search"
              class="search-input"
              placeholder="Search by candidate…"
            />
          </div>
          <div class="vp-tabs">
            @for (t of tabs(); track t.key) {
              <button
                class="vp-tab"
                [class.active]="activeTab() === t.key"
                (click)="activeTab.set(t.key)"
              >
                {{ t.label }} ({{ t.count }})
              </button>
            }
          </div>
        </div>

        @if (!filteredApplications().length) {
          <div class="empty-state">
            <i class="ti ti-zoom-question"></i>
            <p>No applications match.</p>
          </div>
        } @else {
          <div class="vp-table-wrap">
            <table class="vp-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  @if (rankedMatches().size > 0) {
                    <th>AI Fit</th>
                  }
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (a of filteredApplications(); track a.applicationId) {
                  <tr class="vp-row">
                    <td class="vp-name">
                      <a
                        class="app-title app-title-link"
                        [href]="
                          '/admin/applications/' +
                          a.applicationId +
                          '/candidate'
                        "
                        (click)="$event.stopPropagation()"
                      >
                        {{ a.candidateName }}
                      </a>
                    </td>
                    @if (rankedMatches().size > 0) {
                      <td (click)="$event.stopPropagation()">
                        @if (rankedMatches().get(a.candidateId); as m) {
                          <span class="vp-fit-badge" [title]="m.reasoning">{{
                            m.score
                          }}</span>
                        } @else {
                          <span class="vp-muted">—</span>
                        }
                      </td>
                    }
                    <td class="vp-muted" (click)="openHistory(a)">
                      {{ formatDate(a.appliedAt) }}
                    </td>
                    <td>
                      <span class="status-pill s-{{ statusClass(a.status) }}">{{
                        statusLabel(a)
                      }}</span>
                    </td>
                    <td (click)="$event.stopPropagation()">
                      @switch (a.status) {
                        @case ('Applied') {
                          <button
                            class="btn-primary vp-action-btn"
                            (click)="openReview(a)"
                          >
                            <i class="ti ti-eye"></i> Review
                          </button>
                        }
                        @case ('UnderReview') {
                          <button
                            class="btn-primary vp-action-btn"
                            (click)="openReview(a)"
                          >
                            <i class="ti ti-eye"></i> Continue Review
                          </button>
                        }
                        @case ('Shortlisted') {
                          <button
                            class="btn-primary vp-action-btn"
                            (click)="openPreScreeningReview(a)"
                          >
                            <i class="ti ti-clipboard-list"></i> Send
                            pre-screening form
                          </button>
                        }
                        @case ('PrescreeningStage') {
                          @if (prescreeningPassed().has(a.applicationId)) {
                            <button
                              class="btn-primary vp-action-btn"
                              (click)="scheduleInterview(a)"
                            >
                              <i class="ti ti-calendar-event"></i> Schedule
                              Interview
                            </button>
                          } @else if (
                            prescreeningSubmitted().has(a.applicationId)
                          ) {
                            <button
                              class="btn-primary vp-action-btn"
                              (click)="openPreScreeningReview(a)"
                            >
                              <i class="ti ti-clipboard-check"></i> Review
                              submission
                            </button>
                          } @else {
                            <button
                              class="btn-primary vp-action-btn"
                              (click)="openPreScreeningReview(a)"
                            >
                              <i class="ti ti-clipboard-check"></i> View
                              pre-screening form
                            </button>
                          }
                        }
                        @case ('InterviewStage') {
                          @if (maxRoundsReached().has(a.applicationId)) {
                            <span class="form-note"
                              ><i class="ti ti-flag-check"></i> Final round
                              completed</span
                            >
                          } @else {
                            <button
                              class="btn-primary vp-action-btn"
                              (click)="scheduleInterview(a)"
                            >
                              <i class="ti ti-calendar-event"></i> View
                              Interview
                            </button>
                          }
                        }
                        @case ('OfferExtended') {
                          <button
                            class="btn-primary vp-action-btn"
                            (click)="openOfferLetter(a)"
                          >
                            <i class="ti ti-clipboard-check"></i> View Offer
                            Details
                          </button>
                        }
                        @case ('Hired') {
                          @if (
                            employeeIdByApp().get(a.applicationId);
                            as empId
                          ) {
                            <button
                              class="btn-primary vp-action-btn"
                              (click)="openEmployee(empId)"
                            >
                              <i class="ti ti-user-check"></i> View employee
                            </button>
                          } @else if (isOnboarded(a)) {
                            <span class="form-note"
                              ><i class="ti ti-user-check"></i> Onboarded</span
                            >
                          } @else {
                            <button
                              class="btn-primary vp-action-btn"
                              (click)="openOnboardModal(a)"
                            >
                              <i class="ti ti-user-plus"></i> Mark as onboarded
                            </button>
                          }
                        }
                        @default {
                          <span class="form-note"
                            ><i class="ti ti-lock"></i> Final stage</span
                          >
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>

    @if (onboardTarget(); as target) {
      <div class="mo-backdrop" (click)="closeOnboardModal()">
        <div
          class="mo-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mo-title"
          (click)="$event.stopPropagation()"
        >
          <div class="mo-head">
            <div>
              <div class="mo-title" id="mo-title">Mark as onboarded</div>
              <div class="mo-sub">{{ target.candidateName }}</div>
            </div>
            <button
              class="mo-close"
              type="button"
              aria-label="Close"
              (click)="closeOnboardModal()"
            >
              <i class="ti ti-x"></i>
            </button>
          </div>

          @if (onboardError()) {
            <div class="mo-error" role="alert">
              <i class="ti ti-alert-circle"></i> {{ onboardError() }}
            </div>
          }

          <form (ngSubmit)="submitOnboard()" novalidate>
            <div class="mo-grid">
              <div class="mo-field">
                <label for="mo-empno">Employee number *</label>
                <input
                  id="mo-empno"
                  name="externalEmployeeId"
                  type="text"
                  maxlength="50"
                  [(ngModel)]="onboardForm.externalEmployeeId"
                />
                @if (fieldError('externalEmployeeId'); as err) {
                  <div class="mo-field-error">{{ err }}</div>
                }
              </div>

              <div class="mo-field">
                <label for="mo-start">Start date *</label>
                <input
                  id="mo-start"
                  name="hireDate"
                  type="date"
                  [(ngModel)]="onboardForm.hireDate"
                />
                @if (fieldError('hireDate'); as err) {
                  <div class="mo-field-error">{{ err }}</div>
                }
              </div>

              <div class="mo-field">
                <label for="mo-title-input">Job title *</label>
                <input
                  id="mo-title-input"
                  name="jobTitle"
                  type="text"
                  maxlength="100"
                  [(ngModel)]="onboardForm.jobTitle"
                />
                <div class="mo-hint">Pre-filled from the vacancy</div>
                @if (fieldError('jobTitle'); as err) {
                  <div class="mo-field-error">{{ err }}</div>
                }
              </div>

              <div class="mo-field">
                <label for="mo-dept">Department *</label>
                <select
                  id="mo-dept"
                  name="departmentId"
                  [(ngModel)]="onboardForm.departmentId"
                >
                  <option [ngValue]="null" disabled>Select a department</option>
                  @for (d of deptOptions(); track d.id) {
                    <option [ngValue]="d.id">{{ d.name }}</option>
                  }
                </select>
                @if (vacancy()?.departmentId) {
                  <div class="mo-hint">Pre-filled from the vacancy</div>
                }
                @if (fieldError('departmentId'); as err) {
                  <div class="mo-field-error">{{ err }}</div>
                }
              </div>

              <div class="mo-field mo-span">
                <label for="mo-email">Work email *</label>
                <input
                  id="mo-email"
                  name="workEmail"
                  type="email"
                  maxlength="150"
                  [(ngModel)]="onboardForm.workEmail"
                />
                <div class="mo-hint">
                  This becomes their login. Their current email is kept as a
                  personal email, and they must change their password at first
                  sign-in.
                </div>
                @if (fieldError('workEmail'); as err) {
                  <div class="mo-field-error">{{ err }}</div>
                }
              </div>
            </div>

            <div class="mo-actions">
              <button
                type="button"
                class="mo-cancel"
                (click)="closeOnboardModal()"
                [disabled]="onboardSaving()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn-primary"
                [disabled]="onboardSaving()"
              >
                @if (onboardSaving()) {
                  <mat-spinner
                    diameter="14"
                    style="display:inline-block;margin-right:6px"
                  ></mat-spinner>
                  Saving…
                } @else {
                  Mark as onboarded
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <style>
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-muted);
        font-size: 13px;
        margin-bottom: 14px;
      }
      .back-link:hover {
        color: var(--navy);
      }
      .vp-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 18px;
        gap: 12px;
        flex-wrap: wrap;
      }
      .vp-title {
        font-size: 20px;
        font-weight: 800;
        color: var(--text);
      }
      .vp-sub {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 3px;
      }
      .vp-filters {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .vp-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .vp-tab {
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 7px 14px;
        font-size: 12px;
        background: #fff;
        color: var(--text-muted);
        cursor: pointer;
        font-family: inherit;
      }
      .vp-tab.active {
        border-color: rgba(0, 0, 0, 0.3);
        color: var(--text);
        font-weight: 700;
        background: var(--surface-2);
      }
      .vp-table-wrap {
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
      }
      .vp-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .vp-table thead tr {
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
      }
      .vp-table th {
        text-align: left;
        padding: 10px 16px;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .vp-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
      }
      .vp-table tr:last-child td {
        border-bottom: none;
      }
      .vp-row {
        cursor: pointer;
        transition: background 0.15s;
      }
      .vp-row:hover {
        background: var(--surface-2);
      }
      .vp-name {
        font-weight: 700;
        color: var(--text);
      }
      .vp-muted {
        color: var(--text-muted);
      }
      .vp-action-btn {
        padding: 7px 14px;
        font-size: 12px;
      }
      .vp-fit-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        padding: 4px 8px;
        border-radius: 20px;
        background: #f3e9ff;
        color: #6a1b9a;
        font-weight: 700;
        font-size: 12px;
        cursor: help;
      }
      .btn-primary.vp-action-btn {
        width: 200px;
        justify-content: center;
      }
      .app-title-link,
      .app-title-link:visited {
        color: inherit;
        text-decoration: none;
      }

      /* ── Mark as onboarded modal ── */
      .mo-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .mo-dialog {
        background: #fff;
        border-radius: 14px;
        width: min(560px, 100%);
        max-height: 90vh;
        overflow: auto;
        padding: 20px 24px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      }
      .mo-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 14px;
      }
      .mo-title {
        font-size: 18px;
        font-weight: 800;
        color: var(--text);
      }
      .mo-sub {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .mo-close {
        border: none;
        background: none;
        cursor: pointer;
        font-size: 18px;
        color: var(--text-muted);
      }
      .mo-error {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 13px;
        background: #fdecea;
        color: #b3261e;
      }
      .mo-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .mo-span {
        grid-column: span 2;
      }
      .mo-field label {
        display: block;
        margin-bottom: 4px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .mo-field input,
      .mo-field select {
        width: 100%;
        box-sizing: border-box;
        padding: 9px 10px;
        font: inherit;
        font-size: 13px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
      }
      .mo-field input:focus,
      .mo-field select:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .mo-hint {
        margin-top: 3px;
        font-size: 11px;
        color: var(--text-muted);
      }
      .mo-field-error {
        margin-top: 3px;
        font-size: 12px;
        color: #b3261e;
      }
      .mo-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 18px;
      }
      .mo-cancel {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 8px 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      @media (max-width: 520px) {
        .mo-grid {
          grid-template-columns: 1fr;
        }
        .mo-span {
          grid-column: span 1;
        }
      }
    </style>
  `,
})
export class VacancyApplicationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyAdminService);
  private prescreeningService = inject(PrescreeningService);
  private interviewService = inject(InterviewService);
  private offerLetterService = inject(OfferLetterService);
  private toast = inject(ToastService);
  private location = inject(Location);
  private matchingService = inject(TalentPoolMatchingService);

  vacancyId!: number;
  vacancy = signal<VacancyResponse | null>(null);
  applications = signal<ApplicationResponse[]>([]);
  loading = signal(true);

  searchQ = '';
  activeTab = signal<TabKey>('all');

  prescreeningPassed = signal<Set<number>>(new Set());
  prescreeningSubmitted = signal<Set<number>>(new Set());
  maxRoundsReached = signal<Set<number>>(new Set());
  interviewSubState = signal<Map<number, InterviewSubState>>(new Map());
  offerStatusByApp = signal<Map<number, string>>(new Map());

  // ── AI applicant ranking (Phase 2) - Applied candidates only ─────
  ranking = signal(false);
  rankedMatches = signal<Map<number, AiTalentPoolMatchResponse>>(new Map()); // keyed by candidateId
  lastRankedAt = signal<string | null>(null);

  employeeIdByApp = signal<Map<number, number>>(new Map());
  awaitingIds = signal<Set<number> | null>(null);
  onboardTarget = signal<ApplicationResponse | null>(null);
  onboardSaving = signal(false);
  onboardError = signal<string | null>(null);
  onboardSubmitted = signal(false);
  departments = signal<DepartmentOption[]>([]);
  onboardForm = {
    externalEmployeeId: '',
    hireDate: '',
    jobTitle: '',
    departmentId: null as number | null,
    workEmail: '',
  };

  appliedCount = computed(
    () => this.applications().filter((a) => a.status === 'Applied').length,
  );

  ngOnInit(): void {
    this.vacancyId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.vacancyService.getById(this.vacancyId).subscribe({
      next: (v) => {
        this.vacancy.set(v);
        if (v.status === 'Published') this.loadExistingRanking();
      },
      error: (err: Error) => this.toast.show(err.message, 'error'),
    });

    this.appService.getByVacancy(this.vacancyId).subscribe({
      next: (apps) => {
        this.applications.set(
          [...apps].sort(
            (a, b) =>
              new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime(),
          ),
        );
        this.loading.set(false);
        this.seedEmployeeIds(apps);
        this.loadOnboardingState(apps);
        this.enrich(apps);
      },
      error: (err: Error) => {
        this.toast.show(err.message, 'error');
        this.loading.set(false);
      },
    });
  }

  private seedEmployeeIds(apps: ApplicationResponse[]): void {
    const m = new Map<number, number>();
    (apps as ApplicationWithEmployee[]).forEach((a) => {
      if (a.employeeId) m.set(a.applicationId, a.employeeId);
    });
    this.employeeIdByApp.set(m);
  }

  private loadOnboardingState(apps: ApplicationResponse[]): void {
    if (!apps.some((a) => a.status === 'Hired')) {
      this.awaitingIds.set(new Set());
      return;
    }
    this.http
      .get<AwaitingOnboardingItem[]>(
        `${environment.apiUrl}/employees/awaiting-onboarding`,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((items) =>
        this.awaitingIds.set(
          items ? new Set(items.map((i) => i.applicationId)) : null,
        ),
      );
  }

  isOnboarded(a: ApplicationResponse): boolean {
    if (this.employeeIdByApp().has(a.applicationId)) return true;
    const awaiting = this.awaitingIds();
    return awaiting !== null && !awaiting.has(a.applicationId);
  }

  // Loads any previous ranking without re-running AI, so navigating back to
  // this page later still shows the last ranked batch and re-sorts by it.
  private loadExistingRanking(): void {
    this.matchingService.getMatches(this.vacancyId, 'FullRanking').subscribe({
      next: (matches) => {
        if (!matches.length) return;
        const map = new Map(matches.map((m) => [m.candidateId, m]));
        this.rankedMatches.set(map);
        this.lastRankedAt.set(matches[0]?.computedAt ?? null);
        this.resortByRanking();
      },
      error: () => {}, // no ranking yet is a normal state
    });
  }

  rankCandidates(): void {
    if (this.ranking()) return;
    this.ranking.set(true);
    this.matchingService.rankApplicants(this.vacancyId).subscribe({
      next: (result) => {
        const map = new Map(result.matches.map((m) => [m.candidateId, m]));
        this.rankedMatches.set(map);
        this.lastRankedAt.set(result.rankedAt);
        this.resortByRanking();
        this.ranking.set(false);
        this.toast.show(
          result.matches.length
            ? `Ranked ${result.matches.length} new applicant${result.matches.length === 1 ? '' : 's'} by AI fit.`
            : 'No newly-applied candidates to rank for this vacancy.',
          result.matches.length ? 'success' : 'warn',
        );
      },
      error: (err: Error) => {
        this.ranking.set(false);
        this.toast.show(err.message, 'error');
      },
    });
  }

  // Re-sorts by AI score (highest first) once a ranking exists; candidates
  // with no score (anyone past "Applied", since only fresh applicants are
  // ranked) sink to the bottom rather than being hidden.
  private resortByRanking(): void {
    const map = this.rankedMatches();
    this.applications.update((list) =>
      [...list].sort((a, b) => {
        const scoreA = map.get(a.candidateId)?.score ?? -1;
        const scoreB = map.get(b.candidateId)?.score ?? -1;
        return scoreB - scoreA;
      }),
    );
  }

  private enrich(apps: ApplicationResponse[]): void {
    const preToCheck = apps.filter((a) => a.status === 'PrescreeningStage');
    if (preToCheck.length) {
      forkJoin(
        preToCheck.map((a) =>
          this.prescreeningService
            .getByApplication(a.applicationId)
            .pipe(catchError(() => of(null))),
        ),
      ).subscribe((results) => {
        const passed = new Set<number>();
        const submitted = new Set<number>();
        preToCheck.forEach((a, i) => {
          const r = results[i];
          if (r?.outcome === 'Passed') passed.add(a.applicationId);
          else if (r?.status === 'Submitted') submitted.add(a.applicationId);
        });
        this.prescreeningPassed.set(passed);
        this.prescreeningSubmitted.set(submitted);
      });
    }

    const ivToCheck = apps.filter((a) => a.status === 'InterviewStage');
    if (ivToCheck.length) {
      forkJoin(
        ivToCheck.map((a) =>
          this.interviewService
            .getByApplication(a.applicationId)
            .pipe(catchError(() => of([] as InterviewResponse[]))),
        ),
      ).subscribe((interviewResults) => {
        const exhausted = new Set<number>();
        ivToCheck.forEach((a, i) => {
          const interviews = interviewResults[i];
          if (!interviews.length) return;
          const latest = [...interviews].sort(
            (x, y) => y.roundNumber - x.roundNumber,
          )[0];

          if (
            latest.status === 'Completed' &&
            latest.outcome === 'Passed' &&
            latest.roundNumber >= MAX_INTERVIEW_ROUNDS
          ) {
            exhausted.add(a.applicationId);
          }

          if (latest.status === 'Scheduled') {
            this.interviewService
              .getRescheduleHistory(latest.interviewId)
              .pipe(catchError(() => of([])))
              .subscribe((history) => {
                const map = new Map(this.interviewSubState());
                map.set(
                  a.applicationId,
                  history.length
                    ? {
                        label: 'Rescheduled',
                        detail: `Round ${latest.roundNumber} now ${this.formatDateTime(latest.scheduledAt)}`,
                      }
                    : {
                        label: 'Upcoming',
                        detail: `Scheduled for ${this.formatDateTime(latest.scheduledAt)}`,
                      },
                );
                this.interviewSubState.set(map);
              });
          } else if (
            latest.status === 'Completed' &&
            latest.outcome === 'Passed'
          ) {
            const map = new Map(this.interviewSubState());
            map.set(a.applicationId, {
              label: 'Passed',
              detail: `Round ${latest.roundNumber} passed`,
            });
            this.interviewSubState.set(map);
          }
        });
        this.maxRoundsReached.set(exhausted);
      });
    }

    const offerToCheck = apps.filter((a) => a.status === 'OfferExtended');
    if (offerToCheck.length) {
      const ids = offerToCheck.map((a) => a.applicationId);
      this.offerLetterService.preload(ids).subscribe(() => {
        const map = new Map<number, string>();
        ids.forEach((id) => {
          const status = this.offerLetterService.peek(id)?.status;
          if (status) map.set(id, status);
        });
        this.offerStatusByApp.set(map);
      });
    }
  }

  private tabKeyFor(status: string): TabKey {
    if (status === 'Applied' || status === 'UnderReview') return 'review';
    if (status === 'Shortlisted' || status === 'PrescreeningStage')
      return 'prescreen';
    if (status === 'InterviewStage') return 'interview';
    if (status === 'OfferExtended') return 'offer';
    if (status === 'Hired') return 'hired';
    return 'all';
  }

  tabs = computed(() => {
    const apps = this.applications();
    const count = (key: TabKey) =>
      apps.filter((a) => this.tabKeyFor(a.status) === key).length;
    return [
      { key: 'all' as TabKey, label: 'All', count: apps.length },
      { key: 'review' as TabKey, label: 'Review', count: count('review') },
      {
        key: 'prescreen' as TabKey,
        label: 'Pre-screening',
        count: count('prescreen'),
      },
      {
        key: 'interview' as TabKey,
        label: 'Interview',
        count: count('interview'),
      },
      { key: 'offer' as TabKey, label: 'Offer', count: count('offer') },
      { key: 'hired' as TabKey, label: 'Hired', count: count('hired') },
    ];
  });

  filteredApplications = computed(() => {
    const q = this.searchQ.trim().toLowerCase();
    const tab = this.activeTab();
    return this.applications().filter((a) => {
      const matchesTab = tab === 'all' || this.tabKeyFor(a.status) === tab;
      const matchesSearch = !q || a.candidateName.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  });

  statusClass(s: string): string {
    return sharedStatusClass(s);
  }

  statusLabel(a: ApplicationResponse): string {
    const base = sharedStatusLabel(a.status);
    if (a.status === 'InterviewStage') {
      const sub = this.interviewSubState().get(a.applicationId);
      return sub ? `Interview \u00b7 ${sub.label}` : base;
    }
    if (a.status === 'OfferExtended') {
      const status = this.offerStatusByApp().get(a.applicationId);
      if (status === 'Accepted') return 'Offer \u00b7 Accepted';
      if (status === 'Declined') return 'Offer \u00b7 Declined';
      return 'Offer \u00b7 Awaiting response';
    }
    if (a.status === 'Hired') {
      return this.isOnboarded(a)
        ? 'Hired \u00b7 Onboarded'
        : 'Hired \u00b7 Awaiting onboarding';
    }
    return base;
  }

  offerDetail(a: ApplicationResponse): string {
    const status = this.offerStatusByApp().get(a.applicationId);
    if (status === 'Accepted') return 'Candidate accepted the offer';
    if (status === 'Declined') return 'Candidate declined the offer';
    return 'Awaiting candidate response';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  goBack(): void {
    this.location.back();
  }
  openHistory(a: ApplicationResponse): void {
    this.router.navigate(['/admin/applications', a.applicationId, 'history']);
  }
  openReview(a: ApplicationResponse): void {
    if (a.status === 'Applied') {
      this.appService
        .updateStatus(a.applicationId, { newStatus: 'UnderReview' })
        .subscribe({
          next: () =>
            this.router.navigate(['/applications/review', a.applicationId], {
              queryParams: { vacancyId: this.vacancyId },
            }),
          error: (err: Error) => this.toast.show(err.message, 'error'),
        });
    } else {
      this.router.navigate(['/applications/review', a.applicationId], {
        queryParams: { vacancyId: this.vacancyId },
      });
    }
  }
  openPreScreeningReview(a: ApplicationResponse): void {
    this.router.navigate(['/admin/applications', a.applicationId]);
  }
  scheduleInterview(a: ApplicationResponse): void {
    this.router.navigate(
      ['/applications', a.applicationId, 'schedule-interview'],
      { queryParams: { vacancyId: this.vacancyId } },
    );
  }
  openOfferLetter(a: ApplicationResponse): void {
    this.router.navigate(['/admin/applications', a.applicationId, 'offer'], {
      queryParams: { vacancyId: this.vacancyId },
    });
  }

  // ── Mark as onboarded modal ──────────────────────────────────────

  openOnboardModal(a: ApplicationResponse): void {
    const v = this.vacancy();
    this.onboardForm = {
      externalEmployeeId: '',
      hireDate: '',
      jobTitle: v?.title ?? '',
      departmentId: v?.departmentId ?? null,
      workEmail: '',
    };
    this.onboardSubmitted.set(false);
    this.onboardError.set(null);
    this.onboardTarget.set(a);
  }

  closeOnboardModal(): void {
    if (this.onboardSaving()) return;
    this.onboardTarget.set(null);
  }

  // Falls back to one option so the pre-filled vacancy department still shows
  // until a real department lookup is wired in.
  deptOptions(): DepartmentOption[] {
    const list = this.departments();
    const id = this.onboardForm.departmentId;
    if (id !== null && !list.some((d) => d.id === id)) {
      return [...list, { id, name: 'Vacancy department' }];
    }
    return list;
  }

  // Rules mirror the backend OnboardingCompleteRequest.
  fieldError(name: OnboardField): string | null {
    if (!this.onboardSubmitted()) return null;
    const f = this.onboardForm;
    switch (name) {
      case 'externalEmployeeId': {
        const v = f.externalEmployeeId.trim();
        return !v
          ? 'Enter the employee number.'
          : v.length > 50
            ? 'Maximum 50 characters.'
            : null;
      }
      case 'hireDate':
        return f.hireDate ? null : 'Choose a start date.';
      case 'jobTitle': {
        const v = f.jobTitle.trim();
        return !v
          ? 'Enter the job title.'
          : v.length > 100
            ? 'Maximum 100 characters.'
            : null;
      }
      case 'departmentId':
        return f.departmentId !== null ? null : 'Select a department.';
      case 'workEmail': {
        const v = f.workEmail.trim();
        return !EMAIL_RE.test(v)
          ? 'Enter a valid work email.'
          : v.length > 150
            ? 'Maximum 150 characters.'
            : null;
      }
    }
  }

  private onboardHasErrors(): boolean {
    const names: OnboardField[] = [
      'externalEmployeeId',
      'hireDate',
      'jobTitle',
      'departmentId',
      'workEmail',
    ];
    return names.some((n) => !!this.fieldError(n));
  }

  submitOnboard(): void {
    const target = this.onboardTarget();
    if (!target || this.onboardSaving()) return; // double-click guard
    this.onboardSubmitted.set(true);
    if (this.onboardHasErrors()) return;

    const f = this.onboardForm;
    this.onboardSaving.set(true);
    this.onboardError.set(null);

    this.http
      .post<OnboardingCompleteResponse>(
        `${environment.apiUrl}/employees/onboarding-complete`,
        {
          sourceApplicationId: target.applicationId,
          externalEmployeeId: f.externalEmployeeId.trim(),
          workEmail: f.workEmail.trim(),
          hireDate: f.hireDate,
          jobTitle: f.jobTitle.trim(),
          departmentId: f.departmentId,
        },
      )
      .subscribe({
        next: (r) => {
          const m = new Map(this.employeeIdByApp());
          m.set(target.applicationId, r.employeeId);
          this.employeeIdByApp.set(m);
          this.onboardSaving.set(false);
          this.onboardTarget.set(null);
          this.toast.show(
            r.alreadyOnboarded
              ? `${target.candidateName} was already onboarded.`
              : `${target.candidateName} onboarded. They now sign in with ${r.loginEmail}.`,
            'success',
          );
        },
        error: (err) => {
          this.onboardSaving.set(false);
          this.onboardError.set(this.onboardErrorMessage(err));
        },
      });
  }

  private onboardErrorMessage(err: any): string {
    const e = err?.error;
    if (e?.message) return e.message;
    if (e?.errors) {
      const first = (Object.values(e.errors) as unknown[]).flat()[0];
      if (first) return String(first);
    }
    return err?.message ?? 'Could not mark as onboarded. Try again.';
  }

  openEmployee(employeeId: number): void {
    this.router.navigate(['/admin/employees', employeeId]); // ASSUMPTION: HR profile route, built later
  }
}
