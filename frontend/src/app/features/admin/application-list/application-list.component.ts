import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  getValidNextStatuses,
  statusLabel as sharedStatusLabel,
  statusClass as sharedStatusClass,
  ApplicationStatusKey,
} from '../../../core/utils/application-status';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

// Must stay in sync with backend InterviewService.MaxRounds
const MAX_INTERVIEW_ROUNDS = 5;

interface VacancyGroup {
  vacancyId: number;
  vacancyTitle: string;
  applications: ApplicationResponse[]; // sorted oldest-first (submission order)
}

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
            <i class="ti ti-chart-arrows-vertical"></i> Manage applications
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
          <div class="metric-card">
            <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
              <i class="ti ti-send"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ totalApplications() }}</div>
              <div class="metric-label">Total applications</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background:#fff3e0;color:#e65100">
              <i class="ti ti-clock"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ pendingReviewCount() }}</div>
              <div class="metric-label">Awaiting review</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20">
              <i class="ti ti-briefcase"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ vacanciesWithApplicants() }}</div>
              <div class="metric-label">Vacancies with applicants</div>
            </div>
          </div>
        </div>

        <!-- Search + filters -->
        <div class="filters-row">
          <div class="search-wrap" style="flex:1;min-width:220px">
            <i class="ti ti-search search-icon"></i>
            <input
              [(ngModel)]="searchQ"
              type="search"
              class="search-input"
              placeholder="Search by candidate or vacancy…"
            />
          </div>

          <mat-form-field
            appearance="outline"
            class="compact-select"
            style="width:200px"
          >
            <mat-label>Vacancy</mat-label>
            <mat-select [(ngModel)]="vacancyFilter">
              <mat-option [value]="''">All vacancies</mat-option>
              @for (v of vacancyOptions(); track v.id) {
                <mat-option [value]="v.id">{{ v.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field
            appearance="outline"
            class="compact-select"
            style="width:180px"
          >
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter">
              <mat-option [value]="''">All statuses</mat-option>
              @for (s of allStatuses; track s) {
                <mat-option [value]="s">{{ label(s) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button
            mat-stroked-button
            style="border-radius:8px;height:56px"
            (click)="toggleExpandAll()"
          >
            <i
              class="ti"
              [class.ti-chevrons-down]="!allExpanded()"
              [class.ti-chevrons-up]="allExpanded()"
            ></i>
            {{ allExpanded() ? 'Collapse all' : 'Expand all' }}
          </button>
        </div>
      }

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
        <div style="display:flex;flex-direction:column;gap:14px">
          @for (group of filteredGroups; track group.vacancyId) {
            <mat-card
              class="mat-elevation-z1"
              style="border-radius:12px;overflow:hidden"
            >
              <!-- Vacancy group header -->
              <div class="vgroup-header" (click)="toggleGroup(group.vacancyId)">
                <i
                  class="ti ti-chevron-down vgroup-chevron"
                  [class.open]="isExpanded(group.vacancyId)"
                ></i>
                <div style="flex:1;min-width:0">
                  <div class="vgroup-title">{{ group.vacancyTitle }}</div>
                  <div class="vgroup-sub">
                    {{ group.applications.length }} application{{
                      group.applications.length !== 1 ? 's' : ''
                    }}
                  </div>
                </div>
                <div
                  style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"
                >
                  @for (row of statusBreakdown(group); track row.status) {
                    <span
                      class="status-pill s-{{ statusClass(row.status) }}"
                      style="font-size:11px"
                      >{{ row.count }} {{ label(row.status) }}</span
                    >
                  }
                </div>
              </div>

              @if (isExpanded(group.vacancyId)) {
                <div style="padding:4px 20px 16px">
                  @for (
                    a of group.applications;
                    track a.applicationId;
                    let i = $index
                  ) {
                    <div class="app-row">
                      <div class="app-rank" [matTooltip]="'Submission order'">
                        #{{ i + 1 }}
                      </div>
                      <div
                        class="app-icon-wrap"
                        [class]="'app-icon-' + statusClass(a.status)"
                      >
                        <i class="ti ti-user"></i>
                      </div>
                      <div class="app-main">
                        <div class="app-title">{{ a.candidateName }}</div>
                        <div class="app-sub">
                          Applied {{ formatDate(a.appliedAt)
                          }}{{ i === 0 ? ' · First to apply' : '' }}
                        </div>
                      </div>
                      <span class="status-pill s-{{ statusClass(a.status) }}">{{
                        label(a.status)
                      }}</span>

                      <div
                        style="display:flex;align-items:center;gap:8px;margin-left:12px"
                      >
                        @switch (a.status) {
                          @case ('Applied') {
                            <button
                              mat-stroked-button
                              style="border-radius:8px"
                              (click)="openReview(a, group.vacancyId)"
                            >
                              <i class="ti ti-eye"></i> Review
                            </button>
                          }

                          @case ('UnderReview') {
                            <button
                              mat-stroked-button
                              style="border-radius:8px"
                              (click)="openReview(a, group.vacancyId)"
                            >
                              <i class="ti ti-eye"></i> Continue Review
                            </button>
                          }

                          @case ('Shortlisted') {
                            <button
                              mat-stroked-button
                              style="border-radius:8px"
                              (click)="sendPreScreening(a)"
                            >
                              <i class="ti ti-clipboard-list"></i> Send
                              Pre-Screening
                            </button>
                          }

                          @case ('PrescreeningStage') {
                            @if (prescreeningPassed().has(a.applicationId)) {
                              <button
                                mat-stroked-button
                                style="border-radius:8px"
                                (click)="scheduleInterview(a, group.vacancyId)"
                              >
                                <i class="ti ti-calendar-event"></i> Schedule
                                Interview
                              </button>
                            } @else {
                              <span class="form-note">
                                <i class="ti ti-clock"></i> Awaiting
                                pre-screening outcome
                              </span>
                            }
                          }

                          @case ('InterviewStage') {
                            @if (maxRoundsReached().has(a.applicationId)) {
                              <span
                                class="form-note"
                                [matTooltip]="
                                  'All ' +
                                  maxRounds +
                                  ' interview rounds passed — move this application forward manually'
                                "
                              >
                                <i class="ti ti-flag-check"></i> Final round
                                completed
                              </span>
                            } @else {
                              <button
                                mat-stroked-button
                                style="border-radius:8px"
                                (click)="scheduleInterview(a, group.vacancyId)"
                              >
                                <i class="ti ti-calendar-event"></i> view
                                Interview
                              </button>
                            }
                          }

                          @case ('OfferExtended') {
                            <span class="form-note">
                              <i class="ti ti-clock"></i> Awaiting candidate
                              response
                            </span>
                          }

                          @default {
                            <span class="form-note">
                              <i class="ti ti-lock"></i> Final stage
                            </span>
                          }
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </mat-card>
          }
        </div>
      }
    </div>
  `,
})
export class ApplicationListComponent implements OnInit {
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyAdminService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private prescreeningService = inject(PrescreeningService);
  private interviewService = inject(InterviewService);

  prescreeningPassed = signal<Set<number>>(new Set());
  maxRoundsReached = signal<Set<number>>(new Set());
  maxRounds = MAX_INTERVIEW_ROUNDS;

  rawGroups = signal<VacancyGroup[]>([]);
  loading = signal(false);
  updatingId = signal<number | null>(null);
  pendingStatus: Record<number, ApplicationStatusKey | ''> = {};

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
  vacanciesWithApplicants = computed(
    () => this.rawGroups().filter((g) => g.applications.length > 0).length,
  );

  vacancyOptions = computed(() =>
    this.rawGroups()
      .filter((g) => g.applications.length > 0)
      .map((g) => ({ id: g.vacancyId, title: g.vacancyTitle })),
  );

  get filteredGroups(): VacancyGroup[] {
    const q = this.searchQ.trim().toLowerCase();
    const vf = this.vacancyFilter;
    const sf = this.statusFilter;

    return this.rawGroups()
      .filter((g) => vf === '' || g.vacancyId === vf)
      .map((g) => ({
        ...g,
        applications: g.applications.filter(
          (a) =>
            (!q ||
              a.candidateName.toLowerCase().includes(q) ||
              g.vacancyTitle.toLowerCase().includes(q)) &&
            (!sf || a.status === sf),
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

  statusBreakdown(group: VacancyGroup) {
    const counts: Record<string, number> = {};
    for (const a of group.applications)
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

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

            // Check whether applications currently in InterviewStage have
            // exhausted all rounds (last round Completed + Passed at MaxRounds),
            // so we don't send the recruiter into a form that only fails server-side.
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

  toggleExpandAll(): void {
    if (this.allExpanded()) {
      this.expandedIds.set(new Set());
    } else {
      this.expandedIds.set(
        new Set(this.filteredGroups.map((g) => g.vacancyId)),
      );
    }
  }

  nextOptions(status: string) {
    return getValidNextStatuses(status);
  }
  label(s: string): string {
    return sharedStatusLabel(s);
  }
  statusClass(s: string): string {
    return sharedStatusClass(s);
  }
  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  openReview(a: ApplicationResponse, vacancyId: number): void {
    if (a.status === 'Applied') {
      this.appService
        .updateStatus(a.applicationId, { newStatus: 'UnderReview' })
        .subscribe({
          next: (updated) => {
            this.rawGroups.update((groups) =>
              groups.map((g) => ({
                ...g,
                applications: g.applications.map((x) =>
                  x.applicationId === updated.applicationId ? updated : x,
                ),
              })),
            );
            this.router.navigate(['/applications/review', a.applicationId], {
              queryParams: { vacancyId },
            });
          },
          error: (err: Error) => this.toast.show(err.message, 'error'),
        });
    } else {
      this.router.navigate(['/applications/review', a.applicationId], {
        queryParams: { vacancyId },
      });
    }
  }

  sendPreScreening(a: ApplicationResponse): void {
    // Navigate to pre-screening form sender
    // This will be built in a later sprint
    this.toast.show('Pre-screening feature coming soon.', 'warn');
  }

  openPreScreeningReview(a: ApplicationResponse, vacancyId: number): void {
    // Navigate to pre-screening review screen
    // This will be built in a later sprint
    this.toast.show('Pre-screening review coming soon.', 'warn');
  }

  scheduleInterview(a: ApplicationResponse, vacancyId: number): void {
    this.router.navigate(
      ['/applications', a.applicationId, 'schedule-interview'],
      {
        queryParams: { vacancyId },
      },
    );
  }
}
