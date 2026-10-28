import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import { ProjectService, ProjectResponse, SaveProjectRequest } from '../../../core/services/project.service';
import {
  EmployeeProfileService,
  SkillOption,
  PROFICIENCY_LEVELS,
} from '../../../core/services/employee-profile.service';
import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { EmployeeListItem } from '../../../core/models/index';

// The backend DTO has a stray [Range(0, 60)] on RequiredQualifications (a string), so any real text
// fails validation with a 400. Keep this false until the backend team removes it, then set it to true.
const QUALIFICATIONS_ENABLED = false;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface SkillRow {
  skillId: number | null;
  isRequired: boolean;
  minimumLevel: string;
}

// Routes: admin/projects/new (create)  and  admin/projects/:id/edit (edit)  (HR, Admin)
@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container pf-page">
      <a class="pf-back" (click)="cancel()"><i class="ti ti-arrow-left"></i> Back</a>
      <div class="pf-title">{{ editId() ? 'Edit project' : 'New project' }}</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else {
        <form (ngSubmit)="submit()" novalidate>
          <div class="pf-card">
            <div class="pf-field">
              <label for="pf-name">Project name *</label>
              <input id="pf-name" class="pf-input" name="name" maxlength="200" [(ngModel)]="form.name" />
              @if (fieldError('name'); as err) { <div class="pf-error">{{ err }}</div> }
            </div>

            <div class="pf-field">
              <label for="pf-desc">Description *</label>
              <textarea id="pf-desc" class="pf-input" name="description" rows="4" [(ngModel)]="form.description"></textarea>
              <div class="pf-hint">The AI reads this to judge how well each employee fits, so describe the real day-to-day work.</div>
              @if (fieldError('description'); as err) { <div class="pf-error">{{ err }}</div> }
            </div>

            <div class="pf-grid">
              <div class="pf-field">
                <label for="pf-dept">Department</label>
                <select id="pf-dept" class="pf-input" name="department" [(ngModel)]="form.departmentId">
                  <option value="">All departments</option>
                  @for (d of departmentOptions(); track d.id) {
                    <option [value]="d.id">{{ d.name }}</option>
                  }
                </select>
              </div>
              <div class="pf-field">
                <label for="pf-start">Start date</label>
                <input id="pf-start" class="pf-input" name="startDate" type="date" [min]="minStart()" [(ngModel)]="form.startDate" />
                @if (fieldError('startDate'); as err) { <div class="pf-error">{{ err }}</div> }
              </div>
              <div class="pf-field">
                <label for="pf-end">End date</label>
                <input id="pf-end" class="pf-input" name="endDate" type="date" [min]="minEnd()" [(ngModel)]="form.endDate" />
                @if (fieldError('endDate'); as err) { <div class="pf-error">{{ err }}</div> }
              </div>
            </div>

            @if (qualificationsEnabled) {
              <div class="pf-field">
                <label for="pf-qual">Required qualifications (optional)</label>
                <textarea id="pf-qual" class="pf-input" name="qualifications" rows="2" [(ngModel)]="form.requiredQualifications"></textarea>
              </div>
            }
          </div>

          <div class="pf-card">
            <div class="pf-h">Skills</div>
            <div class="pf-hint">Add at least one required skill before you can run a match.</div>

            @for (row of rows(); track row; let i = $index) {
              <div class="pf-skillrow">
                <div class="pf-field pf-grow">
                  <label [for]="'pf-sk' + i">Skill</label>
                  <select [id]="'pf-sk' + i" class="pf-input" [ngModelOptions]="{ standalone: true }" [(ngModel)]="row.skillId">
                    <option [ngValue]="null">Select a skill…</option>
                    @for (s of availableFor(row); track s.skillId) {
                      <option [ngValue]="s.skillId">{{ s.name }}</option>
                    }
                  </select>
                  @if (rowError(row); as err) { <div class="pf-error">{{ err }}</div> }
                </div>
                <div class="pf-field pf-level">
                  <label [for]="'pf-lv' + i">Minimum level</label>
                  <select [id]="'pf-lv' + i" class="pf-input" [ngModelOptions]="{ standalone: true }" [(ngModel)]="row.minimumLevel">
                    @for (l of levels; track l) { <option [value]="l">{{ l }}</option> }
                  </select>
                </div>
                <label class="pf-check">
                  <input type="checkbox" [ngModelOptions]="{ standalone: true }" [(ngModel)]="row.isRequired" /> Required
                </label>
                <button class="pf-ghost" type="button" [attr.aria-label]="'Remove skill row ' + (i + 1)" (click)="removeRow(row)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            }

            @if (fieldError('skills'); as err) { <div class="pf-error">{{ err }}</div> }
            @if (rows().length && !hasRequired()) {
              <div class="pf-warn"><i class="ti ti-info-circle"></i> No skill is marked Required yet, so a match can’t be run.</div>
            }

            <button class="pf-cancel" type="button" (click)="addRow()"><i class="ti ti-plus"></i> Add skill</button>
          </div>

          @if (saveError()) {
            <div class="pf-banner" role="alert"><i class="ti ti-alert-circle"></i> {{ saveError() }}</div>
          }

          <div class="pf-actions">
            <button class="pf-cancel" type="button" (click)="cancel()">Cancel</button>
            <button class="btn-primary" type="submit" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="14" class="pf-spin"></mat-spinner> }
              Save project
            </button>
          </div>
        </form>
      }
    </div>

    <style>
      .pf-page { max-width: 860px; }
      .pf-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); cursor: pointer; margin-bottom: 10px; }
      .pf-back:hover { color: var(--navy); }
      .pf-title { font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 18px; }
      .pf-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 26px; margin-bottom: 16px; }
      .pf-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .pf-hint { font-size: 12px; color: var(--text-muted); margin: 4px 0 8px; }
      .pf-field { margin-bottom: 14px; }
      .pf-field label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .pf-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .pf-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .pf-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .pf-error { font-size: 12px; color: #b3261e; margin-top: 3px; }
      .pf-warn { display: flex; gap: 8px; font-size: 13px; color: #8a5a00; background: #fff3e0; border-radius: 8px; padding: 10px 12px; margin: 6px 0 10px; }
      .pf-banner { display: flex; gap: 8px; margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; font-size: 13px; background: #fdecea; color: #b3261e; }
      .pf-skillrow { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); margin-top: 10px; }
      .pf-grow { flex: 2 1 220px; margin-bottom: 0; }
      .pf-level { flex: 1 1 160px; margin-bottom: 0; }
      .pf-check { display: flex; align-items: center; gap: 8px; font-size: 13px; min-height: 40px; margin-top: 18px; }
      .pf-ghost { border: none; background: none; cursor: pointer; font-size: 18px; color: var(--text-muted); padding: 8px; border-radius: 6px; margin-top: 16px; }
      .pf-ghost:hover { background: var(--surface-2); color: #b3261e; }
      .pf-cancel { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; cursor: pointer; margin-top: 8px; }
      .pf-cancel:hover { background: var(--surface-2); }
      .pf-actions { display: flex; justify-content: flex-end; gap: 8px; }
      .pf-actions .pf-cancel { margin-top: 0; }
      .pf-spin { display: inline-block; }
      .pf-spin ::ng-deep circle { stroke: #fff; }
      @media (max-width: 640px) { .pf-card { padding: 18px 16px; } .pf-grid { grid-template-columns: 1fr; } }
    </style>
  `,
})
export class ProjectFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private projects = inject(ProjectService);
  private profileApi = inject(EmployeeProfileService);
  private directory = inject(UserDirectoryService);
  private toast = inject(ToastService);

  readonly levels = PROFICIENCY_LEVELS;
  readonly qualificationsEnabled = QUALIFICATIONS_ENABLED;

  editId = signal<number | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  submitted = signal(false);

  readonly today = todayStr();
  // The dates the project had when it was opened for editing. An unchanged past date is allowed,
  // so an already-running project can still have its description or skills edited.
  private origStart = '';
  private origEnd = '';

  form = { name: '', description: '', departmentId: '', startDate: '', endDate: '', requiredQualifications: '' };
  rows = signal<SkillRow[]>([]);

  allSkills = signal<SkillOption[]>([]);
  private employees = signal<EmployeeListItem[]>([]);
  private projectDept = signal<{ id: number; name: string } | null>(null);

  // HR can't call GET api/Department, so the list is built from the employees HR can already see.
  departmentOptions = computed(() => {
    const map = new Map<number, string>();
    for (const e of this.employees()) {
      if (e.departmentId != null && e.departmentName) map.set(e.departmentId, e.departmentName);
    }
    const current = this.projectDept();
    if (current) map.set(current.id, current.name);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editId.set(idParam ? Number(idParam) : null);

    this.profileApi
      .getSkillOptions()
      .pipe(catchError(() => of([] as SkillOption[])))
      .subscribe((s) => this.allSkills.set(s));

    this.directory
      .getEmployees()
      .pipe(catchError(() => of([] as EmployeeListItem[])))
      .subscribe((list) => this.employees.set(list));

    if (!idParam) {
      this.addRow();
      this.loading.set(false);
      return;
    }

    this.projects.getById(Number(idParam)).subscribe({
      next: (p) => {
        if (!this.isActive(p)) {
          this.loadError.set('A closed project can’t be edited.');
        } else {
          this.fill(p);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(this.errMsg(err, 'Could not load the project.'));
        this.loading.set(false);
      },
    });
  }

  private isActive(p: ProjectResponse): boolean {
    return p.status === 'Active' || (p.status as unknown) === 0;
  }

  private fill(p: ProjectResponse): void {
    this.form = {
      name: p.name,
      description: p.description,
      departmentId: p.departmentId != null ? String(p.departmentId) : '',
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      requiredQualifications: p.requiredQualifications ?? '',
    };
    this.origStart = this.form.startDate;
    this.origEnd = this.form.endDate;
    if (p.departmentId != null && p.departmentName) {
      this.projectDept.set({ id: p.departmentId, name: p.departmentName });
    }
    this.rows.set(
      p.skills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired, minimumLevel: s.minimumLevel })),
    );
  }

  // Earliest date the pickers allow. An unchanged past start date stays selectable when editing.
  minStart(): string {
    return this.origStart && this.origStart < this.today ? this.origStart : this.today;
  }
  minEnd(): string {
    const start = this.form.startDate;
    return start && start > this.today ? start : this.today;
  }

  // ───────────── Skill rows ─────────────

  addRow(): void {
    this.rows.update((r) => [...r, { skillId: null, isRequired: true, minimumLevel: this.levels[0] }]);
  }

  removeRow(row: SkillRow): void {
    this.rows.update((r) => r.filter((x) => x !== row));
  }

  // A skill can only be picked once (the backend rejects duplicates).
  availableFor(row: SkillRow): SkillOption[] {
    const taken = new Set(this.rows().filter((r) => r !== row && r.skillId != null).map((r) => r.skillId));
    return this.allSkills().filter((s) => !taken.has(s.skillId));
  }

  hasRequired(): boolean {
    return this.rows().some((r) => r.skillId != null && r.isRequired);
  }

  // ───────────── Validation (mirrors ProjectsController.ValidateAsync) ─────────────

  fieldError(f: 'name' | 'description' | 'startDate' | 'endDate' | 'skills'): string | null {
    if (!this.submitted()) return null;
    switch (f) {
      case 'name': {
        const n = this.form.name.trim();
        return !n ? 'Project name is required.' : n.length > 200 ? 'Maximum 200 characters.' : null;
      }
      case 'description':
        return this.form.description.trim() ? null : 'Description is required.';
      case 'startDate': {
        const v = this.form.startDate;
        return v && v < this.today && v !== this.origStart ? 'Start date can’t be in the past.' : null;
      }
      case 'endDate': {
        const { startDate, endDate } = this.form;
        if (!endDate) return null;
        if (endDate < this.today && endDate !== this.origEnd) return 'End date can’t be in the past.';
        return startDate && endDate < startDate ? 'End date can’t be before the start date.' : null;
      }
      case 'skills':
        return this.rows().length === 0 ? 'At least one skill must be specified.' : null;
    }
  }

  rowError(row: SkillRow): string | null {
    return this.submitted() && row.skillId == null ? 'Choose a skill.' : null;
  }

  private hasErrors(): boolean {
    const fields = ['name', 'description', 'startDate', 'endDate', 'skills'] as const;
    return fields.some((f) => !!this.fieldError(f)) || this.rows().some((r) => r.skillId == null);
  }

  // ───────────── Save ─────────────

  submit(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.saveError.set(null);
    if (this.hasErrors()) return;

    const f = this.form;
    const body: SaveProjectRequest = {
      name: f.name.trim(),
      description: f.description.trim(),
      departmentId: f.departmentId ? Number(f.departmentId) : null,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      requiredQualifications: QUALIFICATIONS_ENABLED ? f.requiredQualifications.trim() || null : null,
      skills: this.rows().map((r) => ({
        skillId: r.skillId as number,
        isRequired: r.isRequired,
        minimumLevel: r.minimumLevel,
      })),
    };

    const id = this.editId();
    const call$ = id ? this.projects.update(id, body) : this.projects.create(body);

    this.saving.set(true);
    call$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.show(id ? 'Project updated.' : 'Project created.', 'success');
        this.router.navigate(['/admin/projects', saved.projectId]);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(this.errMsg(err, 'Could not save the project.'));
      },
    });
  }

  cancel(): void {
    this.location.back();
  }

  // Handles { message } and ASP.NET { errors: { Field: [msg] } }.
  private errMsg(err: any, fallback: string): string {
    const e = err?.error;
    if (e?.message) return e.message;
    if (e?.errors) {
      const first = (Object.values(e.errors) as unknown[]).flat()[0];
      if (first) return String(first);
    }
    return err?.message ?? fallback;
  }
}