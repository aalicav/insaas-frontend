import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { FeedbackService } from '../feedback/feedback.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(FeedbackService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const isAuthRoute =
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/invitations/accept');
        if (!isAuthRoute) {
          auth.logout(false);
          feedback.warning('Sessão expirada. Faça login novamente.');
          void router.navigate(['/login'], {
            queryParams: { returnUrl: router.url },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
