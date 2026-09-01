import { Injectable, inject, signal, computed } from '@angular/core';
import { ParsedResumeResponse, ParsedQualification, ParsedExperience, SkillResponse } from '../models';
import { ResumeAutofillMappingService, MatchedParsedSkill, UnmatchedParsedSkill } from './resume-autofill-mapping.service';

export interface MatchedSkillItem extends MatchedParsedSkill { id: string; }
export interface UnmatchedSkillItem extends UnmatchedParsedSkill { id: string; }
export interface QualificationItem extends ParsedQualification { id: string; }
export interface ExperienceItem extends ParsedExperience { id: string; }

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

@Injectable({ providedIn: 'root' })
export class ResumeAutofillStoreService {
  private mapper = inject(ResumeAutofillMappingService);

  private _phone = signal<string | null>(null);
  private _matchedSkills = signal<MatchedSkillItem[]>([]);
  private _unmatchedSkills = signal<UnmatchedSkillItem[]>([]);
  private _qualifications = signal<QualificationItem[]>([]);
  private _experiences = signal<ExperienceItem[]>([]);

  phone = this._phone.asReadonly();
  matchedSkills = this._matchedSkills.asReadonly();
  unmatchedSkills = this._unmatchedSkills.asReadonly();
  qualifications = this._qualifications.asReadonly();
  experiences = this._experiences.asReadonly();

  totalPending = computed(() =>
    this._matchedSkills().length + this._unmatchedSkills().length +
    this._qualifications().length + this._experiences().length,
  );

  /** Called once after a successful parse-cv call + a fresh master skill-list
   *  fetch. Overwrites any previous batch — a second CV parse replaces the
   *  first rather than appending to it. */
  load(parsed: ParsedResumeResponse, masterSkills: SkillResponse[]): void {
    this._phone.set(parsed.phone ?? null);

    const { matched, unmatched } = this.mapper.matchSkills(parsed.skills, masterSkills);
    this._matchedSkills.set(matched.map(m => ({ ...m, id: nextId('mskill') })));
    this._unmatchedSkills.set(unmatched.map(u => ({ ...u, id: nextId('uskill') })));
    this._qualifications.set(parsed.qualifications.map(q => ({ ...q, id: nextId('qual') })));
    this._experiences.set(parsed.experiences.map(e => ({ ...e, id: nextId('exp') })));
  }

  dismissPhone(): void { this._phone.set(null); }
  removeMatchedSkill(id: string): void { this._matchedSkills.update(l => l.filter(x => x.id !== id)); }
  removeUnmatchedSkill(id: string): void { this._unmatchedSkills.update(l => l.filter(x => x.id !== id)); }
  removeQualification(id: string): void { this._qualifications.update(l => l.filter(x => x.id !== id)); }
  removeExperience(id: string): void { this._experiences.update(l => l.filter(x => x.id !== id)); }

  /** Call from AuthService.logout() if this app may run on a shared/kiosk
   *  device — otherwise one candidate's unsaved suggestions could still be
   *  visible to the next candidate who logs in on the same tab. */
  clearAll(): void {
    this._phone.set(null);
    this._matchedSkills.set([]);
    this._unmatchedSkills.set([]);
    this._qualifications.set([]);
    this._experiences.set([]);
  }
}