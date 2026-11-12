import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import {
  EmployeeProfileService,
  SkillOption,
} from '../../../core/services/employee-profile.service';
import { ProgrammeResponse, SaveProgrammeRequest } from '../../../core/models/index';
import { errMsg } from '../../../core/utils/training-format';

// Routes: admin/training/programmes/new (create) and admin/training/programmes/:id/edit (edit)  (HR, Admin)
// Validation mirrors TrainingProgrammesController.ValidateAsync. The server stays the authority.
@Component({
  selector: 'app-training-programme-form',
  standalone: true,
  imports: [FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container tf-page">
      <a class="tf-back" (click)="cancel()"><i class="ti ti-arrow-left"></i> Back</a>
      <div class="tf-title">{{ editId() ? 'Edit programme' : 'New programme' }}</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else {
        <form (ngSubmit)="submit()" novalidate>
          <div class="tf-card">
            <div class="tf-field">
              <label for="tf-title">Title *</label>
              <input id="tf-title" class="tf-input" name="title" maxlength="200" [(ngModel)]="form.title" />
              @if (fieldError('title'); as err) { <div class="tf-error">{{ err }}</div> }
            </div>

            <div class="tf-grid">
              <div class="tf-field">
                <label for="tf-prov">Provider</label>
                <input id="tf-prov" class="tf-input" name="provider" maxlength="200" [(ngModel)]="form.provider" />
                @if (fieldError('provider'); as err) { <div class="tf-error">{{ err }}</div> }
              </div>
              <div class="tf-field">
                <label for="tf-cat">Category</label>
                <input id="tf-cat" class="tf-input" name="category" maxlength="100" [(ngModel)]="form.category" />
                @if (fieldError('category'); as err) { <div class="tf-error">{{ err }}</div> }
              </div>
              <div class="tf-field">
                <label for="tf-hours">Duration (hours)</label>
                <input id="tf-hours" class="tf-input" name="hours" type="number" step="0.5" min="0" [(ngModel)]="form.durationHours" />
                @if (fieldError('hours'); as err) { <div class="tf-error">{{ err }}</div> }
              </div>
            </div>

            <div class="tf-field">
              <label for="tf-url">Link</label>
              <input id="tf-url" class="tf-input" name="url" maxlength="500" placeholder="https://" [(ngModel)]="form.url" />
              @if (fieldError('url'); as err) { <div class="tf-error">{{ err }}</div> }
            </div>

            <div class="tf-field">
              <label for="tf-desc">Description</label>
              <textarea id="tf-desc" class="tf-input" name="description" rows="4" maxlength="2000" [(ngModel)]="form.description"></textarea>
              @if (fieldError('description'); as err) { <div class="tf-error">{{ err }}</div> }
            </div>
          </div>

          <div class="tf-card">
            <div class="tf-h">Skills this training builds</div>
            <div class="tf-hint">
              Optional. These link the programme to skill gaps, so it can be recommended to employees.
            </div>

            @if (selectedSkills().length) {
              <div class="tf-selected">
                @for (s of selectedSkills(); track s.skillId) {
                  <span class="tf-tag">
                    {{ s.name }}
                    <button type="button" [attr.aria-label]="'Remove ' + s.name" (click)="toggleSkill(s.skillId)">×</button>
                  </span>
                }
              </div>
            }

            <label class="tf-lbl" for="tf-sq">Find a skill</label>
            <input id="tf-sq" class="tf-input" name="skillSearch" placeholder="Search skills" [ngModelOptions]="{ standalone: true }" [ngModel]="skillSearch()" (ngModelChange)="skillSearch.set($event)" />

            <div class="tf-pick" role="group" aria-label="Skills">
              @for (s of visibleSkills(); track s.skillId) {
                <label class="tf-opt">
                  <input type="checkbox" [checked]="isSelected(s.skillId)" (change)="toggleSkill(s.skillId)" />
                  {{ s.name }}
                </label>
              } @empty {
                <div class="tf-hint tf-pad">
                  @if (allSkills().length === 0) { No skills could be loaded. } @else { No skills match your search. }
                </div>
              }
            </div>
          </div>

          @if (saveError()) {
            <div class="tf-banner" role="alert"><i class="ti ti-alert-circle"></i> {{ saveError() }}</div>
          }

          <div class="tf-actions">
            <button class="tf-cancel" type="button" (click)="cancel()">Cancel</button>
            <button class="btn-primary" type="submit" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="14" class="tf-spin"></mat-spinner> }
              Save programme
            </button>
          </div>
        </form>
      }
    </div>

    <style>
      .tf-page { max-width: 820px; }
      .tf-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); cursor: pointer; margin-bottom: 10px; }
      .tf-back:hover { color: var(--navy); }
      .tf-title { font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 18px; }
      .tf-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 26px; margin-bottom: 16px; }
      .tf-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .tf-hint { font-size: 12px; color: var(--text-muted); margin: 4px 0 8px; }
      .tf-pad { padding: 12px; }
      .tf-field { margin-bottom: 14px; }
      .tf-field label, .tf-lbl { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .tf-grid { display: grid; grid-template-columns: 2fr 1.5fr 1fr; gap: 12px; }
      .tf-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .tf-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .tf-error { font-size: 12px; color: #b3261e; margin-top: 3px; }
      .tf-banner { display: flex; gap: 8px; margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; font-size: 13px; background: #fdecea; color: #b3261e; }
      .tf-selected { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 10px; }
      .tf-tag { display: inline-flex; align-items: center; gap: 4px; background: var(--surface-2); border-radius: 20px; padding: 3px 4px 3px 10px; font-size: 12.5px; }
      .tf-tag button { border: none; background: none; cursor: pointer; font-size: 16px; line-height: 1; color: var(--text-muted); padding: 2px 6px; border-radius: 50%; }
      .tf-tag button:hover { color: #b3261e; }
      .tf-pick { max-height: 240px; overflow: auto; border: 1px solid var(--border); border-radius: 8px; margin-top: 8px; }
      .tf-opt { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text); cursor: pointer; }
      .tf-opt:first-child { border-top: 0; }
      .tf-opt:hover { background: var(--surface-2); }
      .tf-actions { display: flex; justify-content: flex-end; gap: 8px; }
      .tf-cancel { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; }
      .tf-cancel:hover { background: var(--surface-2); }
      .tf-spin { display: inline-block; }
      .tf-spin ::ng-deep circle { stroke: #fff; }
      @media (max-width: 640px) { .tf-card { padding: 18px 16px; } .tf-grid { grid-template-columns: 1fr; } }
    </style>
  `,
})
export class TrainingProgrammeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private training = inject(TrainingService);
  private profileApi = inject(EmployeeProfileService);
  private toast = inject(ToastService);

  editId = signal<number | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  submitted = signal(false);

  form = {
    title: '',
    provider: '',
    category: '',
    durationHours: null as number | null,
    url: '',
    description: '',
  };

  allSkills = signal<SkillOption[]>([]);
  selectedIds = signal<number[]>([]);
  skillSearch = signal('');

  selectedSkills = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.allSkills().filter((s) => ids.has(s.skillId));
  });

  visibleSkills = computed(() => {
    const q = this.skillSearch().trim().toLowerCase();
    return this.allSkills().filter((s) => !q || s.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editId.set(idParam ? Number(idParam) : null);

    this.profileApi
      .getSkillOptions()
      .pipe(catchError(() => of([] as SkillOption[])))
      .subscribe((s) => this.allSkills.set(s));

    if (!idParam) {
      this.loading.set(false);
      return;
    }

    this.training.getProgramme(Number(idParam)).subscribe({
      next: (p) => {
        if (!p.isActive) {
          this.loadError.set('A retired programme can’t be edited. Reactivate it first.');
        } else {
          this.fill(p);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errMsg(err, 'Could not load the programme.'));
        this.loading.set(false);
      },
    });
  }

  private fill(p: ProgrammeResponse): void {
    this.form = {
      title: p.title,
      provider: p.provider ?? '',
      category: p.category ?? '',
      durationHours: p.durationHours,
      url: p.url ?? '',
      description: p.description ?? '',
    };
    this.selectedIds.set(p.skills.map((s) => s.skillId));
  }

  // ───────────── Skills ─────────────

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSkill(id: number): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  // ───────────── Validation ─────────────

  fieldError(f: 'title' | 'provider' | 'category' | 'hours' | 'url' | 'description'): string | null {
    if (!this.submitted()) return null;
    const v = this.form;
    switch (f) {
      case 'title': {
        const t = v.title.trim();
        return !t ? 'Title is required.' : t.length > 200 ? 'Title can’t be longer than 200 characters.' : null;
      }
      case 'provider':
        return v.provider.length > 200 ? 'Provider can’t be longer than 200 characters.' : null;
      case 'category':
        return v.category.length > 100 ? 'Category can’t be longer than 100 characters.' : null;
      case 'hours':
        return v.durationHours != null && (v.durationHours <= 0 || v.durationHours > 9999)
          ? 'Duration must be greater than 0 and no more than 9999.'
          : null;
      case 'url': {
        const u = v.url.trim();
        if (!u) return null;
        if (u.length > 500) return 'Link can’t be longer than 500 characters.';
        return /^https?:\/\/\S+$/i.test(u) ? null : 'Link must be a valid http or https address.';
      }
      case 'description':
        return v.description.length > 2000 ? 'Description can’t be longer than 2000 characters.' : null;
    }
  }

  private hasErrors(): boolean {
    return (['title', 'provider', 'category', 'hours', 'url', 'description'] as const).some(
      (f) => !!this.fieldError(f),
    );
  }

  // ───────────── Save ─────────────

  private clean(v: string): string | null {
    const t = v.trim();
    return t ? t : null;
  }

  submit(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.saveError.set(null);
    if (this.hasErrors()) return;

    const f = this.form;
    const body: SaveProgrammeRequest = {
      title: f.title.trim(),
      description: this.clean(f.description),
      provider: this.clean(f.provider),
      category: this.clean(f.category),
      durationHours: f.durationHours,
      url: this.clean(f.url),
      skillIds: this.selectedIds(),
    };

    const id = this.editId();
    const call$ = id ? this.training.updateProgramme(id, body) : this.training.createProgramme(body);

    this.saving.set(true);
    call$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.show(id ? 'Programme updated.' : 'Programme created.', 'success');
        this.router.navigate(['/admin/training/programmes', saved.trainingProgrammeId]);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(errMsg(err, 'Could not save the programme.'));
      },
    });
  }

  cancel(): void {
    this.location.back();
  }
}