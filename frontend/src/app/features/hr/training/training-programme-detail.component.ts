import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import { IntakeListItem, ProgrammeResponse } from '../../../core/models/index';
import {
  STATE_META,
  errMsg,
  fmtDate,
} from '../../../core/utils/training-format';
import { TrainingIntakeDialogComponent } from './training-intake-dialog.component';

// Route: admin/training/programmes/:id  (HR, Admin)
@Component({
  selector: 'app-training-programme-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container pdt-page">
      <a class="pdt-back" routerLink="/admin/training"
        ><i class="ti ti-arrow-left"></i> Programmes</a
      >

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      } @else {
        @if (programme(); as p) {
          <div class="pdt-head">
            <div>
              <div class="pdt-title">{{ p.title }}</div>
              <div class="pdt-chips">
                <span
                  [class]="p.isActive ? 'tc-chip tc-green' : 'tc-chip tc-grey'"
                  >{{ p.isActive ? 'Active' : 'Retired' }}</span
                >
                @if (p.category) {
                  <span class="tc-chip tc-grey">{{ p.category }}</span>
                }
                @if (p.durationHours) {
                  <span class="tc-chip tc-grey"
                    >{{ p.durationHours }} hours</span
                  >
                }
              </div>
              <div class="pdt-meta">
                {{ p.provider || 'No provider' }} · Created by
                {{ p.createdByName }}, {{ fmt(p.createdAt) }}
                @if (p.url) {
                  ·
                  <a
                    class="pdt-ext"
                    [href]="p.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Open course link</a
                  >
                }
              </div>
            </div>
            <div class="pdt-actions">
              <button
                class="pdt-btn"
                type="button"
                [disabled]="!p.isActive"
                [title]="
                  p.isActive ? '' : 'Reactivate the programme to edit it'
                "
                [routerLink]="[
                  '/admin/training/programmes',
                  p.trainingProgrammeId,
                  'edit',
                ]"
              >
                Edit
              </button>
              @if (p.isActive) {
                <button
                  class="pdt-btn"
                  type="button"
                  [disabled]="busy() || p.openIntakeCount > 0"
                  [title]="
                    p.openIntakeCount > 0
                      ? 'Close or finish its upcoming and running intakes first'
                      : ''
                  "
                  (click)="retire()"
                >
                  Retire
                </button>
              } @else {
                <button
                  class="pdt-btn"
                  type="button"
                  [disabled]="busy()"
                  (click)="reactivate()"
                >
                  Reactivate
                </button>
              }
            </div>
          </div>

          @if (!p.isActive) {
            <div class="pdt-info">
              <i class="ti ti-lock"></i> This programme is retired. Its history
              stays, but it can’t be edited or given new intakes.
            </div>
          }

          <div class="pdt-card">
            <div class="pdt-h">About</div>
            <div class="pdt-text">
              {{ p.description || 'No description yet.' }}
            </div>
            <div class="pdt-h pdt-gap">Skills this training builds</div>
            @for (s of p.skills; track s.skillId) {
              <span class="pdt-skill">{{ s.skillName }}</span>
            } @empty {
              <span class="pdt-meta">No skills linked yet.</span>
            }
          </div>

          <div class="pdt-ihead">
            <div class="pdt-h2">Intakes ({{ intakes()?.length ?? 0 }})</div>
            <button
              class="btn-primary"
              type="button"
              [disabled]="!p.isActive"
              [title]="p.isActive ? '' : 'Reactivate the programme first'"
              (click)="newIntake()"
            >
              <i class="ti ti-plus"></i> New intake
            </button>
          </div>

          @if (intakesFailed()) {
            <div class="api-error">
              <i class="ti ti-alert-circle"></i> We couldn’t load the intakes.
              <a class="pdt-link" (click)="loadIntakes()">Try again</a>
            </div>
          } @else if (intakes() === null) {
            <div class="empty-state">
              <mat-spinner diameter="26"></mat-spinner>
            </div>
          } @else {
            <div class="pdt-card pdt-flush">
              <div class="pdt-scroll">
                <div class="pdt-table">
                  <div class="pdt-grid pdt-thead">
                    <div>Intake</div>
                    <div>Dates</div>
                    <div>State</div>
                    <div>Assigned</div>
                    <div>Completed</div>
                  </div>
                  @for (i of intakes(); track i.trainingIntakeId) {
                    <a
                      class="pdt-grid pdt-row"
                      [routerLink]="[
                        '/admin/training/intakes',
                        i.trainingIntakeId,
                      ]"
                    >
                      <div class="pdt-name">{{ i.name }}</div>
                      <div>{{ fmt(i.startDate) }} – {{ fmt(i.endDate) }}</div>
                      <div>
                        <span [class]="'tc-chip ' + state(i).cls">{{
                          state(i).label
                        }}</span>
                      </div>
                      <div>
                        {{ i.assignmentCount
                        }}{{
                          i.maxParticipants ? ' / ' + i.maxParticipants : ''
                        }}
                      </div>
                      <div>{{ i.completedCount }}</div>
                    </a>
                  } @empty {
                    <div class="pdt-empty">
                      No intakes yet. Create one to start assigning employees.
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
      .pdt-page {
        max-width: 1100px;
      }
      .pdt-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 10px;
        text-decoration: none;
      }
      .pdt-back:hover {
        color: var(--navy);
      }
      .pdt-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .pdt-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .pdt-chips {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .pdt-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 6px;
      }
      .pdt-ext {
        color: var(--navy);
        text-decoration: underline;
      }
      .pdt-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pdt-btn {
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
      .pdt-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .pdt-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .pdt-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .pdt-info {
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
      .pdt-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px 22px;
        margin-bottom: 18px;
      }
      .pdt-flush {
        padding: 0;
        overflow: hidden;
      }
      .pdt-h {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--navy);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
      }
      .pdt-gap {
        margin-top: 16px;
      }
      .pdt-h2 {
        font-size: 18px;
        font-weight: 800;
        color: var(--text);
      }
      .pdt-text {
        font-size: 13.5px;
        color: var(--text);
        white-space: pre-line;
      }
      .pdt-skill {
        display: inline-block;
        background: var(--surface-2);
        border-radius: 20px;
        padding: 3px 10px;
        margin: 2px 6px 2px 0;
        font-size: 12.5px;
      }
      .pdt-ihead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .pdt-scroll {
        overflow-x: auto;
      }
      .pdt-table {
        min-width: 680px;
      }
      .pdt-grid {
        display: grid;
        grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
        gap: 16px;
        padding: 14px 24px;
        align-items: center;
      }
      .pdt-thead {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .pdt-row {
        border-top: 1px solid var(--border);
        color: inherit;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
      }
      .pdt-row:hover {
        background: var(--surface-2);
      }
      .pdt-row:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: -2px;
      }
      .pdt-name {
        font-weight: 700;
        color: var(--text);
      }
      .pdt-empty {
        padding: 24px;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
      }
      .pdt-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
    </style>
  `,
})
export class TrainingProgrammeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private training = inject(TrainingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  private id = 0;

  programme = signal<ProgrammeResponse | null>(null);
  intakes = signal<IntakeListItem[] | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  intakesFailed = signal(false);
  busy = signal(false);

  readonly fmt = fmtDate;
  state = (i: IntakeListItem) => STATE_META[i.state];

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProgramme(true);
  }

  private loadProgramme(first = false): void {
    this.training.getProgramme(this.id).subscribe({
      next: (p) => {
        this.programme.set(p);
        this.loading.set(false);
        if (first) this.loadIntakes();
      },
      error: (err) => {
        this.loadError.set(errMsg(err, 'Could not load the programme.'));
        this.loading.set(false);
      },
    });
  }

  loadIntakes(): void {
    this.intakesFailed.set(false);
    this.intakes.set(null);
    this.training.getIntakes(this.id).subscribe({
      next: (list) => this.intakes.set(list),
      error: () => this.intakesFailed.set(true),
    });
  }

  // ───────────── Actions ─────────────

  retire(): void {
    const p = this.programme();
    if (!p || this.busy()) return;
    if (
      !confirm(
        `Retire ${p.title}? It can’t be edited or given new intakes until you reactivate it. History stays.`,
      )
    )
      return;
    this.busy.set(true);
    this.training.retireProgramme(this.id).subscribe({
      next: (updated) => {
        this.programme.set(updated);
        this.busy.set(false);
        this.toast.show('Programme retired.', 'success');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.show(
          errMsg(err, 'Could not retire the programme.'),
          'error',
        );
      },
    });
  }

  reactivate(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.training.reactivateProgramme(this.id).subscribe({
      next: (updated) => {
        this.programme.set(updated);
        this.busy.set(false);
        this.toast.show('Programme reactivated.', 'success');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.show(
          errMsg(err, 'Could not reactivate the programme.'),
          'error',
        );
      },
    });
  }

  newIntake(): void {
    const p = this.programme();
    if (!p || !p.isActive) return;
    this.dialog
      .open(TrainingIntakeDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: { programmeId: p.trainingProgrammeId, programmeTitle: p.title },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.show('Intake created.', 'success');
        // Counts on the programme (open intakes) changed too
        this.loadProgramme();
        this.loadIntakes();
      });
  }
}
