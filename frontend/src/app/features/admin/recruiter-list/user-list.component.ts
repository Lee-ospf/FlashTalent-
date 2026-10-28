import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, forkJoin, of, catchError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  UserDirectoryService,
  HrListItem,
} from '../../../core/services/user-directory.service';
import { RecruiterResponse,EmployeeListItem } from '../../../core/models';

export type UserType = 'Recruiter' | 'HR';
export type UserRole = 'Recruiter' | 'HR' | 'Employee';

export interface UserRow {
  key: string; // unique per row, e.g. "Recruiter-3"
  userId?: number; // needed for "Resend login"; not set for employees
  name: string;
  role: UserRole;
  jobTitle: string;
  email: string;
}

interface IssuedLogin {
  name: string;
  password: string;
  reason: 'created' | 'reset';
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-users"></i> Users</h2>
          <p class="page-sub">
            {{
              isAdmin()
                ? 'Onboard a new recruiter or HR user'
                : 'People on the team'
            }}
          </p>
        </div>
      </div>

      @if (isAdmin()) {
        <mat-card
          class="mat-elevation-z1"
          style="border-radius:12px;margin-bottom:20px"
        >
          <mat-card-content style="padding:18px 20px">
            <div class="form-section-label">
              <i class="ti ti-plus"></i> Add a user
            </div>
            <form [formGroup]="form" (ngSubmit)="add()">
              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Type</mat-label>
                  <mat-select formControlName="type">
                    @for (t of userTypes; track t) {
                      <mat-option [value]="t">{{ t }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <div></div>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>First name</mat-label>
                  <input matInput formControlName="firstName" />
                  @if (invalid('firstName')) {
                    <mat-error>Required</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Last name</mat-label>
                  <input matInput formControlName="lastName" />
                  @if (invalid('lastName')) {
                    <mat-error>Required</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Email address</mat-label>
                  <input matInput type="email" formControlName="email" />
                  @if (invalid('email')) {
                    <mat-error>Enter a valid email</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Job title</mat-label>
                  <input
                    matInput
                    formControlName="jobTitle"
                    placeholder="e.g. Senior Recruiter"
                  />
                  @if (invalid('jobTitle')) {
                    <mat-error>Required</mat-error>
                  }
                </mat-form-field>
              </div>
              <p class="form-note" style="margin-top:4px">
                <i class="ti ti-info-circle"></i> A temporary password is
                generated automatically and emailed to the new user. You'll also
                see it once here in case the email doesn't arrive.
              </p>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                style="border-radius:8px;margin-top:10px"
                [disabled]="form.invalid || saving()"
              >
                @if (saving()) {
                  <mat-spinner
                    diameter="16"
                    style="display:inline-block;margin-right:6px"
                  ></mat-spinner>
                }
                <i class="ti ti-plus"></i> {{ addLabel() }}
              </button>
            </form>
            @if (apiError) {
              <div class="api-error" style="margin-top:12px">
                <i class="ti ti-alert-circle"></i> {{ apiError }}
              </div>
            }
          </mat-card-content>
        </mat-card>

        @if (issuedLogin(); as issued) {
          <div class="temp-password-banner">
            <i class="ti ti-key" style="font-size:20px"></i>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px">
                {{
                  issued.reason === 'created'
                    ? issued.name + "'s account is ready"
                    : 'New login issued for ' + issued.name
                }}
              </div>
              <div style="font-size:12px;margin-top:2px">
                Temp password:
                <code class="temp-pw">{{ issued.password }}</code>
                <button
                  class="btn-copy"
                  (click)="copyPassword(issued.password)"
                >
                  <i class="ti ti-copy"></i> Copy
                </button>
              </div>
              <div
                style="font-size:11px;color:var(--text-muted);margin-top:2px"
              >
                Also emailed to them. This won't be shown again. They'll be
                asked to set their own password on first login.
              </div>
            </div>
            <button
              class="btn-dismiss"
              aria-label="Dismiss"
              (click)="issuedLogin.set(null)"
            >
              <i class="ti ti-x"></i>
            </button>
          </div>
        }
      }

      @if (!loading()) {
        <div class="toolbar">
          <div class="search-wrap" style="max-width:340px;flex:1">
            <i class="ti ti-search search-icon"></i>
            <input
              [ngModel]="searchQ()"
              (ngModelChange)="searchQ.set($event)"
              type="search"
              class="search-input"
              placeholder="Search users…"
            />
          </div>
          <select
            class="filter-select"
            aria-label="Filter by role"
            [ngModel]="roleFilter()"
            (ngModelChange)="roleFilter.set($event)"
          >
            <option value="All">All roles</option>
            <option value="Recruiter">Recruiter</option>
            <option value="HR">HR</option>
            <option value="Employee">Employee</option>
          </select>
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state">
          <i class="ti ti-users"></i>
          <p>
            {{
              searchQ() || roleFilter() !== 'All'
                ? 'No users match your search.'
                : 'No users added yet.'
            }}
          </p>
        </div>
      } @else {
        <div class="user-table-wrap">
          <table class="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Job Title</th>
                <th>Email</th>
                @if (isAdmin()) {
                  <th class="th-actions">Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (u of filtered(); track u.key) {
                <tr>
                  <td class="cell-name">{{ u.name }}</td>
                  <td>{{ u.role }}</td>
                  <td>{{ u.jobTitle || '—' }}</td>
                  <td>{{ u.email }}</td>
                  @if (isAdmin()) {
                    <td class="td-actions">
                      @if (canResend(u)) {
                        <button
                          class="btn-resend"
                          [disabled]="resendingKey() === u.key"
                          (click)="resend(u)"
                        >
                          @if (resendingKey() === u.key) {
                            <mat-spinner
                              diameter="12"
                              style="display:inline-block"
                            ></mat-spinner>
                          } @else {
                            <i class="ti ti-mail-forward"></i>
                          }
                          Resend login
                        </button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <style>
      .toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .toolbar .search-wrap {
        flex: 1 1 240px;
        max-width: 340px;
        margin: 0;
      }
      .toolbar .filter-select {
        flex: 0 0 auto;
        width: 160px;
        height: 40px;
        margin: 0;
        padding: 0 12px;
        border-radius: 8px;
        border: 1.5px solid var(--border);
        box-shadow: none;
        outline: none;
        background: var(--surface);
        color: var(--text);
        font-size: 13px;
      }
      .toolbar .filter-select:focus-visible {
        border-color: var(--navy);
      }

      .user-table-wrap {
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: 12px;
        overflow-x: auto;
      }
      .user-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .user-table th {
        text-align: left;
        padding: 12px 16px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--text-muted);
        border-bottom: 1.5px solid var(--border);
      }
      .user-table td {
        padding: 13px 16px;
        border-bottom: 1px solid var(--border);
        color: var(--text);
      }
      .user-table tbody tr:last-child td {
        border-bottom: 0;
      }
      .cell-name {
        font-weight: 600;
      }
      .th-actions,
      .td-actions {
        text-align: right;
        white-space: nowrap;
      }

      .temp-password-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        margin-bottom: 20px;
        background: var(--green-bg);
        border: 1px solid var(--green-mid);
        border-radius: 12px;
        color: #1a5c35;
      }
      .temp-pw {
        background: rgba(255, 255, 255, 0.7);
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 700;
        font-family: monospace;
        font-size: 13px;
        margin: 0 6px;
      }
      .btn-copy {
        background: none;
        border: 1px solid #1a5c35;
        color: #1a5c35;
        border-radius: 6px;
        font-size: 11px;
        padding: 2px 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .btn-copy:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      .btn-dismiss {
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        opacity: 0.6;
      }
      .btn-dismiss:hover {
        opacity: 1;
      }
      .btn-resend {
        background: none;
        border: 1px solid var(--border);
        color: var(--text);
        border-radius: 6px;
        font-size: 11px;
        padding: 4px 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .btn-resend:hover {
        background: var(--surface-2);
      }
      .btn-resend:disabled {
        opacity: 0.6;
        cursor: default;
      }
    </style>
  `,
})
export class UserListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private recruiterService = inject(RecruiterService);
  private toast = inject(ToastService);
  private directory = inject(UserDirectoryService);

  readonly userTypes: UserType[] = ['Recruiter', 'HR'];

  // One signal per source, combined into `users` below.
  private recruiterRows = signal<UserRow[]>([]);
  private hrRows = signal<UserRow[]>([]);
  private employeeRows = signal<UserRow[]>([]);

  loading = signal(false);
  saving = signal(false);
  resendingKey = signal<string | null>(null);
  apiError = '';
  searchQ = signal('');
  roleFilter = signal<'All' | UserRole>('All');

  // Shown once to the admin after creating a user or resending their login.
  issuedLogin = signal<IssuedLogin | null>(null);

  form = this.fb.nonNullable.group({
    type: ['Recruiter' as UserType, Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    jobTitle: ['', Validators.required],
  });

  private typeValue = signal<UserType>('Recruiter');

  addLabel = computed(() =>
    this.typeValue() === 'HR' ? 'Add HR' : 'Add recruiter',
  );

  users = computed<UserRow[]>(() => [
    ...this.recruiterRows(),
    ...this.hrRows(),
    ...this.employeeRows(),
  ]);

  filtered = computed(() => {
    const q = this.searchQ().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter(
      (u) =>
        (role === 'All' || u.role === role) &&
        (!q ||
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.jobTitle.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)),
    );
  });

  isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'Admin';
  }

  // Resend is for accounts an admin created (recruiter/HR), never employees.
  canResend(u: UserRow): boolean {
    return u.role !== 'Employee' && !!u.userId;
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  copyPassword(pw: string): void {
    navigator.clipboard?.writeText(pw);
    this.toast.show('Password copied to clipboard.', 'success');
  }

  ngOnInit(): void {
    this.form.controls.type.valueChanges.subscribe((t) =>
      this.typeValue.set(t),
    );
    this.loadUsers();
  }

  private orEmpty<T>(label: string) {
    return (source: Observable<T[]>): Observable<T[]> =>
      source.pipe(
        catchError((err: Error) => {
          this.toast.show(`Could not load ${label}: ${err.message}`, 'error');
          return of([] as T[]);
        }),
      );
  }

  loadUsers(): void {
    this.loading.set(true);

    // Each source fails on its own: a toast is shown and that source is empty,
    // so one bad endpoint doesn't blank the whole table.
    forkJoin({
      recruiters: this.recruiterService
        .getAll()
        .pipe(this.orEmpty<RecruiterResponse>('recruiters')),
      hr: this.directory.getHr().pipe(this.orEmpty<HrListItem>('HR users')),
      employees: this.directory
        .getEmployees()
        .pipe(this.orEmpty<EmployeeListItem>('employees')),
    }).subscribe(({ recruiters, hr, employees }) => {
      this.recruiterRows.set(
        recruiters.map((r) => ({
          key: `Recruiter-${r.recruiterId}`,
          userId: r.userId,
          name: r.fullName || r.email || '',
          role: 'Recruiter' as const,
          jobTitle: r.jobTitle ?? '',
          email: r.email ?? '',
        })),
      );
      this.hrRows.set(
        hr.map((h) => ({
          key: `HR-${h.userId}`,
          userId: h.userId,
          name: h.fullName || h.email,
          role: 'HR' as const,
          jobTitle: h.jobTitle ?? '',
          email: h.email,
        })),
      );
      this.employeeRows.set(
        employees.map((e) => ({
          key: `Employee-${e.employeeId}`,
          name: `${e.firstName} ${e.lastName}`.trim() || e.email,
          role: 'Employee' as const,
          jobTitle: e.jobTitle ?? '',
          email: e.email,
        })),
      );
      this.loading.set(false);
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.issuedLogin.set(null);

    const { type, firstName, lastName, email, jobTitle } =
      this.form.getRawValue();

    const req = { firstName, lastName, email, jobTitle };

    const request$ =
      type === 'HR' ? this.auth.createHr(req) : this.auth.createRecruiter(req);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.issuedLogin.set({
          name: `${firstName} ${lastName}`,
          password: res.temporaryPassword,
          reason: 'created',
        });
        this.form.reset({
          type,
          firstName: '',
          lastName: '',
          email: '',
          jobTitle: '',
        });
        this.toast.show(
          `${type === 'HR' ? 'HR' : 'Recruiter'} account created.`,
          'success',
        );
        this.loadUsers();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.apiError = err.message;
      },
    });
  }

  resend(u: UserRow): void {
    if (!u.userId || this.resendingKey()) return;
    if (
      !confirm(
        `Issue a new temporary password for ${u.name}? Their current password will stop working.`,
      )
    )
      return;

    this.resendingKey.set(u.key);
    this.auth.resendLogin(u.userId).subscribe({
      next: (res) => {
        this.resendingKey.set(null);
        this.issuedLogin.set({
          name: u.name,
          password: res.temporaryPassword,
          reason: 'reset',
        });
        this.toast.show('New login details issued and emailed.', 'success');
      },
      error: (err: Error) => {
        this.resendingKey.set(null);
        this.toast.show(err.message, 'error');
      },
    });
  }
}
