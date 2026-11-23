import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import { CareerGoalsService } from '../../../core/services/career-goals.service';
import {
  EmployeeProfileResponse,
  EmployeeProfileService,
} from '../../../core/services/employee-profile.service';
import {
  AdviceCourse,
  AdviceSkill,
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
import { levelIndex, levelName } from '../../../core/utils/skill-gap';

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

// ───────────── Career goals tab ─────────────

type SkillState = 'missing' | 'below' | 'ok';

// One row of a goal's "Recommended skills" table (the backend sends at most 5 per goal)
interface SkillRow {
  itemId: number;
  skill: string;
  current: string | null; // the employee's level, null = not on profile
  target: string | null; // the level to aim for
  state: SkillState;
  training: string[]; // the courses recommended for this skill, for this goal
  note: string; // how to build the skill
}

interface GoalView {
  goal: CareerGoalResponse;
  rows: SkillRow[];
  // This goal's courses, split by the employee's answer (each course is for this goal only)
  recommended: AdviceCourse[];
  interested: AdviceCourse[];
  dismissed: AdviceCourse[];
}

type CourseTab = 'recommended' | 'interested' | 'dismissed';

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9#+]/g, '');
}

const STATE_LABEL: Record<SkillState, string> = {
  missing: 'Not on your profile',
  below: 'Below target',
  ok: 'On track',
};

// Route: my-career-goals (Employee), opened from the top navigation. Every goal is its own section:
// goal details and advice controls, a table of recommended skills, then the courses recommended for that goal.
// Employees can't enrol themselves and the advice carries no course link, so a course card says to ask HR.
@Component({
  selector: 'app-my-career-goals',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="page-container cg-page">
      <div class="cg-title">Career goals</div>
      <div class="cg-sub">
        Plan where you want to grow and see the skills and training that can get
        you there.
      </div>

      <div class="cg-head">
        <div class="cg-meta">
          {{ goals()?.length ?? 0 }} of {{ maxGoals }} active goals
        </div>
        <button
          class="btn-primary"
          type="button"
          [disabled]="(goals()?.length ?? 0) >= maxGoals"
          [title]="
            (goals()?.length ?? 0) >= maxGoals
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
          <a class="cg-link" (click)="load()">Try again</a>
        </div>
      } @else if (goals() === null) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        @for (v of views(); track v.goal.careerGoalId) {
          <section class="cg-goal">
            <header class="cg-ghead">
              <div>
                <div class="cg-kind">
                  <i class="ti ti-target-arrow"></i> Career goal
                </div>
                <h3 class="cg-gtitle">{{ v.goal.targetRole }}</h3>
                <div class="cg-meta">
                  {{
                    v.goal.targetDate
                      ? 'Target ' + fmt(v.goal.targetDate)
                      : 'No target date'
                  }}
                  ·
                  {{ v.goal.shareWithHr ? 'Shared with HR' : 'Private' }}
                </div>
              </div>
              <div class="cg-acts">
                <button class="cg-btn" type="button" (click)="openGoal(v.goal)">
                  Edit
                </button>
                <button
                  class="cg-btn"
                  type="button"
                  [disabled]="busyGoal() === v.goal.careerGoalId"
                  (click)="finish(v.goal, 'archive')"
                >
                  Archive
                </button>
                <button
                  class="cg-btn"
                  type="button"
                  [disabled]="busyGoal() === v.goal.careerGoalId"
                  (click)="finish(v.goal, 'achieve')"
                >
                  Achieved
                </button>
              </div>
            </header>

            @if (
              generating() === v.goal.careerGoalId ||
              !advice()[v.goal.careerGoalId]
            ) {
              <div class="cg-acts cg-gap">
                @if (generating() === v.goal.careerGoalId) {
                  <span class="cg-meta"
                    ><mat-spinner diameter="14" class="cg-inline"></mat-spinner>
                    Working out your path. This can take a few seconds.</span
                  >
                } @else if (v.goal.hasAdvice && loadingAdvice()) {
                  <span class="cg-meta"
                    ><mat-spinner diameter="14" class="cg-inline"></mat-spinner>
                    Loading your advice…</span
                  >
                } @else {
                  <button
                    class="btn-primary"
                    type="button"
                    [disabled]="generating() !== null"
                    (click)="generate(v.goal)"
                  >
                    View advice
                  </button>
                }
              </div>
            }

            @if (errors()[v.goal.careerGoalId]; as e) {
              <div class="cg-note cg-rj" role="alert">{{ e }}</div>
            }

            @if (advice()[v.goal.careerGoalId]; as a) {
              @if (a.isStale) {
                <div class="cg-note cg-wn">
                  <i class="ti ti-refresh"></i>
                  <span
                    >Your skills or the course list changed since this was
                    written. Refresh to update it.</span
                  >
                  <button
                    class="cg-btn cg-refresh"
                    type="button"
                    [disabled]="
                      a.generationsLeft === 0 || generating() !== null
                    "
                    (click)="generate(v.goal)"
                  >
                    Refresh advice ({{ a.generationsLeft }} left today)
                  </button>
                </div>
              }
              @if (a.summary) {
                <p class="cg-sum">{{ a.summary }}</p>
              }
              <div class="cg-meta">Generated {{ day(a.generatedAt) }}</div>

              <!-- Recommended skills (table) -->
              <h4 class="cg-h4">
                Recommended skills for {{ v.goal.targetRole }}
              </h4>
              @if (v.rows.length) {
                <div class="cg-scroll">
                  <table class="cg-table">
                    <thead>
                      <tr>
                        <th scope="col">Skill</th>
                        <th scope="col">Your level</th>
                        <th scope="col">Aim for</th>
                        <th scope="col">Status</th>
                        <th scope="col">Training</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of v.rows; track r.itemId) {
                        <tr>
                          <td>
                            <b>{{ r.skill }}</b>
                            <div class="cg-meta">{{ r.note }}</div>
                          </td>
                          <td>{{ r.current ?? '–' }}</td>
                          <td>{{ r.target ? levelLabel(r.target) : '–' }}</td>
                          <td>
                            <span [class]="'cg-state cg-s-' + r.state">{{
                              stateLabel[r.state]
                            }}</span>
                          </td>
                          <td>
                            @for (t of r.training; track t) {
                              <div>{{ t }}</div>
                            } @empty {
                              No course yet
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="cg-empty">
                  This advice has no skills yet. Refresh it to try again.
                </div>
              }

              <!-- Recommended training for THIS goal only -->
              <h4 class="cg-h4">Training for {{ v.goal.targetRole }}</h4>
              <div
                class="cg-tabs"
                role="tablist"
                aria-label="Training for this goal"
              >
                @for (t of courseTabs; track t.key) {
                  <button
                    class="cg-tab"
                    type="button"
                    role="tab"
                    [class.cg-on]="tabOf(v.goal.careerGoalId) === t.key"
                    [attr.aria-selected]="tabOf(v.goal.careerGoalId) === t.key"
                    (click)="setCourseTab(v.goal.careerGoalId, t.key)"
                  >
                    {{ t.label }}
                    <span class="cg-pill">{{ v[t.key].length }}</span>
                  </button>
                }
              </div>
              @for (
                c of v[tabOf(v.goal.careerGoalId)];
                track c.skillSuggestionItemId
              ) {
                <article
                  class="cg-course"
                  [class.cg-dim]="c.status === 'Dismissed'"
                >
                  <div class="cg-top">
                    <div>
                      @if (c.programme; as p) {
                        <div class="cg-h3">{{ p.title }}</div>
                        <div class="cg-meta cg-row">
                          @if (p.durationHours) {
                            <span
                              ><i class="ti ti-clock"></i>
                              {{ p.durationHours }} hours</span
                            >
                          }
                          @if (p.provider) {
                            <span>{{ p.provider }}</span>
                          }
                          @if (p.category) {
                            <span>{{ p.category }}</span>
                          }
                        </div>
                      } @else {
                        <div class="cg-h3">{{ c.skillName }}</div>
                        <div class="cg-meta">AI suggestion, not verified</div>
                      }
                    </div>
                    <div class="cg-chips">
                      <span class="cg-goalchip"
                        ><i class="ti ti-target-arrow"></i> For:
                        {{ v.goal.targetRole }}</span
                      >
                      @if (c.status !== 'Suggested') {
                        <span
                          [class]="
                            c.status === 'Accepted'
                              ? 'tc-chip tc-green'
                              : 'tc-chip tc-grey'
                          "
                          >{{
                            c.status === 'Accepted'
                              ? 'Interested'
                              : 'Not interested'
                          }}</span
                        >
                      }
                    </div>
                  </div>

                  <div class="cg-covers">
                    <span class="cg-meta">Helps with:</span>
                    <span class="cg-skill">{{ c.skillName }}</span>
                  </div>
                  <p class="cg-text">
                    {{ c.programme ? c.why : c.externalIdea || c.why }}
                  </p>

                  @if (c.programme) {
                    <div class="cg-avail">
                      @if (c.isAlreadyCompleted) {
                        <i class="ti ti-circle-check cg-ok"></i> You’ve already
                        completed this.
                      } @else if (c.isAlreadyAssigned) {
                        <i class="ti ti-circle-check cg-ok"></i> Already
                        assigned to you.
                      } @else if (!c.programme.isActive) {
                        This programme is no longer offered.
                      } @else {
                        @if (c.programme.nextOpenIntake; as n) {
                          Next intake: <b>{{ n.name }}</b
                          >, starts {{ fmt(n.startDate) }}
                          @if (n.spotsLeft !== null) {
                            ({{ n.spotsLeft }} spots left)
                          }
                          . Ask HR to add you.
                        } @else {
                          No open intake yet. Ask HR to schedule one.
                        }
                      }
                    </div>
                  }

                  @if (!c.isAlreadyCompleted) {
                    <div class="cg-acts cg-gap">
                      @if (c.status === 'Suggested') {
                        <button
                          class="btn-primary"
                          type="button"
                          (click)="
                            setStatus(v.goal.careerGoalId, c, 'Accepted')
                          "
                        >
                          I’m interested
                        </button>
                        <button
                          class="cg-btn"
                          type="button"
                          (click)="
                            setStatus(v.goal.careerGoalId, c, 'Dismissed')
                          "
                        >
                          Not interested
                        </button>
                      } @else if (c.status === 'Accepted') {
                        <button
                          class="cg-btn"
                          type="button"
                          (click)="
                            setStatus(v.goal.careerGoalId, c, 'Dismissed')
                          "
                        >
                          Not interested
                        </button>
                        <button
                          class="cg-btn"
                          type="button"
                          (click)="
                            setStatus(v.goal.careerGoalId, c, 'Suggested')
                          "
                        >
                          Move back to recommended
                        </button>
                      } @else {
                        <button
                          class="btn-primary"
                          type="button"
                          (click)="
                            setStatus(v.goal.careerGoalId, c, 'Accepted')
                          "
                        >
                          I’m interested
                        </button>
                        <button
                          class="cg-btn"
                          type="button"
                          (click)="
                            setStatus(v.goal.careerGoalId, c, 'Suggested')
                          "
                        >
                          Move back to recommended
                        </button>
                      }
                    </div>
                  }
                </article>
              } @empty {
                <div class="cg-empty">
                  {{ emptyText[tabOf(v.goal.careerGoalId)] }}
                </div>
              }
            } @else if (
              !v.goal.hasAdvice && generating() !== v.goal.careerGoalId
            ) {
              <div class="cg-empty">
                Get advice to see the skills and training recommended for this
                goal.
              </div>
            }
          </section>
        } @empty {
          <div class="cg-empty">
            You have no career goals yet. Add one to get recommended skills and
            training.
          </div>
        }
      }
    </div>

    <style>
      .cg-page {
        max-width: 960px;
      }
      .cg-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .cg-sub {
        font-size: 14px;
        color: var(--text-muted);
        margin: 2px 0 20px;
      }
      .cg-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .cg-h2 {
        font-size: 18px;
        font-weight: 800;
        color: var(--text);
      }
      .cg-h3 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .cg-h4 {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
        margin: 22px 0 10px;
      }
      .cg-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .cg-row {
        display: flex;
        gap: 6px 16px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .cg-row i {
        margin-right: 4px;
      }

      /* One goal = one framed section, so everything inside it clearly belongs to that goal */
      .cg-goal {
        background: #fff;
        border: 1px solid var(--border);
        border-left: 4px solid var(--navy);
        border-radius: 16px;
        padding: 20px 24px 22px;
        margin-bottom: 22px;
      }
      .cg-soft {
        background: var(--surface-2);
        border-left-color: var(--border);
      }
      .cg-ghead {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .cg-kind {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--navy);
      }
      .cg-kind i {
        margin-right: 4px;
      }
      .cg-gtitle {
        margin: 2px 0 0;
        font-size: 20px;
        font-weight: 800;
        color: var(--text);
      }
      .cg-sum {
        margin: 14px 0 4px;
        font-size: 14px;
      }

      .cg-scroll {
        overflow-x: auto;
        border: 1px solid var(--border);
        border-radius: 10px;
        margin-top: 8px;
      }
      .cg-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13.5px;
        min-width: 640px;
        background: #fff;
      }
      .cg-table th {
        text-align: left;
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-muted);
        background: var(--surface-2);
        padding: 10px 14px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
      }
      .cg-table td {
        padding: 11px 14px;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
        color: var(--text);
      }
      .cg-table tr:last-child td {
        border-bottom: none;
      }
      .cg-state {
        display: inline-block;
        font-size: 12px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 6px;
        white-space: nowrap;
      }
      .cg-s-missing {
        background: #fdecea;
        color: #b3261e;
      }
      .cg-s-below {
        background: #fff3e0;
        color: #8a5a00;
      }
      .cg-s-ok {
        background: #e3eee8;
        color: #1a5c35;
      }

      .cg-course {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px 18px;
        margin-top: 10px;
      }
      .cg-dim {
        opacity: 0.6;
      }
      .cg-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .cg-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .cg-goalchip {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        background: #e3eee8;
        color: #1a5c35;
        white-space: nowrap;
      }
      .cg-goalchip i {
        margin-right: 4px;
      }
      .cg-covers {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 12px;
      }
      .cg-skill {
        font-size: 12px;
        padding: 2px 10px;
        border-radius: 10px;
        background: #fff;
        border: 1px solid var(--border);
        color: var(--text);
      }
      .cg-avail {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 10px;
      }
      .cg-ok {
        color: #1a5c35;
        margin-right: 4px;
      }
      .cg-text {
        font-size: 14px;
        color: var(--text-muted);
        margin: 10px 0 0;
      }

      .cg-acts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .cg-gap {
        margin-top: 14px;
      }
      .cg-btn {
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
      .cg-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .cg-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .cg-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .cg-note {
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
      .cg-wn {
        background: #fff3e0;
        color: #8a5a00;
        align-items: center;
      }
      .cg-refresh {
        margin-left: auto;
        flex-shrink: 0;
      }
      .cg-rj {
        background: #fdecea;
        color: #b3261e;
      }
      .cg-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--border);
        margin-bottom: 4px;
      }
      .cg-tab {
        padding: 9px 12px;
        margin-bottom: -1px;
        font: inherit;
        font-size: 13.5px;
        font-weight: 600;
        color: var(--text-muted);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
      }
      .cg-tab:hover {
        color: var(--navy);
      }
      .cg-tab:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .cg-on {
        color: var(--navy);
        border-bottom-color: var(--navy);
      }
      .cg-pill {
        display: inline-block;
        min-width: 18px;
        padding: 0 6px;
        margin-left: 4px;
        border-radius: 10px;
        background: var(--surface-2);
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 700;
        text-align: center;
      }
      .cg-empty {
        padding: 22px;
        text-align: center;
        font-size: 13.5px;
        color: var(--text-muted);
        background: #fff;
        border: 1px dashed var(--border);
        border-radius: 12px;
        margin-top: 10px;
      }
      .cg-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
      .cg-nopad {
        margin-left: 0;
        display: inline-block;
        margin-top: 12px;
      }
      .cg-inline {
        display: inline-block;
        vertical-align: middle;
        margin-right: 6px;
      }
    </style>
  `,
})
export class MyCareerGoalsComponent implements OnInit {
  private careerApi = inject(CareerGoalsService);
  private profileApi = inject(EmployeeProfileService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  readonly maxGoals = MAX_ACTIVE_GOALS;
  readonly fmt = fmtDate;
  readonly day = fmtDay;
  readonly levelLabel = levelName;
  readonly stateLabel = STATE_LABEL;

  readonly courseTabs: { key: CourseTab; label: string }[] = [
    { key: 'recommended', label: 'Recommended' },
    { key: 'interested', label: 'Interested' },
    { key: 'dismissed', label: 'Not interested' },
  ];
  readonly emptyText: Record<CourseTab, string> = {
    recommended: 'No training to review for this goal right now.',
    interested: 'Courses you mark as interested will appear here.',
    dismissed: 'Courses you mark as not interested will appear here.',
  };

  // The selected training tab for each goal
  private courseTab = signal<Record<number, CourseTab>>({});
  tabOf(goalId: number): CourseTab {
    return this.courseTab()[goalId] ?? 'recommended';
  }
  setCourseTab(goalId: number, tab: CourseTab): void {
    this.courseTab.update((m) => ({ ...m, [goalId]: tab }));
  }

  goals = signal<CareerGoalResponse[] | null>(null);
  profile = signal<EmployeeProfileResponse | null>(null);
  advice = signal<Record<number, AdviceResponse>>({});
  errors = signal<Record<number, string>>({});
  failed = signal<string | null>(null);
  generating = signal<number | null>(null);
  loadingAdvice = signal(false);
  busyGoal = signal<number | null>(null);

  // Skills held, as a lookup by id and by normalised name
  private held = computed(() => {
    const m = new Map<string, string>();
    for (const s of this.profile()?.skills ?? []) {
      m.set('id:' + s.skillId, s.proficiencyLevel);
      m.set('n:' + normName(s.skillName), s.proficiencyLevel);
    }
    return m;
  });

  private keyOf(skillId: number | null, name: string): string {
    return skillId != null ? 'id:' + skillId : 'n:' + normName(name);
  }

  // One view per active goal. Skills and courses come from THAT goal's advice only.
  views = computed<GoalView[]>(() => {
    const held = this.held();
    const heldFor = (s: AdviceSkill) =>
      held.get(this.keyOf(s.skillId, s.skillName)) ??
      held.get('n:' + normName(s.skillName)) ??
      null;

    const stateOrder: Record<SkillState, number> = {
      missing: 0,
      below: 1,
      ok: 2,
    };

    return (this.goals() ?? []).map((g): GoalView => {
      const a = this.advice()[g.careerGoalId];
      if (!a)
        return {
          goal: g,
          rows: [],
          recommended: [],
          interested: [],
          dismissed: [],
        };

      const ordered = [...a.courses].sort((x, y) => x.sortOrder - y.sortOrder);
      // Courses marked Not interested no longer count as the training for a skill
      const active = ordered.filter((c) => c.status !== 'Dismissed');

      // Which of this goal's courses are for which skill
      const trainingFor = new Map<string, string[]>();
      for (const c of active) {
        const k = this.keyOf(c.skillId, c.skillName);
        const label =
          c.programme?.title ?? 'Idea: ' + (c.externalIdea ?? c.skillName);
        trainingFor.set(k, [...(trainingFor.get(k) ?? []), label]);
      }

      const rows = a.skills.map((s): SkillRow => {
        const cur = heldFor(s);
        const target = s.targetLevel ?? null;
        const state: SkillState = !cur
          ? 'missing'
          : target && levelIndex(cur) < levelIndex(target)
            ? 'below'
            : 'ok';
        return {
          itemId: s.skillSuggestionItemId,
          skill: s.skillName,
          current: cur,
          target,
          state,
          training: trainingFor.get(this.keyOf(s.skillId, s.skillName)) ?? [],
          note: s.advice,
        };
      });
      rows.sort(
        (x, y) =>
          stateOrder[x.state] - stateOrder[y.state] ||
          x.skill.localeCompare(y.skill),
      );

      return {
        goal: g,
        rows,
        recommended: ordered.filter((c) => c.status === 'Suggested'),
        interested: ordered.filter((c) => c.status === 'Accepted'),
        dismissed: ordered.filter((c) => c.status === 'Dismissed'),
      };
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(null);
    this.goals.set(null);
    // The profile only supplies "your level" in the skills table: if it fails, the goals still work.
    forkJoin({
      goals: this.careerApi.getMine('Active'),
      profile: this.profileApi.getMine().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ goals, profile }) => {
        this.profile.set(profile);
        this.goals.set(goals);
        this.loadSavedAdvice(goals);
      },
      error: (err) =>
        this.failed.set(errMsg(err, 'We couldn’t load your career goals.')),
    });
  }

  // Saved advice is read straight away (it never calls the AI), so everything is there on arrival.
  private loadSavedAdvice(goals: CareerGoalResponse[]): void {
    const withAdvice = goals.filter((g) => g.hasAdvice);
    if (!withAdvice.length) return;
    this.loadingAdvice.set(true);
    forkJoin(
      withAdvice.map((g) =>
        this.careerApi
          .getAdvice(g.careerGoalId)
          .pipe(catchError(() => of(null))),
      ),
    ).subscribe((results) => {
      const map: Record<number, AdviceResponse> = {};
      results.forEach((a, i) => {
        if (a) map[withAdvice[i].careerGoalId] = a;
      });
      this.advice.set(map);
      this.loadingAdvice.set(false);
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
        ? this.careerApi.archive(g.careerGoalId)
        : this.careerApi.achieve(g.careerGoalId);
    call$.subscribe({
      next: () => {
        this.busyGoal.set(null);
        // Its skills and courses go with it
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

  generate(g: CareerGoalResponse): void {
    const id = g.careerGoalId;
    if (this.generating() !== null) return;
    this.generating.set(id);
    this.setError(id, null);
    this.careerApi.generateAdvice(id).subscribe({
      next: (a) => {
        this.generating.set(null);
        this.advice.update((m) => ({ ...m, [id]: a }));
        this.goals.update((l) =>
          (l ?? []).map((x) =>
            x.careerGoalId === id ? { ...x, hasAdvice: true } : x,
          ),
        );
        this.toast.show(
          'Advice ready. See the recommended skills and training for this goal.',
          'success',
        );
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

  // Moves a course between Recommended / Interested / Not interested, and undoes it if the server refuses
  setStatus(goalId: number, course: AdviceCourse, status: AdviceStatus): void {
    const previous = course.status;
    this.patchCourse(goalId, course.skillSuggestionItemId, status);
    this.careerApi
      .setItemStatus(course.skillSuggestionItemId, status)
      .subscribe({
        next: () => {
          const msg =
            status === 'Accepted'
              ? 'Moved to Interested.'
              : status === 'Dismissed'
                ? 'Moved to Not interested.'
                : 'Moved back to Recommended.';
          this.toast.show(msg, 'success');
        },
        error: (err) => {
          this.patchCourse(goalId, course.skillSuggestionItemId, previous);
          this.toast.show(errMsg(err, 'Could not save your choice.'), 'error');
        },
      });
  }

  private patchCourse(
    goalId: number,
    itemId: number,
    status: AdviceStatus,
  ): void {
    this.advice.update((m) => {
      const cur = m[goalId];
      if (!cur) return m;
      return {
        ...m,
        [goalId]: {
          ...cur,
          courses: cur.courses.map((x) =>
            x.skillSuggestionItemId === itemId ? { ...x, status } : x,
          ),
        },
      };
    });
  }
}
