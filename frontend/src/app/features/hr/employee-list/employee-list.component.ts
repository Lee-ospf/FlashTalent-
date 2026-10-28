import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { EmployeeListItem } from '../../../core/models/index';
@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container el-page">
      <div class="el-title">Employees</div>
      <div class="el-sub">Browse skills and profiles by department.</div>

      <div class="el-filters">
        <div class="el-f el-grow">
          <label for="el-q">Search</label>
          <input
            id="el-q"
            class="el-input"
            placeholder="Name, email or job title"
            [value]="search()"
            (input)="onSearch($any($event.target).value)"
          />
        </div>
        <div class="el-f">
          <label for="el-d">Department</label>
          <select
            id="el-d"
            class="el-input"
            (change)="onDepartment($any($event.target).value)"
          >
            <option value="All">All departments</option>
            @for (d of departments(); track d) {
              <option [value]="d" [selected]="d === department()">
                {{ d }}
              </option>
            }
          </select>
        </div>
        <div class="el-f">
          <label for="el-s">Status</label>
          <select
            id="el-s"
            class="el-input"
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
          <i class="ti ti-alert-circle"></i> We couldn’t load the employees.
          <a class="el-link" (click)="load()">Try again</a>
        </div>
      } @else if (employees() === null) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <div class="el-card">
          <div class="el-scroll">
            <div class="el-table">
              <div class="el-grid el-head">
                <div>Employee</div>
                <div>Job title</div>
                <div>Department</div>
                <div>Hired</div>
                <div>Status</div>
              </div>
              @for (e of paged(); track e.employeeId) {
                <a
                  class="el-grid el-row"
                  [routerLink]="['/admin/employees', e.employeeId]"
                >
                  <div>
                    <div class="el-name">
                      {{ e.firstName }} {{ e.lastName }}
                    </div>
                    <div class="el-meta">{{ e.email }}</div>
                  </div>
                  <div>{{ e.jobTitle || '—' }}</div>
                  <div>{{ e.departmentName || '—' }}</div>
                  <div>{{ e.hireDate ? fmt(e.hireDate) : '—' }}</div>
                  <div>
                    <span
                      class="el-badge"
                      [class.el-ok]="isActive(e)"
                      [class.el-muted]="!isActive(e)"
                      >{{ e.status || 'Active' }}</span
                    >
                  </div>
                </a>
              } @empty {
                <div class="el-empty">No employees match your filters.</div>
              }
            </div>
          </div>

          <div class="el-foot">
            <div class="el-meta">
              Showing {{ from() }}–{{ to() }} of
              {{ filtered().length }} employees
            </div>
            <div class="el-pagesize">
              <label for="el-pp" class="el-meta">Rows per page</label>
              <select
                id="el-pp"
                class="el-input el-narrow"
                (change)="onPageSize($any($event.target).value)"
              >
                @for (n of sizes; track n) {
                  <option [value]="n" [selected]="n === pageSize()">
                    {{ n }}
                  </option>
                }
              </select>
            </div>
            <nav class="el-pager" aria-label="Pagination">
              <button
                class="el-pg"
                type="button"
                [disabled]="current() === 1"
                (click)="go(current() - 1)"
              >
                Previous
              </button>
              @for (p of pages(); track p) {
                <button
                  class="el-pg"
                  type="button"
                  [class.el-on]="p === current()"
                  [attr.aria-current]="p === current() ? 'page' : null"
                  (click)="go(p)"
                >
                  {{ p }}
                </button>
              }
              <button
                class="el-pg"
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
      .el-page {
        max-width: 1100px;
      }
      .el-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .el-sub {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .el-filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 20px 0 16px;
        align-items: flex-end;
      }
      .el-f label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .el-f {
        min-width: 170px;
      }
      .el-grow {
        flex: 1 1 260px;
      }
      .el-input {
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
      .el-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .el-narrow {
        width: 76px;
      }
      .el-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .el-scroll {
        overflow-x: auto;
      }
      .el-table {
        min-width: 720px;
      }
      .el-grid {
        display: grid;
        grid-template-columns: 2.2fr 1.6fr 1.1fr 1fr 0.8fr;
        gap: 16px;
        padding: 14px 24px;
        align-items: center;
      }
      .el-head {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .el-row {
        border-top: 1px solid var(--border);
        color: inherit;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
      }
      .el-row:hover {
        background: var(--surface-2);
      }
      .el-row:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: -2px;
      }
      .el-name {
        font-weight: 700;
        color: var(--text);
      }
      .el-meta {
        font-size: 12.5px;
        color: var(--text-muted);
      }
      .el-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
        white-space: nowrap;
      }
      .el-ok {
        background: #e8f5e9;
        color: #1a5c35;
      }
      .el-muted {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .el-empty {
        padding: 24px;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
      }
      .el-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding: 12px 24px;
        border-top: 1px solid var(--border);
      }
      .el-pagesize {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .el-pager {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .el-pg {
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
      .el-pg:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .el-pg:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .el-on {
        background: var(--navy);
        border-color: var(--navy);
        color: #fff;
      }
      .el-on:hover:not(:disabled) {
        background: var(--navy);
      }
      .el-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
      @media (max-width: 560px) {
        .el-grid {
          padding: 12px 16px;
        }
        .el-foot {
          padding: 12px 16px;
        }
      }
    </style>
  `,
})
export class EmployeeListComponent implements OnInit {
  private directory = inject(UserDirectoryService);

  readonly statuses = ['Active', 'Inactive', 'All'];
  readonly sizes = [5, 10, 25];

  employees = signal<EmployeeListItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  department = signal('All');
  status = signal('Active');
  page = signal(1);
  pageSize = signal(10);

  departments = computed(() =>
    Array.from(
      new Set(
        (this.employees() ?? [])
          .map((e) => e.departmentName)
          .filter((d): d is string => !!d),
      ),
    ).sort(),
  );

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const dep = this.department();
    const st = this.status();
    return (this.employees() ?? []).filter((e) => {
      if (dep !== 'All' && e.departmentName !== dep) return false;
      if (st === 'Active' && !this.isActive(e)) return false;
      if (st === 'Inactive' && this.isActive(e)) return false;
      if (!q) return true;
      return `${e.firstName} ${e.lastName} ${e.email} ${e.jobTitle ?? ''}`
        .toLowerCase()
        .includes(q);
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
    this.employees.set(null);
    this.directory.getEmployees().subscribe({
      next: (list) => this.employees.set(list),
      error: () => this.failed.set(true),
    });
  }

  isActive(e: EmployeeListItem): boolean {
    return !e.status || e.status === 'Active';
  }

  onSearch(v: string): void {
    this.search.set(v);
    this.page.set(1);
  }
  onDepartment(v: string): void {
    this.department.set(v);
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
