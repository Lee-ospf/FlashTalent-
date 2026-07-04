import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkillService } from '../../../core/services/skill.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkillResponse } from '../../../core/models';

@Component({
  selector: 'app-skill-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-tools"></i> Manage skills</h2>
          <p class="page-sub">Skills used when creating vacancy requirements</p>
        </div>
      </div>

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-plus"></i> Add a skill</div>
          <form [formGroup]="form" (ngSubmit)="add()" style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
            <mat-form-field appearance="outline" style="flex:1;min-width:200px">
              <mat-label>Skill name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. C#">
              @if (invalid('name')) { <mat-error>Required</mat-error> }
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:200px">
              <mat-label>Category</mat-label>
              <mat-select formControlName="category">
                <mat-option value="Technical">Technical</mat-option>
                <mat-option value="Soft Skills">Soft Skills</mat-option>
                <mat-option value="Language">Language</mat-option>
                <mat-option value="Certification">Certification</mat-option>
              </mat-select>
              @if (invalid('category')) { <mat-error>Required</mat-error> }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" style="height:56px;border-radius:8px"
                    [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-plus"></i> Add skill
            </button>
          </form>
          @if (apiError) {
            <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
          }
        </mat-card-content>
      </mat-card>

      <div class="card-header"><i class="ti ti-list"></i> Existing skills ({{ skills().length }})</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!skills().length) {
        <div class="empty-state"><i class="ti ti-tools"></i><p>No skills added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (s of skills(); track s.skillId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ s.name }}</div>
                <div class="doc-meta">{{ s.category }}</div>
              </div>
              <div class="doc-actions">
                <button class="btn-remove" (click)="remove(s)" [disabled]="deletingId() === s.skillId">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class SkillListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private skillService = inject(SkillService);
  private toast = inject(ToastService);

  skills = signal<SkillResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  deletingId = signal<number | null>(null);
  apiError = '';

  form = this.fb.group({
    name: ['', Validators.required],
    category: ['Technical', Validators.required]
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.skillService.getAll().subscribe({
      next: s => { this.skills.set(s); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.skillService.create(this.form.value as { name: string; category: string }).subscribe({
      next: created => {
        this.skills.update(list => [...list, created]);
        this.saving.set(false);
        this.form.reset({ name: '', category: 'Technical' });
        this.toast.show(`"${created.name}" added.`, 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }

  remove(s: SkillResponse): void {
    if (!confirm(`Delete "${s.name}"?`)) return;
    this.deletingId.set(s.skillId);
    this.skillService.delete(s.skillId).subscribe({
      next: () => {
        this.skills.update(list => list.filter(x => x.skillId !== s.skillId));
        this.deletingId.set(null);
        this.toast.show('Skill deleted.', 'success');
      },
      error: (err: Error) => {
        this.deletingId.set(null);
        this.toast.show(err.message, 'error'); // backend blocks delete if skill is in use — this surfaces that message
      }
    });
  }
}