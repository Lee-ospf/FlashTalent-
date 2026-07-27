export type ApplicationStatusKey =
  | 'Applied' | 'UnderReview' | 'Shortlisted' | 'OfferExtended' | 'Hired' | 'NotSelected';

const ALLOWED_TRANSITIONS: Record<ApplicationStatusKey, ApplicationStatusKey[]> = {
  Applied: ['UnderReview', 'NotSelected'],
  UnderReview: ['Shortlisted', 'NotSelected'],
  Shortlisted: ['OfferExtended', 'NotSelected'],
  OfferExtended: ['Hired', 'NotSelected'],
  Hired: [],
  NotSelected: []
};

export function getValidNextStatuses(current: string): ApplicationStatusKey[] {
  return ALLOWED_TRANSITIONS[current as ApplicationStatusKey] ?? [];
}

export const STATUS_LABELS: Record<ApplicationStatusKey, string> = {
  Applied: 'Applied',
  UnderReview: 'Under Review',
  Shortlisted: 'Shortlisted',
  OfferExtended: 'Offer Extended',
  Hired: 'Hired',
  NotSelected: 'Not Selected'
};