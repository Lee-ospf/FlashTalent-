import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import {
  ProjectService,
  ProjectResponse,
  ProjectMatchResponse,
  ProjectMemberResponse,
  ProjectDocumentResponse,
  SkillGapItem,
  GapStatus,
} from '../../../core/services/project.service';

const HIGH_WORKLOAD = 3; // active projects at which the workload chip turns amber
const PAGE = 10; // match cards shown at a time
const LEVELS = ['Beginner', 'Intermediate', 'Expert'];
const STATUSES: GapStatus[] = ['Met', 'BelowLevel', 'Missing'];
const NOT_SCORED = 'The AI did not score';

// Route: admin/projects/:id (HR, Admin)
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container pd-page">
      <a class="pd-back" routerLink="/admin/projects"
        ><i class="ti ti-arrow-left"></i> Projects</a
      >

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      } @else {
        @if (project(); as p) {
          <div class="pd-head">
            <div>
              <div class="pd-title">{{ p.name }}</div>
              <div class="pd-chips">
                <span
                  class="pd-badge"
                  [class.pd-ok]="active()"
                  [class.pd-muted]="!active()"
                  >{{ active() ? 'Active' : 'Closed' }}</span
                >
                <span class="pd-badge pd-muted">{{
                  p.departmentName || 'All departments'
                }}</span>
              </div>
              <div class="pd-meta">
                @if (p.lastMatchedAt) {
                  Last matched {{ fmtTime(p.lastMatchedAt) }}
                } @else {
                  Not matched yet
                }
              </div>
            </div>
            @if (active()) {
              <div class="pd-actions">
                <button
                  class="pd-btn"
                  type="button"
                  [routerLink]="['/admin/projects', p.projectId, 'edit']"
                >
                  Edit
                </button>
                <button
                  class="pd-btn"
                  type="button"
                  [disabled]="closing()"
                  (click)="closeProject()"
                >
                  Close project
                </button>
                <button
                  class="btn-primary"
                  type="button"
                  [disabled]="running() || !hasRequired()"
                  [title]="
                    hasRequired()
                      ? ''
                      : 'Mark at least one skill as Required first'
                  "
                  (click)="run()"
                >
                  @if (running()) {
                    <mat-spinner diameter="14" class="pd-spin"></mat-spinner>
                    Matching…
                  } @else {
                    <i class="ti ti-sparkles"></i> Run match
                  }
                </button>
              </div>
            }
          </div>

          @if (stale() && active()) {
            <div class="pd-warn" role="status">
              <i class="ti ti-refresh"></i> The project was edited after the
              last match. Run the match again to refresh the scores.
            </div>
          }
          @if (active() && !hasRequired()) {
            <div class="pd-warn" role="status">
              <i class="ti ti-info-circle"></i> No skill is marked Required, so
              a match can’t be run. Edit the project to fix this.
            </div>
          }
          @if (!active()) {
            <div class="pd-info">
              <i class="ti ti-lock"></i> This project is closed. Members and
              results are kept, but nothing can be changed.
            </div>
          }

          <div class="pd-cols">
            <div class="pd-side">
              <div class="pd-card">
                <div class="pd-h">Description</div>
                <div class="pd-text">{{ p.description }}</div>
              </div>

              <div class="pd-card">
                <div class="pd-h">Skills needed</div>
                @for (s of p.skills; track s.skillId) {
                  <div class="pd-skill">
                    <b>{{ s.skillName }}</b>
                    <span class="pd-meta"
                      >{{ s.isRequired ? 'Required' : 'Nice to have' }} ·
                      {{ lvl(s.minimumLevel) }}</span
                    >
                  </div>
                }
              </div>
<div class="pd-card">
  <div class="pd-h">Project files ({{ docs().length }})</div>
  @if (docError()) {
    <div class="pd-err" role="alert">{{ docError() }}</div>
  }
  @for (d of docs(); track d.projectDocumentId) {
    <div class="pd-member">
      <div class="pd-grow">
        <div class="pd-name pd-file" [title]="d.fileName">{{ d.fileName }}</div>
        <div class="pd-meta">
          {{ fileSize(d.sizeBytes) }} · {{ d.uploadedByName }} · {{ fmtDay(d.uploadedAt) }}
        </div>
      </div>
      <button
        class="pd-btn"
        type="button"
        [disabled]="busyDocId() === d.projectDocumentId"
        [attr.aria-label]="'Download ' + d.fileName"
        (click)="downloadDoc(d)"
      >
        Download
      </button>
    </div>
  } @empty {
    @if (!docsLoading() && !docError()) {
      <div class="pd-meta">
        No files yet.
        @if (active()) { Add them from Edit. }
      </div>
    }
  }
</div>
              <div class="pd-card">
                <div class="pd-h">Team ({{ members().length }})</div>
                @for (t of members(); track t.employeeId) {
                  <div class="pd-member">
                    <div class="pd-grow">
                      <a
                        class="pd-name pd-link"
                        [routerLink]="['/admin/employees', t.employeeId]"
                        >{{ t.fullName }}</a
                      >
                      <div class="pd-meta">{{ t.jobTitle || '—' }}</div>
                    </div>
                    @if (active()) {
                      <button
                        class="pd-btn"
                        type="button"
                        [disabled]="busyId() === t.employeeId"
                        [attr.aria-label]="
                          'Remove ' + t.fullName + ' from the project'
                        "
                        (click)="removeMember(t)"
                      >
                        Remove
                      </button>
                    }
                  </div>
                } @empty {
                  <div class="pd-meta">No one has been added yet.</div>
                }
              </div>
            </div>

            <div class="pd-main">
              <div class="pd-mhead">
                <div class="pd-h2">Matches ({{ visibleMatches().length }})</div>
                <label class="pd-toggle">
                  <input
                    type="checkbox"
                    [checked]="showDismissed()"
                    (change)="onToggle($any($event.target).checked)"
                  />
                  Show dismissed
                </label>
              </div>

              @if (matchError()) {
                <div class="pd-banner" role="alert">
                  <i class="ti ti-alert-circle"></i> {{ matchError() }}
                </div>
              }
              @if (running()) {
                <div class="pd-info">
                  <mat-spinner diameter="18"></mat-spinner> Matching employees.
                  This can take a minute for a large department.
                </div>
              }

              @if (!p.lastMatchedAt && !running()) {
                <div class="pd-empty">
                  No match has been run yet. Run the match to see the employees
                  ranked for this project.
                </div>
              } @else if (!visibleMatches().length && !running()) {
                <div class="pd-empty">
                  No matches to show. Employees must be active and in the
                  project’s department.
                </div>
              }

              @for (m of shownMatches(); track m.employeeId) {
                <div class="pd-match" [class.pd-dim]="m.isDismissed">
                  <div class="pd-score" [class]="'pd-score ' + scoreClass(m)">
                    {{ notScored(m) ? 'N/A' : m.score }}
                  </div>
                  <div class="pd-body">
                    <div>
                      <a
                        class="pd-name pd-link"
                        [routerLink]="['/admin/employees', m.employeeId]"
                        >{{ m.fullName }}</a
                      >
                      @if (m.isMember) {
                        <span class="pd-badge pd-info-b">On project</span>
                      }
                      @if (notScored(m)) {
                        <span class="pd-badge pd-muted">Not scored</span>
                      }
                      @if (m.isDismissed) {
                        <span class="pd-badge pd-muted">Dismissed</span>
                      }
                    </div>
                    <div class="pd-meta">
                      {{ m.jobTitle || '—' }} · {{ m.departmentName || '—' }} ·
                      <span
                        [class.pd-busy]="m.activeProjectCount >= highWorkload"
                        >{{ m.activeProjectCount }} active
                        {{
                          m.activeProjectCount === 1 ? 'project' : 'projects'
                        }}</span
                      >
                    </div>
                    <div class="pd-reason">{{ m.reasoning }}</div>
                    <div class="pd-gaps">
                      @for (g of m.gaps.skills; track g.skillId) {
                        <span
                          class="pd-chip"
                          [class]="'pd-chip ' + chipClass(g)"
                          >{{ chipLabel(g) }}</span
                        >
                      }
                    </div>
                  </div>
                  <div class="pd-btns">
                    <button
                      class="pd-btn"
                      type="button"
                      [routerLink]="['/admin/employees', m.employeeId]"
                    >
                      View profile
                    </button>
                    @if (active() && !m.isMember) {
                      @if (m.isDismissed) {
                        <button
                          class="pd-btn"
                          type="button"
                          [disabled]="busyId() === m.employeeId"
                          (click)="restore(m)"
                        >
                          Restore
                        </button>
                      } @else {
                        <button
                          class="pd-btn"
                          type="button"
                          [disabled]="busyId() === m.employeeId"
                          [attr.aria-label]="'Dismiss ' + m.fullName"
                          (click)="dismiss(m)"
                        >
                          Dismiss
                        </button>
                      }
                      <button
                        class="btn-primary"
                        type="button"
                        [disabled]="busyId() === m.employeeId"
                        [attr.aria-label]="
                          'Add ' + m.fullName + ' to the project'
                        "
                        (click)="add(m)"
                      >
                        Add to project
                      </button>
                    }
                  </div>
                </div>
              }

              @if (visibleMatches().length > shownMatches().length) {
                <button
                  class="pd-btn pd-more"
                  type="button"
                  (click)="showMore()"
                >
                  Show more
                </button>
              }
            </div>
          </div>
        }
      }
    </div>

    <style>
      .pd-page {
        max-width: 1100px;
      }
      .pd-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-muted);
        cursor: pointer;
        margin-bottom: 10px;
        text-decoration: none;
      }
      .pd-back:hover {
        color: var(--navy);
      }
      .pd-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .pd-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .pd-chips {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .pd-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .pd-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pd-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 40px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 0 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        color: var(--text);
      }
      .pd-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .pd-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .pd-btn:focus-visible,
      .pd-link:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .pd-warn,
      .pd-info,
      .pd-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        padding: 10px 14px;
        border-radius: 10px;
        margin-bottom: 14px;
      }
      .pd-warn {
        background: #fff3e0;
        color: #8a5a00;
      }
      .pd-info {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .pd-banner {
        background: #fdecea;
        color: #b3261e;
      }
      .pd-cols {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .pd-side {
        flex: 1 1 280px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pd-main {
        flex: 3 1 520px;
        min-width: 0;
      }
      .pd-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px 20px;
      }
      .pd-h {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--navy);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
      }
      .pd-h2 {
        font-size: 18px;
        font-weight: 800;
        color: var(--text);
      }
      .pd-text {
        font-size: 13.5px;
        color: var(--text);
        white-space: pre-line;
      }
      .pd-skill {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 13.5px;
        padding: 5px 0;
        flex-wrap: wrap;
      }
      .pd-member {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
      }
      .pd-grow {
        flex: 1;
        min-width: 0;
      }
      .pd-name {
        font-weight: 700;
        color: var(--text);
        font-size: 14px;
      }
      .pd-link {
        text-decoration: none;
        cursor: pointer;
      }
      .pd-link:hover {
        text-decoration: underline;
      }
      .pd-mhead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .pd-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        min-height: 40px;
        cursor: pointer;
      }
      .pd-match {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        align-items: flex-start;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 12px;
      }
      .pd-dim {
        opacity: 0.7;
      }
      .pd-score {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 17px;
        flex: none;
      }
      .pd-s-hi {
        background: #e8f5e9;
        color: #1a5c35;
      }
      .pd-s-mid {
        background: #fff3e0;
        color: #8a5a00;
      }
      .pd-s-lo {
        background: #fdecea;
        color: #b3261e;
      }
      .pd-s-na {
        background: var(--surface-2);
        color: var(--text-muted);
        font-size: 12px;
      }
      .pd-body {
        flex: 1 1 300px;
        min-width: 0;
      }
      .pd-reason {
        font-size: 13.5px;
        color: var(--text);
        margin: 8px 0;
      }
      .pd-busy {
        color: #8a5a00;
        font-weight: 700;
      }
      .pd-gaps {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .pd-chip {
        font-size: 12px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        white-space: nowrap;
      }
      .pd-c-met {
        background: #e8f5e9;
        color: #1a5c35;
      }
      .pd-c-low {
        background: #fff3e0;
        color: #8a5a00;
      }
      .pd-c-mis {
        background: #fdecea;
        color: #b3261e;
      }
      .pd-c-opt {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .pd-btns {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .pd-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 20px;
        white-space: nowrap;
        margin-left: 6px;
      }
      .pd-chips .pd-badge {
        margin-left: 0;
      }
      .pd-ok {
        background: #e8f5e9;
        color: #1a5c35;
      }
      .pd-muted {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .pd-info-b {
        background: #e3ecfb;
        color: #1a3d8f;
      }
      .pd-empty {
        font-size: 13.5px;
        color: var(--text-muted);
        background: #fff;
        border: 1px dashed var(--border);
        border-radius: 16px;
        padding: 24px;
      }
      .pd-more {
        margin: 4px 0 12px;
      }
      .pd-spin {
        display: inline-block;
      }
      .pd-spin ::ng-deep circle {
        stroke: #fff;
      }
      @media (max-width: 640px) {
        .pd-match {
          padding: 14px 16px;
        }
      }
      .pd-file { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pd-err { font-size: 12.5px; color: #b3261e; margin-bottom: 6px; }
    </style>
  `,
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ProjectService);
  private toast = inject(ToastService);

  readonly highWorkload = HIGH_WORKLOAD;
  private projectId = 0;

  project = signal<ProjectResponse | null>(null);
  members = signal<ProjectMemberResponse[]>([]);
  matches = signal<ProjectMatchResponse[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  running = signal(false);
  matchError = signal<string | null>(null);
  closing = signal(false);
  busyId = signal<number | null>(null); // one row action at a time
  showDismissed = signal(false);
  limit = signal(PAGE);


  docs = signal<ProjectDocumentResponse[]>([]);
docsLoading = signal(false);
docError = signal<string | null>(null);
busyDocId = signal<number | null>(null);

  active = computed(() => {
    const p = this.project();
    return !!p && (p.status === 'Active' || (p.status as unknown) === 0);
  });
  hasRequired = computed(() =>
    (this.project()?.skills ?? []).some((s) => s.isRequired),
  );

  // Edited after the last run? (The list endpoints can't tell, but this one has both dates.)
  stale = computed(() => {
    const p = this.project();
    return (
      !!p?.lastMatchedAt &&
      !!p.updatedAt &&
      new Date(p.updatedAt) > new Date(p.lastMatchedAt)
    );
  });

  visibleMatches = computed(() =>
    this.matches().filter((m) => this.showDismissed() || !m.isDismissed),
  );
  shownMatches = computed(() => this.visibleMatches().slice(0, this.limit()));

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(this.projectId).subscribe({
      next: (p) => {
        this.project.set(p);
        this.loading.set(false);
        this.loadMembers();
this.loadDocs();
if (p.lastMatchedAt) this.loadMatches();
      },
      error: (err) => {
        this.loadError.set(this.errMsg(err, 'Could not load the project.'));
        this.loading.set(false);
      },
    });
  }

  private loadMembers(): void {
    this.api.getMembers(this.projectId).subscribe({
      next: (list) => this.members.set(list),
      error: (err) =>
        this.toast.show(this.errMsg(err, 'Could not load the team.'), 'error'),
    });
  }

  // Always ask for dismissed rows too, so the list is the same after a run and after a refresh.
  private loadMatches(): void {
    this.api.getMatches(this.projectId, true).subscribe({
      next: (res) => this.matches.set(res.matches),
      error: (err) =>
        this.matchError.set(this.errMsg(err, 'Could not load the matches.')),
    });
  }

  // ───────────── Actions ─────────────

  run(): void {
    if (this.running() || !this.active() || !this.hasRequired()) return;
    this.running.set(true);
    this.matchError.set(null);
    this.api.runMatch(this.projectId).subscribe({
      next: (res) => {
        this.matches.set(res.matches);
        this.project.update((p) =>
          p ? { ...p, lastMatchedAt: res.lastMatchedAt ?? p.lastMatchedAt } : p,
        );
        this.limit.set(PAGE);
        this.running.set(false);
        this.toast.show('Match complete.', 'success');
      },
      error: (err) => {
        this.running.set(false);
        this.matchError.set(
          this.errMsg(
            err,
            'The match could not be run. Please try again shortly.',
          ),
        );
      },
    });
  }

  closeProject(): void {
    const p = this.project();
    if (!p || this.closing()) return;
    if (
      !confirm(
        `Close ${p.name}? Members and history stay, but it can no longer be edited or matched.`,
      )
    )
      return;
    this.closing.set(true);
    this.api.close(this.projectId).subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.closing.set(false);
        this.toast.show('Project closed.', 'success');
      },
      error: (err) => {
        this.closing.set(false);
        this.toast.show(
          this.errMsg(err, 'Could not close the project.'),
          'error',
        );
      },
    });
  }

  dismiss(m: ProjectMatchResponse): void {
    this.rowAction(
      m.employeeId,
      this.api.dismissMatch(this.projectId, m.employeeId),
      () => {
        this.patchMatch(m.employeeId, (x) => ({ ...x, isDismissed: true }));
        this.toast.show(`${m.fullName} dismissed.`, 'success');
      },
      'Could not dismiss this employee.',
    );
  }

  restore(m: ProjectMatchResponse): void {
    this.rowAction(
      m.employeeId,
      this.api.restoreMatch(this.projectId, m.employeeId),
      () => {
        this.patchMatch(m.employeeId, (x) => ({ ...x, isDismissed: false }));
        this.toast.show(`${m.fullName} restored.`, 'success');
      },
      'Could not restore this employee.',
    );
  }

  add(m: ProjectMatchResponse): void {
    if (this.busyId() !== null) return;
    this.busyId.set(m.employeeId);
    this.api.addMember(this.projectId, m.employeeId).subscribe({
      next: (member) => {
        this.members.update((list) => [...list, member]);
        // The server also clears an earlier dismissal, and the active-project count now includes this project.
        this.patchMatch(m.employeeId, (x) => ({
          ...x,
          isMember: true,
          isDismissed: false,
          activeProjectCount: x.activeProjectCount + 1,
        }));
        this.project.update((p) =>
          p ? { ...p, memberCount: p.memberCount + 1 } : p,
        );
        this.busyId.set(null);
        this.toast.show(`${m.fullName} added to the project.`, 'success');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.show(
          this.errMsg(err, 'Could not add this employee.'),
          'error',
        );
      },
    });
  }

  removeMember(t: ProjectMemberResponse): void {
    if (this.busyId() !== null) return;
    if (!confirm(`Remove ${t.fullName} from this project?`)) return;
    this.busyId.set(t.employeeId);
    this.api.removeMember(this.projectId, t.employeeId).subscribe({
      next: () => {
        this.members.update((list) =>
          list.filter((x) => x.employeeId !== t.employeeId),
        );
        this.patchMatch(t.employeeId, (x) => ({
          ...x,
          isMember: false,
          activeProjectCount: Math.max(0, x.activeProjectCount - 1),
        }));
        this.project.update((p) =>
          p ? { ...p, memberCount: Math.max(0, p.memberCount - 1) } : p,
        );
        this.busyId.set(null);
        this.toast.show(`${t.fullName} removed.`, 'success');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.show(
          this.errMsg(err, 'Could not remove this employee.'),
          'error',
        );
      },
    });
  }

  private rowAction(
    employeeId: number,
    call$: Observable<void>,
    done: () => void,
    fallback: string,
  ): void {
    if (this.busyId() !== null) return;
    this.busyId.set(employeeId);
    call$.subscribe({
      next: () => {
        done();
        this.busyId.set(null);
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.show(this.errMsg(err, fallback), 'error');
      },
    });
  }

  private patchMatch(
    employeeId: number,
    fn: (m: ProjectMatchResponse) => ProjectMatchResponse,
  ): void {
    this.matches.update((list) =>
      list.map((m) => (m.employeeId === employeeId ? fn(m) : m)),
    );
  }

  onToggle(checked: boolean): void {
    this.showDismissed.set(checked);
    this.limit.set(PAGE);
  }

  showMore(): void {
    this.limit.update((n) => n + PAGE);
  }

  // ───────────── Display helpers ─────────────

  // Enums may arrive as text or as numbers, depending on the API's JSON settings.
  lvl(v: string | number | null | undefined): string {
    return typeof v === 'number' ? (LEVELS[v] ?? String(v)) : (v ?? '');
  }
  private status(g: SkillGapItem): GapStatus {
    return typeof g.status === 'number'
      ? (STATUSES[g.status] ?? 'Missing')
      : g.status;
  }

  chipLabel(g: SkillGapItem): string {
    switch (this.status(g)) {
      case 'Met':
        return `${g.skillName} · Met`;
      case 'BelowLevel':
        return `${g.skillName} · ${this.lvl(g.employeeLevel)}, needs ${this.lvl(g.requiredLevel)}`;
      default:
        return g.isRequired
          ? `${g.skillName} · Missing`
          : `${g.skillName} · Missing (optional)`;
    }
  }

  chipClass(g: SkillGapItem): string {
    const s = this.status(g);
    if (s === 'Met') return 'pd-c-met';
    if (!g.isRequired) return 'pd-c-opt'; // a missing nice-to-have is not a failure
    return s === 'BelowLevel' ? 'pd-c-low' : 'pd-c-mis';
  }

  // The service stores this fixed sentence when Gemini skips someone, and the score is then 0.
  notScored(m: ProjectMatchResponse): boolean {
    return m.reasoning?.startsWith(NOT_SCORED) ?? false;
  }

  scoreClass(m: ProjectMatchResponse): string {
    if (this.notScored(m)) return 'pd-s-na';
    return m.score >= 75 ? 'pd-s-hi' : m.score >= 50 ? 'pd-s-mid' : 'pd-s-lo';
  }

  fmtTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Handles { message } and ASP.NET { errors: { Field: [msg] } }.
  private errMsg(err: any, fallback: string): string {
    const e = err?.error;
    if (e?.message) return e.message;
    if (e?.errors) {
      const first = (Object.values(e.errors) as unknown[]).flat()[0];
      if (first) return String(first);
    }
    return err?.message ?? fallback;
  }
  private loadDocs(): void {
  this.docsLoading.set(true);
  this.api.getDocuments(this.projectId).subscribe({
    next: (list) => {
      this.docs.set(list);
      this.docsLoading.set(false);
    },
    error: (err) => {
      this.docsLoading.set(false);
      this.docError.set(this.errMsg(err, 'Could not load the project files.'));
    },
  });
}

downloadDoc(d: ProjectDocumentResponse): void {
  if (this.busyDocId() !== null) return;
  this.docError.set(null);
  this.busyDocId.set(d.projectDocumentId);
  this.api.downloadDocument(this.projectId, d.projectDocumentId).subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.fileName;
      a.click();
      URL.revokeObjectURL(url);
      this.busyDocId.set(null);
    },
    error: (err) => {
      this.busyDocId.set(null);
      // A blob request's error body is a Blob, so use fixed messages.
      this.docError.set(
        err?.status === 404
          ? 'The file could not be found on the server.'
          : 'Could not download the file.',
      );
    },
  });
}

fileSize(b: number): string {
  return b >= 1048576
    ? `${(b / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;
}

fmtDay(d: string): string {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
}
