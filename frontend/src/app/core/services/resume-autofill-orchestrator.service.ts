import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ResumeParsingService } from './resume-parsing.service';
import { SkillService } from './skill.service';
import { ResumeAutofillStoreService } from './resume-autofill-store.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ResumeAutofillOrchestratorService {
  private resumeParsing = inject(ResumeParsingService);
  private skillService = inject(SkillService);
  private autofillStore = inject(ResumeAutofillStoreService);
  private toast = inject(ToastService);

  parsing = signal(false);

  /** Parses the candidate's already-uploaded CV and loads results into
   *  ResumeAutofillStoreService for the Skills/Qualifications/Experience
   *  steps to render. Shows its own toasts on success/failure so callers
   *  (CvUploadStepComponent, DocumentsComponent) don't have to duplicate
   *  that messaging. */
  run(candidateId: number): void {
    if (this.parsing()) return;
    this.parsing.set(true);

    forkJoin({
      parsed: this.resumeParsing.parseCv(candidateId),
      masterSkills: this.skillService.getAll(),
    }).subscribe({
      next: ({ parsed, masterSkills }) => {
        this.autofillStore.load(candidateId, parsed, masterSkills);
        this.parsing.set(false);
        const count = this.autofillStore.totalPending();
        this.toast.show(
          count > 0
            ? `Found ${count} item${count === 1 ? '' : 's'} in your CV — review and add them as you go.`
            : "We couldn't find anything usable to auto-fill — no problem, just fill things in manually.",
          count > 0 ? 'success' : 'warn',
        );
      },
      error: (e: Error) => {
        this.parsing.set(false);
        this.toast.show(e.message, 'error');
      },
    });
  }
}
