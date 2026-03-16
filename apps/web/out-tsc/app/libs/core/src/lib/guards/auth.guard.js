import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
/**
 * Protects routes so only authenticated users can access.
 * Waits for auth initialization before making a decision.
 */
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return toObservable(auth.initialized).pipe(
    filter((isInit) => isInit), // Wait for initialization to complete
    take(1),
    map(() => {
      if (auth.isAuthenticated()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
