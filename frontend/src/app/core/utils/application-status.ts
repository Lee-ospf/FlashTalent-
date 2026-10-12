export type ApplicationStatusKey =
  // ── Real backend statuses (matches TalentHub.Models.ApplicationStatus exactly) ──
  | 'Applied'
  | 'UnderReview'
  | 'Shortlisted'
  | 'PrescreeningStage'
  | 'InterviewStage'
  | 'OfferExtended'
  | 'Hired'
  | 'NotSelected'

  // 'OfferDeclined' overlay 'OfferExtended' (see OfferLetterService).
  | 'OfferSent'
  | 'OfferAccepted'
  | 'OfferDeclined';

// Matches the backend's ApplicationStatusRules exactly:
// Applied → UnderReview → Shortlisted → PrescreeningStage → InterviewStage
// → OfferExtended → Hired, with NotSelected reachable at any active stage.

const ALLOWED_TRANSITIONS: Record<
  ApplicationStatusKey,
  ApplicationStatusKey[]
> = {
  Applied: ['UnderReview', 'NotSelected'],
  UnderReview: ['Shortlisted', 'NotSelected'],
  Shortlisted: ['PrescreeningStage', 'NotSelected'],
  PrescreeningStage: ['InterviewStage', 'NotSelected'],
  InterviewStage: ['OfferExtended', 'NotSelected'],
  OfferExtended: ['Hired', 'NotSelected'],
  OfferSent: ['NotSelected'], // waiting on the candidate; recruiter can still withdraw
  OfferAccepted: ['Hired'],
  OfferDeclined: ['NotSelected'],
  Hired: [],
  NotSelected: [],
};

export function getValidNextStatuses(current: string): ApplicationStatusKey[] {
  return ALLOWED_TRANSITIONS[current as ApplicationStatusKey] ?? [];
}

export const STATUS_LABELS: Record<ApplicationStatusKey, string> = {
  Applied: 'Applied',
  UnderReview: 'Under Review',
  Shortlisted: 'Shortlisted',
  PrescreeningStage: 'Pre-Screening',
  InterviewStage: 'Interview',
  OfferExtended: 'Offer Extended',
  OfferSent: 'Offer Sent',
  OfferAccepted: 'Offer Accepted',
  OfferDeclined: 'Offer Declined',
  Hired: 'Hired',
  NotSelected: 'Not Selected',
};

export const STATUS_CLASS: Record<ApplicationStatusKey, string> = {
  Applied: 'applied',
  UnderReview: 'underreview',
  Shortlisted: 'shortlisted',
  PrescreeningStage: 'prescreening',
  InterviewStage: 'interview',
  OfferExtended: 'offer',
  OfferSent: 'Offer Sent',
  OfferAccepted: 'Offer Accepted',
  OfferDeclined: 'Offer Declined',
  Hired: 'hired',
  NotSelected: 'rejected',
};

export function statusClass(s: string): string {
  return STATUS_CLASS[s as ApplicationStatusKey] ?? 'applied';
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s as ApplicationStatusKey] ?? s;
}
