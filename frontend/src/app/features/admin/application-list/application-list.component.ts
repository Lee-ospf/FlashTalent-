import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { ApplicationService } from '../../../core/services/application.service';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrescreeningService } from '../../../core/services/prescreening.service';
import { ApplicationResponse } from '../../../core/models';
import { STATUS_LABELS, ApplicationStatusKey } from '../../../core/utils/application-status';
import { MatTooltipModule } from '@angular/material/tooltip';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied', UnderReview: 'shortlisted', Shortlisted: 'prescreen',
  PrescreeningStage: 'interview', InterviewStage: 'interview',
  OfferExtended: 'offer', Hired: 'offer', NotSelected: 'rejected'
};

interface VacancyGroup {
  vacancyId: number;
  vacancyTitle: string;
  applications: ApplicationResponse[]; // sorted oldest-first (submission order)
}

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatCardModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-chart-arrows-vertical"></i> Manage applications</h2>
          <p class="page-sub">Move candidates through the recruitment pipeline, grouped by vacancy</p>
        </div>
      </div>

      @if (!loading()) {
        <!-- Metrics -->
        <div class="metrics-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px">
          <div class="metric-card">
            <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1"><i class="ti ti-send"></i></div>
            <div class="metric-body">
              <div class="metric-val">{{ totalApplications() }}</div>
              <div class="metric-label">Total applications</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background:#fff3e0;color:#e65100"><i class="ti ti-clock"></i></div>
            <div class="metric-body">
              <div class="metric-val">{{ pendingReviewCount() }}</div>
              <div class="metric-label">Awaiting review</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20"><i class="ti ti-briefcase"></i></div>
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
            <input [(ngModel)]="searchQ" type="search" class="search-input"
                   placeholder="Search by candidate or vacancy…">
          </div>

          <mat-form-field appearance="outline" class="compact-select" style="width:200px">
            <mat-label>Vacancy</mat-label>
            <mat-select [(ngModel)]="vacancyFilter">
              <mat-option [value]="''">All vacancies</mat-option>
              @for (v of vacancyOptions(); track v.id) {
                <mat-option [value]="v.id">{{ v.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="compact-select" style="width:180px">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter">
              <mat-option [value]="''">All statuses</mat-option>
              @for (s of allStatuses; track s) {
                <mat-option [value]="s">{{ label(s) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-stroked-button style="border-radius:8px;height:56px" (click)="toggleExpandAll()">
            <i class="ti" [class.ti-chevrons-down]="!allExpanded()" [class.ti-chevrons-up]="allExpanded()"></i>
            {{ allExpanded() ? 'Collapse all' : 'Expand all' }}
          </button>
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!rawGroups().length || !totalApplications()) {
        <div class="empty-state"><i class="ti ti-inbox"></i><p>No applications yet.</p></div>
      } @else if (!filteredGroups.length) {
        <div class="empty-state"><i class="ti ti-zoom-question"></i><p>No applications match your filters.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:16px">
          @for (group of filteredGroups; track group.vacancyId) {
            <mat-card class="mat-elevation-z1 vlist-card">

              <!-- Vacancy group header -->
              <div class="vlist-header" (click)="toggleGroup(group.vacancyId)">
                <div class="vlist-header-main">
                  <div class="vlist-title">{{ group.vacancyTitle }}</div>
                  <div class="vlist-ref">{{ group.applications.length }} application{{ group.applications.length !== 1 ? 's' : '' }}</div>
                </div>
                <div class="vlist-header-right">
                  <div class="vlist-breakdown">
                    @for (row of statusBreakdown(group); track row.status) {
                      <span class="status-pill s-{{ statusClass(row.status) }}">{{ row.count }} {{ label(row.status) }}</span>
                    }
                  </div>
                  <i class="ti ti-chevron-down vgroup-chevron" [class.open]="isExpanded(group.vacancyId)"></i>
                </div>
              </div>

              @if (isExpanded(group.vacancyId)) {
                <div class="vlist-body">
                  <div class="vd-section-label">Applications</div>
                  <div style="margin-top:6px">
                  @for (a of group.applications; track a.applicationId; let i = $index) {
                    <div class="app-row">
                      <div class="app-rank" [matTooltip]="'Submission order'">#{{ i + 1 }}</div>
                      <div class="app-icon-wrap" [class]="'app-icon-' + statusClass(effectiveStatus(a))">
                        <i class="ti ti-user"></i>
                      </div>
                      <div class="app-main">
                        <div class="app-title">{{ a.candidateName }}</div>
                        <div class="app-sub">Applied {{ formatDate(a.appliedAt) }}{{ i === 0 ? ' · First to apply' : '' }}</div>
                      </div>
                      <a class="status-pill s-{{ statusClass(effectiveStatus(a)) }} status-pill-link"
                         [routerLink]="['/admin/applications', a.applicationId]"
                         matTooltip="View application & pre-screening">
                        {{ label(effectiveStatus(a)) }}
                      </a>

                      <a class="btn-secondary app-row-open" style="margin-left:12px;white-space:nowrap"
                         [routerLink]="['/admin/applications', a.applicationId]">
                        <i class="ti ti-clipboard-text"></i> View details
                      </a>
                    </div>
                  }
                  </div>
                </div>
              }
            </mat-card>
          }
        </div>
      }
    </div>

    <style>
      .status-pill-link {
        text-decoration: none; cursor: pointer; border: 1px solid transparent;
        transition: box-shadow 0.15s, transform 0.1s;
      }
      .status-pill-link:hover { box-shadow: 0 0 0 1px currentColor inset; }
      .status-pill-link:active { transform: scale(0.97); }

      .app-row-open {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
        font-size: 12px; text-decoration: none; flex-shrink: 0;
      }

      .filters-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 18px; }

      /* ── Vacancy group card (plain style, matches vacancy detail) ── */
      .vlist-card { border-radius: 14px !important; overflow: hidden; }
      .vlist-header {
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        padding: 18px 22px; cursor: pointer; user-select: none; background: #fff; transition: background 0.15s;
      }
      .vlist-header:hover { background: var(--surface-2); }
      .vlist-header-main { min-width: 0; flex: 1; }
      .vlist-title { font-size: 16px; font-weight: 700; color: var(--text); }
      .vlist-ref { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .vlist-header-right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
      .vlist-breakdown { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .vgroup-chevron { font-size: 16px; color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0; }
      .vgroup-chevron.open { transform: rotate(180deg); }
      .vlist-body { padding: 16px 22px 18px; border-top: 1px solid var(--border); }
      .vd-section-label { font-size: 11px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }

      .app-row {
        display: flex; align-items: center; gap: 12px; padding: 12px 0;
        border-bottom: 1px solid var(--border);
      }
      .app-row:last-child { border-bottom: none; }
      .app-rank {
        width: 26px; height: 26px; border-radius: 50%; background: var(--navy); color: #fff;
        font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
    </style>
  `
})
export class ApplicationListComponent implements OnInit {
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyAdminService);
  private toast = inject(ToastService);
  private prescreening = inject(PrescreeningService);

  rawGroups = signal<VacancyGroup[]>([]);
  loading = signal(false);

  searchQ = '';
  vacancyFilter: number | '' = '';
  statusFilter: ApplicationStatusKey | '' = '';

  private expandedIds = signal<Set<number>>(new Set());

  allStatuses: ApplicationStatusKey[] = ['Applied', 'UnderReview', 'Shortlisted', 'PrescreeningStage', 'InterviewStage', 'OfferExtended', 'Hired', 'NotSelected'];

  totalApplications = computed(() => this.rawGroups().reduce((sum, g) => sum + g.applications.length, 0));
  pendingReviewCount = computed(() => this.rawGroups().reduce(
    (sum, g) => sum + g.applications.filter(a => a.status === 'Applied' || a.status === 'UnderReview').length, 0
  ));
  vacanciesWithApplicants = computed(() => this.rawGroups().filter(g => g.applications.length > 0).length);

  vacancyOptions = computed(() =>
    this.rawGroups()
      .filter(g => g.applications.length > 0)
      .map(g => ({ id: g.vacancyId, title: g.vacancyTitle }))
  );

  get filteredGroups(): VacancyGroup[] {
  const q = this.searchQ.trim().toLowerCase();
  const vf = this.vacancyFilter;
  const sf = this.statusFilter;

  return this.rawGroups()
    .filter(g => vf === '' || g.vacancyId === vf)
    .map(g => ({
      ...g,
      applications: g.applications.filter(a =>
        (!q ||
          a.candidateName.toLowerCase().includes(q) ||
          g.vacancyTitle.toLowerCase().includes(q)) &&
        (!sf || this.effectiveStatus(a) === sf)
      )
    }))
    .filter(g => g.applications.length > 0);
}

  allExpanded = computed(() => {
  const groups = this.filteredGroups;
  return groups.length > 0 && groups.every(g => this.expandedIds().has(g.vacancyId));
});

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    // No single "get all applications" endpoint exists — fetch every vacancy,
    // then fetch applications per vacancy and group the results.
    this.vacancyService.getAllByStatus().subscribe({
      next: vacancies => {
        if (!vacancies.length) { this.rawGroups.set([]); this.loading.set(false); return; }
        forkJoin(vacancies.map(v => this.appService.getByVacancy(v.vacancyId))).subscribe({
          next: results => {
            const groups: VacancyGroup[] = vacancies.map((v, i) => ({
              vacancyId: v.vacancyId,
              vacancyTitle: v.title,
              // Oldest first = submission order, so #1 is always the first person who applied
              applications: [...results[i]].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())
            }));
            this.rawGroups.set(groups);
            // Default: expand every group that actually has applicants
            this.expandedIds.set(new Set(groups.filter(g => g.applications.length > 0).map(g => g.vacancyId)));
            this.loading.set(false);
            // Preload pre-screening records for every application so
            // status pills and the assessment panel can read them synchronously.
            // (A record can exist from PrescreeningStage onward - Applied/
            // UnderReview/Shortlisted never have one, but it's cheap to just ask.)
            const allIds = groups.flatMap(g => g.applications).map(a => a.applicationId);
            this.prescreening.preload(allIds).subscribe();
          },
          error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
        });
      },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  statusBreakdown(group: VacancyGroup) {
    const counts: Record<string, number> = {};
    for (const a of group.applications) {
      const s = this.effectiveStatus(a);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

  isExpanded(vacancyId: number): boolean { return this.expandedIds().has(vacancyId); }

  toggleGroup(vacancyId: number): void {
    const s = new Set(this.expandedIds());
    if (s.has(vacancyId)) { s.delete(vacancyId); } else { s.add(vacancyId); }
    this.expandedIds.set(s);
  }

  toggleExpandAll(): void {
    if (this.allExpanded()) {
      this.expandedIds.set(new Set());
    } else {
      this.expandedIds.set(new Set(this.filteredGroups.map(g => g.vacancyId)));
    }
  }

  label(s: string): string { return (STATUS_LABELS as Record<string, string>)[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }
  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  effectiveStatus(a: ApplicationResponse): string {
    return this.prescreening.effectiveStatus(a.applicationId, a.status);
  }
}