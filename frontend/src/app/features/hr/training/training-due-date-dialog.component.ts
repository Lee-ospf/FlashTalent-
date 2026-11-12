import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TrainingService } from '../../../core/services/training.service';
import { AssignmentListItem } from '../../../core/models/index';
import { errMsg, fmtDate, todayStr } from '../../../core/utils/training-format';

export interface DueDateDialogData {
  assignmentId: number;
  employeeName: string;
  programmeTitle: string;
  dueDate: string; // current due date
}

// Sets one person's due date (PATCH training-assignments/{id}/due-date).
// Works on ended intakes too, which is how HR extends someone who didn't finish.
// Closes with the updated AssignmentListItem, or undefined if cancelled.
@Component({
  selector: 'app-training-due-date-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Set due date</h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <div class="dd-who">
          <b>{{ data.employeeName }}</b> · {{ data.programmeTitle }}
        </div>
        <div class="dd-hint">Current due date: {{ fmt(data.dueDate) }}</div>

        <label class="dd-lbl" for="dd-date">New due date</label>
        <input id="dd-date" class="dd-input" name="due" type="date" [min]="today" [(ngModel)]="due" />
        <div class="dd-hint">A later date also lets the 3-day reminder be sent again.</div>

        @if (error()) {
          <div class="dd-error" role="alert">{{ error() }}</div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="dd-cancel" type="button" (click)="ref.close()">Cancel</button>
        <button class="btn-primary" type="submit" [disabled]="saving()">
          @if (saving()) { <mat-spinner diameter="14" class="dd-spin"></mat-spinner> }
          Save due date
        </button>
      </mat-dialog-actions>
    </form>

    <style>
      .dd-who { font-size: 14px; margin-bottom: 4px; }
      .dd-hint { font-size: 12px; color: var(--text-muted); margin: 3px 0 12px; }
      .dd-lbl { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .dd-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .dd-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .dd-error { font-size: 13px; color: #b3261e; background: #fdecea; border-radius: 8px; padding: 9px 12px; margin-top: 8px; }
      .dd-cancel { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; }
      .dd-cancel:hover { background: var(--surface-2); }
      .dd-spin { display: inline-block; }
      .dd-spin ::ng-deep circle { stroke: #fff; }
    </style>
  `,
})
export class TrainingDueDateDialogComponent {
  data = inject<DueDateDialogData>(MAT_DIALOG_DATA);
  ref = inject<MatDialogRef<TrainingDueDateDialogComponent, AssignmentListItem>>(MatDialogRef);
  private training = inject(TrainingService);

  readonly today = todayStr();
  readonly fmt = fmtDate;
  due = this.data.dueDate.slice(0, 10) < this.today ? this.today : this.data.dueDate.slice(0, 10);
  saving = signal(false);
  error = signal<string | null>(null);

  save(): void {
    if (this.saving()) return;
    if (!this.due) {
      this.error.set('Due date is required.');
      return;
    }
    if (this.due < this.today) {
      this.error.set('Due date can’t be in the past.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.training.setDueDate(this.data.assignmentId, this.due).subscribe({
      next: (item) => {
        this.saving.set(false);
        this.ref.close(item);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errMsg(err, 'Could not update the due date.'));
      },
    });
  }
}