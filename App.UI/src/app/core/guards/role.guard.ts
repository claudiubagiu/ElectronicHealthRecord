import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard =
  (allowedRoles: string[]): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const hasRole = allowedRoles.some((role) => authService.hasRole(role));

    if (hasRole) {
      return true;
    }

    return router.createUrlTree(['/unauthorized']);
  };
