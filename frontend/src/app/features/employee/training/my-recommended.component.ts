import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { CareerGoalsService } from '../../../core/services/career-goals.service';
import {
  AdviceItem,
  AdviceResponse,
  AdviceStatus,
  CareerGoalResponse,
} from '../../../core/models/index';
import {
  errMsg,
  fmtDate,
  fmtDay,
  todayStr,
} from '../../../core/utils/training-format';

const MAX_ACTIVE_GOALS = 3; // SkillSuggestionRules.MaxActiveGoals
const MAX_ROLE_LENGTH = 200; // SkillSuggestionRules.MaxGoalTextLength

// ───────────── Goal dialog (only used here) ─────────────

export interface GoalDialogData {
  goal?: CareerGoalResponse; // present = edit
  activeGoals: CareerGoalResponse[];
}

// Mirrors CareerGoalsController validation. Closes with the saved goal, or undefined if cancelled.
@Component({
  selector: 'app-career-goal-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>
      {{ data.goal ? 'Edit career goal' : 'New career goal' }}
    </h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <label class="cg-lbl" for="cg-role">Role you want to grow into *</label>
        <input
          id="cg-role"
          class="cg-input"
          name="role"
          [maxlength]="maxRole"
          placeholder="e.g. Tech Lead"
          [(ngModel)]="role"
        />

        <label class="cg-lbl cg-gap" for="cg-date"
          >Target date (optional)</label
        >
        <input
          id="cg-date"
          class="cg-input"
          name="date"
          type="date"
          [min]="today"
          [(ngModel)]="date"
        />

        <label class="cg-check">
          <input type="checkbox" name="share" [(ngModel)]="share" />
          Share this goal with HR
        </label>
        <div class="cg-hint">
          If you don’t share it, HR can’t see it and it’s left out of reports.
        </div>

        @if (error()) {
          <div class="cg-error" role="alert">{{ error() }}</div>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button class="cg-cancel" type="button" (click)="ref.close()">
          Cancel
        </button>
        <button class="btn-primary" type="submit" [disabled]="saving()">
          @if (saving()) {
            <mat-spinner diameter="14" class="cg-spin"></mat-spinner>
          }
          Save goal
        </button>
      </mat-dialog-actions>
    </form>
    <style>
      .cg-lbl {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .cg-gap {
        margin-top: 12px;
      }
      .cg-input {
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
      .cg-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .cg-check {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        margin-top: 14px;
        min-height: 40px;
        cursor: pointer;
      }
      .cg-hint {
        font-size: 12px;
        color: var(--text-muted);
      }
      .cg-error {
        font-size: 13px;
        color: #b3261e;
        background: #fdecea;
        border-radius: 8px;
        padding: 9px 12px;
        margin-top: 10px;
      }
      .cg-cancel {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 9px 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .cg-cancel:hover {
        background: var(--surface-2);
      }
      .cg-spin {
        display: inline-block;
      }
      .cg-spin ::ng-deep circle {
        stroke: #fff;
      }
    </style>
  `,
})
export class CareerGoalDialogComponent {
  data = inject<GoalDialogData>(MAT_DIALOG_DATA);
  ref =
    inject<MatDialogRef<CareerGoalDialogComponent, CareerGoalResponse>>(
      MatDialogRef,
    );
  private api = inject(CareerGoalsService);

  readonly maxRole = MAX_ROLE_LENGTH;
  readonly today = todayStr();
  role = this.data.goal?.targetRole ?? '';
  date = this.data.goal?.targetDate
    ? this.data.goal.targetDate.slice(0, 10)
    : '';
  share = this.data.goal?.shareWithHr ?? true;
  saving = signal(false);
  error = signal<string | null>(null);

  private validate(role: string): string | null {
    if (!role) return 'Target role is required.';
    if (role.length > MAX_ROLE_LENGTH)
      return `Target role can’t be longer than ${MAX_ROLE_LENGTH} characters.`;
    if (this.date && this.date < this.today)
      return 'Target date can’t be in the past.';
    const others = this.data.activeGoals.filter(
      (g) => g.careerGoalId !== this.data.goal?.careerGoalId,
    );
    if (!this.data.goal && others.length >= MAX_ACTIVE_GOALS) {
      return `You can have at most ${MAX_ACTIVE_GOALS} active goals. Archive or complete one first.`;
    }
    if (others.some((g) => g.targetRole.toLowerCase() === role.toLowerCase())) {
      return 'You already have an active goal with that role.';
    }
    return null;
  }

  save(): void {
    if (this.saving()) return;
    // Collapse repeated spaces, like the backend does, so "Tech   Lead " is saved as "Tech Lead"
    const role = this.role.split(/\s+/).filter(Boolean).join(' ');
    const problem = this.validate(role);
    this.error.set(problem);
    if (problem) return;

    const body = {
      targetRole: role,
      targetDate: this.date || null,
      shareWithHr: this.share,
    };
    const call$ = this.data.goal
      ? this.api.update(this.data.goal.careerGoalId, body)
      : this.api.create(body);
    this.saving.set(true);
    call$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.ref.close(saved);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errMsg(err, 'Could not save the goal.'));
      },
    });
  }
}

// ───────────── Recommended tab ─────────────

// Shown inside MyTrainingComponent. Employees can't enrol themselves, so a suggested programme
// tells them to ask HR. Advice is only fetched when the employee opens a goal.
@Component({
  selector: 'app-my-recommended',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="rc-head">
      <div>
        <div class="rc-h2">Career goals</div>
        <div class="rc-meta">
          Add up to {{ maxGoals }} goals and get a suggested learning path for
          each. HR assigns the actual training.
        </div>
      </div>
      <button
        class="btn-primary"
        type="button"
        [disabled]="goals() === null || goals()!.length >= maxGoals"
        [title]="
          goals() && goals()!.length >= maxGoals
            ? 'You have ' +
              maxGoals +
              ' active goals. Archive or complete one first.'
            : ''
        "
        (click)="openGoal()"
      >
        <i class="ti ti-plus"></i> New goal
      </button>
    </div>

    @if (failed()) {
      <div class="api-error">
        <i class="ti ti-alert-circle"></i> {{ failed() }}
        <a class="rc-link" (click)="load()">Try again</a>
      </div>
    } @else if (goals() === null) {
      <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      @for (g of goals(); track g.careerGoalId) {
        <article class="rc-card">
          <div class="rc-top">
            <div>
              <div class="rc-h3">{{ g.targetRole }}</div>
              <div class="rc-meta">
                {{
                  g.targetDate
                    ? 'Target ' + fmt(g.targetDate)
                    : 'No target date'
                }}
                · {{ g.shareWithHr ? 'Shared with HR' : 'Private' }}
              </div>
            </div>
            <div class="rc-acts">
              <button class="rc-btn" type="button" (click)="openGoal(g)">
                Edit
              </button>
              <button
                class="rc-btn"
                type="button"
                [disabled]="busyGoal() === g.careerGoalId"
                (click)="finish(g, 'archive')"
              >
                Archive
              </button>
              <button
                class="rc-btn"
                type="button"
                [disabled]="busyGoal() === g.careerGoalId"
                (click)="finish(g, 'achieve')"
              >
                Achieved
              </button>
            </div>
          </div>

          <div class="rc-acts rc-gap">
            @if (generating() === g.careerGoalId) {
              <span class="rc-meta"
                ><mat-spinner diameter="14" class="rc-inline"></mat-spinner>
                Working out your path. This can take a few seconds.</span
              >
            } @else if (advice()[g.careerGoalId] || g.hasAdvice) {
              <button
                class="rc-btn"
                type="button"
                [disabled]="loadingAdvice() === g.careerGoalId"
                (click)="toggle(g)"
              >
                {{ open() === g.careerGoalId ? 'Hide advice' : 'View advice' }}
              </button>
              <button
                class="rc-btn"
                type="button"
                [disabled]="advice()[g.careerGoalId]?.generationsLeft === 0"
                (click)="generate(g)"
              >
                Refresh advice
                @if (advice()[g.careerGoalId]; as a) {
                  ({{ a.generationsLeft }} left today)
                }
              </button>
            } @else {
              <button class="btn-primary" type="button" (click)="generate(g)">
                Get advice
              </button>
            }
          </div>

          @if (errors()[g.careerGoalId]; as e) {
            <div class="rc-note rc-rj" role="alert">{{ e }}</div>
          }

          @if (open() === g.careerGoalId && advice()[g.careerGoalId]; as a) {
            @if (a.isStale) {
              <div class="rc-note rc-wn">
                <i class="ti ti-refresh"></i> Your skills or the course list
                changed since this was written. Refresh to update it.
              </div>
            }
            @if (a.summary) {
              <p class="rc-sum">{{ a.summary }}</p>
            }
            <div class="rc-meta">Generated {{ day(a.generatedAt) }}</div>

            @for (it of a.items; track it.skillSuggestionItemId) {
              <div class="rc-step" [class.rc-done]="it.status !== 'Suggested'">
                <div class="rc-top">
                  <div>
                    <b>{{ it.skillName }}</b>
                    @if (it.targetLevel) {
                      <span class="tc-chip tc-grey">{{ it.targetLevel }}</span>
                    }
                    @if (it.status !== 'Suggested') {
                      <span
                        [class]="
                          it.status === 'Accepted'
                            ? 'tc-chip tc-green'
                            : 'tc-chip tc-grey'
                        "
                        >{{ it.status }}</span
                      >
                    }
                  </div>
                  <div class="rc-acts">
                    @if (it.status === 'Suggested') {
                      <button
                        class="rc-btn"
                        type="button"
                        (click)="setStatus(g, it, 'Accepted')"
                      >
                        Accept
                      </button>
                      <button
                        class="rc-btn"
                        type="button"
                        (click)="setStatus(g, it, 'Dismissed')"
                      >
                        Dismiss
                      </button>
                    } @else {
                      <button
                        class="rc-btn"
                        type="button"
                        (click)="setStatus(g, it, 'Suggested')"
                      >
                        Undo
                      </button>
                    }
                  </div>
                </div>
                <div class="rc-text">{{ it.advice }}</div>

                @if (it.programme; as p) {
                  <div class="rc-note">
                    <i class="ti ti-school"></i>
                    <span>
                      <b>{{ p.title }}</b>
                      <span class="rc-meta"
                        >{{ p.provider || '' }}
                        @if (p.durationHours) {
                          · {{ p.durationHours }} hours
                        }</span
                      ><br />
                      @if (it.isAlreadyAssigned) {
                        Already assigned to you.
                      } @else if (!p.isActive) {
                        This programme is no longer offered.
                      } @else {
  @if (p.nextOpenIntake; as n) {
                        Next intake: {{ n.name }}, starts {{ fmt(n.startDate) }}
                        @if (n.spotsLeft !== null) {
                          ({{ n.spotsLeft }} spots left)
                        }
                        . Ask HR to add you.
                      } @else {
                        No open intake yet. Ask HR to schedule one.
                      }}
                    </span>
                  </div>
                }
                @if (it.externalIdea) {
                  <div class="rc-note">
                    <i class="ti ti-sparkles"></i> AI suggestion, not verified:
                    {{ it.externalIdea }}
                  </div>
                }
              </div>
            } @empty {
              <div class="rc-meta rc-gap">
                Nothing to work on. You already meet what this role needs.
              </div>
            }
          }
        </article>
      } @empty {
        <div class="rc-empty">
          Add a career goal to get a suggested learning path.
        </div>
      }
    }

    <style>
      .rc-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .rc-h2 {
        font-size: 18px;
        font-weight: 800;
        color: var(--text);
      }
      .rc-h3 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .rc-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .rc-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px 22px;
        margin-bottom: 14px;
      }
      .rc-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .rc-acts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .rc-gap {
        margin-top: 12px;
      }
      .rc-btn {
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
      .rc-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .rc-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .rc-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .rc-sum {
        margin: 14px 0 4px;
        font-size: 14px;
      }
      .rc-step {
        border-top: 1px solid var(--border);
        padding: 14px 0;
        margin-top: 10px;
      }
      .rc-done {
        opacity: 0.65;
      }
      .rc-text {
        font-size: 13.5px;
        margin-top: 6px;
      }
      .rc-note {
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
      .rc-wn {
        background: #fff3e0;
        color: #8a5a00;
      }
      .rc-rj {
        background: #fdecea;
        color: #b3261e;
      }
      .rc-empty {
        padding: 28px;
        text-align: center;
        font-size: 13.5px;
        color: var(--text-muted);
        background: #fff;
        border: 1px dashed var(--border);
        border-radius: 16px;
      }
      .rc-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
      .rc-inline {
        display: inline-block;
        vertical-align: middle;
        margin-right: 6px;
      }
    </style>
  `,
})
export class MyRecommendedComponent implements OnInit {
  private api = inject(CareerGoalsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  readonly maxGoals = MAX_ACTIVE_GOALS;
  readonly fmt = fmtDate;
  readonly day = fmtDay;

  goals = signal<CareerGoalResponse[] | null>(null);
  failed = signal<string | null>(null);
  advice = signal<Record<number, AdviceResponse>>({});
  errors = signal<Record<number, string>>({});
  open = signal<number | null>(null);
  generating = signal<number | null>(null);
  loadingAdvice = signal<number | null>(null);
  busyGoal = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(null);
    this.goals.set(null);
    // Only active goals: the backend returns Active and Achieved when no status is given
    this.api.getMine('Active').subscribe({
      next: (list) => this.goals.set(list),
      error: (err) =>
        this.failed.set(errMsg(err, 'We couldn’t load your career goals.')),
    });
  }

  private setError(goalId: number, msg: string | null): void {
    this.errors.update((e) => {
      const n = { ...e };
      if (msg) n[goalId] = msg;
      else delete n[goalId];
      return n;
    });
  }

  // ───────────── Goals ─────────────

  openGoal(goal?: CareerGoalResponse): void {
    this.dialog
      .open(CareerGoalDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        data: { goal, activeGoals: this.goals() ?? [] },
      })
      .afterClosed()
      .subscribe((saved: CareerGoalResponse | undefined) => {
        if (!saved) return;
        this.goals.update((list) =>
          goal
            ? (list ?? []).map((g) =>
                g.careerGoalId === saved.careerGoalId ? saved : g,
              )
            : [...(list ?? []), saved],
        );
        this.toast.show('Goal saved.', 'success');
      });
  }

  finish(g: CareerGoalResponse, how: 'archive' | 'achieve'): void {
    if (this.busyGoal() !== null) return;
    const text =
      how === 'archive'
        ? `Archive “${g.targetRole}”?`
        : `Mark “${g.targetRole}” as achieved?`;
    if (!confirm(text)) return;
    this.busyGoal.set(g.careerGoalId);
    const call$ =
      how === 'archive'
        ? this.api.archive(g.careerGoalId)
        : this.api.achieve(g.careerGoalId);
    call$.subscribe({
      next: () => {
        this.busyGoal.set(null);
        this.goals.update((list) =>
          (list ?? []).filter((x) => x.careerGoalId !== g.careerGoalId),
        );
        this.toast.show(
          how === 'archive' ? 'Goal archived.' : 'Marked as achieved.',
          'success',
        );
      },
      error: (err) => {
        this.busyGoal.set(null);
        this.toast.show(errMsg(err, 'Could not update the goal.'), 'error');
      },
    });
  }

  // ───────────── Advice ─────────────

  toggle(g: CareerGoalResponse): void {
    const id = g.careerGoalId;
    if (this.open() === id) {
      this.open.set(null);
      return;
    }
    if (this.advice()[id]) {
      this.open.set(id);
      return;
    }
    // Fetch on first open. 204 (nothing generated yet) arrives as null.
    this.loadingAdvice.set(id);
    this.setError(id, null);
    this.api.getAdvice(id).subscribe({
      next: (a) => {
        this.loadingAdvice.set(null);
        if (a) {
          this.advice.update((m) => ({ ...m, [id]: a }));
          this.open.set(id);
        } else {
          this.goals.update((l) =>
            (l ?? []).map((x) =>
              x.careerGoalId === id ? { ...x, hasAdvice: false } : x,
            ),
          );
        }
      },
      error: (err) => {
        this.loadingAdvice.set(null);
        this.setError(id, errMsg(err, 'We couldn’t load your advice.'));
      },
    });
  }

  generate(g: CareerGoalResponse): void {
    const id = g.careerGoalId;
    if (this.generating() !== null) return;
    this.generating.set(id);
    this.setError(id, null);
    this.api.generateAdvice(id).subscribe({
      next: (a) => {
        this.generating.set(null);
        this.advice.update((m) => ({ ...m, [id]: a }));
        this.goals.update((l) =>
          (l ?? []).map((x) =>
            x.careerGoalId === id ? { ...x, hasAdvice: true } : x,
          ),
        );
        this.open.set(id);
        this.toast.show('Advice ready.', 'success');
      },
      error: (err) => {
        this.generating.set(null);
        // 429: "Advice can be generated 5 times in 24 hours...". 502: the AI failed. 400: e.g. the goal wording.
        this.setError(
          id,
          errMsg(
            err,
            'We couldn’t generate advice right now. Please try again shortly.',
          ),
        );
      },
    });
  }

  setStatus(
    g: CareerGoalResponse,
    item: AdviceItem,
    status: AdviceStatus,
  ): void {
    const id = g.careerGoalId;
    const previous = item.status;
    const apply = (s: AdviceStatus) =>
      this.advice.update((m) => {
        const cur = m[id];
        if (!cur) return m;
        return {
          ...m,
          [id]: {
            ...cur,
            items: cur.items.map((x) =>
              x.skillSuggestionItemId === item.skillSuggestionItemId
                ? { ...x, status: s }
                : x,
            ),
          },
        };
      });

    apply(status); // update straight away, undo if the server refuses
    this.api.setItemStatus(item.skillSuggestionItemId, status).subscribe({
      error: (err) => {
        apply(previous);
        this.toast.show(errMsg(err, 'Could not save your choice.'), 'error');
      },
    });
  }
}
