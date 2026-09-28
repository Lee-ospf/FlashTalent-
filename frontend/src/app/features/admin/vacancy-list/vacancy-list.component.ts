import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { TalentPoolMatchingService } from '../../../core/services/talent-pool-matching.service';
import { VacancyResponse, AiTalentPoolMatchResponse } from '../../../core/models';

type SortMode = 'closingSoon' | 'newest';
type StatusFilter = 'all' | 'Draft' | 'TalentPoolOnly' | 'Published' | 'Closed';

@Component({
  selector: 'app-vacancy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-briefcase"></i> Manage vacancies</h2>
          <p class="page-sub">{{ filtered().length }} of {{ vacancies().length }} vacancies</p>
        </div>
        <a routerLink="/admin/vacancies/new" class="btn-primary" style="text-decoration:none">
          <i class="ti ti-plus"></i> Create vacancy
        </a>
      </div>

      <div class="filters-row">
        <div class="search-wrap" style="flex:1;min-width:220px">
          <i class="ti ti-search search-icon"></i>
          <input [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" type="search" class="search-input" placeholder="Search by vacancy title…">
        </div>
        <select [ngModel]="sortMode()" (ngModelChange)="sortMode.set($event)" style="min-width:170px">
          <option value="closingSoon">Closing soonest first</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      <div class="filter-chips">
        @for (f of statusFilters; track f) {
          <button class="filter-chip" [class.on]="activeFilter() === f" (click)="setFilter(f)">
            {{ f === 'all' ? 'All' : statusLabel(f) }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state"><i class="ti ti-briefcase-off"></i><p>No vacancies match your search.</p></div>
      } @else {
        <div class="vacancy-list">
          @for (v of filtered(); track v.vacancyId) {
            <mat-card class="mat-elevation-z1 vacancy-list-card" style="border-radius:12px">
              <mat-card-content style="padding:16px 20px">
                <div class="vc-header">
                  <a [routerLink]="['/admin/vacancies', v.vacancyId]" class="vc-title-link">
                    <div class="vc-title">{{ v.title }}</div>
                    <div class="vc-ref">JDF-VAC-{{ v.vacancyId }} · {{ v.location }} · {{ v.employmentType }}</div>
                  </a>
                  <span class="pill"
                        [class.pill-pub]="v.status==='Published'"
                        [class.pill-dept]="v.status==='Draft'"
                        [class.pill-tpo]="v.status==='TalentPoolOnly'"
                        [class.pill-type]="v.status==='Closed'">
                    {{ statusLabel(v.status) }}
                  </span>
                </div>

                <div class="vc-footer" style="border-top:none;padding-top:10px">
                  <span class="apply-hint">
                    Closes {{ formatDate(v.closingDate) }} · {{ v.skills.length }} skill(s) required
                  </span>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <a [routerLink]="['/admin/vacancies', v.vacancyId]" class="card-link" style="font-size:12px">
                      View details <i class="ti ti-arrow-right"></i>
                    </a>

                    @if (v.status === 'Draft' || v.status === 'TalentPoolOnly') {
                      <button class="btn-secondary" style="text-decoration:none"
                              (click)="pullTalentPool(v); $event.stopPropagation()"
                              [disabled]="pullingId() === v.vacancyId || !v.skills.length"
                              [title]="!v.skills.length ? 'Add at least one required skill first' : 'AI-match this vacancy against the talent pool'">
                        @if (pullingId() === v.vacancyId) {
                          <mat-spinner diameter="14" style="display:inline-block;margin-right:6px"></mat-spinner> Pulling…
                        } @else {
                          <i class="ti ti-sparkles"></i> Pull talent pool
                        }
                      </button>
                      @if (matchesByVacancyId().has(v.vacancyId)) {
                        <button class="btn-secondary tp-toggle-btn" (click)="toggleExpand(v); $event.stopPropagation()">
                          <i class="ti" [class.ti-chevron-down]="expandedVacancyId() !== v.vacancyId" [class.ti-chevron-up]="expandedVacancyId() === v.vacancyId"></i>
                          {{ expandedVacancyId() === v.vacancyId ? 'Hide' : 'Show' }} matches ({{ matchesByVacancyId().get(v.vacancyId)?.length ?? 0 }})
                        </button>
                      }
                    }

                    @if (v.status === 'Draft') {
                      <a [routerLink]="['/admin/vacancies', v.vacancyId, 'edit']" class="btn-secondary" style="text-decoration:none" (click)="$event.stopPropagation()">
                        <i class="ti ti-pencil"></i> Edit
                      </a>
                      <button class="btn-primary" (click)="publish(v); $event.stopPropagation()" [disabled]="busyId() === v.vacancyId">
                        <i class="ti ti-send"></i> Publish
                      </button>
                      <button class="btn-remove" (click)="remove(v); $event.stopPropagation()" [disabled]="busyId() === v.vacancyId">
                        <i class="ti ti-trash"></i>
                      </button>
                    } @else if (v.status === 'TalentPoolOnly') {
                      <button class="btn-primary" (click)="publish(v); $event.stopPropagation()" [disabled]="busyId() === v.vacancyId">
                        <i class="ti ti-send"></i> Publish to everyone
                      </button>
                    } @else if (v.status === 'Published') {
                      <button class="btn-secondary" (click)="close(v); $event.stopPropagation()" [disabled]="busyId() === v.vacancyId">
                        <i class="ti ti-lock"></i> Close
                      </button>
                    }
                  </div>
                </div>

                <!-- Collapsible AI talent pool matches panel -->
                @if (expandedVacancyId() === v.vacancyId) {
                  <div class="tp-panel">
                    @if (matchLoadingId() === v.vacancyId) {
                      <div class="empty-state" style="padding:1.25rem 0"><mat-spinner diameter="26"></mat-spinner></div>
                    } @else {
                      @if (!matchesFor(v.vacancyId).length) {
                        <div class="tp-empty">
                          <i class="ti ti-users-off"></i>
                          <span>No talent pool candidates cleared the match bar for this vacancy.</span>
                        </div>
                      } @else {
                        <div class="tp-panel-header">
                          <i class="ti ti-sparkles"></i> AI-suggested talent pool candidates
                        </div>
                        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
                          @for (m of matchesFor(v.vacancyId); track m.talentPoolMatchId) {
                            <div class="tp-match-row">
                              <div class="tp-score-badge">{{ m.score }}</div>
                              <div class="tp-match-body">
                                <div class="tp-match-name">{{ m.candidateName }}</div>
                                <div class="tp-match-reasoning">{{ m.reasoning }}</div>
                              </div>
                              @if (m.invitedAt) {
                                <span class="form-note" style="white-space:nowrap">
                                  <i class="ti ti-circle-check"></i> Invited {{ formatDate(m.invitedAt) }}
                                </span>
                              } @else {
                                <button class="btn-secondary" style="white-space:nowrap"
                                        (click)="inviteCandidate(v, m); $event.stopPropagation()"
                                        [disabled]="invitingId() === m.talentPoolMatchId">
                                  @if (invitingId() === m.talentPoolMatchId) {
                                    <mat-spinner diameter="14" style="display:inline-block;margin-right:6px"></mat-spinner>
                                  } @else {
                                    <i class="ti ti-send-2"></i>
                                  }
                                  Invite to apply
                                </button>
                              }
                            </div>
                          }
                        </div>
                      }
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>

    <style>
      .filters-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 12px; }
      .vc-title-link { text-decoration: none; color: inherit; display: block; }
      .vc-title-link:hover .vc-title { color: var(--navy); text-decoration: underline; }

      .pill-tpo { background: #f3e9ff; color: #6a1b9a; border: 1px solid #ce93d8; }

      .tp-toggle-btn { display: inline-flex; align-items: center; gap: 6px; }

      .tp-panel {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px dashed var(--border);
      }
      .tp-panel-header {
        font-size: 12px; font-weight: 700; color: #6a1b9a;
        display: flex; align-items: center; gap: 6px;
      }
      .tp-empty {
        display: flex; align-items: center; gap: 8px;
        font-size: 12.5px; color: var(--text-muted); padding: 10px 2px;
      }
      .tp-match-row {
        display: flex; align-items: center; gap: 14px; padding: 12px 14px;
        border: 1px solid var(--border); border-radius: 10px; background: #fbf8ff;
      }
      .tp-score-badge {
        width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
        background: #f3e9ff; color: #6a1b9a; font-size: 13px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
      .tp-match-body { flex: 1; min-width: 0; }
      .tp-match-name { font-size: 13px; font-weight: 700; color: var(--text); }
      .tp-match-reasoning { font-size: 12px; color: var(--text-muted); margin-top: 2px; line-height: 1.4; }
    </style>
  `
})
export class VacancyListComponent implements OnInit {
  private vacancyService = inject(VacancyAdminService);
  private toast = inject(ToastService);
  private matchingService = inject(TalentPoolMatchingService);

  vacancies = signal<VacancyResponse[]>([]);
  loading = signal(false);
  busyId = signal<number | null>(null);
  pullingId = signal<number | null>(null);
  activeFilter = signal<StatusFilter>('all');
  statusFilters: StatusFilter[] = ['all', 'Draft', 'TalentPoolOnly', 'Published', 'Closed'];

  searchQ = signal('');
  sortMode = signal<SortMode>('closingSoon');

  // ── AI talent pool panel state (per-row, keyed by vacancyId) ──────
  expandedVacancyId = signal<number | null>(null);
  matchesByVacancyId = signal<Map<number, AiTalentPoolMatchResponse[]>>(new Map());
  matchLoadingId = signal<number | null>(null);
  invitingId = signal<number | null>(null);

  filtered = computed(() => {
    const f = this.activeFilter();
    const q = this.searchQ().trim().toLowerCase();

    let list = f === 'all' ? this.vacancies() : this.vacancies().filter(v => v.status === f);
    if (q) list = list.filter(v => v.title.toLowerCase().includes(q));

    list = [...list].sort((a, b) => {
      if (this.sortMode() === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const aTime = a.closingDate ? new Date(a.closingDate).getTime() : Infinity;
      const bTime = b.closingDate ? new Date(b.closingDate).getTime() : Infinity;
      return aTime - bTime;
    });

    return list;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.vacancyService.getAllByStatus().subscribe({
      next: v => { this.vacancies.set(v); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  setFilter(f: StatusFilter): void { this.activeFilter.set(f); }

  statusLabel(status: string): string {
    return status === 'TalentPoolOnly' ? 'Talent Pool Only' : status;
  }

  formatDate(d?: string): string {
    return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }

  matchesFor(vacancyId: number): AiTalentPoolMatchResponse[] {
    return this.matchesByVacancyId().get(vacancyId) ?? [];
  }

  pullTalentPool(v: VacancyResponse): void {
    if (this.pullingId()) return;

    if (v.status === 'Draft') {
      const confirmed = confirm(
        'This will open the vacancy to invited talent pool candidates only, and lock further editing. Continue?'
      );
      if (!confirmed) return;
    }

    this.pullingId.set(v.vacancyId);
    this.matchingService.pullDraftSuggestions(v.vacancyId).subscribe({
      next: result => {
        this.pullingId.set(null);
        this.matchesByVacancyId.update(map => {
          const next = new Map(map);
          next.set(v.vacancyId, result.matches);
          return next;
        });
        if (result.vacancyStatus && result.vacancyStatus !== v.status) {
          this.vacancies.update(list =>
            list.map(x => x.vacancyId === v.vacancyId ? { ...x, status: result.vacancyStatus } : x));
        }
        this.expandedVacancyId.set(v.vacancyId);
        this.toast.show(
          result.matches.length
            ? `Found ${result.matches.length} talent pool match${result.matches.length === 1 ? '' : 'es'} for "${v.title}".`
            : `No talent pool candidates cleared the match bar for "${v.title}".`,
          result.matches.length ? 'success' : 'warn',
        );
      },
      error: (err: Error) => { this.pullingId.set(null); this.toast.show(err.message, 'error'); },
    });
  }

  toggleExpand(v: VacancyResponse): void {
    if (this.expandedVacancyId() === v.vacancyId) {
      this.expandedVacancyId.set(null);
      return;
    }
    this.expandedVacancyId.set(v.vacancyId);
    if (this.matchesByVacancyId().has(v.vacancyId)) return;

    this.matchLoadingId.set(v.vacancyId);
    this.matchingService.getMatches(v.vacancyId, 'DraftSuggestion').subscribe({
      next: matches => {
        this.matchesByVacancyId.update(map => {
          const next = new Map(map);
          next.set(v.vacancyId, matches);
          return next;
        });
        this.matchLoadingId.set(null);
      },
      error: () => this.matchLoadingId.set(null),
    });
  }

  inviteCandidate(v: VacancyResponse, match: AiTalentPoolMatchResponse): void {
    this.invitingId.set(match.talentPoolMatchId);
    this.matchingService.invite(v.vacancyId, match.talentPoolMatchId).subscribe({
      next: updated => {
        this.matchesByVacancyId.update(map => {
          const next = new Map(map);
          const list = next.get(v.vacancyId) ?? [];
          next.set(v.vacancyId, list.map(m => m.talentPoolMatchId === updated.talentPoolMatchId ? updated : m));
          return next;
        });
        this.invitingId.set(null);
        this.toast.show(`Invite sent to ${updated.candidateName}.`, 'success');
      },
      error: (err: Error) => { this.invitingId.set(null); this.toast.show(err.message, 'error'); },
    });
  }

  publish(v: VacancyResponse): void {
    this.busyId.set(v.vacancyId);
    this.vacancyService.publish(v.vacancyId).subscribe({
      next: updated => {
        this.vacancies.update(list => list.map(x => x.vacancyId === updated.vacancyId ? updated : x));
        this.busyId.set(null);
        this.toast.show('Vacancy published.', 'success');
      },
      error: (err: Error) => { this.busyId.set(null); this.toast.show(err.message, 'error'); }
    });
  }

  close(v: VacancyResponse): void {
    if (!confirm(`Close "${v.title}"? This cannot be undone.`)) return;
    this.busyId.set(v.vacancyId);
    this.vacancyService.close(v.vacancyId).subscribe({
      next: updated => {
        this.vacancies.update(list => list.map(x => x.vacancyId === updated.vacancyId ? updated : x));
        this.busyId.set(null);
        this.toast.show('Vacancy closed.', 'success');
      },
      error: (err: Error) => { this.busyId.set(null); this.toast.show(err.message, 'error'); }
    });
  }

  remove(v: VacancyResponse): void {
    if (!confirm(`Delete draft "${v.title}"? This cannot be undone.`)) return;
    this.busyId.set(v.vacancyId);
    this.vacancyService.delete(v.vacancyId).subscribe({
      next: () => {
        this.vacancies.update(list => list.filter(x => x.vacancyId !== v.vacancyId));
        this.busyId.set(null);
        this.toast.show('Draft deleted.', 'success');
      },
      error: (err: Error) => { this.busyId.set(null); this.toast.show(err.message, 'error'); }
    });
  }
}