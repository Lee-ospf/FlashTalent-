import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ToastService } from '../../../core/services/toast.service';
import { RecruiterResponse } from '../../../core/models';

@Component({
  selector: 'app-recruiter-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-user-star"></i> Manage recruiters</h2>
          <p class="page-sub">Link an existing user account to a recruiter profile</p>
        </div>
      </div>

    <div class="info-banner warn" style="margin-bottom:16px">
  <i class="ti ti-info-circle"></i>
  Enter the User ID of the account you want to designate as a recruiter. This ID is assigned when the user registers.
</div>

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-plus"></i> Add a recruiter</div>
          <form [formGroup]="form" (ngSubmit)="add()" style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
            <mat-form-field appearance="outline" style="width:160px">
              <mat-label>User ID</mat-label>
              <input matInput type="number" formControlName="userId">
              @if (invalid('userId')) { <mat-error>Required</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex:1;min-width:200px">
              <mat-label>Job title</mat-label>
              <input matInput formControlName="jobTitle" placeholder="e.g. Senior Recruiter">
              @if (invalid('jobTitle')) { <mat-error>Required</mat-error> }
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" style="height:56px;border-radius:8px" [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-plus"></i> Add recruiter
            </button>
          </form>
          @if (apiError) {
            <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
          }
        </mat-card-content>
      </mat-card>

      <div class="card-header"><i class="ti ti-list"></i> Existing recruiters ({{ recruiters().length }})</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!recruiters().length) {
        <div class="empty-state"><i class="ti ti-user-star"></i><p>No recruiters added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (r of recruiters(); track r.recruiterId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ r.fullName || r.email }}</div>
                <div class="doc-meta">{{ r.jobTitle }} · Recruiter #{{ r.recruiterId }} · User #{{ r.userId }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class RecruiterListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private recruiterService = inject(RecruiterService);
  private toast = inject(ToastService);

  recruiters = signal<RecruiterResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';

  form = this.fb.group({
    userId: [null as number | null, Validators.required],
    jobTitle: ['', Validators.required]
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.recruiterService.getAll().subscribe({
      next: r => { this.recruiters.set(r); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.recruiterService.create(this.form.value as { userId: number; jobTitle: string }).subscribe({
      next: created => {
        this.recruiters.update(list => [...list, created]);
        this.saving.set(false);
        this.form.reset();
        this.toast.show(`Recruiter profile created for User #${created.userId}.`, 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }
}