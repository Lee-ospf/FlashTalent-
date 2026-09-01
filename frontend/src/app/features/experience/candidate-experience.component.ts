import { Component, inject, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { CandidateExperienceService } from '../../core/services/candidate-experience.service';
import { ToastService } from '../../core/services/toast.service';
import { ResumeAutofillStoreService, ExperienceItem } from '../../core/services/resume-autofill-store.service';
import { ExperienceResponse } from '../../core/models';
import { DatePickerTriggerDirective } from '../../shared/directives/date-picker-trigger.directive';

@Component({
  selector: 'app-candidate-experience',
  standalone: true,
  imports: [
    CommonModule,
    DatePickerTriggerDirective,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-briefcase"></i> Work experience
          </h2>
          <p class="page-sub">Your employment history, visible to recruiters</p>
        </div>
      </div>

      @if (autofillStore.experiences().length) {
        <div class="autofill-review-block">
          <div class="autofill-review-header">
            <i class="ti ti-sparkles"></i> Found {{ autofillStore.experiences().length }} entry(ies) in your CV — review and add
          </div>
          @for (item of autofillStore.experiences(); track item.id) {
            <div class="autofill-card autofill-card-stack">
              <div class="autofill-card-body">
                <div class="autofill-card-title">{{ item.role }}</div>
                <div class="autofill-card-sub">
                  {{ item.company }}
                  @if (item.startDate) {
                    · {{ formatDate(item.startDate) }} – {{ item.endDate ? formatDate(item.endDate) : 'Present' }}
                  }
                </div>
                @if (item.projectsAndDuties) {
                  <div class="autofill-card-desc">{{ item.projectsAndDuties }}</div>
                }
                @if (!item.startDate) {
                  <input type="date" class="ai-mini-date" [max]="maxDate"
                         [value]="expStartDraft[item.id] ?? ''"
                         (change)="expStartDraft[item.id] = $any($event.target).value">
                  <span class="autofill-missing-note">AI couldn't find a start date — set one to add this.</span>
                }
              </div>
              <div class="autofill-card-actions">
                <button mat-stroked-button style="border-radius:8px" (click)="addSuggestedExperience(item)"
                        [disabled]="saving() || (!item.startDate && !expStartDraft[item.id])">
                  <i class="ti ti-plus"></i> Add
                </button>
                <button type="button" class="chip-dismiss" (click)="autofillStore.removeExperience(item.id)"><i class="ti ti-x"></i></button>
              </div>
            </div>
          }
        </div>
      }

      <mat-card
        class="mat-elevation-z1"
        style="border-radius:12px;margin-bottom:16px"
      >
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label">
            <i class="ti ti-plus"></i> Add experience
          </div>
          <form [formGroup]="form" (ngSubmit)="add()">
            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Company</mat-label>
                <input matInput formControlName="company" />
                @if (invalid('company')) {
                  <mat-error>Required</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Role</mat-label>
                <input matInput formControlName="role" />
                @if (invalid('role')) {
                  <mat-error>Required</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Start date</mat-label>
                <input
                  matInput
                  type="date"
                  formControlName="startDate"
                  [max]="maxDate"
                />
                @if (
                  invalid('startDate') &&
                  form.get('startDate')?.errors?.['required']
                ) {
                  <mat-error>Required</mat-error>
                } @else if (
                  invalid('startDate') &&
                  form.get('startDate')?.errors?.['futureDate']
                ) {
                  <mat-error>Start date can't be in the future</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>End date (leave blank if current)</mat-label>
                <input matInput type="date" formControlName="endDate" />
                @if (form.errors?.['endBeforeStart']) {
                  <mat-error>End date can't be before start date</mat-error>
                }
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Projects and duties</mat-label>
              <textarea
                matInput
                formControlName="projectsAndDuties"
                rows="3"
              ></textarea>
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              style="border-radius:8px"
              [disabled]="form.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-plus"></i> Add experience
            </button>
          </form>
          @if (apiError) {
            <div class="api-error" style="margin-top:12px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!experiences().length) {
        <div class="empty-state">
          <i class="ti ti-briefcase-off"></i>
          <p>No experience added yet.</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (e of experiences(); track e.candidateExperienceId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ e.role }} · {{ e.company }}</div>
                <div class="doc-meta">
                  {{ formatDate(e.startDate) }} –
                  {{ e.endDate ? formatDate(e.endDate) : 'Present' }}
                  @if (e.projectsAndDuties) {
                    · {{ e.projectsAndDuties }}
                  }
                </div>
              </div>
              <div class="doc-actions">
                <button class="btn-remove" (click)="remove(e)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .autofill-review-block { margin-bottom: 20px; }
    .autofill-review-header { font-size: 12px; font-weight: 600; color: #6a1b9a; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
    .autofill-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid #ce93d8; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }
    .autofill-card-stack { align-items: flex-start; }
    .autofill-card-body { flex: 1; min-width: 0; }
    .autofill-card-title { font-size: 13px; font-weight: 600; color: var(--text); }
    .autofill-card-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .autofill-card-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
    .autofill-missing-note { display: block; font-size: 11px; color: #c0392b; margin-top: 4px; }
    .autofill-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .ai-mini-date { border: 1px solid #ddd; border-radius: 8px; padding: 6px 8px; font-size: 12px; margin-top: 6px; }
    .chip-dismiss { background: none; border: none; cursor: pointer; opacity: 0.5; padding: 4px; }
    .chip-dismiss:hover { opacity: 1; }
  `],
})
export class CandidateExperienceComponent implements OnInit {
  @Input() embedded = false;
  /** Whether adding the very first experience entry from the inline button
   *  should itself emit `saved`. True by default (used by the edit-in-place
   *  summary view, where saving should close the section). The setup wizard
   *  sets this to false so only its footer's "Save and continue" button —
   *  which calls add(true) — advances the step; the inline "Add experience"
   *  button there just saves and stays put. */
  @Input() autoAdvanceOnSave = true;
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private state = inject(CandidateStateService);
  private experienceService = inject(CandidateExperienceService);
  private toast = inject(ToastService);
  autofillStore = inject(ResumeAutofillStoreService);

  experiences = signal<ExperienceResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  maxDate = new Date().toISOString().substring(0, 10);

  // Draft start-dates for CV-suggested experiences missing one — keyed by
  // the suggestion's autofill id.
  expStartDraft: Record<string, string> = {};

  form = this.fb.group(
    {
      company: ['', Validators.required],
      role: ['', Validators.required],
      startDate: ['', [Validators.required, this.notFutureDate]],
      endDate: [''],
      projectsAndDuties: [''],
    },
    { validators: this.endAfterStart },
  );

  private endAfterStart(group: any) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    return start && end && new Date(end) < new Date(start)
      ? { endBeforeStart: true }
      : null;
  }
  private notFutureDate(control: { value: string }) {
    if (!control.value) return null;
    return new Date(control.value) > new Date() ? { futureDate: true } : null;
  }
  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.experienceService.getAll(p.candidateId).subscribe({
      next: (e) => {
        this.experiences.set(e);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      month: 'short',
      year: 'numeric',
    });
  }

  /** @param forceAdvance When true (used by the wizard's footer button),
   *  emits `saved` on success regardless of `autoAdvanceOnSave` or whether
   *  this is the first entry. */
  add(forceAdvance: boolean = false): void {
    const p = this.state.profile();
    if (!p) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.apiError = '';
    this.saving.set(true);
    const wasEmpty = this.experiences().length === 0;
    const v = this.form.value;
    this.experienceService
      .create(p.candidateId, {
        company: v.company!,
        role: v.role!,
        startDate: new Date(v.startDate!).toISOString(),
        endDate: v.endDate ? new Date(v.endDate).toISOString() : undefined,
        projectsAndDuties: v.projectsAndDuties || undefined,
      })
      .subscribe({
        next: (created) => {
          this.experiences.update((list) => [created, ...list]);
          this.saving.set(false);
          this.form.reset();
          this.toast.show('Experience added.', 'success');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
        },
      });
  }

  remove(e: ExperienceResponse): void {
    const p = this.state.profile();
    if (!p) return;
    if (!confirm(`Remove "${e.role} at ${e.company}"?`)) return;
    this.experienceService
      .delete(p.candidateId, e.candidateExperienceId)
      .subscribe({
        next: () => {
          this.experiences.update((list) =>
            list.filter(
              (x) => x.candidateExperienceId !== e.candidateExperienceId,
            ),
          );
          this.toast.show('Experience removed.', 'success');
        },
        error: (err: Error) => this.toast.show(err.message, 'error'),
      });
  }

  // Saves a CV-suggested experience via the real create endpoint. Falls back
  // to the candidate's drafted start date if the AI couldn't find one; the
  // Add button stays disabled until some start date is set.
  addSuggestedExperience(item: ExperienceItem): void {
    const p = this.state.profile();
    const start = item.startDate ?? this.expStartDraft[item.id];
    if (!p || !start) return;

    this.saving.set(true);
    this.experienceService.create(p.candidateId, {
      company: item.company,
      role: item.role,
      startDate: new Date(start).toISOString(),
      endDate: item.endDate ? new Date(item.endDate).toISOString() : undefined,
      projectsAndDuties: item.projectsAndDuties || undefined,
    }).subscribe({
      next: created => {
        this.experiences.update(list => [created, ...list]);
        this.saving.set(false);
        this.autofillStore.removeExperience(item.id);
        this.toast.show('Experience added.', 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; },
    });
  }
}