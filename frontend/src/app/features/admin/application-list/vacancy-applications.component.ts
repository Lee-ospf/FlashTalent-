import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
type TabKey = 'all' | 'review' | 'prescreen' | 'interview' | 'offer';
interface InterviewSubState {
  label: string;
  detail: string;
}

@Component({
  selector: 'app-vacancy-applications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <a (click)="goBack()" class="back-link" style="cursor:pointer">
        <i class="ti ti-arrow-left"></i> Back to Applications
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
              <button class="btn-primary" (click)="rankCandidates()" [disabled]="ranking() || !appliedCount()">
                @if (ranking()) {
                  <mat-spinner diameter="14" style="display:inline-block;margin-right:6px"></mat-spinner> Ranking…
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
            <i class="ti ti-sparkles"></i> Applied candidates sorted by AI fit score{{ lastRankedAt() ? ' — ranked ' + formatDateTime(lastRankedAt()!) : '' }}.
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
                  <tr class="vp-row" (click)="openHistory(a)">
                    <td class="vp-name">{{ a.candidateName }}</td>
                    @if (rankedMatches().size > 0) {
                      <td (click)="$event.stopPropagation()">
                        @if (rankedMatches().get(a.candidateId); as m) {
                          <span class="vp-fit-badge" [title]="m.reasoning">{{ m.score }}</span>
                        } @else {
                          <span class="vp-muted">—</span>
                        }
                      </td>
                    }
                    <td class="vp-muted">{{ formatDate(a.appliedAt) }}</td>
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
                            <span class="form-note"
                              ><i class="ti ti-hourglass"></i> Waiting for
                              pre-screening form from candidate</span
                            >
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
                          <span class="form-note"
                            ><i class="ti ti-mail"></i>
                            {{ offerDetail(a) }}</span
                          >
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
    </style>
  `,
})
export class VacancyApplicationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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

  appliedCount = computed(() => this.applications().filter(a => a.status === 'Applied').length);

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
        this.enrich(apps);
      },
      error: (err: Error) => {
        this.toast.show(err.message, 'error');
        this.loading.set(false);
      },
    });
  }

  // Loads any previous ranking without re-running AI, so navigating back to
  // this page later still shows the last ranked batch and re-sorts by it.
  private loadExistingRanking(): void {
    this.matchingService.getMatches(this.vacancyId, 'FullRanking').subscribe({
      next: matches => {
        if (!matches.length) return;
        const map = new Map(matches.map(m => [m.candidateId, m]));
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
      next: result => {
        const map = new Map(result.matches.map(m => [m.candidateId, m]));
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
      error: (err: Error) => { this.ranking.set(false); this.toast.show(err.message, 'error'); },
    });
  }

  // Re-sorts by AI score (highest first) once a ranking exists; candidates
  // with no score (anyone past "Applied", since only fresh applicants are
  // ranked) sink to the bottom rather than being hidden.
  private resortByRanking(): void {
    const map = this.rankedMatches();
    this.applications.update(list =>
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
}