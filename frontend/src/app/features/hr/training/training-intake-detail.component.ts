import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import {
  AssignmentListItem,
  AssignmentStatus,
  IntakeResponse,
  AssignEmployeesResponse,
  EmployeeListItem,
} from '../../../core/models/index';
import {
  STATE_META,
  STATUS_META,
  errMsg,
  fmtDate,
  todayStr,
} from '../../../core/utils/training-format';
import { TrainingIntakeDialogComponent } from './training-intake-dialog.component';
import { TrainingDueDateDialogComponent } from './training-due-date-dialog.component';
import { FormsModule } from '@angular/forms';
import { UserDirectoryService } from '../../../core/services/user-directory.service';

export interface AssignDialogData {
  intakeId: number;
  intakeName: string;
  endDate: string;
  spotsLeft: number | null; // null = no maximum
  assignedEmployeeIds: number[];
}

const MAX_PER_REQUEST = 200; // TrainingAssignmentsController.MaxEmployeesPerRequest

// Closes with true if at least one employee was added (so the caller reloads), otherwise false.
@Component({
  selector: 'app-training-assign-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Assign employees</h2>

    @if (result(); as r) {
      <mat-dialog-content>
        <div class="ad-sub">{{ data.intakeName }}</div>
        @if (r.added.length) {
          <div class="ad-block">
            <span class="tc-chip tc-green">Added {{ r.added.length }}</span>
            <div class="ad-names">{{ addedNames() }}</div>
            <div class="ad-hint">
              Due {{ fmt(r.added[0].dueDate) }}. Each person was notified.
            </div>
          </div>
        }
        @if (r.skipped.length) {
          <div class="ad-block">
            <span class="tc-chip tc-red">Skipped {{ r.skipped.length }}</span>
            @for (s of r.skipped; track s.employeeId) {
              <div class="ad-skip">
                <b>{{ s.employeeName || 'Employee #' + s.employeeId }}</b> —
                {{ s.reason }}
              </div>
            }
          </div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button
          class="btn-primary"
          type="button"
          (click)="ref.close(r.added.length > 0)"
        >
          Done
        </button>
      </mat-dialog-actions>
    } @else {
      <mat-dialog-content>
        <div class="ad-sub">
          {{ data.intakeName }}
          @if (data.spotsLeft !== null) {
            · {{ data.spotsLeft }} spot(s) left
          } @else {
            · No participant limit
          }
        </div>

        <label class="ad-lbl" for="ad-due"
          >Due date (leave empty to use the intake’s end date,
          {{ fmt(data.endDate) }})</label
        >
        <input
          id="ad-due"
          class="ad-input"
          type="date"
          [min]="today"
          [(ngModel)]="due"
        />

        <div class="ad-row">
          <div class="ad-grow">
            <label class="ad-lbl" for="ad-q">Find employees</label>
            <input
              id="ad-q"
              class="ad-input"
              placeholder="Name, email or job title"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
            />
          </div>
          <div class="ad-dep">
            <label class="ad-lbl" for="ad-d">Department</label>
            <select
              id="ad-d"
              class="ad-input"
              [ngModel]="department()"
              (ngModelChange)="department.set($event)"
            >
              <option value="All">All</option>
              @for (d of departments(); track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
          </div>
        </div>

        @if (failed()) {
          <div class="ad-error">
            We couldn’t load the employees. Close this and try again.
          </div>
        } @else if (employees() === null) {
          <div class="ad-load"><mat-spinner diameter="26"></mat-spinner></div>
        } @else {
          <div class="ad-tools">
            <label class="ad-all">
              <input
                type="checkbox"
                [checked]="allShownSelected()"
                [disabled]="!eligibleShown().length"
                (change)="toggleAll($any($event.target).checked)"
              />
              Select all shown ({{ eligibleShown().length }})
            </label>
            <span class="ad-count"
              >Selected {{ selected().size }} / {{ max }}</span
            >
          </div>

          <div class="ad-pick" role="group" aria-label="Employees">
            @for (e of shown(); track e.employeeId) {
              <label class="ad-opt" [class.ad-off]="already(e)">
                <input
                  type="checkbox"
                  [disabled]="
                    already(e) || (!isSel(e) && selected().size >= max)
                  "
                  [checked]="isSel(e)"
                  (change)="toggle(e)"
                />
                <span>
                  <b>{{ e.firstName }} {{ e.lastName }}</b>
                  <span class="ad-meta">
                    {{ e.jobTitle || '—' }} · {{ e.departmentName || '—' }}
                    @if (already(e)) {
                      · Already in this intake
                    }
                  </span>
                </span>
              </label>
            } @empty {
              <div class="ad-empty">No employees match.</div>
            }
          </div>

          @if (overCapacity()) {
            <div class="ad-warn">
              You selected more people than there are spots. Anyone who doesn’t
              fit will be skipped with “The intake is full.”
            </div>
          }
        }

        @if (error()) {
          <div class="ad-error" role="alert">{{ error() }}</div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="ad-cancel" type="button" (click)="ref.close(false)">
          Cancel
        </button>
        <button
          class="btn-primary"
          type="button"
          [disabled]="saving() || selected().size === 0"
          (click)="assign()"
        >
          @if (saving()) {
            <mat-spinner diameter="14" class="ad-spin"></mat-spinner>
          }
          Assign {{ selected().size }} employee{{
            selected().size === 1 ? '' : 's'
          }}
        </button>
      </mat-dialog-actions>
    }

    <style>
      .ad-sub {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 12px;
      }
      .ad-lbl {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .ad-input {
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
      .ad-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .ad-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 14px 0 8px;
      }
      .ad-grow {
        flex: 1 1 220px;
      }
      .ad-dep {
        flex: 0 1 170px;
      }
      .ad-tools {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin: 8px 0 6px;
        font-size: 13px;
      }
      .ad-all {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .ad-count {
        color: var(--text-muted);
      }
      .ad-pick {
        max-height: 260px;
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      .ad-opt {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        border-top: 1px solid var(--border);
        font-size: 13px;
        cursor: pointer;
      }
      .ad-opt:first-child {
        border-top: 0;
      }
      .ad-opt:hover {
        background: var(--surface-2);
      }
      .ad-off {
        opacity: 0.5;
        cursor: default;
      }
      .ad-meta {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
      }
      .ad-empty,
      .ad-load {
        padding: 18px;
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
      }
      .ad-warn {
        font-size: 12.5px;
        color: #8a5a00;
        background: #fff3e0;
        border-radius: 8px;
        padding: 9px 12px;
        margin-top: 8px;
      }
      .ad-error {
        font-size: 13px;
        color: #b3261e;
        background: #fdecea;
        border-radius: 8px;
        padding: 9px 12px;
        margin-top: 8px;
      }
      .ad-block {
        margin-bottom: 14px;
      }
      .ad-names {
        font-size: 13.5px;
        margin-top: 6px;
      }
      .ad-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .ad-skip {
        font-size: 13px;
        margin-top: 6px;
      }
      .ad-cancel {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 9px 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .ad-cancel:hover {
        background: var(--surface-2);
      }
      .ad-spin {
        display: inline-block;
      }
      .ad-spin ::ng-deep circle {
        stroke: #fff;
      }
    </style>
  `,
})
export class TrainingAssignDialogComponent implements OnInit {
  data = inject<AssignDialogData>(MAT_DIALOG_DATA);
  ref =
    inject<MatDialogRef<TrainingAssignDialogComponent, boolean>>(MatDialogRef);
  private training = inject(TrainingService);
  private directory = inject(UserDirectoryService);

  readonly max = MAX_PER_REQUEST;
  readonly today = todayStr();
  readonly fmt = fmtDate;
  due = '';

  employees = signal<EmployeeListItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  department = signal('All');
  selected = signal<Set<number>>(new Set());
  saving = signal(false);
  error = signal<string | null>(null);
  result = signal<AssignEmployeesResponse | null>(null);

  private assignedIds = new Set(this.data.assignedEmployeeIds);

  // Only active employees are offered (the backend would skip the others anyway)
  private active = computed(() =>
    (this.employees() ?? []).filter((e) => !e.status || e.status === 'Active'),
  );

  // HR can't call GET api/Department, so the options come from the employees themselves
  departments = computed(() =>
    Array.from(
      new Set(
        this.active()
          .map((e) => e.departmentName)
          .filter((d): d is string => !!d),
      ),
    ).sort(),
  );

  shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    const dep = this.department();
    return this.active().filter((e) => {
      if (dep !== 'All' && e.departmentName !== dep) return false;
      return (
        !q ||
        `${e.firstName} ${e.lastName} ${e.email} ${e.jobTitle ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    });
  });

  eligibleShown = computed(() => this.shown().filter((e) => !this.already(e)));
  allShownSelected = computed(
    () =>
      this.eligibleShown().length > 0 &&
      this.eligibleShown().every((e) => this.selected().has(e.employeeId)),
  );
  overCapacity = computed(
    () =>
      this.data.spotsLeft !== null &&
      this.selected().size > this.data.spotsLeft,
  );

  addedNames = computed(() =>
    (this.result()?.added ?? []).map((a) => a.employeeName).join(', '),
  );

  ngOnInit(): void {
    this.directory.getEmployees().subscribe({
      next: (list) => this.employees.set(list),
      error: () => this.failed.set(true),
    });
  }

  already(e: EmployeeListItem): boolean {
    return this.assignedIds.has(e.employeeId);
  }
  isSel(e: EmployeeListItem): boolean {
    return this.selected().has(e.employeeId);
  }

  toggle(e: EmployeeListItem): void {
    this.selected.update((s) => {
      const n = new Set(s);
      n.has(e.employeeId) ? n.delete(e.employeeId) : n.add(e.employeeId);
      return n;
    });
  }

  toggleAll(on: boolean): void {
    this.selected.update((s) => {
      const n = new Set(s);
      for (const e of this.eligibleShown()) {
        if (!on) n.delete(e.employeeId);
        else if (n.size < this.max) n.add(e.employeeId);
      }
      return n;
    });
  }

  assign(): void {
    if (this.saving() || this.selected().size === 0) return;
    if (this.due && this.due < this.today) {
      this.error.set('Due date can’t be in the past.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.training
      .assign(this.data.intakeId, {
        employeeIds: [...this.selected()],
        dueDate: this.due || null,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.result.set(res);
        },
        error: (err) => {
          this.saving.set(false);
          // 409 comes back as "Someone else just changed this intake. Please reload and try again."
          this.error.set(errMsg(err, 'Could not assign the employees.'));
        },
      });
  }
}

// Route: admin/training/intakes/:id  (HR, Admin)
@Component({
  selector: 'app-training-intake-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container idt-page">
      @if (intake(); as i) {
        <a
          class="idt-back"
          [routerLink]="['/admin/training/programmes', i.trainingProgrammeId]"
        >
          <i class="ti ti-arrow-left"></i> {{ i.programmeTitle }}
        </a>
      } @else {
        <a class="idt-back" routerLink="/admin/training/intakes"
          ><i class="ti ti-arrow-left"></i> Intakes</a
        >
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      }
       @else {
  @if (intake(); as i) {
        <div class="idt-head">
          <div>
            <div class="idt-title">{{ i.name }}</div>
            <div class="idt-chips">
              <span [class]="'tc-chip ' + stateMeta().cls">{{
                stateMeta().label
              }}</span>
              <span class="tc-chip tc-grey"
                >{{ fmt(i.startDate) }} – {{ fmt(i.endDate) }}</span
              >
              @if (i.closedAt) {
                <span class="tc-chip tc-grey">Closed early</span>
              }
            </div>
            @if (i.closedAt) {
              <div class="idt-meta">Closed by {{ i.closedByName }}.</div>
            }
          </div>
          <div class="idt-actions">
            <button
              class="idt-btn"
              type="button"
              [disabled]="ended()"
              [title]="ended() ? 'An ended intake can’t be edited' : ''"
              (click)="edit()"
            >
              Edit
            </button>
            <button
              class="idt-btn"
              type="button"
              [disabled]="ended() || busy()"
              [title]="ended() ? 'This intake has already ended' : ''"
              (click)="close()"
            >
              Close intake
            </button>
            <button
              class="btn-primary"
              type="button"
              [disabled]="ended() || full()"
              [title]="
                ended()
                  ? 'This intake has ended'
                  : full()
                    ? 'The intake is full'
                    : ''
              "
              (click)="assign()"
            >
              <i class="ti ti-user-plus"></i> Assign employees
            </button>
          </div>
        </div>

        @if (ended()) {
          <div class="idt-info">
            <i class="ti ti-lock"></i> This intake has ended. No new people can
            join. Unfinished work is handled under Needs resolution.
          </div>
        }

        <div class="idt-stats">
          <div>
            <b>{{ i.assignmentCount }}</b
            >Assigned
          </div>
          <div>
            <b>{{ i.completedCount }}</b
            >Completed
          </div>
          <div>
            <b>{{ i.awaitingConfirmationCount }}</b
            >Awaiting review
          </div>
          <div>
            <b>{{ i.spotsLeft === null ? 'No limit' : i.spotsLeft }}</b
            >Spots left
          </div>
        </div>

        <div class="idt-filter">
          <label for="idt-s">Status</label>
          <select
            id="idt-s"
            class="idt-input"
            (change)="status.set($any($event.target).value)"
          >
            <option value="All">All</option>
            @for (s of statuses; track s) {
              <option [value]="s">{{ meta(s).label }}</option>
            }
          </select>
        </div>

        @if (listFailed()) {
          <div class="api-error">
            <i class="ti ti-alert-circle"></i> We couldn’t load the assignments.
            <a class="idt-link" (click)="loadAssignments()">Try again</a>
          </div>
        } @else if (assignments() === null) {
          <div class="empty-state">
            <mat-spinner diameter="26"></mat-spinner>
          </div>
        } @else {
          <div class="idt-card">
            <div class="idt-scroll">
              <div class="idt-table">
                <div class="idt-grid idt-thead">
                  <div>Employee</div>
                  <div>Status</div>
                  <div>Progress</div>
                  <div>Due</div>
                  <div>Action</div>
                </div>
                @for (a of filtered(); track a.trainingAssignmentId) {
                  <div class="idt-grid idt-row">
                    <div>
                      <div class="idt-name">{{ a.employeeName }}</div>
                      <div class="idt-meta">
                        {{ a.jobTitle || '—' }} · {{ a.departmentName || '—' }}
                      </div>
                    </div>
                    <div>
                      <span [class]="'tc-chip ' + meta(a.status).cls">{{
                        meta(a.status).label
                      }}</span>
                      @if (a.isOverdue) {
                        <span class="tc-chip tc-red idt-gapl">Overdue</span>
                      }
                      @if (a.status === 'InProgress' && a.rejectionReason) {
                        <div class="idt-meta">
                          Sent back: {{ a.rejectionReason }}
                        </div>
                      }
                    </div>
                    <div class="idt-prog">
                      <div
                        class="idt-track"
                        role="progressbar"
                        [attr.aria-valuenow]="a.progressPercent"
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <i [style.width.%]="a.progressPercent"></i>
                      </div>
                      {{ a.progressPercent }}%
                    </div>
                    <div>{{ fmt(a.dueDate) }}</div>
                    <div>
                      @if (
                        a.status === 'Completed' || a.status === 'NotCompleted'
                      ) {
                        <span class="idt-meta">—</span>
                      } @else if (a.status === 'AwaitingConfirmation') {
                        <a class="idt-btn" routerLink="/admin/training/review"
                          >Review</a
                        >
                      } @else {
                        <button
                          class="idt-btn"
                          type="button"
                          (click)="setDue(a)"
                        >
                          Due date
                        </button>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="idt-empty">
                    @if (assignments()!.length === 0) {
                      No one is assigned yet.
                    } @else {
                      No one matches this filter.
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }
    }
    </div>

    <style>
      .idt-page {
        max-width: 1100px;
      }
      .idt-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 10px;
        text-decoration: none;
      }
      .idt-back:hover {
        color: var(--navy);
      }
      .idt-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .idt-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .idt-chips {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .idt-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .idt-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 0 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        color: var(--text);
        text-decoration: none;
      }
      .idt-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .idt-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .idt-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .idt-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        padding: 10px 14px;
        border-radius: 10px;
        margin-bottom: 14px;
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .idt-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1px;
        background: var(--border);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 18px;
      }
      .idt-stats div {
        background: #fff;
        padding: 14px 18px;
        font-size: 12.5px;
        color: var(--text-muted);
      }
      .idt-stats b {
        display: block;
        font-size: 22px;
        color: var(--text);
      }
      .idt-filter {
        margin-bottom: 12px;
        max-width: 220px;
      }
      .idt-filter label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .idt-input {
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
      .idt-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .idt-scroll {
        overflow-x: auto;
      }
      .idt-table {
        min-width: 760px;
      }
      .idt-grid {
        display: grid;
        grid-template-columns: 2fr 2fr 1.3fr 1fr 1fr;
        gap: 16px;
        padding: 14px 24px;
        align-items: center;
      }
      .idt-thead {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .idt-row {
        border-top: 1px solid var(--border);
        font-size: 14px;
      }
      .idt-name {
        font-weight: 700;
        color: var(--text);
      }
      .idt-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .idt-gapl {
        margin-left: 6px;
      }
      .idt-prog {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .idt-track {
        width: 70px;
        height: 6px;
        border-radius: 4px;
        background: var(--surface-2);
        overflow: hidden;
      }
      .idt-track i {
        display: block;
        height: 100%;
        background: var(--navy);
      }
      .idt-empty {
        padding: 24px;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
      }
      .idt-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
    </style>
  `,
})
export class TrainingIntakeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private training = inject(TrainingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  private id = 0;

  intake = signal<IntakeResponse | null>(null);
  assignments = signal<AssignmentListItem[] | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  listFailed = signal(false);
  busy = signal(false);
  status = signal<string>('All');

  readonly fmt = fmtDate;
  readonly statuses: AssignmentStatus[] = [
    'NotStarted',
    'InProgress',
    'AwaitingConfirmation',
    'Completed',
    'NotCompleted',
  ];
  meta = (s: AssignmentStatus) => STATUS_META[s];

  ended = computed(() => this.intake()?.state === 'Ended');
  full = computed(() => this.intake()?.spotsLeft === 0);
  stateMeta = computed(() => STATE_META[this.intake()?.state ?? 'Running']);

  filtered = computed(() => {
    const s = this.status();
    return (this.assignments() ?? []).filter(
      (a) => s === 'All' || a.status === s,
    );
  });

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadIntake(true);
  }

  private loadIntake(first = false): void {
    this.training.getIntake(this.id).subscribe({
      next: (i) => {
        this.intake.set(i);
        this.loading.set(false);
        if (first) this.loadAssignments();
      },
      error: (err) => {
        this.loadError.set(errMsg(err, 'Could not load the intake.'));
        this.loading.set(false);
      },
    });
  }

  loadAssignments(): void {
    this.listFailed.set(false);
    this.assignments.set(null);
    this.training.getAssignments(this.id).subscribe({
      next: (list) => this.assignments.set(list),
      error: () => this.listFailed.set(true),
    });
  }

  private reload(): void {
    this.loadIntake();
    this.loadAssignments();
    this.training.refreshBadges();
  }

  // ───────────── Actions ─────────────

  edit(): void {
    const i = this.intake();
    if (!i || this.ended()) return;
    this.dialog
      .open(TrainingIntakeDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: {
          programmeId: i.trainingProgrammeId,
          programmeTitle: i.programmeTitle,
          intake: i,
        },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.show('Intake updated.', 'success');
        this.reload(); // a changed end date also moves some due dates
      });
  }

  close(): void {
    const i = this.intake();
    if (!i || this.ended() || this.busy()) return;
    if (
      !confirm(
        `Close ${i.name}? It counts as ended: no new people can join, and you decide what happens to unfinished work.`,
      )
    )
      return;
    this.busy.set(true);
    this.training.closeIntake(this.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.show('Intake closed.', 'success');
        this.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.show(errMsg(err, 'Could not close the intake.'), 'error');
      },
    });
  }

  assign(): void {
    const i = this.intake();
    if (!i || this.ended()) return;
    this.dialog
      .open(TrainingAssignDialogComponent, {
        width: '620px',
        maxWidth: '95vw',
        data: {
          intakeId: i.trainingIntakeId,
          intakeName: i.name,
          endDate: i.endDate,
          spotsLeft: i.spotsLeft,
          assignedEmployeeIds: (this.assignments() ?? []).map(
            (a) => a.employeeId,
          ),
        },
      })
      .afterClosed()
      .subscribe((added) => {
        if (added) this.reload();
      });
  }

  setDue(a: AssignmentListItem): void {
    const i = this.intake();
    this.dialog
      .open(TrainingDueDateDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        data: {
          assignmentId: a.trainingAssignmentId,
          employeeName: a.employeeName,
          programmeTitle: i?.programmeTitle ?? '',
          dueDate: a.dueDate,
        },
      })
      .afterClosed()
      .subscribe((updated: AssignmentListItem | undefined) => {
        if (!updated) return;
        this.assignments.update((list) =>
          (list ?? []).map((x) =>
            x.trainingAssignmentId === updated.trainingAssignmentId
              ? updated
              : x,
          ),
        );
        this.training.refreshBadges();
        this.toast.show('Due date updated.', 'success');
      });
  }
}
