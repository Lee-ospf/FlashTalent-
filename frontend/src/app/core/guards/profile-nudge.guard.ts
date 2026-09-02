import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { CandidateStateService } from '../services/candidate-state.service';
import { ProfileCompletionService } from '../services/profile-completion.service';

const NUDGE_FLAG = 'ft_profile_nudge_shown';

/** Soft nudge, not a gate: on /dashboard, redirects a Candidate to /profile
 *  once per browser session if their profile isn't 100% complete. Applies
 *  to Candidates only — /dashboard is shared across all roles via
 *  DashboardGateComponent, and Recruiter/Admin have no candidate profile
 *  to check. After the first nudge (this session), Dashboard is freely
 *  navigable even if still incomplete. */
export const profileNudgeGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const state = inject(CandidateStateService);
  const completion = inject(ProfileCompletionService);

  const user = auth.currentUser();
  if (user?.role !== 'Candidate') return of(true);

  const nudgeKey = `ft_profile_nudge_shown_${user.userId}`;
  if (sessionStorage.getItem(nudgeKey)) return of(true);

  const check = () => {
    if (!state.profile()) return of(true);

    return completion.load().pipe(
      map(() => {
        sessionStorage.setItem(nudgeKey, '1');
        if (!completion.allComplete()) {
          router.navigateByUrl('/profile');
          return false;
        }
        return true;
      }),
    );
  };

  return state.loaded() ? check() : state.loadMyProfile().pipe(switchMap(() => check()));
};
