import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentService } from '../../../core/services/department.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentResponse,EmployeeListItem} from '../../../core/models';
import { MatDialog } from '@angular/material/dialog';
import { DepartmentEmployeesDialogComponent } from './department-employees-dialog.component';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-building-community"></i> Departments</h2>
          <p class="page-sub">{{ isAdmin() ? 'Add and manage departments used for internal vacancies' : 'Departments used for internal vacancies' }}</p>
        </div>
      </div>

      @if (isAdmin()) {
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
          <mat-card-content style="padding:18px 20px">
            <div class="form-section-label"><i class="ti ti-plus"></i> Add a department</div>
            <form [formGroup]="form" (ngSubmit)="add()" style="display:flex;gap:10px;align-items:flex-start">
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>Department name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. IT">
                @if (invalid('name')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" style="height:56px;border-radius:8px"
                      [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
                <i class="ti ti-plus"></i> Add department
              </button>
            </form>
            @if (apiError) {
              <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
            }
          </mat-card-content>
        </mat-card>
      }

      @if (!loading()) {
        <div class="search-wrap" style="max-width:340px;margin-bottom:16px">
          <i class="ti ti-search search-icon"></i>
          <input [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" type="search" class="search-input" placeholder="Search departments…">
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state"><i class="ti ti-building-community"></i><p>{{ searchQ() ? 'No departments match your search.' : 'No departments added yet.' }}</p></div>
      } @else {
<div class="directory-grid">
  @for (d of filtered(); track d.departmentId) {
    <div class="directory-card">
      <button type="button" class="dc-head"
              [class.static]="!canViewEmployees()"
              [attr.aria-haspopup]="canViewEmployees() ? 'dialog' : null"
              (click)="openEmployees(d)">
        <div class="directory-avatar"><i class="ti ti-building-community"></i></div>
        <div class="directory-info">
          <div class="directory-name">{{ d.name }}</div>
          <div class="directory-meta">
            <span class="status-pill" [class.s-offer]="d.isActive" [class.s-rejected]="!d.isActive">
              {{ d.isActive ? 'Active' : 'Inactive' }}
            </span>
            <span class="dc-count">
              {{ d.headCount }} {{ d.headCount === 1 ? 'employee' : 'employees' }}
            </span>
          </div>
        </div>
        @if (canViewEmployees()) {
          <i class="ti ti-chevron-right dc-chevron"></i>
        }
      </button>
    </div>
  }
</div>
      }
    </div>

    <style>
      .directory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
      .directory-card {
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
  overflow: hidden;
}

.dc-head {
  display: flex; align-items: flex-start; gap: 12px; padding: 16px; width: 100%;
  background: none; border: 0; font: inherit; text-align: left; cursor: pointer;
}
.dc-head.static { cursor: default; }
.dc-head:focus-visible { outline: 2px solid var(--navy); outline-offset: -2px; }
.dc-count { font-size: 12.5px; color: var(--text-muted); margin-left: 8px; }
.dc-chevron { margin-left: auto; color: var(--text-muted); align-self: center; }

   .directory-avatar {
        width: 42px; height: 42px; border-radius: 10px; background: var(--surface-2); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
      }
      .directory-info { flex: 1; min-width: 0; }
      .directory-name { font-size: 14px; font-weight: 600; color: var(--text); }
      .directory-meta { margin-top: 8px; }
    </style>
  `
})
export class DepartmentListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private departmentService = inject(DepartmentService);
  private toast = inject(ToastService);

  departments = signal<DepartmentResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  searchQ = signal('');

  form = this.fb.group({ name: ['', Validators.required] });

  filtered = computed(() => {
    const q = this.searchQ().trim().toLowerCase();
    return q ? this.departments().filter(d => d.name.toLowerCase().includes(q)) : this.departments();
  });

  isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'Admin';
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
canViewEmployees = computed(() => {
  const role = this.auth.currentUser()?.role;
  return role === 'Admin' || role === 'HR';
});
private dialog = inject(MatDialog);

openEmployees(d: DepartmentResponse): void {
  if (!this.canViewEmployees()) return;

  this.dialog.open(DepartmentEmployeesDialogComponent, {
    data: { departmentId: d.departmentId, name: d.name },
    width: '800px',
    maxWidth: '95vw'
  });
}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.departmentService.getAll().subscribe({
      next: d => { this.departments.set(d); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

 add(): void {
  if (this.form.invalid) return;

  const name = (this.form.value.name ?? '').trim();

  if (this.departments().some(d => d.name.trim().toLowerCase() === name.toLowerCase())) {
    this.apiError = `A department named '${name}' already exists.`;
    return;
  }

  this.apiError = '';
  this.saving.set(true);
  this.departmentService.create({ name }).subscribe({
    next: created => {
      this.departments.update(list => [...list, created]);
      this.saving.set(false);
      this.form.reset();
      this.toast.show(`"${created.name}" added.`, 'success');
    },
    error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
  });
}
  }
