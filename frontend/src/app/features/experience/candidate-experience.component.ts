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
import { ExperienceResponse } from '../../core/models';

@Component({
  selector: 'app-candidate-experience',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div [class.page-container]="!embedded" [class.step-body-padded]="embedded">
      @if (!embedded) {
        <div class="page-header">
          <div>
            <h2 class="page-title"><i class="ti ti-briefcase"></i> Work experience</h2>
            <p class="page-sub">Your employment history, visible to recruiters</p>
          </div>
        </div>
      }

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-plus"></i> Add experience</div>
          <form [formGroup]="form" (ngSubmit)="add()">
            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Company</mat-label>
                <input matInput formControlName="company">
                @if (invalid('company')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Role</mat-label>
                <input matInput formControlName="role">
                @if (invalid('role')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Start date</mat-label>
                <input matInput type="date" formControlName="startDate">
                @if (invalid('startDate')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>End date (leave blank if current)</mat-label>
                <input matInput type="date" formControlName="endDate">
                @if (form.errors?.['endBeforeStart']) { <mat-error>End date can't be before start date</mat-error> }
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Projects and duties</mat-label>
              <textarea matInput formControlName="projectsAndDuties" rows="3"></textarea>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" style="border-radius:8px" [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-plus"></i> Add experience
            </button>
          </form>
          @if (apiError) {
            <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
          }
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!experiences().length) {
        <div class="empty-state"><i class="ti ti-briefcase-off"></i><p>No experience added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (e of experiences(); track e.candidateExperienceId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ e.role }} · {{ e.company }}</div>
                <div class="doc-meta">
                  {{ formatDate(e.startDate) }} – {{ e.endDate ? formatDate(e.endDate) : 'Present' }}
                  @if (e.projectsAndDuties) { · {{ e.projectsAndDuties }} }
                </div>
              </div>
              <div class="doc-actions">
                <button class="btn-remove" (click)="remove(e)"><i class="ti ti-trash"></i></button>
              </div>
            </div>
          }
        </div>
      }
    </div>
    <style>.step-body-padded { padding: 1.5rem; }</style>
  `,
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

  experiences = signal<ExperienceResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';

  form = this.fb.group({
    company: ['', Validators.required],
    role: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: [''],
    projectsAndDuties: [''],
  }, { validators: this.endAfterStart });

  private endAfterStart(group: any) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    return start && end && new Date(end) < new Date(start) ? { endBeforeStart: true } : null;
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.experienceService.getAll(p.candidateId).subscribe({
      next: e => { this.experiences.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
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
    this.experienceService.create(p.candidateId, {
      company: v.company!, role: v.role!,
      startDate: new Date(v.startDate!).toISOString(),
      endDate: v.endDate ? new Date(v.endDate).toISOString() : undefined,
      projectsAndDuties: v.projectsAndDuties || undefined,
    }).subscribe({
      next: created => {
        this.experiences.update(list => [created, ...list]);
        this.saving.set(false);
        this.form.reset();
        this.toast.show('Experience added.', 'success');
        if ((wasEmpty && this.autoAdvanceOnSave) || forceAdvance) this.saved.emit();
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; },
    });
  }

  remove(e: ExperienceResponse): void {
    const p = this.state.profile();
    if (!p) return;
    if (!confirm(`Remove "${e.role} at ${e.company}"?`)) return;
    this.experienceService.delete(p.candidateId, e.candidateExperienceId).subscribe({
      next: () => {
        this.experiences.update(list => list.filter(x => x.candidateExperienceId !== e.candidateExperienceId));
        this.toast.show('Experience removed.', 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error'),
    });
  }
}