import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TrainingService } from '../../../core/services/training.service';
import { IntakeResponse, SaveIntakeRequest } from '../../../core/models/index';
import { errMsg, todayStr } from '../../../core/utils/training-format';

export interface IntakeDialogData {
  programmeId: number;
  programmeTitle: string;
  intake?: IntakeResponse; // present = edit
}

// Opened with MatDialog. Closes with the saved IntakeResponse, or undefined if cancelled.
// Validation mirrors TrainingIntakesController.ValidateAsync. The server stays the authority.
@Component({
  selector: 'app-training-intake-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ data.intake ? 'Edit intake' : 'New intake' }}</h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <div class="id-prog">{{ data.programmeTitle }}</div>

        <div class="id-field">
          <label for="id-name">Name *</label>
          <input
            id="id-name"
            class="id-input"
            name="name"
            maxlength="200"
            [(ngModel)]="form.name"
          />
        </div>

        <div class="id-grid">
          <div class="id-field">
            <label for="id-start">Start date *</label>
            <input
              id="id-start"
              class="id-input"
              name="start"
              type="date"
              [min]="minStart"
              [disabled]="startLocked"
              [(ngModel)]="form.startDate"
            />
            @if (startLocked) {
              <div class="id-hint">Locked once employees are assigned.</div>
            }
          </div>
          <div class="id-field">
            <label for="id-end">End date *</label>
            <input
              id="id-end"
              class="id-input"
              name="end"
              type="date"
              [min]="minEnd"
              [(ngModel)]="form.endDate"
            />
          </div>
        </div>
        @if (data.intake) {
          <div class="id-hint">
            Employees still on the old end date will move to the new one.
            Individual due dates are kept.
          </div>
        }

        <div class="id-field">
          <label for="id-max"
            >Max participants (leave empty for no limit)</label
          >
          <input
            id="id-max"
            class="id-input"
            name="max"
            type="number"
            [min]="minMax"
            [(ngModel)]="form.maxParticipants"
          />
        </div>

        @if (error()) {
          <div class="id-error" role="alert">{{ error() }}</div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button class="id-cancel" type="button" (click)="ref.close()">
          Cancel
        </button>
        <button class="btn-primary" type="submit" [disabled]="saving()">
          @if (saving()) {
            <mat-spinner diameter="14" class="id-spin"></mat-spinner>
          }
          Save intake
        </button>
      </mat-dialog-actions>
    </form>

    <style>
      .id-prog {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 12px;
      }
      .id-field {
        margin-bottom: 14px;
      }
      .id-field label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .id-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .id-input {
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
      .id-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .id-input:disabled {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .id-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin: 3px 0 10px;
      }
      .id-error {
        font-size: 13px;
        color: #b3261e;
        background: #fdecea;
        border-radius: 8px;
        padding: 9px 12px;
      }
      .id-cancel {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 9px 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .id-cancel:hover {
        background: var(--surface-2);
      }
      .id-spin {
        display: inline-block;
      }
      .id-spin ::ng-deep circle {
        stroke: #fff;
      }
      @media (max-width: 520px) {
        .id-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `,
})
export class TrainingIntakeDialogComponent {
  data = inject<IntakeDialogData>(MAT_DIALOG_DATA);
  ref =
    inject<MatDialogRef<TrainingIntakeDialogComponent, IntakeResponse>>(
      MatDialogRef,
    );
  private training = inject(TrainingService);

  saving = signal(false);
  error = signal<string | null>(null);

  readonly today = todayStr();
  private origStart: string;
  private origEnd: string;

  form: {
    name: string;
    startDate: string;
    endDate: string;
    maxParticipants: number | null;
  };

  constructor() {
    const i = this.data.intake;
    this.origStart = i ? i.startDate.slice(0, 10) : '';
    this.origEnd = i ? i.endDate.slice(0, 10) : '';
    this.form = {
      name: i?.name ?? '',
      startDate: this.origStart,
      endDate: this.origEnd,
      maxParticipants: i?.maxParticipants ?? null,
    };
  }

  // The start date is locked once anyone is assigned (backend rule)
  get startLocked(): boolean {
    return !!this.data.intake && this.data.intake.assignmentCount > 0;
  }

  // An unchanged past date stays selectable when editing a running intake
  get minStart(): string {
    return this.origStart && this.origStart < this.today
      ? this.origStart
      : this.today;
  }
  get minEnd(): string {
    const s = this.form.startDate;
    const floor = s && s > this.today ? s : this.today;
    return this.origEnd && this.origEnd < floor ? this.origEnd : floor;
  }
  // Can't go below the number already assigned
  get minMax(): number {
    return Math.max(1, this.data.intake?.assignmentCount ?? 1);
  }

  private validate(): string | null {
    const f = this.form;
    const name = f.name.trim();
    if (!name) return 'Name is required.';
    if (name.length > 200) return 'Name can’t be longer than 200 characters.';
    if (!f.startDate) return 'Start date is required.';
    if (!f.endDate) return 'End date is required.';
    if (f.endDate < f.startDate)
      return 'End date can’t be before the start date.';
    if (f.startDate !== this.origStart && f.startDate < this.today)
      return 'Start date can’t be in the past.';
    if (f.endDate !== this.origEnd && f.endDate < this.today)
      return 'End date can’t be in the past.';
    const max = f.maxParticipants;
    if (max != null) {
      if (max < 1)
        return 'Max participants must be at least 1, or left empty for no limit.';
      const assigned = this.data.intake?.assignmentCount ?? 0;
      if (max < assigned) {
        return `Max participants can’t be lower than the ${assigned} employee(s) already assigned.`;
      }
    }
    return null;
  }

  save(): void {
    if (this.saving()) return;
    const problem = this.validate();
    this.error.set(problem);
    if (problem) return;

    const f = this.form;
    const body: SaveIntakeRequest = {
      name: f.name.trim(),
      startDate: f.startDate,
      endDate: f.endDate,
      maxParticipants: f.maxParticipants,
    };
    const edit = this.data.intake;
    const call$ = edit
      ? this.training.updateIntake(edit.trainingIntakeId, body)
      : this.training.createIntake({
          ...body,
          trainingProgrammeId: this.data.programmeId,
        });

    this.saving.set(true);
    call$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.ref.close(saved);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errMsg(err, 'Could not save the intake.'));
      },
    });
  }
}
