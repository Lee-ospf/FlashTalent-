import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApplicationService } from '../../core/services/application.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { ApplicationResponse, ApplicationStatusHistoryResponse } from '../../core/models';

const PIPELINE = ['Applied', 'UnderReview', 'Shortlisted', 'OfferExtended', 'Hired'];

const STATUS_CLASS: Record<string, string> = {
  Applied:'applied', UnderReview:'shortlisted', Shortlisted:'interview',
  OfferExtended:'offer', Hired:'offer', NotSelected:'rejected'
};

const STATUS_LABEL: Record<string, string> = {
  Applied:'Applied', UnderReview:'Under Review', Shortlisted:'Shortlisted',
  OfferExtended:'Offer Extended', Hired:'Hired', NotSelected:'Not Selected'
};

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatProgressSpinnerModule, MatChipsModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-file-check"></i> My Applications</h2>
          <p class="page-sub">
            {{ apps().length }} application{{ apps().length !== 1 ? 's' : '' }} · Track your recruitment progress
          </p>
        </div>
      </div>

      @if (!state.profile()) {
        <div class="info-banner warn">
          <i class="ti ti-alert-triangle"></i>
          Create your <a routerLink="/profile">candidate profile</a> first to start applying and tracking applications.
        </div>
      }

      @if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      }

      <!-- Metrics -->
      <div class="metrics-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div class="metric-card">
          <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1"><i class="ti ti-send"></i></div>
          <div class="metric-body">
            <div class="metric-val">{{ apps().length }}</div>
            <div class="metric-label">Total</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#ede7f6;color:#4527a0"><i class="ti ti-star"></i></div>
          <div class="metric-body">
            <div class="metric-val">{{ count('Shortlisted') }}</div>
            <div class="metric-label">Shortlisted</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#fff3e0;color:#e65100"><i class="ti ti-file-check"></i></div>
          <div class="metric-body">
            <div class="metric-val">{{ count('OfferExtended') }}</div>
            <div class="metric-label">Offers</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20"><i class="ti ti-trophy"></i></div>
          <div class="metric-body">
            <div class="metric-val">{{ count('Hired') }}</div>
            <div class="metric-label">Hired</div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="empty-state"><i class="ti ti-loader"></i><p>Loading applications…</p></div>
      } @else if (!apps().length && !loadError()) {
        <div class="empty-state">
          <i class="ti ti-clipboard-list"></i>
          <p>No applications yet.<br>Browse vacancies to apply.</p>
        </div>
      } @else if (apps().length) {
        <div class="app-list">
          @for (app of apps(); track app.applicationId) {
            <mat-card class="mat-elevation-z1 app-card" style="border-radius:12px;padding:0">
              <!-- Header row -->
              <div class="app-card-header" (click)="toggle(app.applicationId)"
                   role="button" [attr.aria-expanded]="isOpen(app.applicationId)">
                <div class="app-icon-wrap app-icon-{{ statusClass(app.status) }}">
                  <i class="ti ti-briefcase"></i>
                </div>
                <div class="app-main">
                  <div class="app-title">{{ app.vacancyTitle }}</div>
                  <div class="app-sub">
                    Applied {{ formatDate(app.appliedAt) }}
                    @if (app.updatedAt) { · Updated {{ formatDate(app.updatedAt) }} }
                  </div>
                </div>
                <span class="status-pill s-{{ statusClass(app.status) }}">{{ statusLabel(app.status) }}</span>
                <i class="ti ti-chevron-down expand-icon" [class.open]="isOpen(app.applicationId)"></i>
              </div>

              <!-- Expanded detail -->
              @if (isOpen(app.applicationId)) {
                <div class="app-detail">
                  <mat-divider></mat-divider>
                  <div style="padding:18px 20px">

                    <!-- Pipeline -->
                    <div class="detail-label">Recruitment pipeline</div>
                    <div class="pipeline-track" style="margin-bottom:20px">
                      @for (step of pipelineSteps(app); track step.label; let last=$last) {
                        <div class="pip-step" [class.done]="step.state==='done'" [class.pip-last]="last">
                          <div class="pip-dot"
                               [class.dot-done]="step.state==='done'"
                               [class.dot-active]="step.state==='active'"
                               [class.dot-rejected]="step.state==='rejected'">
                            <i class="ti"
                               [class.ti-check]="step.state==='done'"
                               [class.ti-x]="step.state==='rejected'"
                               [class.ti-player-play]="step.state==='active'"
                               [class.ti-circle]="step.state==='pending'"></i>
                          </div>
                          <div class="pip-label"
                               [class.label-done]="step.state==='done'"
                               [class.label-active]="step.state==='active'"
                               [class.label-rejected]="step.state==='rejected'">
                            {{ step.label }}
                          </div>
                        </div>
                      }
                    </div>

                    <!-- History -->
                    <div class="detail-label">Status history</div>
                    @if (historyLoading().has(app.applicationId)) {
                      <div style="font-size:12px;color:var(--text-muted);padding:8px 0;display:flex;align-items:center;gap:8px">
                        <mat-spinner diameter="16"></mat-spinner> Loading history…
                      </div>
                    } @else if (!getHistory(app.applicationId).length) {
                      <div style="font-size:12px;color:var(--text-muted)">No status history yet.</div>
                    } @else {
                      <div class="timeline">
                        @for (event of getHistory(app.applicationId); track event.applicationStatusHistoryId; let last=$last) {
                          <div class="tl-entry">
                            <div class="tl-line">
                              <div class="tl-dot" [style.background]="dotColor(event.newStatus)"></div>
                              @if (!last) { <div class="tl-connector"></div> }
                            </div>
                            <div class="tl-content">
                              <span class="status-pill s-{{ statusClass(event.newStatus) }}">
                                {{ statusLabel(event.newStatus) }}
                              </span>
                              <div class="tl-meta">
                                <i class="ti ti-user"></i> {{ event.changedByName }}
                                &nbsp;·&nbsp;
                                <i class="ti ti-clock"></i> {{ formatDate(event.changedAt) }}
                              </div>
                              @if (event.oldStatus !== event.newStatus) {
                                <div class="tl-note">Moved from {{ statusLabel(event.oldStatus) }}</div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }

                    <!-- IDs -->
                    <div class="app-ids">
                      <span class="id-chip"><i class="ti ti-hash"></i> APP-{{ app.applicationId }}</span>
                      <span class="id-chip"><i class="ti ti-user"></i> Candidate #{{ app.candidateId }}</span>
                      <span class="id-chip"><i class="ti ti-building"></i> Vacancy #{{ app.vacancyId }}</span>
                    </div>
                  </div>
                </div>
              }
            </mat-card>
          }
        </div>
      }
    </div>
  `
})
export class ApplicationsComponent implements OnInit {
  private appService = inject(ApplicationService);
  state = inject(CandidateStateService);

  apps      = signal<ApplicationResponse[]>([]);
  loading   = signal(false);
  loadError = signal('');

  private expanded     = signal<Set<number>>(new Set());
  historyLoading       = signal<Set<number>>(new Set());
  private historyCache = new Map<number, ApplicationStatusHistoryResponse[]>();

  ngOnInit(): void {
    const p = this.state.profile();
    if (!p) return; // banner in the template covers this case, nothing to load yet

    this.loading.set(true);
    this.appService.getByCandidate(p.candidateId).subscribe({
      next: a => { this.apps.set(a); this.loading.set(false); },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });
  }

  toggle(id: number): void {
    const s = new Set(this.expanded());
    if (s.has(id)) { s.delete(id); } else { s.add(id); if (!this.historyCache.has(id)) this.loadHistory(id); }
    this.expanded.set(s);
  }

  isOpen(id: number): boolean { return this.expanded().has(id); }

  private loadHistory(id: number): void {
    this.historyLoading.update(s => new Set([...s, id]));
    this.appService.getHistory(id).subscribe({
      next: h => {
        this.historyCache.set(id, h);
        this.historyLoading.update(s => { const n = new Set(s); n.delete(id); return n; });
      },
      error: () => this.historyLoading.update(s => { const n = new Set(s); n.delete(id); return n; })
    });
  }

  getHistory(id: number): ApplicationStatusHistoryResponse[] { return this.historyCache.get(id) ?? []; }

  count(status: string): number { return this.apps().filter(a => a.status === status).length; }

  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }
  statusLabel(s: string): string { return STATUS_LABEL[s] ?? s; }

  dotColor(s: string): string {
    const m: Record<string, string> = { Hired:'#1b5e20', OfferExtended:'#2D7A4F', NotSelected:'#c62828' };
    return m[s] ?? '#1A2744';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
  }

  pipelineSteps(app: ApplicationResponse) {
    const isNotSelected = app.status === 'NotSelected';
    const steps = isNotSelected ? [...PIPELINE, 'NotSelected'] : PIPELINE;
    const ci = steps.indexOf(app.status);
    return steps.map((label, i) => {
      if (isNotSelected && label === 'NotSelected') return { label:'Not Selected', state:'rejected' as const };
      if (i < ci)  return { label: STATUS_LABEL[label] ?? label, state:'done'    as const };
      if (i === ci) return { label: STATUS_LABEL[label] ?? label, state:'active'  as const };
      return              { label: STATUS_LABEL[label] ?? label, state:'pending' as const };
    });
  }
}