import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { CandidateSkillService } from '../../core/services/candidate-skill.service';
import { SkillService } from '../../core/services/skill.service';
import { ToastService } from '../../core/services/toast.service';
import { CandidateSkillResponse, SkillResponse } from '../../core/models';

@Component({
  selector: 'app-candidate-skills',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-bulb"></i> My skills</h2>
          <p class="page-sub">Skills recruiters will see on your profile</p>
        </div>
      </div>

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-plus"></i> Add a skill</div>
          <form [formGroup]="form" (ngSubmit)="add()" style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
            <mat-form-field appearance="outline" style="flex:1;min-width:200px">
              <mat-label>Skill</mat-label>
              <mat-select formControlName="skillId">
                @for (s of availableSkills(); track s.skillId) {
                  <mat-option [value]="s.skillId">{{ s.name }} · {{ s.category }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:180px">
              <mat-label>Proficiency</mat-label>
              <mat-select formControlName="proficiencyLevel">
                <mat-option value="Beginner">Beginner</mat-option>
                <mat-option value="Intermediate">Intermediate</mat-option>
                <mat-option value="Advanced">Advanced</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" style="height:56px;border-radius:8px" [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-plus"></i> Add
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!mySkills().length) {
        <div class="empty-state"><i class="ti ti-bulb-off"></i><p>No skills added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (s of mySkills(); track s.candidateSkillId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ s.skillName }}</div>
                <div class="doc-meta">{{ s.category }} · {{ s.proficiencyLevel }}</div>
              </div>
              <div class="doc-actions">
                <button class="btn-remove" (click)="remove(s)"><i class="ti ti-trash"></i></button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CandidateSkillsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(CandidateStateService);
  private skillService = inject(SkillService);
  private candidateSkillService = inject(CandidateSkillService);
  private toast = inject(ToastService);

  allSkills = signal<SkillResponse[]>([]);
  mySkills = signal<CandidateSkillResponse[]>([]);
  loading = signal(false);
  saving = signal(false);

  availableSkills = () => this.allSkills().filter(s => !this.mySkills().some(m => m.skillId === s.skillId));

  form = this.fb.group({
    skillId: [null as number | null, Validators.required],
    proficiencyLevel: ['Intermediate', Validators.required]
  });

  ngOnInit(): void {
    this.skillService.getAll().subscribe({ next: s => this.allSkills.set(s) });
    this.load();
  }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.candidateSkillService.getAll(p.candidateId).subscribe({
      next: s => { this.mySkills.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  add(): void {
    const p = this.state.profile();
    if (!p || this.form.invalid) return;
    this.saving.set(true);
    this.candidateSkillService.assign(p.candidateId, {
      skills: [{ skillId: this.form.value.skillId!, proficiencyLevel: this.form.value.proficiencyLevel! }]
    }).subscribe({
      next: updated => {
        this.mySkills.set(updated);
        this.saving.set(false);
        this.form.reset({ skillId: null, proficiencyLevel: 'Intermediate' });
        this.toast.show('Skill added.', 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  remove(s: CandidateSkillResponse): void {
    const p = this.state.profile();
    if (!p) return;
    this.candidateSkillService.remove(p.candidateId, s.skillId).subscribe({
      next: () => {
        this.mySkills.update(list => list.filter(x => x.candidateSkillId !== s.candidateSkillId));
        this.toast.show('Skill removed.', 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error')
    });
  }
}