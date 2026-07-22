import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.me()) return true;
  if (!auth.getToken()) {
    return router.createUrlTree(['/login']);
  }

  return auth.restoreSession().pipe(
    map((me) => (me ? true : router.createUrlTree(['/login']))),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.getToken()) return true;
  if (auth.me()) return router.createUrlTree(['/']);

  return auth.restoreSession().pipe(
    map((me) => (me ? router.createUrlTree(['/']) : true)),
  );
};
