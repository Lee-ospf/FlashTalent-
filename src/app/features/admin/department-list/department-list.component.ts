import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DepartmentService } from '../../../core/services/department.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentResponse } from '../../../core/models';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-building-community"></i> Manage departments</h2>
          <p class="page-sub">Departments used for internal vacancies</p>
        </div>
      </div>

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
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

      <div class="card-header"><i class="ti ti-list"></i> Existing departments ({{ departments().length }})</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!departments().length) {
        <div class="empty-state"><i class="ti ti-building-community"></i><p>No departments added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (d of departments(); track d.departmentId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ d.name }}</div>
                <div class="doc-meta">{{ d.isActive ? 'Active' : 'Inactive' }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DepartmentListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private departmentService = inject(DepartmentService);
  private toast = inject(ToastService);

  departments = signal<DepartmentResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';

  form = this.fb.group({ name: ['', Validators.required] });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
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
    this.apiError = '';
    this.saving.set(true);
    this.departmentService.create(this.form.value as { name: string }).subscribe({
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