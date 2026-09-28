import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const PUBLIC_ROUTES = ['/login', '/register'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('rms_token');
  const router = inject(Router);

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        localStorage.removeItem('rms_token');
        localStorage.removeItem('rms_auth');
        const currentUrl = router.url;
        const alreadyOnPublicRoute = PUBLIC_ROUTES.some((p) =>
          currentUrl.startsWith(p),
        );
        if (!alreadyOnPublicRoute) {
          router.navigate(['/login']);
        }
      }
      return throwError(() => err);
    }),
  );
};
