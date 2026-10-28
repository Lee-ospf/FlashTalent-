import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectListItem, isActiveProject } from '../../../core/models';

// Route: admin/projects (HR, Admin).
// GET api/projects has no paging, so the list loads once and is filtered and paged in the browser.
// "Re-run needed" isn't shown here because the list has no UpdatedAt; the detail page can show it.
@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container pl-page">
      <div class="pl-head">
        <div>
          <div class="pl-title">Projects</div>
          <div class="pl-sub">
            Create a project, run a match and build the team from your
            employees.
          </div>
        </div>
        <button
          class="btn-primary"
          type="button"
          routerLink="/admin/projects/new"
        >
          <i class="ti ti-plus"></i> New project
        </button>
      </div>

      <div class="pl-filters">
        <div class="pl-f pl-grow">
          <label for="pl-q">Search</label>
          <input
            id="pl-q"
            class="pl-input"
            placeholder="Search by project name"
            [value]="search()"
            (input)="onSearch($any($event.target).value)"
          />
        </div>
        <div class="pl-f">
          <label for="pl-s">Status</label>
          <select
            id="pl-s"
            class="pl-input"
            (change)="onStatus($any($event.target).value)"
          >
            @for (s of statuses; track s) {
              <option [value]="s" [selected]="s === status()">{{ s }}</option>
            }
          </select>
        </div>
      </div>

      @if (failed()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> We couldn’t load the projects.
          <a class="pl-link" (click)="load()">Try again</a>
        </div>
      } @else if (projects() === null) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <div class="pl-card">
          <div class="pl-scroll">
            <div class="pl-table">
              <div class="pl-grid pl-thead">
                <div>Project</div>
                <div>Department</div>
                <div>Skills</div>
                <div>Members</div>
                <div>Status</div>
                <div>Last matched</div>
              </div>
              @for (p of paged(); track p.projectId) {
                <a
                  class="pl-grid pl-row"
                  [routerLink]="['/admin/projects', p.projectId]"
                >
                  <div>
                    <div class="pl-name">{{ p.name }}</div>
                    <div class="pl-meta">Created by {{ p.createdByName }}</div>
                  </div>
                  <div>{{ p.departmentName || 'All departments' }}</div>
                  <div>{{ p.skillCount }}</div>
                  <div>{{ p.memberCount }}</div>
                  <div>
                    <span
                      class="pl-badge"
                      [class.pl-ok]="isActive(p)"
                      [class.pl-muted]="!isActive(p)"
                      >{{ isActive(p) ? 'Active' : 'Closed' }}</span
                    >
                  </div>
                  <div>
                    @if (p.lastMatchedAt) {
                      <span>{{ fmt(p.lastMatchedAt) }}</span>
                    } @else if (isActive(p)) {
                      <span class="pl-badge pl-muted">Not matched yet</span>
                    } @else {
                      <span>—</span>
                    }
                  </div>
                </a>
              } @empty {
                <div class="pl-empty">No projects match your filters.</div>
              }
            </div>
          </div>

          <div class="pl-foot">
            <div class="pl-meta">
              Showing {{ from() }}–{{ to() }} of
              {{ filtered().length }} projects
            </div>
            <div class="pl-pagesize">
              <label for="pl-pp" class="pl-meta">Rows per page</label>
              <select
                id="pl-pp"
                class="pl-input pl-narrow"
                (change)="onPageSize($any($event.target).value)"
              >
                @for (n of sizes; track n) {
                  <option [value]="n" [selected]="n === pageSize()">
                    {{ n }}
                  </option>
                }
              </select>
            </div>
            <nav class="pl-pager" aria-label="Pagination">
              <button
                class="pl-pg"
                type="button"
                [disabled]="current() === 1"
                (click)="go(current() - 1)"
              >
                Previous
              </button>
              @for (n of pages(); track n) {
                <button
                  class="pl-pg"
                  type="button"
                  [class.pl-on]="n === current()"
                  [attr.aria-current]="n === current() ? 'page' : null"
                  (click)="go(n)"
                >
                  {{ n }}
                </button>
              }
              <button
                class="pl-pg"
                type="button"
                [disabled]="current() === totalPages()"
                (click)="go(current() + 1)"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      }
    </div>

    <style>
      .pl-page {
        max-width: 1100px;
      }
      .pl-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
      }
      .pl-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .pl-sub {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .pl-filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 20px 0 16px;
        align-items: flex-end;
      }
      .pl-f label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .pl-f {
        min-width: 170px;
      }
      .pl-grow {
        flex: 1 1 260px;
      }
      .pl-input {
        width: 100%;
        box-sizing: border-box;
        padding: 9px 10px;
        font: inherit;
        font-size: 13px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
        min-height: 40px;
      }
      .pl-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .pl-narrow {
        width: 76px;
      }
      .pl-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .pl-scroll {
        overflow-x: auto;
      }
      .pl-table {
        min-width: 760px;
      }
      .pl-grid {
        display: grid;
        grid-template-columns: 2.4fr 1.2fr 0.7fr 0.8fr 0.9fr 1.5fr;
        gap: 16px;
        padding: 14px 24px;
        align-items: center;
      }
      .pl-thead {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .pl-row {
        border-top: 1px solid var(--border);
        color: inherit;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
      }
      .pl-row:hover {
        background: var(--surface-2);
      }
      .pl-row:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: -2px;
      }
      .pl-name {
        font-weight: 700;
        color: var(--text);
      }
      .pl-meta {
        font-size: 12.5px;
        color: var(--text-muted);
      }
      .pl-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
        white-space: nowrap;
      }
      .pl-ok {
        background: #e8f5e9;
        color: #1a5c35;
      }
      .pl-muted {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .pl-empty {
        padding: 24px;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
      }
      .pl-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding: 12px 24px;
        border-top: 1px solid var(--border);
      }
      .pl-pagesize {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pl-pager {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .pl-pg {
        min-width: 40px;
        min-height: 40px;
        padding: 0 12px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .pl-pg:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .pl-pg:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .pl-on {
        background: var(--navy);
        border-color: var(--navy);
        color: #fff;
      }
      .pl-on:hover:not(:disabled) {
        background: var(--navy);
      }
      .pl-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
      @media (max-width: 560px) {
        .pl-grid {
          padding: 12px 16px;
        }
        .pl-foot {
          padding: 12px 16px;
        }
      }
    </style>
  `,
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);

  readonly statuses = ['All', 'Active', 'Closed'];
  readonly sizes = [5, 10, 25];
  readonly isActive = isActiveProject;

  projects = signal<ProjectListItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  status = signal('All');
  page = signal(1);
  pageSize = signal(10);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const st = this.status();
    return (this.projects() ?? []).filter((p) => {
      if (st === 'Active' && !isActiveProject(p)) return false;
      if (st === 'Closed' && isActiveProject(p)) return false;
      return !q || p.name.toLowerCase().includes(q);
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize())),
  );
  current = computed(() => Math.min(this.page(), this.totalPages()));
  paged = computed(() => {
    const start = (this.current() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  from = computed(() =>
    this.filtered().length ? (this.current() - 1) * this.pageSize() + 1 : 0,
  );
  to = computed(() =>
    Math.min(this.current() * this.pageSize(), this.filtered().length),
  );
  pages = computed(() => {
    const t = this.totalPages();
    const start = Math.max(1, Math.min(this.current() - 2, t - 4));
    const end = Math.min(t, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    this.projects.set(null);
    this.projectService.getAll().subscribe({
      next: (list) => this.projects.set(list),
      error: () => this.failed.set(true),
    });
  }

  onSearch(v: string): void {
    this.search.set(v);
    this.page.set(1);
  }
  onStatus(v: string): void {
    this.status.set(v);
    this.page.set(1);
  }
  onPageSize(v: string): void {
    this.pageSize.set(Number(v));
    this.page.set(1);
  }
  go(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  fmt(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
