import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EmployeeProfileService,
  EmployeeProfileResponse,
  EmployeeQualificationDto,
} from '../../core/services/employee-profile.service';

type AlertKind = 'expired' | 'expiring' | 'noexpiry';

interface CertAlert {
  id: number;
  name: string;
  kind: AlertKind;
  label: string;
  expiry: string | null;
}

// Rendered by DashboardGateComponent for the Employee role (route: /dashboard).
// Built from the same GET api/employees/me call as the profile page.
@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container ed-page">
      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      } @else {
        @if (profile(); as p) {
          <h2 class="ed-welcome">Welcome back, {{ p.firstName }}</h2>
          <p class="ed-sub">Here's your skills profile at a glance</p>

          <div class="ed-stats">
            <div class="ed-stat">
              <div class="ed-stat-k">Skills</div>
              <div class="ed-stat-v">{{ p.skills.length }}</div>
            </div>
            <div class="ed-stat">
              <div class="ed-stat-k">Certifications</div>
              <div class="ed-stat-v">{{ certCount() }}</div>
            </div>
            <div class="ed-stat">
              <div class="ed-stat-k">Need attention</div>
              <div
                class="ed-stat-v"
                [class.ed-warn-text]="attentionCount() > 0"
              >
                {{ attentionCount() }}
              </div>
            </div>
          </div>

          <div class="ed-cols">
            <section class="ed-card">
              <div class="ed-card-head">
                <h3>Skills</h3>
                <a
                  routerLink="/my-profile"
                  [queryParams]="{ section: 'skills' }"
                  >Manage skills</a
                >
              </div>
              @if (!p.skills.length) {
                <div class="ed-empty">
                  No skills added yet.
                  <a
                    routerLink="/my-profile"
                    [queryParams]="{ section: 'skills' }"
                    >Add your first skill</a
                  >
                </div>
              } @else {
                <div class="ed-chips">
                  @for (s of p.skills; track s.employeeSkillId) {
                    <span class="ed-chip">{{ s.skillName }}</span>
                  }
                </div>
              }
            </section>

            <section class="ed-card">
              <div class="ed-card-head">
                <h3>Certification alerts</h3>
                <a
                  routerLink="/my-profile"
                  [queryParams]="{ section: 'qualifications' }"
                  >View all</a
                >
              </div>
              @if (!certCount()) {
                <div class="ed-empty">
                  No certifications added yet.
                  <a
                    routerLink="/my-profile"
                    [queryParams]="{ section: 'qualifications' }"
                    >Add one</a
                  >
                </div>
              } @else if (!alerts().length) {
                <div class="ed-empty">
                  All your certifications are up to date.
                </div>
              } @else {
                <div class="ed-alerts">
                  @for (a of alerts(); track a.id) {
                    <div class="ed-alert ed-{{ a.kind }}">
                      <i
                        class="ti"
                        [class.ti-alert-circle]="a.kind === 'expired'"
                        [class.ti-alert-triangle]="a.kind === 'expiring'"
                        [class.ti-calendar-off]="a.kind === 'noexpiry'"
                      ></i>
                      <div class="ed-alert-body">
                        <div class="ed-alert-title">{{ a.name }}</div>
                        <div class="ed-alert-sub">{{ a.label }}</div>
                      </div>
                      @if (a.kind === 'noexpiry') {
                        <a
                          routerLink="/my-profile"
                          [queryParams]="{ editQual: a.id }"
                          >Add</a
                        >
                      }
                    </div>
                  }
                </div>
              }
            </section>
          </div>
        }
      }
    </div>

    <style>
      .ed-page {
        max-width: 1000px;
      }
      .ed-welcome {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        color: var(--text);
      }
      .ed-sub {
        margin: 4px 0 22px;
        font-size: 14px;
        color: var(--text-muted);
      }
      .ed-stats {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .ed-stat {
        flex: 1;
        min-width: 140px;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px 22px;
      }
      .ed-stat-k {
        font-size: 13px;
        color: var(--text-muted);
      }
      .ed-stat-v {
        font-size: 30px;
        font-weight: 600;
        margin-top: 4px;
        color: var(--text);
      }
      .ed-warn-text {
        color: #8a5a00;
      }
      .ed-cols {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
        align-items: start;
      }
      .ed-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 22px 24px;
      }
      .ed-card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .ed-card-head h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .ed-card-head a,
      .ed-alert a,
      .ed-empty a {
        font-size: 13px;
        font-weight: 600;
        color: var(--navy);
        text-decoration: underline;
      }
      .ed-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .ed-chip {
        background: var(--blue-bg);
        color: var(--blue);
        font-size: 13px;
        font-weight: 600;
        padding: 7px 14px;
        border-radius: 20px;
      }
      .ed-alerts {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ed-alert {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 12px;
      }
      .ed-alert i {
        font-size: 20px;
        flex-shrink: 0;
      }
      .ed-alert-body {
        flex: 1;
        min-width: 0;
      }
      .ed-alert-title {
        font-size: 14px;
        font-weight: 700;
      }
      .ed-alert-sub {
        font-size: 13px;
        margin-top: 2px;
      }
      .ed-expired {
        background: #fdecea;
        color: #b3261e;
      }
      .ed-expiring {
        background: #fff3e0;
        color: #8a5a00;
      }
      .ed-noexpiry {
        background: var(--surface-2);
        color: var(--text);
      }
      .ed-noexpiry .ed-alert-sub,
      .ed-noexpiry i {
        color: var(--text-muted);
      }
      .ed-empty {
        font-size: 13px;
        color: var(--text-muted);
      }
      @media (max-width: 560px) {
        .ed-welcome {
          font-size: 23px;
        }
        .ed-card {
          padding: 18px 16px;
        }
      }
    </style>
  `,
})
export class EmployeeDashboardComponent implements OnInit {
  private api = inject(EmployeeProfileService);

  profile = signal<EmployeeProfileResponse | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);

  private certs = computed(() =>
    (this.profile()?.qualifications ?? []).filter(
      (q) => q.qualificationType === 'Certification',
    ),
  );

  certCount = computed(() => this.certs().length);

  // Items that need the employee to act: expired, expiring soon, or no expiry date yet.
  alerts = computed<CertAlert[]>(() => {
    const rank: Record<AlertKind, number> = {
      expired: 0,
      expiring: 1,
      noexpiry: 2,
    };
    return this.certs()
      .map((q) => this.toAlert(q))
      .filter((a): a is CertAlert => a !== null)
      .sort(
        (a, b) =>
          rank[a.kind] - rank[b.kind] ||
          (a.expiry ?? '').localeCompare(b.expiry ?? '') ||
          a.name.localeCompare(b.name),
      );
  });

  // "Need attention" counts expired + expiring only; certifications with no expiry set are not counted.
  attentionCount = computed(
    () =>
      this.alerts().filter((a) => a.kind === 'expired' || a.kind === 'expiring')
        .length,
  );

  ngOnInit(): void {
    this.api.getMine().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err?.error?.message ?? err?.message ?? 'Could not load your profile.',
        );
        this.loading.set(false);
      },
    });
  }

  private toAlert(q: EmployeeQualificationDto): CertAlert | null {
    const base = {
      id: q.employeeQualificationId,
      name: q.name,
      expiry: q.expiryDate ?? null,
    };

    switch (q.certificationStatus) {
      case 'Expired': {
        const n = q.expiryDate ? Math.abs(this.daysUntil(q.expiryDate)) : null;
        const label =
          n === null
            ? 'Expired'
            : n === 0
              ? 'Expired today'
              : `Expired ${n} day${n === 1 ? '' : 's'} ago`;
        return { ...base, kind: 'expired', label };
      }
      case 'Expiring': {
        const n = q.expiryDate ? this.daysUntil(q.expiryDate) : null;
        const label =
          n === null
            ? 'Expiring soon'
            : n === 0
              ? 'Expires today'
              : `Expires in ${n} day${n === 1 ? '' : 's'}`;
        return { ...base, kind: 'expiring', label };
      }
      case 'Valid':
        return null;
      default:
        return { ...base, kind: 'noexpiry', label: 'No expiry date set' };
    }
  }

  private daysUntil(iso: string): number {
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
  }
}
