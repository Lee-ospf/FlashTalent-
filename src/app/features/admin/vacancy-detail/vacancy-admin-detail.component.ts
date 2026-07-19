import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { VacancyAdminService, VacancyChangeHistoryEntry } from '../../../core/services/vacancy-admin.service';
import { ApplicationService } from '../../../core/services/application.service';
import { SkillService } from '../../../core/services/skill.service';
import { ToastService } from '../../../core/services/toast.service';
import { VacancyResponse, ApplicationResponse, SkillResponse } from '../../../core/models';
import { getValidNextStatuses, STATUS_LABELS, ApplicationStatusKey } from '../../../core/utils/application-status';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied', UnderReview: 'shortlisted', Shortlisted: 'interview',
  OfferExtended: 'offer', Hired: 'offer', NotSelected: 'rejected'
};

@Component({
  selector: 'app-vacancy-admin-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatSelectModule,
    MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container">
      <a routerLink="/admin/vacancies" class="back-link">
        <i class="ti ti-arrow-left"></i> Back to Manage Vacancies
      </a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      }

      @if (!loading() && loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      }

      @if (!loading() && !loadError() && vacancy(); as v) {

        <!-- Vacancy info card -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
          <mat-card-content style="padding:24px">
            <div class="vd-header">
              <div>
                <div class="vd-title">{{ v.title }}</div>
                <div class="vd-ref">JDF-VAC-{{ v.vacancyId }}</div>
              </div>
              <span class="pill" [class.pill-pub]="v.status==='Published'" [class.pill-dept]="v.status==='Draft'" [class.pill-type]="v.status==='Closed'">
                {{ v.status }}
              </span>
            </div>

            <div class="vc-meta" style="margin-top:14px">
              @if (v.location) { <span><i class="ti ti-map-pin"></i> {{ v.location }}</span> }
              <span><i class="ti ti-briefcase-2"></i> {{ v.employmentType }} · {{ v.vacancyType }}</span>
              @if (v.salaryMin || v.salaryMax) {
                <span><i class="ti ti-currency-rand"></i> R{{ v.salaryMin?.toLocaleString() }}{{ v.salaryMax ? ' – R' + v.salaryMax.toLocaleString() : '' }} pm</span>
              }
              @if (v.closingDate) { <span><i class="ti ti-calendar-event"></i> Closes {{ formatDate(v.closingDate) }}</span> }
              @if (v.minYearsExperience) { <span><i class="ti ti-briefcase"></i> {{ v.minYearsExperience }}+ yrs experience</span> }
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            <div class="vd-section-label">Description</div>
            <p class="vd-body">{{ v.description }}</p>

            @if (v.requirements) {
              <div class="vd-section-label" style="margin-top:14px">Requirements</div>
              <p class="vd-body">{{ v.requirements }}</p>
            }

            @if (v.skills.length) {
              <div class="vd-section-label" style="margin-top:14px">Required skills</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (s of v.skills; track s.skillId) {
                  <span class="skill-chip" [class.skill-chip--technical]="s.isRequired" [class.skill-chip--soft]="!s.isRequired">
                    {{ skillName(s.skillId) }}
                    <span class="chip-level">{{ s.proficiencyLevel }}{{ s.isRequired ? ' · Required' : ' · Preferred' }}</span>
                  </span>
                }
              </div>
            }

            @if (v.requiredDocuments.length) {
              <div class="vd-section-label" style="margin-top:14px">Required documents</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (rd of v.requiredDocuments; track rd.documentType) {
                  <span class="req-tag">{{ rd.documentType }}{{ rd.isMandatory ? ' *' : ' (optional)' }}</span>
                }
              </div>
            }

            <!-- Actions -->
            <mat-divider style="margin:18px 0"></mat-divider>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              @if (v.status === 'Draft') {
                <a [routerLink]="['/admin/vacancies', v.vacancyId, 'edit']" class="btn-secondary" style="text-decoration:none">
                  <i class="ti ti-pencil"></i> Edit
                </a>
                <button class="btn-primary" (click)="publish(v)" [disabled]="busy()">
                  <i class="ti ti-send"></i> Publish
                </button>
                <button class="btn-remove" (click)="remove(v)" [disabled]="busy()">
                  <i class="ti ti-trash"></i> Delete draft
                </button>
              } @else if (v.status === 'Published') {
                <button class="btn-secondary" (click)="close(v)" [disabled]="busy()">
                  <i class="ti ti-lock"></i> Close vacancy
                </button>
              } @else {
                <span class="form-note"><i class="ti ti-lock"></i> This vacancy is closed — no further actions available</span>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Change history -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
          <mat-card-content style="padding:18px 20px">
            <div class="card-header" style="cursor:pointer" (click)="historyOpen.set(!historyOpen())">
              <i class="ti ti-history"></i> Change history
              <i class="ti ti-chevron-down" style="margin-left:auto;transition:transform 0.2s" [style.transform]="historyOpen() ? 'rotate(180deg)' : 'none'"></i>
            </div>
            @if (historyOpen()) {
              @if (!history().length) {
                <p style="font-size:12px;color:var(--text-muted);margin-top:8px">No history recorded yet.</p>
              } @else {
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
                  @for (h of history(); track h.vacancyChangeHistoryId) {
                    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                      <div style="display:flex;align-items:center;gap:10px;font-size:12px">
                        <span class="pill pill-type">{{ h.action }}</span>
                        <span style="color:var(--text-muted)"><i class="ti ti-user"></i> {{ h.changedByName }}</span>
                        <span style="color:var(--text-muted);margin-left:auto"><i class="ti ti-clock"></i> {{ formatDateTime(h.changedAt) }}</span>
                      </div>
                      @if (h.details) {
                        <div style="font-size:12px;color:var(--text);margin-top:4px;padding-left:2px">{{ h.details }}</div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </mat-card-content>
        </mat-card>

        <!-- Applications for this vacancy -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-content style="padding:18px 20px">
            <div class="card-header"><i class="ti ti-users"></i> Applications ({{ applications().length }})</div>

            @if (appsLoading()) {
              <div class="empty-state" style="padding:1.5rem 0"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (!applications().length) {
              <div class="empty-state" style="padding:1.5rem 0"><i class="ti ti-inbox"></i><p>No one has applied yet.</p></div>
            } @else {
              <div style="margin-top:8px">
                @for (a of applications(); track a.applicationId; let i = $index) {
                  <div class="app-row">
                    <div class="app-rank">#{{ i + 1 }}</div>
                    <div class="app-icon-wrap" [class]="'app-icon-' + statusClass(a.status)">
                      <i class="ti ti-user"></i>
                    </div>
                    <div class="app-main">
                      <div class="app-title">{{ a.candidateName }}</div>
                      <div class="app-sub">Applied {{ formatDate(a.appliedAt) }}{{ i === 0 ? ' · First to apply' : '' }}</div>
                    </div>
                    <span class="status-pill s-{{ statusClass(a.status) }}">{{ label(a.status) }}</span>

                    <div style="display:flex;align-items:center;gap:8px;margin-left:12px">
                      @if (nextOptions(a.status).length) {
                        <mat-form-field appearance="outline" style="width:180px" class="compact-select">
                          <mat-label>Move to</mat-label>
                          <mat-select [(ngModel)]="pendingStatus[a.applicationId]">
                            @for (s of nextOptions(a.status); track s) {
                              <mat-option [value]="s">{{ label(s) }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <button mat-raised-button color="primary" style="border-radius:8px;height:56px;white-space:nowrap"
                                [disabled]="!pendingStatus[a.applicationId] || updatingId() === a.applicationId"
                                (click)="updateStatus(a)">
                          @if (updatingId() === a.applicationId) {
                            <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                          }
                          Update
                        </button>
                      } @else {
                        <span class="form-note" style="white-space:nowrap"><i class="ti ti-lock"></i> Final stage</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>

    <style>
      .back-link {
        display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500;
        color: var(--text-muted); text-decoration: none; margin-bottom: 16px;
      }
      .back-link:hover { color: var(--navy); }
      .vd-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .vd-title { font-size: 20px; font-weight: 700; color: var(--text); }
      .vd-ref { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .vd-section-label { font-size: 13px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.03em; }
      .vd-body { font-size: 14px; color: var(--text); line-height: 1.6; margin-top: 6px; white-space: pre-line; }
      .skill-chip {
        display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 20px;
        font-size: 13px; font-weight: 500;
      }
      .skill-chip--technical { background:#e8f4fd; color:#1565c0; border:1px solid #90caf9; }
      .skill-chip--soft { background:#f3e5f5; color:#6a1b9a; border:1px solid #ce93d8; }
      .chip-level { font-size:11px; opacity:0.75; font-weight:400; }
      .req-tag {
        font-size: 12px; padding: 5px 10px; border-radius: 8px; background: var(--surface-2);
        border: 1px solid var(--border); color: var(--text);
      }
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
export class VacancyAdminDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vacancyService = inject(VacancyAdminService);
  private appService = inject(ApplicationService);
  private skillService = inject(SkillService);
  private toast = inject(ToastService);

  vacancy   = signal<VacancyResponse | null>(null);
  loading   = signal(true);
  loadError = signal('');
  busy      = signal(false);

  applications = signal<ApplicationResponse[]>([]);
  appsLoading  = signal(false);
  updatingId   = signal<number | null>(null);
  pendingStatus: Record<number, ApplicationStatusKey | ''> = {};

  history     = signal<VacancyChangeHistoryEntry[]>([]);
  historyOpen = signal(false);

  allSkills = signal<SkillResponse[]>([]);

  private vacancyId = 0;

  ngOnInit(): void {
    this.vacancyId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.vacancyId) { this.loadError.set('Invalid vacancy.'); this.loading.set(false); return; }

    this.skillService.getAll().subscribe({ next: s => this.allSkills.set(s) });
    this.vacancyService.getHistory(this.vacancyId).subscribe({ next: h => this.history.set(h) });

    this.vacancyService.getById(this.vacancyId).subscribe({
      next: v => { this.vacancy.set(v); this.loading.set(false); this.loadApplications(); },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });
  }

  private loadApplications(): void {
    this.appsLoading.set(true);
    this.appService.getByVacancy(this.vacancyId).subscribe({
      next: apps => {
        this.applications.set(
          [...apps].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())
        );
        this.appsLoading.set(false);
      },
      error: () => this.appsLoading.set(false)
    });
  }

  skillName(skillId: number): string {
    return this.allSkills().find(s => s.skillId === skillId)?.name ?? `Skill #${skillId}`;
  }

  nextOptions(status: string) { return getValidNextStatuses(status); }
  label(s: string): string { return (STATUS_LABELS as Record<string, string>)[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }

  formatDate(d?: string): string {
    return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  updateStatus(a: ApplicationResponse): void {
    const newStatus = this.pendingStatus[a.applicationId];
    if (!newStatus) return;

    this.updatingId.set(a.applicationId);
    this.appService.updateStatus(a.applicationId, { newStatus }).subscribe({
      next: updated => {
        this.applications.update(list => list.map(x => x.applicationId === updated.applicationId ? updated : x));
        this.updatingId.set(null);
        delete this.pendingStatus[a.applicationId];
        this.toast.show(`${a.candidateName} moved to ${this.label(newStatus)}.`, 'success');
      },
      error: (err: Error) => { this.updatingId.set(null); this.toast.show(err.message, 'error'); }
    });
  }

  publish(v: VacancyResponse): void {
    this.busy.set(true);
    this.vacancyService.publish(v.vacancyId).subscribe({
      next: updated => { this.vacancy.set(updated); this.busy.set(false); this.toast.show('Vacancy published.', 'success'); },
      error: (err: Error) => { this.busy.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  close(v: VacancyResponse): void {
    if (!confirm(`Close "${v.title}"? This cannot be undone.`)) return;
    this.busy.set(true);
    this.vacancyService.close(v.vacancyId).subscribe({
      next: updated => { this.vacancy.set(updated); this.busy.set(false); this.toast.show('Vacancy closed.', 'success'); },
      error: (err: Error) => { this.busy.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  remove(v: VacancyResponse): void {
    if (!confirm(`Delete draft "${v.title}"? This cannot be undone.`)) return;
    this.busy.set(true);
    this.vacancyService.delete(v.vacancyId).subscribe({
      next: () => { this.toast.show('Draft deleted.', 'success'); this.router.navigate(['/admin/vacancies']); },
      error: (err: Error) => { this.busy.set(false); this.toast.show(err.message, 'error'); }
    });
  }
}