import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import {
  AssignmentListItem,
  NeedsResolutionItem,
  IntakeListItem,
  TrainingResolutionResponse,
} from '../../../core/models/index';
import { STATUS_META, errMsg, fmtDate, todayStr } from '../../../core/utils/training-format';
import { TrainingDueDateDialogComponent } from './training-due-date-dialog.component';
import { FormsModule } from '@angular/forms';

export interface MoveDialogData {
  assignmentId: number;
  employeeName: string;
  programmeId: number;
  currentIntakeId: number;
  progressPercent: number;
}

// Moves an unfinished assignment from an ended intake into another intake of the same programme.
// The old assignment becomes Not completed (history) and the new one keeps the progress.
// Closes with the TrainingResolutionResponse, or undefined if cancelled.
@Component({
  selector: 'app-training-move-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Move to another intake</h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <div class="mv-who"><b>{{ data.employeeName }}</b> keeps their {{ data.progressPercent }}% progress.</div>
        <div class="mv-hint">The old assignment becomes Not completed and stays as history. They’ll be notified of the new intake.</div>

        @if (failed()) {
          <div class="mv-error">We couldn’t load the intakes. Close this and try again.</div>
        } @else if (options() === null) {
          <div class="mv-load"><mat-spinner diameter="24"></mat-spinner></div>
        } @else if (options()!.length === 0) {
          <div class="mv-warn">
            This programme has no other intake that is open. Create one from the programme page first.
          </div>
        } @else {
          <label class="mv-lbl" for="mv-target">Target intake</label>
          <select id="mv-target" class="mv-input" name="target" [(ngModel)]="targetId">
            @for (i of options(); track i.trainingIntakeId) {
              <option [ngValue]="i.trainingIntakeId" [disabled]="isFull(i)">
                {{ i.name }} ({{ fmt(i.startDate) }} – {{ fmt(i.endDate) }}) · {{ spots(i) }}
              </option>
            }
          </select>

          <label class="mv-lbl mv-gap" for="mv-due">Due date (leave empty to use the intake’s end date)</label>
          <input id="mv-due" class="mv-input" name="due" type="date" [min]="today" [(ngModel)]="due" />
        }

        @if (error()) { <div class="mv-error" role="alert">{{ error() }}</div> }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="mv-cancel" type="button" (click)="ref.close()">Cancel</button>
        <button class="btn-primary" type="submit" [disabled]="saving() || !targetId">
          @if (saving()) { <mat-spinner diameter="14" class="mv-spin"></mat-spinner> }
          Move employee
        </button>
      </mat-dialog-actions>
    </form>

    <style>
      .mv-who { font-size: 14px; margin-bottom: 4px; }
      .mv-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
      .mv-lbl { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .mv-gap { margin-top: 12px; }
      .mv-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .mv-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .mv-load { padding: 16px; text-align: center; }
      .mv-warn { font-size: 13px; color: #8a5a00; background: #fff3e0; border-radius: 8px; padding: 10px 12px; }
      .mv-error { font-size: 13px; color: #b3261e; background: #fdecea; border-radius: 8px; padding: 9px 12px; margin-top: 8px; }
      .mv-cancel { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; }
      .mv-cancel:hover { background: var(--surface-2); }
      .mv-spin { display: inline-block; }
      .mv-spin ::ng-deep circle { stroke: #fff; }
    </style>
  `,
})
export class TrainingMoveDialogComponent implements OnInit {
  data = inject<MoveDialogData>(MAT_DIALOG_DATA);
  ref = inject<MatDialogRef<TrainingMoveDialogComponent, TrainingResolutionResponse>>(MatDialogRef);
  private training = inject(TrainingService);

  readonly today = todayStr();
  readonly fmt = fmtDate;

  options = signal<IntakeListItem[] | null>(null);
  failed = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  targetId: number | null = null;
  due = '';

  ngOnInit(): void {
    // Other intakes of this programme that haven't ended. The backend checks the same rules.
    this.training.getIntakes(this.data.programmeId).subscribe({
      next: (list) => {
        const open = list.filter(
          (i) => i.trainingIntakeId !== this.data.currentIntakeId && i.state !== 'Ended',
        );
        this.options.set(open);
        const firstFree = open.find((i) => !this.isFull(i));
        this.targetId = firstFree?.trainingIntakeId ?? null;
      },
      error: () => this.failed.set(true),
    });
  }

  isFull(i: IntakeListItem): boolean {
    return i.maxParticipants !== null && i.assignmentCount >= i.maxParticipants;
  }

  spots(i: IntakeListItem): string {
    if (i.maxParticipants === null) return 'No limit';
    const left = Math.max(0, i.maxParticipants - i.assignmentCount);
    return left === 0 ? 'Full' : `${left} spot${left === 1 ? '' : 's'} left`;
  }

  save(): void {
    if (this.saving() || !this.targetId) return;
    if (this.due && this.due < this.today) {
      this.error.set('Due date can’t be in the past.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.training
      .moveToIntake(this.data.assignmentId, { targetIntakeId: this.targetId, dueDate: this.due || null })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.ref.close(res);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(errMsg(err, 'Could not move the employee.'));
        },
      });
  }
}

// Route: admin/training/resolve (fourth tab of the training shell)
// Unfinished assignments in intakes that have ended or closed early. HR extends, moves or marks Not completed.
@Component({
  selector: 'app-training-resolve',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="rs-note">
      Unfinished training in intakes that have ended or closed early. Decide what happens to each person. Nothing is deleted.
    </div>

    <div class="rs-f">
      <label for="rs-q">Search</label>
      <input id="rs-q" class="rs-input" placeholder="Employee, programme or intake" [value]="search()" (input)="search.set($any($event.target).value)" />
    </div>

    @if (failed()) {
      <div class="api-error">
        <i class="ti ti-alert-circle"></i> We couldn’t load the list.
        <a class="rs-link" (click)="load()">Try again</a>
      </div>
    } @else if (items() === null) {
      <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <div class="rs-card">
        @for (a of filtered(); track a.trainingAssignmentId) {
          <div class="rs-item">
            <div class="rs-main">
              <div>
                <span class="rs-name">{{ a.employeeName }}</span>
                <span class="rs-meta">{{ a.jobTitle || '—' }} · {{ a.departmentName || '—' }}</span>
              </div>
              <div class="rs-prog">
                {{ a.programmeTitle }} · {{ a.intakeName }} · ended {{ fmt(a.intakeEndDate) }}
                @if (a.intakeClosedEarly) { (closed early) }
              </div>
              <div class="rs-status">
                <span [class]="'tc-chip ' + meta(a).cls">{{ meta(a).label }}</span>
                <span class="rs-meta">{{ a.progressPercent }}% · due {{ fmt(a.dueDate) }}</span>
                @if (a.isOverdue) { <span class="tc-chip tc-red">Overdue</span> }
              </div>
            </div>

            @if (a.status === 'AwaitingConfirmation') {
              <div class="rs-acts">
                <span class="rs-meta">Confirm or reject this submission first.</span>
                <a class="rs-btn" routerLink="/admin/training/review">Go to review</a>
              </div>
            } @else {
              <div class="rs-acts">
                <button class="rs-btn" type="button" [disabled]="busyId() === a.trainingAssignmentId" (click)="extend(a)">Extend due date</button>
                <button class="rs-btn" type="button" [disabled]="busyId() === a.trainingAssignmentId" (click)="move(a)">Move to intake</button>
                <button class="rs-btn rs-danger" type="button" [disabled]="busyId() === a.trainingAssignmentId" (click)="markNotCompleted(a)">Mark not completed</button>
              </div>
            }
          </div>
        } @empty {
          <div class="rs-empty">
            @if (items()!.length === 0) { Everything is resolved. } @else { No one matches your search. }
          </div>
        }
      </div>
    }

    <style>
      .rs-note { font-size: 13px; padding: 10px 14px; border-radius: 10px; background: var(--surface-2); color: var(--text-muted); margin-bottom: 14px; }
      .rs-f { max-width: 320px; margin-bottom: 14px; }
      .rs-f label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .rs-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .rs-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .rs-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
      .rs-item { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; padding: 16px 24px; border-top: 1px solid var(--border); }
      .rs-item:first-child { border-top: 0; }
      .rs-main { flex: 1 1 340px; min-width: 0; }
      .rs-name { font-weight: 700; color: var(--text); margin-right: 8px; }
      .rs-meta { font-size: 12.5px; color: var(--text-muted); }
      .rs-prog { font-size: 13.5px; margin-top: 2px; }
      .rs-status { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 6px; }
      .rs-acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .rs-btn { display: inline-flex; align-items: center; min-height: 40px; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 0 14px; font: inherit; font-size: 13px; cursor: pointer; color: var(--text); text-decoration: none; }
      .rs-btn:hover:not(:disabled) { background: var(--surface-2); }
      .rs-btn:disabled { opacity: 0.5; cursor: default; }
      .rs-btn:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
      .rs-danger { color: #b3261e; }
      .rs-empty { padding: 28px; text-align: center; font-size: 13.5px; color: var(--text-muted); }
      .rs-link { font-size: 13px; color: var(--navy); cursor: pointer; text-decoration: underline; margin-left: 8px; }
    </style>
  `,
})
export class TrainingResolveComponent implements OnInit {
  private training = inject(TrainingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  readonly fmt = fmtDate;
  meta = (a: NeedsResolutionItem) => STATUS_META[a.status];

  items = signal<NeedsResolutionItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  busyId = signal<number | null>(null);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return (this.items() ?? []).filter(
      (a) => !q || `${a.employeeName} ${a.programmeTitle} ${a.intakeName}`.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    this.items.set(null);
    this.training.getNeedsResolution().subscribe({
      next: (list) => this.items.set(list),
      error: () => this.failed.set(true),
    });
  }

  private removeRow(id: number): void {
    this.items.update((list) => (list ?? []).filter((x) => x.trainingAssignmentId !== id));
    this.training.refreshBadges();
  }

  // Extending keeps the row: the intake has still ended, so it needs Move or Not completed to clear.
  extend(a: NeedsResolutionItem): void {
    this.dialog
      .open(TrainingDueDateDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        data: {
          assignmentId: a.trainingAssignmentId,
          employeeName: a.employeeName,
          programmeTitle: a.programmeTitle,
          dueDate: a.dueDate,
        },
      })
      .afterClosed()
      .subscribe((updated: AssignmentListItem | undefined) => {
        if (!updated) return;
        this.items.update((list) =>
          (list ?? []).map((x) =>
            x.trainingAssignmentId === a.trainingAssignmentId
              ? { ...x, dueDate: updated.dueDate, isOverdue: updated.isOverdue }
              : x,
          ),
        );
        this.toast.show('Due date extended. It stays here until you move it or mark it not completed.', 'success');
      });
  }

  move(a: NeedsResolutionItem): void {
    this.dialog
      .open(TrainingMoveDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: {
          assignmentId: a.trainingAssignmentId,
          employeeName: a.employeeName,
          programmeId: a.trainingProgrammeId,
          currentIntakeId: a.trainingIntakeId,
          progressPercent: a.progressPercent,
        },
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        this.removeRow(a.trainingAssignmentId);
        this.toast.show(`${a.employeeName} moved to the new intake.`, 'success');
      });
  }

  markNotCompleted(a: NeedsResolutionItem): void {
    if (this.busyId() !== null) return;
    if (!confirm(`Mark ${a.employeeName}’s ${a.programmeTitle} as Not completed? It stays in their history.`)) return;
    this.busyId.set(a.trainingAssignmentId);
    this.training.markNotCompleted(a.trainingAssignmentId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeRow(a.trainingAssignmentId);
        this.toast.show('Marked as not completed.', 'success');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.show(errMsg(err, 'Could not mark this as not completed.'), 'error');
        this.load();
      },
    });
  }
}