import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import { MyTraining } from '../../../core/models/index';
import {
  STATUS_META,
  errMsg,
  fmtDate,
  fmtDay,
} from '../../../core/utils/training-format';
import { MyRecommendedComponent } from './my-recommended.component';

type Tab = 'assigned' | 'recommended' | 'completed';
const TABS: Tab[] = ['assigned', 'recommended', 'completed'];

// ───────────── Progress dialog (only used on this page) ─────────────

export interface ProgressDialogData {
  assignmentId: number;
  title: string;
  progressPercent: number;
}

// Closes with the updated MyTraining, or undefined if cancelled.
@Component({
  selector: 'app-my-training-progress-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Update progress</h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <div class="mp-title">{{ data.title }}</div>
        <label class="mp-lbl" for="mp-range"
          >Progress: <b>{{ value }}%</b></label
        >
        <input
          id="mp-range"
          class="mp-range"
          name="progress"
          type="range"
          min="0"
          max="100"
          step="5"
          [(ngModel)]="value"
        />
        <div class="mp-hint">
          Any progress above 0% marks the training as In progress. Use “Submit
          for confirmation” when you’ve finished.
        </div>
        @if (error()) {
          <div class="mp-error" role="alert">{{ error() }}</div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="mp-cancel" type="button" (click)="ref.close()">
          Cancel
        </button>
        <button class="btn-primary" type="submit" [disabled]="saving()">
          @if (saving()) {
            <mat-spinner diameter="14" class="mp-spin"></mat-spinner>
          }
          Save progress
        </button>
      </mat-dialog-actions>
    </form>
    <style>
      .mp-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .mp-lbl {
        display: block;
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 6px;
      }
      .mp-range {
        width: 100%;
      }
      .mp-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 10px;
      }
      .mp-error {
        font-size: 13px;
        color: #b3261e;
        background: #fdecea;
        border-radius: 8px;
        padding: 9px 12px;
        margin-top: 10px;
      }
      .mp-cancel {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 9px 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .mp-cancel:hover {
        background: var(--surface-2);
      }
      .mp-spin {
        display: inline-block;
      }
      .mp-spin ::ng-deep circle {
        stroke: #fff;
      }
    </style>
  `,
})
export class MyTrainingProgressDialogComponent {
  data = inject<ProgressDialogData>(MAT_DIALOG_DATA);
  ref =
    inject<MatDialogRef<MyTrainingProgressDialogComponent, MyTraining>>(
      MatDialogRef,
    );
  private training = inject(TrainingService);

  value = this.data.progressPercent;
  saving = signal(false);
  error = signal<string | null>(null);

  save(): void {
    if (this.saving()) return;
    this.error.set(null);
    this.saving.set(true);
    this.training
      .updateProgress(this.data.assignmentId, Number(this.value))
      .subscribe({
        next: (item) => {
          this.saving.set(false);
          this.ref.close(item);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(errMsg(err, 'Could not save your progress.'));
        },
      });
  }
}

// ───────────── Page ─────────────

// Route: my-training (Employee). Tabs: Assigned, Recommended, Completed. Deep link: ?tab=recommended
// There is no training-log endpoint, so Assigned and Completed are both split from GET api/employees/me/trainings.
@Component({
  selector: 'app-my-training',
  standalone: true,
  imports: [MatProgressSpinnerModule, MyRecommendedComponent],
  template: `
    <div class="page-container mt-page">
      <div class="mt-title">My training</div>
      <div class="mt-sub">
        Track what HR assigned you, get suggestions and see what you’ve
        finished.
      </div>

      <nav class="mt-tabs" role="tablist" aria-label="Training sections">
        <button
          class="mt-tab"
          type="button"
          role="tab"
          [class.mt-on]="tab() === 'assigned'"
          [attr.aria-selected]="tab() === 'assigned'"
          (click)="setTab('assigned')"
        >
          Assigned training
          @if (items() !== null) {
            <span class="mt-pill">{{ assigned().length }}</span>
          }
        </button>
        <button
          class="mt-tab"
          type="button"
          role="tab"
          [class.mt-on]="tab() === 'recommended'"
          [attr.aria-selected]="tab() === 'recommended'"
          (click)="setTab('recommended')"
        >
          Recommended training
        </button>
        <button
          class="mt-tab"
          type="button"
          role="tab"
          [class.mt-on]="tab() === 'completed'"
          [attr.aria-selected]="tab() === 'completed'"
          (click)="setTab('completed')"
        >
          Completed
          @if (items() !== null) {
            <span class="mt-pill">{{ completed().length }}</span>
          }
        </button>
      </nav>

      @if (tab() === 'recommended') {
        <app-my-recommended />
      } @else if (failed()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ failed() }}
          <a class="mt-link" (click)="load()">Try again</a>
        </div>
      } @else if (items() === null) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (tab() === 'assigned') {
        @for (a of assigned(); track a.trainingAssignmentId) {
          <article class="mt-card">
            <div class="mt-top">
              <div>
                <div class="mt-h">{{ a.programmeTitle }}</div>
                <div class="mt-meta">
                  {{ a.provider || 'No provider' }} ·
                  {{ a.category || 'General' }}
                  @if (a.durationHours) {
                    · {{ a.durationHours }} hours
                  }
                </div>
              </div>
              <div class="mt-chips">
                <span [class]="'tc-chip ' + meta(a).cls">{{
                  meta(a).label
                }}</span>
                @if (a.isOverdue) {
                  <span class="tc-chip tc-red">Overdue</span>
                }
              </div>
            </div>

            <div class="mt-meta mt-row">
              <span
                >{{ a.intakeName }}: {{ fmt(a.intakeStartDate) }} –
                {{ fmt(a.intakeEndDate) }}</span
              >
              <span
                >Due <b>{{ fmt(a.dueDate) }}</b></span
              >
              @if (a.url) {
                <a
                  class="mt-ext"
                  [href]="a.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Open course</a
                >
              }
            </div>

            <div class="mt-prog">
              <div
                class="mt-track"
                role="progressbar"
                [attr.aria-valuenow]="a.progressPercent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <i [style.width.%]="a.progressPercent"></i>
              </div>
              <b>{{ a.progressPercent }}%</b>
            </div>

            @if (a.status === 'InProgress' && a.rejectionReason) {
              <div class="mt-note mt-rj">
                <i class="ti ti-arrow-back-up"></i> HR sent this back:
                {{ a.rejectionReason }}
              </div>
            }
            @if (a.status === 'AwaitingConfirmation') {
              <div class="mt-note mt-wn">
                <i class="ti ti-clock"></i> Submitted {{ day(a.submittedAt) }}.
                Waiting for HR to review.
              </div>
            }
            @if (
              a.intakeState === 'Upcoming' &&
              !a.canUpdateProgress &&
              a.status !== 'AwaitingConfirmation'
            ) {
              <div class="mt-note">
                <i class="ti ti-calendar"></i> This training starts on
                {{ fmt(a.intakeStartDate) }}. You can update progress then.
              </div>
            }

            @if (a.canUpdateProgress || a.canSubmit || a.canWithdraw) {
              <div class="mt-acts">
                @if (a.canUpdateProgress) {
                  <button
                    class="mt-btn"
                    type="button"
                    [disabled]="busyId() === a.trainingAssignmentId"
                    (click)="updateProgress(a)"
                  >
                    Update progress
                  </button>
                }
                @if (a.canSubmit) {
                  <button
                    class="btn-primary"
                    type="button"
                    [disabled]="busyId() === a.trainingAssignmentId"
                    (click)="submit(a)"
                  >
                    Submit for confirmation
                  </button>
                }
                @if (a.canWithdraw) {
                  <button
                    class="mt-btn"
                    type="button"
                    [disabled]="busyId() === a.trainingAssignmentId"
                    (click)="withdraw(a)"
                  >
                    Withdraw submission
                  </button>
                }
              </div>
            }
          </article>
        } @empty {
          <div class="mt-empty">
            Nothing is assigned to you right now. HR will let you know when
            training is assigned.
          </div>
        }
      } @else {
        @for (a of completed(); track a.trainingAssignmentId) {
          <article class="mt-card">
            <div class="mt-top">
              <div>
                <div class="mt-h">{{ a.programmeTitle }}</div>
                <div class="mt-meta">
                  {{ a.provider || 'No provider' }} ·
                  {{ a.category || 'General' }}
                  @if (a.durationHours) {
                    · {{ a.durationHours }} hours
                  }
                  · {{ a.intakeName }}
                </div>
              </div>
              <span [class]="'tc-chip ' + meta(a).cls">{{
                meta(a).label
              }}</span>
            </div>
            <div class="mt-meta mt-row">
              @if (a.status === 'Completed') {
                <span>Confirmed {{ day(a.confirmedAt) }}</span>
              }
              <span>Progress {{ a.progressPercent }}%</span>
              <span>Assigned {{ day(a.assignedAt) }}</span>
            </div>
            @if (a.status === 'NotCompleted') {
              <div class="mt-note">
                <i class="ti ti-info-circle"></i> This training wasn’t finished
                in time. Contact HR if you want to take it again.
              </div>
            }
          </article>
        } @empty {
          <div class="mt-empty">Finished training will appear here.</div>
        }
      }
    </div>

    <style>
      .mt-page {
        max-width: 960px;
      }
      .mt-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .mt-sub {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .mt-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--border);
        margin: 18px 0 20px;
      }
      .mt-tab {
        padding: 10px 12px;
        margin-bottom: -1px;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-muted);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
      }
      .mt-tab:hover {
        color: var(--navy);
      }
      .mt-tab:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .mt-on {
        color: var(--navy);
        border-bottom-color: var(--navy);
      }
      .mt-pill {
        display: inline-block;
        min-width: 18px;
        padding: 0 6px;
        margin-left: 6px;
        border-radius: 10px;
        background: var(--surface-2);
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 700;
        text-align: center;
      }
      .mt-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px 22px;
        margin-bottom: 14px;
      }
      .mt-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .mt-h {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .mt-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .mt-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .mt-row {
        display: flex;
        gap: 6px 16px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .mt-ext {
        color: var(--navy);
        text-decoration: underline;
      }
      .mt-prog {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 14px 0 4px;
      }
      .mt-track {
        flex: 1;
        height: 8px;
        border-radius: 5px;
        background: var(--surface-2);
        overflow: hidden;
      }
      .mt-track i {
        display: block;
        height: 100%;
        background: var(--navy);
      }
      .mt-note {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 13px;
        padding: 10px 14px;
        border-radius: 10px;
        margin-top: 10px;
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .mt-rj {
        background: #fdecea;
        color: #b3261e;
      }
      .mt-wn {
        background: #fff3e0;
        color: #8a5a00;
      }
      .mt-acts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 14px;
      }
      .mt-btn {
        min-height: 40px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 0 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        color: var(--text);
      }
      .mt-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .mt-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .mt-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .mt-empty {
        padding: 28px;
        text-align: center;
        font-size: 13.5px;
        color: var(--text-muted);
        background: #fff;
        border: 1px dashed var(--border);
        border-radius: 16px;
      }
      .mt-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
    </style>
  `,
})
export class MyTrainingComponent implements OnInit {
  private training = inject(TrainingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly fmt = fmtDate;
  readonly day = fmtDay;
  meta = (a: MyTraining) => STATUS_META[a.status];

  tab = signal<Tab>('assigned');
  items = signal<MyTraining[] | null>(null);
  failed = signal<string | null>(null);
  busyId = signal<number | null>(null);

  // Not started, In progress and Awaiting confirmation, earliest due date first
  assigned = computed(() =>
    (this.items() ?? [])
      .filter(
        (a) =>
          a.status === 'NotStarted' ||
          a.status === 'InProgress' ||
          a.status === 'AwaitingConfirmation',
      )
      .sort(
        (x, y) =>
          x.dueDate.localeCompare(y.dueDate) ||
          x.programmeTitle.localeCompare(y.programmeTitle),
      ),
  );

  // Completed and Not completed. The API has no "finished at" for Not completed, so the order falls
  // back to when the training was assigned.
  completed = computed(() =>
    (this.items() ?? [])
      .filter((a) => a.status === 'Completed' || a.status === 'NotCompleted')
      .sort((x, y) =>
        (y.confirmedAt ?? y.assignedAt).localeCompare(
          x.confirmedAt ?? x.assignedAt,
        ),
      ),
  );

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (t && TABS.includes(t)) this.tab.set(t);
    this.load();
  }

  load(): void {
    this.failed.set(null);
    this.items.set(null);
    this.training.getMine().subscribe({
      next: (list) => this.items.set(list),
      error: (err) =>
        this.failed.set(errMsg(err, 'We couldn’t load your training.')),
    });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.router.navigate([], { queryParams: { tab: t }, replaceUrl: true });
  }

  private replace(updated: MyTraining): void {
    this.items.update((list) =>
      (list ?? []).map((x) =>
        x.trainingAssignmentId === updated.trainingAssignmentId ? updated : x,
      ),
    );
  }

  // ───────────── Actions ─────────────

  updateProgress(a: MyTraining): void {
    this.dialog
      .open(MyTrainingProgressDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          assignmentId: a.trainingAssignmentId,
          title: a.programmeTitle,
          progressPercent: a.progressPercent,
        },
      })
      .afterClosed()
      .subscribe((updated: MyTraining | undefined) => {
        if (!updated) return;
        this.replace(updated);
        this.toast.show('Progress saved.', 'success');
      });
  }

  submit(a: MyTraining): void {
    if (this.busyId() !== null) return;
    if (
      !confirm(
        `Submit ${a.programmeTitle} for confirmation? This sets your progress to 100% and tells HR you’ve finished. You can withdraw it until HR decides.`,
      )
    )
      return;
    this.run(
      a,
      this.training.submit(a.trainingAssignmentId),
      'Submitted. HR has been notified.',
      'Could not submit this training.',
    );
  }

  withdraw(a: MyTraining): void {
    if (this.busyId() !== null) return;
    if (
      !confirm(
        'Withdraw your submission? The training goes back to In progress.',
      )
    )
      return;
    this.run(
      a,
      this.training.withdraw(a.trainingAssignmentId),
      'Submission withdrawn.',
      'Could not withdraw this submission.',
    );
  }

  private run(
    a: MyTraining,
    call$: ReturnType<TrainingService['submit']>,
    ok: string,
    fail: string,
  ): void {
    this.busyId.set(a.trainingAssignmentId);
    call$.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
        this.toast.show(ok, 'success');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.show(errMsg(err, fail), 'error');
        this.load(); // HR may have decided in the meantime, so show the current state
      },
    });
  }
}
