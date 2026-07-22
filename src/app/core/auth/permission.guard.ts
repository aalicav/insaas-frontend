import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import type { PermissionKey } from '../models/auth.models';

export function permissionGuard(
  required: PermissionKey | PermissionKey[],
  mode: 'all' | 'any' = 'all',
): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const ok =
      mode === 'any'
        ? auth.hasAnyPermission(Array.isArray(required) ? required : [required])
        : auth.hasPermission(required);
    return ok ? true : router.createUrlTree(['/']);
  };
}
