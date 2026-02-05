import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects routes so only authenticated users can access.
 * When auth is enabled, unauthenticated users are redirected to login (or overview for now).
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  // Stub: no login page yet; redirect to overview. Replace with '/login' when auth UI exists.
  router.navigate(['/login']).catch(() => { });
  return false;
};
