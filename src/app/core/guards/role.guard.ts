import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role !== 'Admin') {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};