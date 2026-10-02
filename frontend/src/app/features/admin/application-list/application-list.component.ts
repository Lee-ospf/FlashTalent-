import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApplicationService } from '../../../core/services/application.service';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrescreeningService } from '../../../core/services/prescreening.service';
import { InterviewService } from '../../../core/services/interview.service';
import { ApplicationResponse } from '../../../core/models';
import {
  statusLabel as sharedStatusLabel,
  statusClass as sharedStatusClass,
  ApplicationStatusKey,
  getValidNextStatuses,
} from '../../../core/utils/application-status';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import { RouterLink } from '@angular/router';
// Must stay in sync with backend InterviewService.MaxRounds
const MAX_INTERVIEW_ROUNDS = 5;

interface VacancyGroup {
  vacancyId: number;
  vacancyTitle: string;
  applications: ApplicationResponse[]; // sorted oldest-first (submission order)
}

type QuickFilterKey =
  | 'awaiting-review'
  | 'needs-prescreening-sent'
  | 'awaiting-prescreening'
  | 'ready-to-schedule'
  | 'awaiting-response';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-chart-arrows-vertical"></i> Manage Applications
          </h2>
          <p class="page-sub">
            Move candidates through the recruitment pipeline, grouped by vacancy
          </p>
        </div>
      </div>

      @if (!loading()) {
        <!-- Metrics -->
        <div
          class="metrics-grid"
          style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px"
        >
          <div class="metric-card summary-only">
            <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
              <i class="ti ti-send"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ totalApplications() }}</div>
              <div class="metric-label">Total Applications</div>
            </div>
          </div>

          @for (qf of quickFilters(); track qf.key) {
            <div
              class="metric-card clickable"
              [class.active]="activeQuickFilter() === qf.key"
              [class.zero]="qf.count === 0"
              (click)="applyQuickFilter(qf.key)"
            >
              <div
                class="metric-icon"
                [style.background]="qf.bg"
                [style.color]="qf.fg"
              >
                <i class="ti" [class]="qf.icon"></i>
              </div>
              <div class="metric-body">
                <div class="metric-val">{{ qf.count }}</div>
                <div class="metric-label">{{ qf.label }}</div>
              </div>
            </div>
          }
        </div>

        @if (activeQuickFilter()) {
          <div
            class="info-banner"
            style="cursor:pointer"
            (click)="clearQuickFilter()"
          >
            <i class="ti ti-filter"></i>
            <span
              >Showing: {{ activeQuickFilterLabel() }} — click to clear</span
            >
          </div>
        }
        <!-- Search + filters -->
        <div class="filters-row">
          <div class="search-wrap" style="flex:1;min-width:220px; height: 56px">
            <i class="ti ti-search search-icon"></i>
            <input
              [(ngModel)]="searchQ"
              type="search"
              class="search-input"
              placeholder="Search forvacancy…"
            />
          </div>
        </div>
      }
      <div #resultsAnchor></div>
      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!rawGroups().length || !totalApplications()) {
        <div class="empty-state">
          <i class="ti ti-inbox"></i>
          <p>No applications yet.</p>
        </div>
      } @else if (!filteredGroups.length) {
        <div class="empty-state">
          <i class="ti ti-zoom-question"></i>
          <p>No applications match your filters.</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:16px">
          @for (group of filteredGroups; track group.vacancyId) {
            <mat-card class="mat-elevation-z1 vlist-card">
              <!-- Vacancy group header -->
              <div class="vlist-header" (click)="toggleGroup(group.vacancyId)">
                <div class="vlist-header-main">
                  <div class="vlist-title">{{ group.vacancyTitle }}</div>
                  <div class="vlist-ref">
                    {{ group.applications.length }} application{{
                      group.applications.length !== 1 ? 's' : ''
                    }}
                  </div>
                </div>
                <div class="vlist-header-right">
                  <button
                    class="btn-primary vp-action-btn"
                    matTooltip="Open vacancy applications view"
                    (click)="
                      $event.stopPropagation();
                      goToVacancyApplications(group.vacancyId)
                    "
                  >
                    <i class="ti ti-external-link"></i>Go to Applications
                  </button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      }
    </div>

    <style>
      .app-row-open {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        font-size: 12px;
        text-decoration: none;
        flex-shrink: 0;
      }

      .filters-row {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }

      /* ── Vacancy group card (plain style, matches vacancy detail) ── */
      .vlist-card {
        border-radius: 14px !important;
        overflow: hidden;
      }
      .vlist-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 22px;
        cursor: pointer;
        user-select: none;
        background: #fff;
        transition: background 0.15s;
      }
      .vlist-header:hover {
        background: var(--surface-2);
      }
      .vlist-header-main {
        min-width: 0;
        flex: 1;
      }
      .vlist-breakdown {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .vgroup-chevron {
        font-size: 16px;
        color: var(--text-muted);
        transition: transform 0.2s;
        flex-shrink: 0;
      }
      .vgroup-chevron.open {
        transform: rotate(180deg);
      }
      .app-title-link {
        text-decoration: none;
        color: inherit;
        cursor: pointer;
      }
      .app-title-link:hover {
        text-decoration: underline;
        color: var(--navy);
      }
    </style>
  `,
})
export class ApplicationListComponent implements OnInit {
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyAdminService);
  private toast = inject(ToastService);
  private prescreeningService = inject(PrescreeningService);
  private interviewService = inject(InterviewService);
  private offerLetterService = inject(OfferLetterService);
  offerAccepted = signal<Set<number>>(new Set());
  private router = inject(Router);

  private matchesQuickFilter(
    a: ApplicationResponse,
    key: QuickFilterKey,
  ): boolean {
    switch (key) {
      case 'awaiting-review':
        return a.status === 'Applied' || a.status === 'UnderReview';
      case 'needs-prescreening-sent':
        return a.status === 'Shortlisted';
      case 'awaiting-prescreening':
        return (
          a.status === 'PrescreeningStage' &&
          !this.prescreeningPassed().has(a.applicationId)
        );
      case 'ready-to-schedule':
        return (
          a.status === 'PrescreeningStage' &&
          this.prescreeningPassed().has(a.applicationId)
        );
      case 'awaiting-response':
        return (
          a.status === 'OfferExtended' &&
          !this.offerAccepted().has(a.applicationId)
        );
    }
  }

  applyQuickFilter(key: QuickFilterKey): void {
    if (this.activeQuickFilter() === key) {
      this.clearQuickFilter();
      return;
    }
    this.searchQ = '';
    this.vacancyFilter = '';
    this.statusFilter = '';
    this.activeQuickFilter.set(key);

    const matchingGroupIds = this.rawGroups()
      .filter((g) =>
        g.applications.some((a) => this.matchesQuickFilter(a, key)),
      )
      .map((g) => g.vacancyId);
    this.expandedIds.set(new Set(matchingGroupIds));

    setTimeout(() =>
      this.resultsAnchor?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      }),
    );
  }

  clearQuickFilter(): void {
    this.activeQuickFilter.set(null);
    this.expandedIds.set(
      new Set(
        this.rawGroups()
          .filter((g) => g.applications.length > 0)
          .map((g) => g.vacancyId),
      ),
    );
  }

  prescreeningPassed = signal<Set<number>>(new Set());
  maxRoundsReached = signal<Set<number>>(new Set());
  maxRounds = MAX_INTERVIEW_ROUNDS;

  rawGroups = signal<VacancyGroup[]>([]);
  loading = signal(false);

  searchQ = '';
  vacancyFilter: number | '' = '';
  statusFilter: ApplicationStatusKey | '' = '';

  private expandedIds = signal<Set<number>>(new Set());

  allStatuses: ApplicationStatusKey[] = [
    'Applied',
    'UnderReview',
    'Shortlisted',
    'PrescreeningStage',
    'InterviewStage',
    'OfferExtended',
    'Hired',
    'NotSelected',
  ];

  totalApplications = computed(() =>
    this.rawGroups().reduce((sum, g) => sum + g.applications.length, 0),
  );
  pendingReviewCount = computed(() =>
    this.rawGroups().reduce(
      (sum, g) =>
        sum +
        g.applications.filter(
          (a) => a.status === 'Applied' || a.status === 'UnderReview',
        ).length,
      0,
    ),
  );
  goToVacancyApplications(vacancyId: number): void {
    this.router.navigate(['/admin/vacancies', vacancyId, 'applications']);
  }
  vacancyOptions = computed(() =>
    this.rawGroups()
      .filter((g) => g.applications.length > 0)
      .map((g) => ({ id: g.vacancyId, title: g.vacancyTitle })),
  );

  get filteredGroups(): VacancyGroup[] {
    const q = this.searchQ.trim().toLowerCase();
    const vf = this.vacancyFilter;
    const sf = this.statusFilter;
    const qf = this.activeQuickFilter();

    return this.rawGroups()
      .filter((g) => vf === '' || g.vacancyId === vf)
      .map((g) => ({
        ...g,
        applications: g.applications.filter(
          (a) =>
            (!q ||
              a.candidateName.toLowerCase().includes(q) ||
              g.vacancyTitle.toLowerCase().includes(q)) &&
            (!sf || a.status === sf) &&
            (!qf || this.matchesQuickFilter(a, qf)),
        ),
      }))
      .filter((g) => g.applications.length > 0);
  }

  allExpanded = computed(() => {
    const groups = this.filteredGroups;
    return (
      groups.length > 0 &&
      groups.every((g) => this.expandedIds().has(g.vacancyId))
    );
  });
  @ViewChild('resultsAnchor') resultsAnchor?: ElementRef<HTMLElement>;

  activeQuickFilter = signal<QuickFilterKey | null>(null);

  awaitingPrescreeningCount = computed(() =>
    this.rawGroups().reduce(
      (sum, g) =>
        sum +
        g.applications.filter(
          (a) =>
            a.status === 'PrescreeningStage' &&
            !this.prescreeningPassed().has(a.applicationId),
        ).length,
      0,
    ),
  );
  needsPrescreeningSentCount = computed(() =>
    this.rawGroups().reduce(
      (sum, g) =>
        sum + g.applications.filter((a) => a.status === 'Shortlisted').length,
      0,
    ),
  );
  readyToScheduleCount = computed(() =>
    this.rawGroups().reduce(
      (sum, g) =>
        sum +
        g.applications.filter(
          (a) =>
            a.status === 'PrescreeningStage' &&
            this.prescreeningPassed().has(a.applicationId),
        ).length,
      0,
    ),
  );

  awaitingResponseCount = computed(() =>
    this.rawGroups().reduce(
      (sum, g) =>
        sum +
        g.applications.filter(
          (a) =>
            a.status === 'OfferExtended' &&
            !this.offerAccepted().has(a.applicationId),
        ).length,
      0,
    ),
  );
  quickFilters = computed(() => [
    {
      key: 'awaiting-review' as const,
      icon: 'ti-clock',
      bg: '#fff3e0',
      fg: '#e65100',
      label: 'Awaiting review',
      count: this.pendingReviewCount(),
    },
    {
      key: 'needs-prescreening-sent' as const,
      icon: 'ti-send',
      bg: '#ede7f6',
      fg: '#4527a0',
      label: 'Needs pre-screening form sent',
      count: this.needsPrescreeningSentCount(),
    },
    {
      key: 'awaiting-prescreening' as const,
      icon: 'ti-clipboard-list',
      bg: '#fce4ec',
      fg: '#ad1457',
      label: 'Awaiting pre-screening outcome',
      count: this.awaitingPrescreeningCount(),
    },
    {
      key: 'ready-to-schedule' as const,
      icon: 'ti-calendar-plus',
      bg: '#e0f2f1',
      fg: '#00695c',
      label: 'Ready for interview scheduling',
      count: this.readyToScheduleCount(),
    },
    {
      key: 'awaiting-response' as const,
      icon: 'ti-mail',
      bg: '#e8f5e9',
      fg: '#1b5e20',
      label: 'Awaiting candidate response',
      count: this.awaitingResponseCount(),
    },
  ]);

  activeQuickFilterLabel = computed(
    () =>
      this.quickFilters().find((f) => f.key === this.activeQuickFilter())
        ?.label ?? '',
  );
  isExpanded(vacancyId: number): boolean {
    return this.expandedIds().has(vacancyId);
  }

  toggleGroup(vacancyId: number): void {
    const s = new Set(this.expandedIds());
    if (s.has(vacancyId)) {
      s.delete(vacancyId);
    } else {
      s.add(vacancyId);
    }
    this.expandedIds.set(s);
  }

  statusBreakdown(group: VacancyGroup) {
    const counts: Record<string, number> = {};
    for (const a of group.applications) {
      const s = a.status;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }
  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    // No single "get all applications" endpoint exists — fetch every vacancy,
    // then fetch applications per vacancy and group the results.

    this.vacancyService.getAllByStatus().subscribe({
      next: (vacancies) => {
        if (!vacancies.length) {
          this.rawGroups.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(
          vacancies.map((v) => this.appService.getByVacancy(v.vacancyId)),
        ).subscribe({
          next: (results) => {
            const groups: VacancyGroup[] = vacancies.map((v, i) => ({
              vacancyId: v.vacancyId,
              vacancyTitle: v.title,
              applications: [...results[i]].sort(
                (a, b) =>
                  new Date(a.appliedAt).getTime() -
                  new Date(b.appliedAt).getTime(),
              ),
            }));
            this.rawGroups.set(groups);
            this.expandedIds.set(
              new Set(
                groups
                  .filter((g) => g.applications.length > 0)
                  .map((g) => g.vacancyId),
              ),
            );
            this.loading.set(false);

            // Check prescreening outcomes for applications currently in that stage
            const toCheck = groups
              .flatMap((g) => g.applications)
              .filter((a) => a.status === 'PrescreeningStage');

            if (toCheck.length) {
              forkJoin(
                toCheck.map(
                  (a) =>
                    this.prescreeningService
                      .getByApplication(a.applicationId)
                      .pipe(catchError(() => of(null))), // 404 = no prescreening yet, treat as "not passed"
                ),
              ).subscribe((prescreenResults) => {
                const passedIds = toCheck
                  .filter((_, i) => prescreenResults[i]?.outcome === 'Passed')
                  .map((a) => a.applicationId);
                this.prescreeningPassed.set(new Set(passedIds));
              });
            }

            const offerExtendedApps = groups
              .flatMap((g) => g.applications)
              .filter((a) => a.status === 'OfferExtended');

            if (offerExtendedApps.length) {
              const ids = offerExtendedApps.map((a) => a.applicationId);
              this.offerLetterService.preload(ids).subscribe(() => {
                const acceptedIds = ids.filter(
                  (id) =>
                    this.offerLetterService.peek(id)?.status === 'Accepted',
                );
                this.offerAccepted.set(new Set(acceptedIds));
              });
            }

            const interviewStageApps = groups
              .flatMap((g) => g.applications)
              .filter((a) => a.status === 'InterviewStage');

            if (interviewStageApps.length) {
              forkJoin(
                interviewStageApps.map((a) =>
                  this.interviewService
                    .getByApplication(a.applicationId)
                    .pipe(catchError(() => of([]))),
                ),
              ).subscribe((interviewResults) => {
                const exhaustedIds = interviewStageApps
                  .filter((_, i) => {
                    const interviews = interviewResults[i];
                    if (!interviews.length) return false;
                    const hasScheduled = interviews.some(
                      (iv) => iv.status === 'Scheduled',
                    );
                    if (hasScheduled) return false;
                    const latest = [...interviews].sort(
                      (x, y) => y.roundNumber - x.roundNumber,
                    )[0];
                    return (
                      latest.status === 'Completed' &&
                      latest.outcome === 'Passed' &&
                      latest.roundNumber >= MAX_INTERVIEW_ROUNDS
                    );
                  })
                  .map((a) => a.applicationId);
                this.maxRoundsReached.set(new Set(exhaustedIds));
              });
            }

            const allIds = groups
              .flatMap((g) => g.applications)
              .map((a) => a.applicationId);
            this.prescreeningService.preload(allIds).subscribe();
          },
          error: (err: Error) => {
            this.toast.show(err.message, 'error');
            this.loading.set(false);
          },
        });
      },
      error: (err: Error) => {
        this.toast.show(err.message, 'error');
        this.loading.set(false);
      },
    });
  }

  nextOptions(status: string) {
    return getValidNextStatuses(status);
  }
  label(s: string): string {
    return sharedStatusLabel(s);
  }
}
