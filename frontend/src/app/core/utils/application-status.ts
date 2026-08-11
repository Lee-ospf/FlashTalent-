export type ApplicationStatusKey =
  | 'Applied'
  | 'UnderReview'
  | 'Shortlisted'
  | 'PrescreeningStage'
  | 'InterviewStage'
  | 'OfferExtended'
  | 'Hired'
  | 'NotSelected';

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
  Hired: 'hired',
  NotSelected: 'rejected',
};

export function statusClass(s: string): string {
  return STATUS_CLASS[s as ApplicationStatusKey] ?? 'applied';
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s as ApplicationStatusKey] ?? s;
}
