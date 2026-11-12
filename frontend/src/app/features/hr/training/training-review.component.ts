import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import { AwaitingConfirmationItem } from '../../../core/models/index';
import { errMsg, fmtDate } from '../../../core/utils/training-format';
import { FormsModule } from '@angular/forms';

export interface RejectDialogData {
  assignmentId: number;
  employeeName: string;
  programmeTitle: string;
}

const MAX_REASON = 1000; // TrainingAssignmentsController.MaxReasonLength

@Component({
  selector: 'app-training-reject-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Reject submission</h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <div class="rj-who"><b>{{ data.employeeName }}</b> · {{ data.programmeTitle }}</div>
        <div class="rj-hint">They’ll see your reason, and can update their progress and submit again.</div>

        <label class="rj-lbl" for="rj-reason">Reason *</label>
        <textarea id="rj-reason" class="rj-input" name="reason" rows="4" [maxlength]="max" [(ngModel)]="reason"></textarea>
        <div class="rj-count">{{ reason.length }} / {{ max }}</div>

        @if (error()) { <div class="rj-error" role="alert">{{ error() }}</div> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="rj-cancel" type="button" (click)="ref.close()">Cancel</button>
        <button class="btn-primary" type="submit" [disabled]="saving()">
          @if (saving()) { <mat-spinner diameter="14" class="rj-spin"></mat-spinner> }
          Reject submission
        </button>
      </mat-dialog-actions>
    </form>

    <style>
      .rj-who { font-size: 14px; margin-bottom: 4px; }
      .rj-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
      .rj-lbl { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .rj-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; resize: vertical; }
      .rj-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .rj-count { font-size: 11.5px; color: var(--text-muted); text-align: right; margin-top: 2px; }
      .rj-error { font-size: 13px; color: #b3261e; background: #fdecea; border-radius: 8px; padding: 9px 12px; margin-top: 8px; }
      .rj-cancel { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; }
      .rj-cancel:hover { background: var(--surface-2); }
      .rj-spin { display: inline-block; }
      .rj-spin ::ng-deep circle { stroke: #fff; }
    </style>
  `,
})
export class TrainingRejectDialogComponent {
  data = inject<RejectDialogData>(MAT_DIALOG_DATA);
  ref = inject<MatDialogRef<TrainingRejectDialogComponent, boolean>>(MatDialogRef);
  private training = inject(TrainingService);

  readonly max = MAX_REASON;
  reason = '';
  saving = signal(false);
  error = signal<string | null>(null);

  save(): void {
    if (this.saving()) return;
    const r = this.reason.trim();
    if (!r) {
      this.error.set('A reason is required when rejecting a submission.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.training.reject(this.data.assignmentId, r).subscribe({
      next: () => {
        this.saving.set(false);
        this.ref.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errMsg(err, 'Could not reject the submission.'));
      },
    });
  }
}

const AMBER_DAYS = 3; // waiting this long turns amber
const RED_DAYS = 7; // and this long turns red

// Route: admin/training/review (third tab of the training shell)
// Oldest submission first (the API already sorts it that way).
@Component({
  selector: 'app-training-review',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="rv-note">
      Employees who say they’ve finished. Confirming doesn’t change their profile qualifications.
    </div>

    <div class="rv-f">
      <label for="rv-q">Search</label>
      <input id="rv-q" class="rv-input" placeholder="Employee or programme" [value]="search()" (input)="search.set($any($event.target).value)" />
    </div>

    @if (failed()) {
      <div class="api-error">
        <i class="ti ti-alert-circle"></i> We couldn’t load the submissions.
        <a class="rv-link" (click)="load()">Try again</a>
      </div>
    } @else if (items() === null) {
      <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <div class="rv-card">
        @for (a of filtered(); track a.trainingAssignmentId) {
          <div class="rv-item">
            <div class="rv-main">
              <div>
                <span class="rv-name">{{ a.employeeName }}</span>
                <span class="rv-meta">{{ a.jobTitle || '—' }} · {{ a.departmentName || '—' }}</span>
              </div>
              <div class="rv-prog">{{ a.programmeTitle }} · {{ a.intakeName }} · due {{ fmt(a.dueDate) }}</div>
              @if (a.wasRejectedBefore && a.previousRejectionReason) {
                <div class="rv-meta">Rejected before: “{{ a.previousRejectionReason }}”</div>
              }
            </div>
            <div class="rv-acts">
              <span [class]="'tc-chip ' + waitCls(a)">Waiting {{ a.daysWaiting }} day{{ a.daysWaiting === 1 ? '' : 's' }}</span>
              <button class="rv-btn" type="button" [disabled]="busyId() === a.trainingAssignmentId" (click)="reject(a)">Reject</button>
              <button class="btn-primary" type="button" [disabled]="busyId() === a.trainingAssignmentId" (click)="confirmIt(a)">Confirm</button>
            </div>
          </div>
        } @empty {
          <div class="rv-empty">
            @if (items()!.length === 0) { Nothing is waiting for review. } @else { No submissions match your search. }
          </div>
        }
      </div>
    }

    <style>
      .rv-note { font-size: 13px; padding: 10px 14px; border-radius: 10px; background: var(--surface-2); color: var(--text-muted); margin-bottom: 14px; }
      .rv-f { max-width: 320px; margin-bottom: 14px; }
      .rv-f label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .rv-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .rv-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .rv-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
      .rv-item { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; padding: 16px 24px; border-top: 1px solid var(--border); }
      .rv-item:first-child { border-top: 0; }
      .rv-main { flex: 1 1 320px; min-width: 0; }
      .rv-name { font-weight: 700; color: var(--text); margin-right: 8px; }
      .rv-meta { font-size: 12.5px; color: var(--text-muted); }
      .rv-prog { font-size: 13.5px; margin-top: 2px; }
      .rv-acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .rv-btn { min-height: 40px; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 0 14px; font: inherit; font-size: 13px; cursor: pointer; color: var(--text); }
      .rv-btn:hover:not(:disabled) { background: var(--surface-2); }
      .rv-btn:disabled { opacity: 0.5; cursor: default; }
      .rv-btn:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
      .rv-empty { padding: 28px; text-align: center; font-size: 13.5px; color: var(--text-muted); }
      .rv-link { font-size: 13px; color: var(--navy); cursor: pointer; text-decoration: underline; margin-left: 8px; }
    </style>
  `,
})
export class TrainingReviewComponent implements OnInit {
  private training = inject(TrainingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  readonly fmt = fmtDate;

  items = signal<AwaitingConfirmationItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  busyId = signal<number | null>(null);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return (this.items() ?? []).filter(
      (a) => !q || `${a.employeeName} ${a.programmeTitle}`.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    this.items.set(null);
    this.training.getAwaitingConfirmation().subscribe({
      next: (list) => this.items.set(list),
      error: () => this.failed.set(true),
    });
  }

  waitCls(a: AwaitingConfirmationItem): string {
    return a.daysWaiting >= RED_DAYS ? 'tc-chip tc-red' : a.daysWaiting >= AMBER_DAYS ? 'tc-chip tc-amber' : 'tc-chip tc-grey';
  }

  private removeRow(id: number): void {
    this.items.update((list) => (list ?? []).filter((x) => x.trainingAssignmentId !== id));
    this.training.refreshBadges();
  }

  confirmIt(a: AwaitingConfirmationItem): void {
    if (this.busyId() !== null) return;
    if (!confirm(`Confirm that ${a.employeeName} completed ${a.programmeTitle}? They will be notified.`)) return;
    this.busyId.set(a.trainingAssignmentId);
    this.training.confirm(a.trainingAssignmentId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeRow(a.trainingAssignmentId);
        this.toast.show(`Confirmed. ${a.employeeName} has been notified.`, 'success');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.show(errMsg(err, 'Could not confirm this submission.'), 'error');
        this.load(); // it may already have been handled by someone else
      },
    });
  }

  reject(a: AwaitingConfirmationItem): void {
    if (this.busyId() !== null) return;
    this.dialog
      .open(TrainingRejectDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        data: {
          assignmentId: a.trainingAssignmentId,
          employeeName: a.employeeName,
          programmeTitle: a.programmeTitle,
        },
      })
      .afterClosed()
      .subscribe((done) => {
        if (!done) return;
        this.removeRow(a.trainingAssignmentId);
        this.toast.show(`Rejected. ${a.employeeName} has been notified.`, 'success');
      });
  }
}