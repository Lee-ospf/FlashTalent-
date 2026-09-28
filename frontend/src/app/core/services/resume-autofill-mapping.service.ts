import { Injectable } from '@angular/core';
import { ParsedSkill, SkillResponse } from '../models';

export interface MatchedParsedSkill {
  skill: SkillResponse;          // the real, existing skill row this matched to
  proficiencyLevel: string;      // 'Beginner' | 'Intermediate' | 'Expert' — same vocabulary as this app already uses
}

export interface UnmatchedParsedSkill {
  parsedName: string;            // whatever name the AI extracted, e.g. "Salesforce"
  proficiencyLevel: string;
  suggestedCategory: 'Technical' | 'SoftSkill'; // used only to pre-filter which dropdown list to show
}

export interface SkillMatchResult {
  matched: MatchedParsedSkill[];
  unmatched: UnmatchedParsedSkill[];
}

@Injectable({ providedIn: 'root' })
export class ResumeAutofillMappingService {

  /** Compares AI-parsed skill names against the candidate's actual master
   *  skill list (both Technical and SoftSkill combined) and splits them into:
   *  - matched: a real SkillResponse this parsed skill clearly refers to —
   *    ready to add via CandidateSkillService.assign() directly.
   *  - unmatched: no confident match found — per the "show as plain text,
   *    let the candidate manually pick the closest real skill" decision,
   *    these are NOT auto-created or silently dropped. The UI is
   *    responsible for offering a dropdown of real skills (filtered by
   *    suggestedCategory) for the candidate to resolve each one.
   *
   *  Matching is deliberately conservative (case-insensitive exact name
   *  match only, punctuation/whitespace normalized) rather than fuzzy —
   *  a wrong auto-match (e.g. "React" matching "ReactJS" when they're
   *  meant to be distinct entries) is worse than asking the candidate to
   *  confirm one they typed exactly.
   *
   *  No vocabulary translation happens here — the backend's ResumeParsingService
   *  prompt already asks Gemini for "Technical"/"SoftSkill" and
   *  "Beginner"/"Intermediate"/"Expert" directly, matching this app's real
   *  values, so proficiencyLevel/category pass through unchanged. */
  matchSkills(parsedSkills: ParsedSkill[], masterSkills: SkillResponse[]): SkillMatchResult {
    const matched: MatchedParsedSkill[] = [];
    const unmatched: UnmatchedParsedSkill[] = [];

    for (const parsed of parsedSkills) {
      const normalizedParsedName = this.normalize(parsed.name);
      const match = masterSkills.find(s => this.normalize(s.name) === normalizedParsedName);

      if (match) {
        matched.push({ skill: match, proficiencyLevel: parsed.proficiencyLevel });
      } else {
        unmatched.push({
          parsedName: parsed.name,
          proficiencyLevel: parsed.proficiencyLevel,
          suggestedCategory: parsed.category === 'SoftSkill' ? 'SoftSkill' : 'Technical',
        });
      }
    }

    return { matched, unmatched };
  }

  private normalize(name: string): string {
    return name.trim().toLowerCase().replace(/[\s/_-]+/g, '');
  }
}