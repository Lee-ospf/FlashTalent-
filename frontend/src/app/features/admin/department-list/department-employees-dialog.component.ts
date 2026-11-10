import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DepartmentService } from '../../../core/services/department.service';
import { EmployeeListItem } from '../../../core/models';

export interface DepartmentEmployeesDialogData {
  departmentId: number;
  name: string;
}

@Component({
  selector: 'app-department-employees-dialog',
  standalone: true,
  imports: [RouterLink, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title class="de-title">
      {{ data.name }}
      @if (employees() !== null) {
        <span class="de-count">{{ total() }} {{ total() === 1 ? 'employee' : 'employees' }}</span>
      }
    </h2>

    <mat-dialog-content class="de-content">
      @if (failed()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> We couldn’t load the employees.
          <a class="de-link" (click)="load()">Try again</a>
        </div>
      } @else if (employees() === null) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <div class="de-scroll">
          <div class="de-table">
            <div class="de-grid de-head">
              <div>Employee</div>
              <div>Job title</div>
              <div>Hired</div>
            </div>
            @for (e of paged(); track e.employeeId) {
              <a class="de-grid de-row" [routerLink]="['/admin/employees', e.employeeId]">
                <div>
                  <div class="de-name">{{ e.firstName }} {{ e.lastName }}</div>
                  <div class="de-meta">{{ e.email }}</div>
                </div>
                <div>{{ e.jobTitle || '—' }}</div>
                <div>{{ e.hireDate ? fmt(e.hireDate) : '—' }}</div>
              </a>
            } @empty {
              <div class="de-empty">No active employees in this department.</div>
            }
          </div>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions class="de-foot">
      @if (total() > 0) {
        <div class="de-meta">Showing {{ from() }}–{{ to() }} of {{ total() }}</div>

        <div class="de-pagesize">
          <label for="de-pp" class="de-meta">Rows</label>
          <select id="de-pp" class="de-select" (change)="onPageSize($any($event.target).value)">
            @for (n of sizes; track n) {
              <option [value]="n" [selected]="n === pageSize()">{{ n }}</option>
            }
          </select>
        </div>

        <nav class="de-pager" aria-label="Pagination">
          <button class="de-pg" type="button" [disabled]="current() === 1" (click)="go(current() - 1)">Previous</button>
          @for (p of pages(); track p) {
            <button class="de-pg" type="button" [class.de-on]="p === current()"
                    [attr.aria-current]="p === current() ? 'page' : null" (click)="go(p)">{{ p }}</button>
          }
          <button class="de-pg" type="button" [disabled]="current() === totalPages()" (click)="go(current() + 1)">Next</button>
        </nav>
      }
      <button mat-button type="button" mat-dialog-close>Close</button>
    </mat-dialog-actions>

    <style>
      .de-title { display: flex; align-items: baseline; gap: 10px; }
      .de-count { font-size: 13px; font-weight: 400; color: var(--text-muted); }
      .de-content { padding-bottom: 0; }
      .de-scroll { overflow-x: auto; }
      .de-table { min-width: 520px; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
      .de-grid { display: grid; grid-template-columns: 2.2fr 1.4fr 1fr; gap: 16px; padding: 12px 16px; align-items: center; }
      .de-head { font-size: 12px; font-weight: 700; color: var(--text-muted); background: var(--surface-2); }
      .de-row { border-top: 1px solid var(--border); color: inherit; text-decoration: none; font-size: 14px; }
      .de-row:hover { background: var(--surface-2); }
      .de-row:focus-visible { outline: 2px solid var(--navy); outline-offset: -2px; }
      .de-name { font-weight: 600; color: var(--text); }
      .de-meta { font-size: 12.5px; color: var(--text-muted); }
      .de-empty { padding: 24px; font-size: 13px; color: var(--text-muted); border-top: 1px solid var(--border); }
      .de-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 24px 16px; }
      .de-pagesize { display: flex; align-items: center; gap: 6px; }
      .de-select { padding: 6px 8px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; }
      .de-pager { display: flex; gap: 6px; flex-wrap: wrap; }
      .de-pg { min-width: 36px; min-height: 36px; padding: 0 10px; border: 1px solid var(--border); background: #fff; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; }
      .de-pg:hover:not(:disabled) { background: var(--surface-2); }
      .de-pg:disabled { opacity: 0.5; cursor: default; }
      .de-on, .de-on:hover:not(:disabled) { background: var(--navy); border-color: var(--navy); color: #fff; }
      .de-link { color: var(--navy); cursor: pointer; text-decoration: underline; margin-left: 8px; }
    </style>
  `
})
export class DepartmentEmployeesDialogComponent implements OnInit {
  readonly data = inject<DepartmentEmployeesDialogData>(MAT_DIALOG_DATA);
  private departmentService = inject(DepartmentService);

  readonly sizes = [5, 10, 25];

  employees = signal<EmployeeListItem[] | null>(null);
  failed = signal(false);
  page = signal(1);
  pageSize = signal(10);

  total = computed(() => this.employees()?.length ?? 0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  current = computed(() => Math.min(this.page(), this.totalPages()));
  paged = computed(() => {
    const start = (this.current() - 1) * this.pageSize();
    return (this.employees() ?? []).slice(start, start + this.pageSize());
  });
  from = computed(() => (this.total() ? (this.current() - 1) * this.pageSize() + 1 : 0));
  to = computed(() => Math.min(this.current() * this.pageSize(), this.total()));
  pages = computed(() => {
    const t = this.totalPages();
    const start = Math.max(1, Math.min(this.current() - 2, t - 4));
    const end = Math.min(t, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.failed.set(false);
    this.employees.set(null);
    this.departmentService.getEmployees(this.data.departmentId).subscribe({
      next: list => this.employees.set(list),
      error: () => this.failed.set(true)
    });
  }

  onPageSize(v: string): void {
    this.pageSize.set(Number(v));
    this.page.set(1);
  }

  go(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  fmt(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}