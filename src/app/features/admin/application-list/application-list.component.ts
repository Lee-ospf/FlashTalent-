import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { ApplicationService } from '../../../core/services/application.service';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApplicationResponse } from '../../../core/models';
import { getValidNextStatuses, STATUS_LABELS, ApplicationStatusKey } from '../../../core/utils/application-status';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied', UnderReview: 'shortlisted', Shortlisted: 'interview',
  OfferExtended: 'offer', Hired: 'offer', NotSelected: 'rejected'
};

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-chart-arrows-vertical"></i> Manage applications</h2>
          <p class="page-sub">Move candidates through the recruitment pipeline</p>
        </div>
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!applications().length) {
        <div class="empty-state"><i class="ti ti-inbox"></i><p>No applications yet.</p></div>
      } @else {
        <div class="app-list">
          @for (a of applications(); track a.applicationId) {
            <mat-card class="mat-elevation-z1" style="border-radius:12px">
              <mat-card-content style="padding:16px 20px">
                <div class="app-card-header" style="cursor:default">
                  <div class="app-icon-wrap" [class]="'app-icon-' + statusClass(a.status)">
                    <i class="ti ti-user"></i>
                  </div>
                  <div class="app-main">
                    <div class="app-title">{{ a.candidateName }}</div>
                    <div class="app-sub">Applied to {{ a.vacancyTitle }} · {{ formatDate(a.appliedAt) }}</div>
                  </div>
                  <span class="status-pill s-{{ statusClass(a.status) }}">{{ label(a.status) }}</span>
                </div>

                <div style="display:flex;align-items:center;gap:10px;padding-top:12px;border-top:0.5px solid var(--border);margin-top:10px">
                  @if (nextOptions(a.status).length) {
                    <mat-form-field appearance="outline" style="width:220px" class="compact-select">
                      <mat-label>Move to</mat-label>
                      <mat-select [(ngModel)]="pendingStatus[a.applicationId]">
                        @for (s of nextOptions(a.status); track s) {
                          <mat-option [value]="s">{{ label(s) }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button mat-raised-button color="primary" style="border-radius:8px;height:56px"
                            [disabled]="!pendingStatus[a.applicationId] || updatingId() === a.applicationId"
                            (click)="updateStatus(a)">
                      @if (updatingId() === a.applicationId) {
                        <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                      }
                      <i class="ti ti-arrow-right"></i> Update status
                    </button>
                  } @else {
                    <span class="form-note"><i class="ti ti-lock"></i> This is a final stage — no further transitions available</span>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `
})
export class ApplicationListComponent implements OnInit {
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyAdminService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  applications = signal<ApplicationResponse[]>([]);
  loading = signal(false);
  updatingId = signal<number | null>(null);
  pendingStatus: Record<number, ApplicationStatusKey | ''> = {};

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    // No single "get all applications" endpoint exists — fetch every vacancy,
    // then fetch applications per vacancy and flatten the results.
    this.vacancyService.getAllByStatus().subscribe({
      next: vacancies => {
        if (!vacancies.length) { this.applications.set([]); this.loading.set(false); return; }
        forkJoin(vacancies.map(v => this.appService.getByVacancy(v.vacancyId))).subscribe({
          next: results => {
            this.applications.set(results.flat());
            this.loading.set(false);
          },
          error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
        });
      },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  nextOptions(status: string) { return getValidNextStatuses(status); }
  label(s: string): string { return (STATUS_LABELS as Record<string, string>)[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }
  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  updateStatus(a: ApplicationResponse): void {
    const newStatus = this.pendingStatus[a.applicationId];
    if (!newStatus) return;

    this.updatingId.set(a.applicationId);
    this.appService.updateStatus(a.applicationId, {
      newStatus,
      changedByUserId: this.auth.currentUser()!.userId
    }).subscribe({
      next: updated => {
        this.applications.update(list => list.map(x => x.applicationId === updated.applicationId ? updated : x));
        this.updatingId.set(null);
        delete this.pendingStatus[a.applicationId];
        this.toast.show(`${a.candidateName} moved to ${this.label(newStatus)}.`, 'success');
      },
      error: (err: Error) => { this.updatingId.set(null); this.toast.show(err.message, 'error'); }
    });
  }
}