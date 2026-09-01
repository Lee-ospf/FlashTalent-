import { Component, inject, signal, OnInit, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { CandidateSkillService } from '../../core/services/candidate-skill.service';
import { SkillService } from '../../core/services/skill.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ResumeAutofillStoreService,
  MatchedSkillItem,
  UnmatchedSkillItem,
} from '../../core/services/resume-autofill-store.service';
import { CandidateSkillResponse, SkillResponse } from '../../core/models';

@Component({
  selector: 'app-candidate-skills',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule,
    MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <div [class.page-container]="!embedded" [class.step-body-padded]="embedded">
      @if (!embedded) {
        <div class="page-header">
          <div>
            <h2 class="page-title"><i class="ti ti-bulb"></i> My Skills</h2>
            <p class="page-sub">Skills recruiters will see on your profile</p>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {

        @if (autofillStore.matchedSkills().length || autofillStore.unmatchedSkills().length) {
          <div class="autofill-review-block">
            <div class="autofill-review-header">
              <i class="ti ti-sparkles"></i> Found {{ autofillStore.matchedSkills().length + autofillStore.unmatchedSkills().length }} skill(s) in your CV — review and add
            </div>

            @for (item of autofillStore.matchedSkills(); track item.id) {
              <div class="autofill-card">
                <div class="autofill-card-body">
                  <div class="autofill-card-title">{{ item.skill.name }}</div>
                  <div class="autofill-card-sub">{{ item.skill.category === 'SoftSkill' ? 'Soft skill' : 'Technical' }}</div>
                  <select class="ai-level-select" [value]="matchedLevelDraft[item.id] ?? item.proficiencyLevel"
                          (change)="matchedLevelDraft[item.id] = $any($event.target).value">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div class="autofill-card-actions">
                  <button mat-stroked-button style="border-radius:8px" (click)="addMatchedSkill(item)" [disabled]="saving()">
                    <i class="ti ti-plus"></i> Add
                  </button>
                  <button type="button" class="chip-dismiss" (click)="autofillStore.removeMatchedSkill(item.id)"><i class="ti ti-x"></i></button>
                </div>
              </div>
            }

            @for (item of autofillStore.unmatchedSkills(); track item.id) {
              <div class="autofill-card">
                <div class="autofill-card-body">
                  <div class="autofill-card-title">"{{ item.parsedName }}" <span class="autofill-unmatched-tag">not in our list</span></div>
                  <select class="ai-mini-select" [value]="unmatchedPickDraft[item.id] ?? ''"
                          (change)="unmatchedPickDraft[item.id] = $any($event.target).value">
                    <option value="" disabled>Pick the closest real skill…</option>
                    @for (s of skillsForCategory(item.suggestedCategory); track s.skillId) {
                      <option [value]="s.skillId">{{ s.name }}</option>
                    }
                  </select>
                  <select class="ai-level-select" [value]="unmatchedLevelDraft[item.id] ?? item.proficiencyLevel"
                          (change)="unmatchedLevelDraft[item.id] = $any($event.target).value">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div class="autofill-card-actions">
                  <button mat-stroked-button style="border-radius:8px" (click)="addUnmatchedSkill(item)"
                          [disabled]="saving() || !unmatchedPickDraft[item.id]">
                    <i class="ti ti-plus"></i> Add
                  </button>
                  <button type="button" class="chip-dismiss" (click)="autofillStore.removeUnmatchedSkill(item.id)"><i class="ti ti-x"></i></button>
                </div>
              </div>
            }
          </div>
        }

        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
          <mat-card-content style="padding:20px">
            <div class="form-section-label" style="margin-bottom:12px">
              <i class="ti ti-code"></i> Technical Skills
            </div>

            @if (myTechnicalSkills().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                @for (s of myTechnicalSkills(); track s.candidateSkillId) {
                  <div class="skill-chip skill-chip--technical">
                    <span>{{ s.skillName }}</span>
                    <span class="chip-level">{{ s.proficiencyLevel }}</span>
                    <button class="chip-remove" (click)="remove(s)" title="Remove">
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
              </div>
            } @else {
              <p style="color:#888;font-size:13px;margin-bottom:12px">No technical skills added yet.</p>
            }

            <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
              <mat-form-field appearance="outline" style="flex:1;min-width:200px">
                <mat-label>Search technical skills</mat-label>
                <input matInput
                  [value]="technicalSearchTerm()"
                  (input)="technicalSearchTerm.set($any($event.target).value)"
                  placeholder="e.g. C#, SQL...">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:170px">
                <mat-label>Proficiency</mat-label>
                <mat-select
                  [value]="technicalLevel()"
                  (selectionChange)="technicalLevel.set($event.value)">
                  <mat-option value="Beginner">Beginner</mat-option>
                  <mat-option value="Intermediate">Intermediate</mat-option>
                  <mat-option value="Expert">Expert</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (filteredTechnical().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (s of filteredTechnical(); track s.skillId) {
                  <button class="skill-pill"
                    [class.skill-pill--disabled]="isAlreadyAdded(s)"
                    (click)="add(s, technicalLevel())"
                    [disabled]="isAlreadyAdded(s) || saving()">
                    {{ s.name }}
                    @if (isAlreadyAdded(s)) {
                      <i class="ti ti-check" style="margin-left:4px"></i>
                    }
                  </button>
                }
              </div>
            } @else if (technicalSearchTerm()) {
              <p style="color:#aaa;font-size:13px;margin-top:8px">
                No technical skills match "{{ technicalSearchTerm() }}"
              </p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-content style="padding:20px">
            <div class="form-section-label" style="margin-bottom:12px">
              <i class="ti ti-users"></i> Soft Skills
            </div>

            @if (mySoftSkills().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                @for (s of mySoftSkills(); track s.candidateSkillId) {
                  <div class="skill-chip skill-chip--soft">
                    <span>{{ s.skillName }}</span>
                    <span class="chip-level">{{ s.proficiencyLevel }}</span>
                    <button class="chip-remove" (click)="remove(s)" title="Remove">
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
              </div>
            } @else {
              <p style="color:#888;font-size:13px;margin-bottom:12px">No soft skills added yet.</p>
            }

            <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
              <mat-form-field appearance="outline" style="flex:1;min-width:200px">
                <mat-label>Search soft skills</mat-label>
                <input matInput
                  [value]="softSearchTerm()"
                  (input)="softSearchTerm.set($any($event.target).value)"
                  placeholder="e.g. Teamwork, Leadership...">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:170px">
                <mat-label>Proficiency</mat-label>
                <mat-select
                  [value]="softLevel()"
                  (selectionChange)="softLevel.set($event.value)">
                  <mat-option value="Beginner">Beginner</mat-option>
                  <mat-option value="Intermediate">Intermediate</mat-option>
                  <mat-option value="Expert">Expert</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (filteredSoft().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (s of filteredSoft(); track s.skillId) {
                  <button class="skill-pill"
                    [class.skill-pill--disabled]="isAlreadyAdded(s)"
                    (click)="add(s, softLevel())"
                    [disabled]="isAlreadyAdded(s) || saving()">
                    {{ s.name }}
                    @if (isAlreadyAdded(s)) {
                      <i class="ti ti-check" style="margin-left:4px"></i>
                    }
                  </button>
                }
              </div>
            } @else if (softSearchTerm()) {
              <p style="color:#aaa;font-size:13px;margin-top:8px">
                No soft skills match "{{ softSearchTerm() }}"
              </p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>

    <style>
      .step-body-padded { padding: 1.5rem; }
      .skill-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 20px; font-size: 13px; font-weight: 500; }
      .skill-chip--technical { background:#e8f4fd; color:#1565c0; border:1px solid #90caf9; }
      .skill-chip--soft { background:#f3e5f5; color:#6a1b9a; border:1px solid #ce93d8; }
      .chip-level { font-size:11px; opacity:0.75; font-weight:400; }
      .chip-remove { background:none; border:none; cursor:pointer; padding:0; color:inherit; opacity:0.6; line-height:1; }
      .chip-remove:hover { opacity:1; }
      .skill-pill { padding:6px 14px; border-radius:20px; border:1px solid #ddd; background:#f5f5f5; cursor:pointer; font-size:13px; transition:background 0.15s; }
      .skill-pill:hover:not(:disabled) { background:#e3f2fd; border-color:#90caf9; }
      .skill-pill--disabled { opacity:0.45; cursor:not-allowed; }

      .autofill-review-block { margin-bottom: 20px; }
      .autofill-review-header { font-size: 12px; font-weight: 600; color: #6a1b9a; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
      .autofill-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid #ce93d8; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }
      .autofill-card-body { flex: 1; min-width: 0; }
      .autofill-card-title { font-size: 13px; font-weight: 600; color: var(--text); }
      .autofill-card-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .autofill-unmatched-tag { font-size: 10px; font-weight: 600; color: #b7791f; background: #fff4d6; border-radius: 20px; padding: 2px 8px; margin-left: 6px; }
      .autofill-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
      .ai-level-select, .ai-mini-select { border: 1px solid #ddd; border-radius: 8px; padding: 6px 8px; font-size: 12px; margin-top: 6px; margin-right: 6px; }
      .chip-dismiss { background: none; border: none; cursor: pointer; opacity: 0.5; padding: 4px; }
      .chip-dismiss:hover { opacity: 1; }
    </style>
  `,
})
export class CandidateSkillsComponent implements OnInit {
  @Input() embedded = false;
  @Output() saved = new EventEmitter<void>();

  private state = inject(CandidateStateService);
  private skillService = inject(SkillService);
  private candidateSkillService = inject(CandidateSkillService);
  private toast = inject(ToastService);
  autofillStore = inject(ResumeAutofillStoreService);

  technicalSkills = signal<SkillResponse[]>([]);
  softSkills = signal<SkillResponse[]>([]);
  mySkills = signal<CandidateSkillResponse[]>([]);

  loading = signal(false);
  saving = signal(false);

  technicalSearchTerm = signal('');
  softSearchTerm = signal('');

  technicalLevel = signal('Intermediate');
  softLevel = signal('Intermediate');

  // Per-card draft state for the autofill review section, keyed by item id.
  // Plain objects (not signals) are fine here since updates happen inside
  // Angular event handlers and only affect template reads on the same item.
  matchedLevelDraft: Record<string, string> = {};
  unmatchedLevelDraft: Record<string, string> = {};
  unmatchedPickDraft: Record<string, string> = {};

  myTechnicalSkills = computed(() => this.mySkills().filter(s => s.category === 'Technical'));
  mySoftSkills = computed(() => this.mySkills().filter(s => s.category === 'SoftSkill'));

  filteredTechnical = computed(() => {
    const term = this.technicalSearchTerm().toLowerCase();
    return term ? this.technicalSkills().filter(s => s.name.toLowerCase().includes(term)) : this.technicalSkills();
  });

  filteredSoft = computed(() => {
    const term = this.softSearchTerm().toLowerCase();
    return term ? this.softSkills().filter(s => s.name.toLowerCase().includes(term)) : this.softSkills();
  });

  isAlreadyAdded(skill: SkillResponse): boolean {
    return this.mySkills().some(s => s.skillId === skill.skillId);
  }

  skillsForCategory(cat: 'Technical' | 'SoftSkill'): SkillResponse[] {
    return cat === 'SoftSkill' ? this.softSkills() : this.technicalSkills();
  }

  ngOnInit(): void {
    this.skillService.getByCategory('Technical').subscribe({ next: skills => this.technicalSkills.set(skills) });
    this.skillService.getByCategory('SoftSkill').subscribe({ next: skills => this.softSkills.set(skills) });
    this.load();
  }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.candidateSkillService.getAll(p.candidateId).subscribe({
      next: s => { this.mySkills.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  add(skill: SkillResponse, proficiencyLevel: string): void {
    const p = this.state.profile();
    if (!p || this.saving()) return;
    this.saving.set(true);
    const wasEmpty = this.mySkills().length === 0;
    this.candidateSkillService.assign(p.candidateId, {
      skills: [{ skillId: skill.skillId, proficiencyLevel }],
    }).subscribe({
      next: updated => {
        this.mySkills.set(updated);
        this.saving.set(false);
        this.toast.show(`${skill.name} added.`, 'success');
        if (wasEmpty) this.saved.emit();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.show(err.message, 'error');
      },
    });
  }

  remove(s: CandidateSkillResponse): void {
    const p = this.state.profile();
    if (!p) return;
    this.candidateSkillService.remove(p.candidateId, s.skillId).subscribe({
      next: () => {
        this.mySkills.update(list => list.filter(x => x.candidateSkillId !== s.candidateSkillId));
        this.toast.show(`${s.skillName} removed.`, 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error'),
    });
  }

  // Adds a CV-matched skill using its already-known real SkillResponse —
  // reuses add() directly so there's no duplicate save path to maintain.
  addMatchedSkill(item: MatchedSkillItem): void {
    const level = this.matchedLevelDraft[item.id] ?? item.proficiencyLevel;
    this.add(item.skill, level);
    this.autofillStore.removeMatchedSkill(item.id);
  }

  // Adds an unmatched CV skill only once the candidate has picked a real
  // skill from the dropdown — the "Add" button stays disabled until then.
  addUnmatchedSkill(item: UnmatchedSkillItem): void {
    const skillId = Number(this.unmatchedPickDraft[item.id]);
    if (!skillId) return;
    const pool = [...this.technicalSkills(), ...this.softSkills()];
    const skill = pool.find(s => s.skillId === skillId);
    if (!skill) { this.toast.show('Could not find that skill.', 'error'); return; }
    this.add(skill, this.unmatchedLevelDraft[item.id] ?? item.proficiencyLevel);
    this.autofillStore.removeUnmatchedSkill(item.id);
  }
}