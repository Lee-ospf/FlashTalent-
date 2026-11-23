import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import { ProjectAdviceService, ProjectGapResponse } from '../../../core/services/project-advice.service';
import { EmployeeProfileResponse, EmployeeProfileService } from '../../../core/services/employee-profile.service';
import { SkillGapItem } from '../../../core/services/project.service';
import {AdviceCourse, AdviceResponse, AdviceSkill, AdviceStatus } from '../../../core/models/index';
import { errMsg, fmtDate, fmtDay } from '../../../core/utils/training-format';
import { levelName } from '../../../core/utils/skill-gap';

const STATUSES = ['Met', 'BelowLevel', 'Missing'];

// Route: admin/projects/:id/employees/:employeeId/gaps  (HR, Admin)
// Shows the rule-based gap (no AI) and, on request, AI training suggestions for the gaps.
// HR can assign the employee to a suggested programme's open intake straight from here.
@Component({
  selector: 'app-project-gap',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container pg-page">
      <a class="pg-back" [routerLink]="['/admin/projects', projectId]"><i class="ti ti-arrow-left"></i> Back to project</a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else {
        @if (gap(); as g) {
        <div class="pg-title">{{ employeeName() }}</div>
        <div class="pg-sub">
          Skill gap for <b>{{ g.projectName }}</b>
          @if (profile(); as p) { · {{ p.jobTitle || '—' }} · {{ p.departmentName || '—' }} }
        </div>

        <!-- ───── Gap analysis (rules, no AI) ───── -->
        <div class="pg-card">
          <div class="pg-top">
            <div class="pg-h">Skill gap</div>
            <span [class]="g.gaps.meetsAllRequiredSkills ? 'tc-chip tc-green' : 'tc-chip tc-amber'">
              {{ g.gaps.meetsAllRequiredSkills ? 'Meets all required skills' : 'Gaps in required skills' }}
            </span>
          </div>
          <div class="pg-meta">
            Required met {{ g.gaps.requiredMet }} of {{ g.gaps.requiredTotal }}
            · Nice to have met {{ g.gaps.niceToHaveMet }} of {{ g.gaps.niceToHaveTotal }}
          </div>

          <div class="pg-scroll">
            <table class="pg-table">
              <thead>
                <tr><th>Skill</th><th>Type</th><th>Needed level</th><th>Their level</th><th>Status</th></tr>
              </thead>
              <tbody>
                @for (s of g.gaps.skills; track s.skillId) {
                  <tr>
                    <td><b>{{ s.skillName }}</b></td>
                    <td>{{ s.isRequired ? 'Required' : 'Nice to have' }}</td>
                    <td>{{ lvl(s.requiredLevel) }}</td>
                    <td>{{ lvl(s.employeeLevel) || '—' }}</td>
                    <td><span [class]="'tc-chip ' + chip(s).cls">{{ chip(s).label }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="pg-meta">This project has no skills.</td></tr>
                }
              </tbody>
            </table>
          </div>

          @if (g.gaps.extraSkills.length) {
            <div class="pg-meta pg-gap">Other skills they have:</div>
            <div>
              @for (x of g.gaps.extraSkills; track x.skillId) {
                <span class="pg-skill">{{ x.skillName }} · {{ lvl(x.level) }}</span>
              }
            </div>
          }
        </div>

        <!-- ───── Training suggestions (AI) ───── -->
        <div class="pg-card">
          <div class="pg-top">
            <div>
              <div class="pg-h">Training suggestions</div>
              <div class="pg-meta">A learning path for the gaps above, using courses in your catalogue where they fit.</div>
            </div>
            <button class="btn-primary" type="button" [disabled]="generating() || advice()?.generationsLeft === 0" (click)="generate()">
              @if (generating()) { <mat-spinner diameter="14" class="pg-spin"></mat-spinner> Working… }
              @else if (advice()) { <i class="ti ti-refresh"></i> Refresh suggestions }
              @else { <i class="ti ti-sparkles"></i> Get training suggestions }
            </button>
          </div>
          @if (advice(); as a) {
            <div class="pg-meta">{{ a.generationsLeft }} generation(s) left for this employee in the next 24 hours.</div>
          }

          @if (adviceError()) { <div class="pg-note pg-rj" role="alert">{{ adviceError() }}</div> }

          @if (adviceFailed()) {
            <div class="pg-note pg-rj">We couldn’t load the saved suggestions. <a class="pg-link" (click)="loadAdvice()">Try again</a></div>
          } @else if (advice() === undefined) {
            <div class="pg-meta pg-gap"><mat-spinner diameter="20"></mat-spinner></div>
          } @else if (advice() === null) {
            <div class="pg-empty">No suggestions yet. Generate them to see which courses could close these gaps.</div>
          } @else 
            {@if (advice(); as a) 
                {@if (a.isStale) {
              <div class="pg-note pg-wn"><i class="ti ti-refresh"></i> The employee’s skills, the project or the course list changed since this was written. Refresh to update it.</div>
            }
            @if (a.summary) { <p class="pg-sum">{{ a.summary }}</p> }
            <div class="pg-meta">Generated {{ day(a.generatedAt) }}</div>
@if (a.skills.length) {
  <div class="pg-sub2">Skills to build</div>
  @for (s of a.skills; track s.skillSuggestionItemId) {
    <div class="pg-step" [class.pg-done]="s.status !== 'Suggested'">
      <div class="pg-top">
        <div>
          <b>{{ s.skillName }}</b>
          @if (s.targetLevel) { <span class="tc-chip tc-grey">{{ s.targetLevel }}</span> }
          @if (s.status !== 'Suggested') {
            <span [class]="s.status === 'Accepted' ? 'tc-chip tc-green' : 'tc-chip tc-grey'">{{ s.status }}</span>
          }
        </div>
        <div class="pg-acts">
          @if (s.status === 'Suggested') {
            <button class="pg-btn" type="button" (click)="setStatus(s, 'Accepted')">Accept</button>
            <button class="pg-btn" type="button" (click)="setStatus(s, 'Dismissed')">Dismiss</button>
          } @else {
            <button class="pg-btn" type="button" (click)="setStatus(s, 'Suggested')">Undo</button>
          }
        </div>
      </div>
      <div class="pg-text">{{ s.advice }}</div>
    </div>
  }
}

@if (a.courses.length) {
  <div class="pg-sub2">Courses</div>
  @for (c of a.courses; track c.skillSuggestionItemId) {
    <div class="pg-step" [class.pg-done]="c.status !== 'Suggested'">
      <div class="pg-top">
        <div>
          <b>{{ c.programme?.title ?? c.skillName }}</b>
          <span class="tc-chip tc-grey">Helps with {{ c.skillName }}</span>
          @if (c.status !== 'Suggested') {
            <span [class]="c.status === 'Accepted' ? 'tc-chip tc-green' : 'tc-chip tc-grey'">{{ c.status }}</span>
          }
        </div>
        <div class="pg-acts">
          @if (c.status === 'Suggested') {
            <button class="pg-btn" type="button" (click)="setStatus(c, 'Accepted')">Accept</button>
            <button class="pg-btn" type="button" (click)="setStatus(c, 'Dismissed')">Dismiss</button>
          } @else {
            <button class="pg-btn" type="button" (click)="setStatus(c, 'Suggested')">Undo</button>
          }
        </div>
      </div>
      <div class="pg-text">{{ c.why }}</div>

      @if (c.programme; as p) {
        <div class="pg-note">
          <i class="ti ti-school"></i>
          <div class="pg-grow">
            <span class="pg-meta">{{ p.provider || '' }}@if (p.durationHours) { · {{ p.durationHours }} hours }</span>
            <div>
              @if (c.isAlreadyCompleted) {
                Already completed by this employee.
              } @else if (c.isAlreadyAssigned) {
                Already assigned to this employee.
              } @else if (!p.isActive) {
                This programme has been retired.
              } @else {
                @if (p.nextOpenIntake; as n) {
                  Next intake: {{ n.name }}, starts {{ fmt(n.startDate) }}@if (n.spotsLeft !== null) { ({{ n.spotsLeft }} spots left) }.
                } @else {
                  No open intake yet.
                  <a class="pg-link" [routerLink]="['/admin/training/programmes', p.trainingProgrammeId]">Schedule an intake</a>
                }
              }
            </div>
          </div>
          @if (!c.isAlreadyCompleted && !c.isAlreadyAssigned && p.isActive && p.nextOpenIntake) {
            <button class="pg-btn" type="button" [disabled]="busyItem() === c.skillSuggestionItemId" (click)="assign(c)">Assign to this intake</button>
          }
        </div>
      }
      @if (c.externalIdea) {
        <div class="pg-note"><i class="ti ti-sparkles"></i> AI suggestion, not verified: {{ c.externalIdea }}</div>
      }
    </div>
  }
}

@if (!a.skills.length && !a.courses.length) {
  <div class="pg-meta pg-gap">Nothing to work on. This employee already meets every skill the project asks for.</div>
}

          }}
        </div>
      }
    }
    </div>

    <style>
      .pg-page { max-width: 960px; }
      .pg-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); margin-bottom: 10px; text-decoration: none; }
      .pg-back:hover { color: var(--navy); }
      .pg-title { font-size: 26px; font-weight: 800; color: var(--text); }
      .pg-sub { font-size: 14px; color: var(--text-muted); margin: 2px 0 18px; }
      .pg-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; margin-bottom: 18px; }
      .pg-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
      .pg-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .pg-meta { font-size: 12.5px; color: var(--text-muted); }
      .pg-gap { margin-top: 12px; }
      .pg-scroll { overflow-x: auto; margin-top: 12px; }
      .pg-table { width: 100%; border-collapse: collapse; min-width: 560px; font-size: 14px; }
      .pg-table th { text-align: left; font-size: 12px; color: var(--text-muted); padding: 8px 10px; }
      .pg-table td { padding: 10px; border-top: 1px solid var(--border); }
      .pg-skill { display: inline-block; background: var(--surface-2); border-radius: 20px; padding: 3px 10px; margin: 4px 6px 0 0; font-size: 12.5px; }
      .pg-sum { margin: 14px 0 4px; font-size: 14px; }
      .pg-step { border-top: 1px solid var(--border); padding: 14px 0; margin-top: 10px; }
      .pg-done { opacity: 0.65; }
      .pg-text { font-size: 13.5px; margin-top: 6px; }
      .pg-acts { display: flex; gap: 8px; flex-wrap: wrap; }
      .pg-btn { min-height: 40px; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 0 14px; font: inherit; font-size: 13px; cursor: pointer; color: var(--text); }
      .pg-btn:hover:not(:disabled) { background: var(--surface-2); }
      .pg-btn:disabled { opacity: 0.5; cursor: default; }
      .pg-btn:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
      .pg-note { display: flex; gap: 10px; align-items: center; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-top: 10px; background: var(--surface-2); color: var(--text); }
      .pg-grow { flex: 1; min-width: 0; }
      .pg-wn { background: #fff3e0; color: #8a5a00; }
      .pg-rj { background: #fdecea; color: #b3261e; }
      .pg-empty { margin-top: 14px; padding: 18px; border: 1px dashed var(--border); border-radius: 12px; font-size: 13.5px; color: var(--text-muted); text-align: center; }
      .pg-link { color: var(--navy); text-decoration: underline; cursor: pointer; }
      .pg-spin { display: inline-block; }
      .pg-spin ::ng-deep circle { stroke: #fff; }
    .pg-sub2 { font-size: 13px; font-weight: 700; color: var(--text); margin: 18px 0 0; }
    </style>
  `,
})
export class ProjectGapComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ProjectAdviceService);
  private training = inject(TrainingService);
  private profiles = inject(EmployeeProfileService);
  private toast = inject(ToastService);

  readonly fmt = fmtDate;
  readonly day = fmtDay;
  readonly lvl = levelName;

  projectId = 0;
  private employeeId = 0;

  loading = signal(true);
  loadError = signal<string | null>(null);
  gap = signal<ProjectGapResponse | null>(null);
  profile = signal<EmployeeProfileResponse | null>(null);

  // undefined = still loading, null = nothing generated yet (204)
  advice = signal<AdviceResponse | null | undefined>(undefined);
  adviceFailed = signal(false);
  adviceError = signal<string | null>(null);
  generating = signal(false);
  busyItem = signal<number | null>(null);

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.employeeId = Number(this.route.snapshot.paramMap.get('employeeId'));

    // The name isn't part of the gap response. If the profile can't be loaded the page still works.
    this.profiles
      .getById(this.employeeId)
      .pipe(catchError(() => of(null)))
      .subscribe((p) => this.profile.set(p));

    this.api.getGap(this.projectId, this.employeeId).subscribe({
      next: (g) => {
        this.gap.set(g);
        this.loading.set(false);
        this.loadAdvice();
      },
      error: (err) => {
        this.loadError.set(errMsg(err, 'Could not load the skill gap.'));
        this.loading.set(false);
      },
    });
  }

  employeeName(): string {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}` : 'Employee';
  }

  chip(s: SkillGapItem): { label: string; cls: string } {
    const st = typeof s.status === 'number' ? (STATUSES[s.status] ?? 'Missing') : s.status;
    if (st === 'Met') return { label: 'Met', cls: 'tc-green' };
    if (st === 'BelowLevel') return { label: 'Below level', cls: 'tc-amber' };
    // A missing nice-to-have is not a failure
    return s.isRequired ? { label: 'Missing', cls: 'tc-red' } : { label: 'Missing (optional)', cls: 'tc-grey' };
  }

  // ───────────── Suggestions ─────────────

  loadAdvice(): void {
    this.adviceFailed.set(false);
    this.advice.set(undefined);
    this.api.getAdvice(this.projectId, this.employeeId).subscribe({
      next: (a) => this.advice.set(a ?? null),
      error: () => {
        this.advice.set(null);
        this.adviceFailed.set(true);
      },
    });
  }

  generate(): void {
    if (this.generating()) return;
    this.generating.set(true);
    this.adviceError.set(null);
    this.api.generate(this.projectId, this.employeeId).subscribe({
      next: (a) => {
        this.generating.set(false);
        this.advice.set(a);
        this.toast.show('Suggestions ready.', 'success');
      },
      error: (err) => {
        this.generating.set(false);
        // 429: daily limit. 502: the AI failed. 400: e.g. the employee is inactive or the project is closed.
        this.adviceError.set(errMsg(err, 'We couldn’t generate suggestions right now. Please try again shortly.'));
      },
    });
  }

 private patchItem(id: number, change: Partial<AdviceSkill & AdviceCourse>): void {
  this.advice.update((cur) =>
    cur
      ? {
          ...cur,
          skills: cur.skills.map((x) => (x.skillSuggestionItemId === id ? { ...x, ...change } : x)),
          courses: cur.courses.map((x) => (x.skillSuggestionItemId === id ? { ...x, ...change } : x)),
        }
      : cur,
  );
}

 setStatus(item: { skillSuggestionItemId: number; status: AdviceStatus }, status: AdviceStatus): void {
  const previous = item.status;
  this.patchItem(item.skillSuggestionItemId, { status });
  this.api.setItemStatus(item.skillSuggestionItemId, status).subscribe({
    error: (err) => {
      this.patchItem(item.skillSuggestionItemId, { status: previous });
      this.toast.show(errMsg(err, 'Could not save that choice.'), 'error');
    },
  });
}

  // Uses the existing assignment endpoint, so the same rules apply (full intake, unfinished
  // training of the same programme elsewhere, inactive employee...) and come back as a skip reason.
  assign(item: AdviceCourse): void {
    const intake = item.programme?.nextOpenIntake;
    if (!intake || this.busyItem() !== null) return;
    const who = this.employeeName();
    if (!confirm(`Assign ${who} to ${item.programme!.title} (${intake.name})? They will be notified.`)) return;

    this.busyItem.set(item.skillSuggestionItemId);
    this.training.assign(intake.trainingIntakeId, { employeeIds: [this.employeeId], dueDate: null }).subscribe({
      next: (res) => {
        this.busyItem.set(null);
        if (res.added.length) {
          this.patchItem(item.skillSuggestionItemId, { isAlreadyAssigned: true });
          this.toast.show(`${who} assigned to ${intake.name}.`, 'success');
          this.training.refreshBadges();
        } else {
          this.toast.show(res.skipped[0]?.reason ?? 'They could not be assigned.', 'error');
        }
      },
      error: (err) => {
        this.busyItem.set(null);
        this.toast.show(errMsg(err, 'Could not assign this employee.'), 'error');
      },
    });
  }
}