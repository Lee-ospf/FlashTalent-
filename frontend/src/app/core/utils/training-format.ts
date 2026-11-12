import { AssignmentStatus, IntakeState } from '../models';

// Date-only values (StartDate, EndDate, DueDate) come back like "2026-11-10T00:00:00" with no zone.
// Read the date parts directly so the browser never shifts the day.
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Timestamps from DateTime.UtcNow come back without a "Z". Treat them as UTC.
export function parseUtc(s: string): Date {
  return new Date(/Z$|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z');
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  return parseUtc(s).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// yyyy-MM-dd for "today" in the browser, used as the minimum for date pickers
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Handles { message } and ASP.NET { errors: { Field: [msg] } }.
export function errMsg(err: any, fallback: string): string {
  const e = err?.error;
  if (e?.message) return e.message;
  if (e?.errors) {
    const first = (Object.values(e.errors) as unknown[]).flat()[0];
    if (first) return String(first);
  }
  return err?.message ?? fallback;
}

export const STATUS_META: Record<AssignmentStatus, { label: string; cls: string }> = {
  NotStarted: { label: 'Not started', cls: 'tc-grey' },
  InProgress: { label: 'In progress', cls: 'tc-blue' },
  AwaitingConfirmation: { label: 'Awaiting confirmation', cls: 'tc-amber' },
  Completed: { label: 'Completed', cls: 'tc-green' },
  NotCompleted: { label: 'Not completed', cls: 'tc-red' },
};

export const STATE_META: Record<IntakeState, { label: string; cls: string }> = {
  Upcoming: { label: 'Upcoming', cls: 'tc-blue' },
  Running: { label: 'Running', cls: 'tc-green' },
  Ended: { label: 'Ended', cls: 'tc-grey' },
};

// A UTC timestamp (no "Z") shown as a local day, e.g. "submitted 8 Nov 2026"
export function fmtDay(s: string | null | undefined): string {
  if (!s) return '—';
  return parseUtc(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}