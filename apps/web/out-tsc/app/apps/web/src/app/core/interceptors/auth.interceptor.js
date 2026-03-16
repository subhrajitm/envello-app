import { inject } from '@angular/core';
import { AuthService } from '@envello/core';
/**
 * Attaches auth token to outgoing requests when available.
 * When backend exists, add: Authorization: Bearer <token> or cookie-based auth.
 */
export const authInterceptor = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
