import { Injectable, inject, signal, computed } from '@angular/core';
import {
  ParsedResumeResponse,
  ParsedQualification,
  ParsedExperience,
  SkillResponse,
} from '../models';
import {
  ResumeAutofillMappingService,
  MatchedParsedSkill,
  UnmatchedParsedSkill,
} from './resume-autofill-mapping.service';

export interface MatchedSkillItem extends MatchedParsedSkill {
  id: string;
}
export interface UnmatchedSkillItem extends UnmatchedParsedSkill {
  id: string;
}
export interface QualificationItem extends ParsedQualification {
  id: string;
}
export interface ExperienceItem extends ParsedExperience {
  id: string;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

interface PersistedAutofillState {
  phone: string | null;
  matchedSkills: MatchedSkillItem[];
  unmatchedSkills: UnmatchedSkillItem[];
  qualifications: QualificationItem[];
  experiences: ExperienceItem[];
}

const storageKey = (candidateId: number) => `ft_resume_autofill_${candidateId}`;

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

  totalPending = computed(
    () =>
      this._matchedSkills().length +
      this._unmatchedSkills().length +
      this._qualifications().length +
      this._experiences().length,
  );

  // Which candidate the currently-loaded/restored data belongs to — needed
  // so every mutation knows which localStorage key to persist back to.
  private currentCandidateId: number | null = null;

  /** Called once after a successful parse-cv call + a fresh master skill-list
   *  fetch. Overwrites any previous batch — a second CV parse replaces the
   *  first rather than appending to it. Persists immediately so a reload
   *  right after parsing doesn't lose the results. */
  load(
    candidateId: number,
    parsed: ParsedResumeResponse,
    masterSkills: SkillResponse[],
  ): void {
    this.currentCandidateId = candidateId;
    this._phone.set(parsed.phone ?? null);

    const { matched, unmatched } = this.mapper.matchSkills(
      parsed.skills,
      masterSkills,
    );
    this._matchedSkills.set(
      matched.map((m) => ({ ...m, id: nextId('mskill') })),
    );
    this._unmatchedSkills.set(
      unmatched.map((u) => ({ ...u, id: nextId('uskill') })),
    );
    this._qualifications.set(
      parsed.qualifications.map((q) => ({ ...q, id: nextId('qual') })),
    );
    this._experiences.set(
      parsed.experiences.map((e) => ({ ...e, id: nextId('exp') })),
    );

    this.persist();
  }

  /** Rehydrates any previously-parsed, not-yet-added suggestions for this
   *  candidate from localStorage. Call once on app/profile load, before the
   *  candidate has a chance to trigger a fresh parse. No-op if nothing was
   *  ever saved, or if it belongs to a different candidate than currently
   *  loaded (defensive — shouldn't normally happen since logout clears it). */
  restore(candidateId: number): void {
    this.currentCandidateId = candidateId;
    const raw = localStorage.getItem(storageKey(candidateId));
    if (!raw) return;

    try {
      const parsed: PersistedAutofillState = JSON.parse(raw);
      this._phone.set(parsed.phone);
      this._matchedSkills.set(parsed.matchedSkills);
      this._unmatchedSkills.set(parsed.unmatchedSkills);
      this._qualifications.set(parsed.qualifications);
      this._experiences.set(parsed.experiences);
    } catch {
      // Corrupt/old-shape data — safer to drop it than to crash the profile page.
      localStorage.removeItem(storageKey(candidateId));
    }
  }

  dismissPhone(): void {
    this._phone.set(null);
    this.persist();
  }
  removeMatchedSkill(id: string): void {
    this._matchedSkills.update((l) => l.filter((x) => x.id !== id));
    this.persist();
  }
  removeUnmatchedSkill(id: string): void {
    this._unmatchedSkills.update((l) => l.filter((x) => x.id !== id));
    this.persist();
  }
  removeQualification(id: string): void {
    this._qualifications.update((l) => l.filter((x) => x.id !== id));
    this.persist();
  }
  removeExperience(id: string): void {
    this._experiences.update((l) => l.filter((x) => x.id !== id));
    this.persist();
  }

  /** Call from AuthService.logout() — clears both in-memory state and the
   *  persisted copy, so one candidate's unsaved suggestions can never leak
   *  into the next candidate's session on a shared/kiosk device. */
  clearAll(): void {
    if (this.currentCandidateId != null) {
      localStorage.removeItem(storageKey(this.currentCandidateId));
    }
    this.currentCandidateId = null;
    this._phone.set(null);
    this._matchedSkills.set([]);
    this._unmatchedSkills.set([]);
    this._qualifications.set([]);
    this._experiences.set([]);
  }

  private persist(): void {
    if (this.currentCandidateId == null) return;
    const state: PersistedAutofillState = {
      phone: this._phone(),
      matchedSkills: this._matchedSkills(),
      unmatchedSkills: this._unmatchedSkills(),
      qualifications: this._qualifications(),
      experiences: this._experiences(),
    };
    localStorage.setItem(
      storageKey(this.currentCandidateId),
      JSON.stringify(state),
    );
  }
}
