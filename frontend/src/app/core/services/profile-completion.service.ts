import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CandidateStateService } from './candidate-state.service';
import { AddressService } from './address.service';
import { DocumentService, GLOBAL_MANDATORY } from './document.service';
import { CandidateSkillService } from './candidate-skill.service';
import { CandidateExperienceService } from './candidate-experience.service';
import { CandidateQualificationService } from './candidate-qualification.service';

export type ProfileStepKey =
  | 'cv'
  | 'personal'
  | 'address'
  | 'documents'
  | 'skills'
  | 'experience'
  | 'qualifications';

// Order matters for ProfileComponent's stepper — kept here so the guard and
// the wizard never disagree on what "all complete" means.
export const PROFILE_STEP_ORDER: ProfileStepKey[] = [
  'cv',
  'personal',
  'address',
  'documents',
  'skills',
  'experience',
  'qualifications',
];

@Injectable({ providedIn: 'root' })
export class ProfileCompletionService {
  private state = inject(CandidateStateService);
  private addressService = inject(AddressService);
  private documentService = inject(DocumentService);
  private skillService = inject(CandidateSkillService);
  private experienceService = inject(CandidateExperienceService);
  private qualificationService = inject(CandidateQualificationService);

  private _loaded = signal(false);
  loaded = this._loaded.asReadonly();

  addressCount = signal(0);
  documentTypesUploaded = signal<string[]>([]);
  skillCount = signal(0);
  experienceCount = signal(0);
  qualificationCount = signal(0);

  isComplete(key: ProfileStepKey): boolean {
    const p = this.state.profile();
    switch (key) {
      case 'cv':
        return this.documentTypesUploaded().includes('CV');
      case 'personal':
        return !!(
          p?.phone &&
          p?.dateOfBirth &&
          p?.gender &&
          p?.nationality &&
          p?.race
        );
      case 'address':
        return this.addressCount() > 0;
      case 'documents':
        return GLOBAL_MANDATORY.every((t) =>
          this.documentTypesUploaded().includes(t),
        );
      case 'skills':
        return this.skillCount() > 0;
      case 'experience':
        return this.experienceCount() > 0;
      case 'qualifications':
        return this.qualificationCount() > 0;
    }
  }

  allComplete = computed(
    () =>
      this._loaded() &&
      !!this.state.profile() &&
      PROFILE_STEP_ORDER.every((k) => this.isComplete(k)),
  );

  pctComplete = computed(() => {
    if (!this.state.profile()) return 0;
    return Math.round(
      (PROFILE_STEP_ORDER.filter((k) => this.isComplete(k)).length /
        PROFILE_STEP_ORDER.length) *
        100,
    );
  });

  /** Fetches the counts needed to evaluate completeness. Safe to call again
   *  later (e.g. after the candidate edits a section) — it just refreshes
   *  the same signals. Resolves even if there's no profile yet. */
  load(): Observable<void> {
    const p = this.state.profile();
    if (!p) {
      this._loaded.set(true);
      return of(void 0);
    }
    const id = p.candidateId;
    return forkJoin({
      addresses: this.addressService.getAll(id),
      documents: this.documentService.getAll(id),
      skills: this.skillService.getAll(id),
      experiences: this.experienceService.getAll(id),
      qualifications: this.qualificationService.getAll(id),
    }).pipe(
      tap((r) => {
        this.addressCount.set(r.addresses.length);
        this.documentTypesUploaded.set(r.documents.map((d) => d.documentType));
        this.skillCount.set(r.skills.length);
        this.experienceCount.set(r.experiences.length);
        this.qualificationCount.set(r.qualifications.length);
        this._loaded.set(true);
      }),
      map(() => void 0),
    );
  }
}
