import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ToastService } from '../../../core/services/toast.service';
import { RecruiterResponse } from '../../../core/models';

@Component({
  selector: 'app-recruiter-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-user-star"></i> Recruiters</h2>
          <p class="page-sub">{{ isAdmin() ? 'Link an existing user account to a recruiter profile' : 'Recruiters on the team' }}</p>
        </div>
      </div>

      @if (isAdmin()) {
        <div class="info-banner warn" style="margin-bottom:16px">
          <i class="ti ti-info-circle"></i>
          Enter the User ID of the account you want to designate as a recruiter. This ID is assigned when the user registers.
        </div>

        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
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
      }

      @if (!loading()) {
        <div class="search-wrap" style="max-width:340px;margin-bottom:16px">
          <i class="ti ti-search search-icon"></i>
          <input [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" type="search" class="search-input" placeholder="Search recruiters…">
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state"><i class="ti ti-user-star"></i><p>{{ searchQ() ? 'No recruiters match your search.' : 'No recruiters added yet.' }}</p></div>
      } @else {
        <div class="directory-grid">
          @for (r of filtered(); track r.recruiterId) {
            <div class="directory-card">
              <div class="directory-avatar">{{ initials(r) }}</div>
              <div class="directory-info">
                <div class="directory-name">{{ r.fullName || r.email }}</div>
                <div class="directory-meta">
                  @if (r.jobTitle) { <span><i class="ti ti-briefcase"></i> {{ r.jobTitle }}</span> }
                  <span><i class="ti ti-hash"></i> Recruiter #{{ r.recruiterId }} · User #{{ r.userId }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      .directory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
      .directory-card {
        display: flex; align-items: flex-start; gap: 12px; padding: 16px;
        background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
      }
      .directory-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: linear-gradient(135deg, #1A2744 0%, #2a3a5c 100%); color: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;
      }
      .directory-info { flex: 1; min-width: 0; }
      .directory-name { font-size: 14px; font-weight: 600; color: var(--text); }
      .directory-meta { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; font-size: 12px; color: var(--text-muted); }
      .directory-meta span { display: flex; align-items: center; gap: 6px; }
    </style>
  `
})
export class RecruiterListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private recruiterService = inject(RecruiterService);
  private toast = inject(ToastService);

  recruiters = signal<RecruiterResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  searchQ = signal('');

  form = this.fb.group({
    userId: [null as number | null, Validators.required],
    jobTitle: ['', Validators.required]
  });

  filtered = computed(() => {
    const q = this.searchQ().trim().toLowerCase();
    if (!q) return this.recruiters();
    return this.recruiters().filter(r =>
      (r.fullName ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      (r.jobTitle ?? '').toLowerCase().includes(q)
    );
  });

  isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'Admin';
  }

  initials(r: RecruiterResponse): string {
    const name = r.fullName ?? r.email ?? '?';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

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