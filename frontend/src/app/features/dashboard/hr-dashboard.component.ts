import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { EmployeeProfileService } from '../../core/services/employee-profile.service';
import {
  EmployeeListItem,
  ProjectListItem,
  isActiveProject,
} from '../../core/models/index';

// TODO: change these to your real HR routes.
const ROUTES = {
  employees: '/admin/employees',
  projects: '/admin/projects',
  newProject: '/admin/projects/new',
  project: (id: number) => ['/admin/projects', id],
};

interface AttentionItem {
  id: number;
  name: string;
  meta: string;
  reasons: { label: string; cls: 'warn' | 'muted' }[];
}

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container hd-page">
      <div class="hd-head">
        <div>
          <div class="hd-title">Welcome back, {{ userName() }}</div>
          <div class="hd-sub">Here’s your workforce and projects at a glance</div>
        </div>
        <div class="hd-actions">
          <button class="hd-btn" type="button" [routerLink]="routes.employees">
            <i class="ti ti-users"></i> View employees
          </button>
          <button class="btn-primary" type="button" [routerLink]="routes.newProject">
            <i class="ti ti-plus"></i> New project
          </button>
        </div>
      </div>

      @if (projectsFailed()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> We couldn’t load your projects.
          <a class="hd-link" (click)="load()">Try again</a>
        </div>
      }

      <div class="hd-stats">
        <div class="hd-card">
          <div class="hd-k">Active employees</div>
          <div class="hd-v">{{ employeeStat() }}</div>
        </div>
        <div class="hd-card">
          <div class="hd-k">Active projects</div>
          <div class="hd-v">{{ activeProjectStat() }}</div>
        </div>
        <div class="hd-card">
          <div class="hd-k">Projects to match</div>
          <div class="hd-v hd-warn-text">{{ toMatchStat() }}</div>
        </div>
      </div>

      <div class="hd-card">
        <div class="hd-cardhead">
          <div class="hd-h">Projects needing attention</div>
          <a class="hd-link" [routerLink]="routes.projects">View all</a>
        </div>

        @if (projectsFailed()) {
          <div class="hd-empty">Projects aren’t available right now.</div>
        } @else if (projects() === null) {
          <div class="hd-empty"><mat-spinner diameter="24"></mat-spinner></div>
        } @else if (!attention().length) {
          <div class="hd-empty">Nothing needs attention right now.</div>
        } @else {
          <div class="hd-list">
            @for (item of attention(); track item.id) {
              <a class="hd-row" [routerLink]="routes.project(item.id)">
                <div class="hd-grow">
                  <div class="hd-rowtitle">{{ item.name }}</div>
                  <div class="hd-meta">{{ item.meta }}</div>
                </div>
                @for (r of item.reasons; track r.label) {
                  <span class="hd-badge hd-{{ r.cls }}">{{ r.label }}</span>
                }
              </a>
            }
          </div>
        }
      </div>
    </div>

    <style>
      .hd-page { max-width: 1100px; }
      .hd-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
      .hd-title { font-size: 26px; font-weight: 800; color: var(--text); }
      .hd-sub { font-size: 14px; color: var(--text-muted); margin-top: 2px; }
      .hd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .hd-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; color: var(--text); }
      .hd-btn:hover { background: var(--surface-2); }
      .hd-link { font-size: 13px; color: var(--navy); cursor: pointer; text-decoration: underline; margin-left: 8px; }
      .hd-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
      .hd-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; margin-bottom: 0; }
      .hd-stats + .hd-card { margin-top: 0; }
      .hd-k { font-size: 13px; color: var(--text-muted); }
      .hd-v { font-size: 32px; font-weight: 800; color: var(--text); margin-top: 4px; }
      .hd-warn-text { color: #8a5a00; }
      .hd-cardhead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .hd-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }
      .hd-list { display: flex; flex-direction: column; gap: 8px; }
      .hd-row { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; flex-wrap: wrap; color: inherit; text-decoration: none; cursor: pointer; }
      .hd-row:hover { background: var(--surface-2); }
      .hd-row:focus-visible, .hd-btn:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
      .hd-grow { flex: 1; min-width: 0; }
      .hd-rowtitle { font-size: 14px; font-weight: 700; color: var(--text); }
      .hd-meta { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
      .hd-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
      .hd-warn { background: #fff3e0; color: #8a5a00; }
      .hd-muted { background: var(--surface-2); color: var(--text-muted); }
      .hd-empty { font-size: 13px; color: var(--text-muted); padding: 8px 0; }
      @media (max-width: 560px) { .hd-card { padding: 16px; } }
    </style>
  `,
})
export class HrDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private projectService = inject(ProjectService);
  private employeeService = inject(EmployeeProfileService);

  readonly routes = ROUTES;
  readonly userName = computed(() => this.auth.currentUser()?.firstName ?? 'there');

  projects = signal<ProjectListItem[] | null>(null); // null = still loading
  employees = signal<EmployeeListItem[] | null>(null);
  projectsFailed = signal(false);
  employeesFailed = signal(false);

  private activeProjects = computed(() => (this.projects() ?? []).filter(isActiveProject));

  employeeStat = computed(() => {
    if (this.employeesFailed()) return '—';
    const list = this.employees();
    return list === null ? '…' : String(list.filter((e) => e.status === 'Active').length);
  });

  activeProjectStat = computed(() =>
    this.projectsFailed() ? '—' : this.projects() === null ? '…' : String(this.activeProjects().length));

  // Active projects that have never had a match run.
  toMatchStat = computed(() =>
    this.projectsFailed()
      ? '—'
      : this.projects() === null
        ? '…'
        : String(this.activeProjects().filter((p) => !p.lastMatchedAt).length));

  // The list endpoint has no UpdatedAt, so "re-run needed" can't be worked out here
  // (it can on the project detail page, where GET api/projects/{id} returns it).
  attention = computed<AttentionItem[]>(() =>
    this.activeProjects()
      .map((p) => {
        const reasons: AttentionItem['reasons'] = [];
        if (!p.lastMatchedAt) reasons.push({ label: 'Not matched yet', cls: 'muted' });
        if (p.memberCount === 0) reasons.push({ label: 'No members yet', cls: 'warn' });
        return {
          id: p.projectId,
          name: p.name,
          meta: `${p.departmentName ?? 'All departments'} · ${p.memberCount} ${p.memberCount === 1 ? 'member' : 'members'}`,
          reasons,
        };
      })
      .filter((item) => item.reasons.length > 0)
      .slice(0, 5));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.projectsFailed.set(false);
    this.employeesFailed.set(false);
    this.projects.set(null);
    this.employees.set(null);

    this.projectService.getAll().subscribe({
      next: (list) => this.projects.set(list),
      error: () => this.projectsFailed.set(true),
    });
    this.employeeService.getAll().subscribe({
      next: (list) => this.employees.set(list),
      error: () => this.employeesFailed.set(true),
    });
  }
}