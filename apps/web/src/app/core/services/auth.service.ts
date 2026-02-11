import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from './logging.service';
import { environment } from '../../../environments/environment';

/** Stub: replace with real auth when backend exists (JWT, refresh, httpOnly cookies). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly logging = inject(LoggingService);

  /** In production: read from secure storage or httpOnly cookie. */
  private readonly isAuthenticatedSignal = signal<boolean>(!environment.production);

  isAuthenticated = computed(() => this.isAuthenticatedSignal());

  getToken(): string | null {
    // Stub: no real token. When backend exists: return from secure storage or cookie.
    return null;
  }

  login(_email: string, _password: string): Promise<boolean> {
    this.logging.info('AuthService.login (stub)');
    this.isAuthenticatedSignal.set(true);
    return Promise.resolve(true);
  }

  logout(): void {
    this.logging.info('AuthService.logout');
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/overview']).catch(() => { });
  }

  refreshToken(): Promise<boolean> {
    this.logging.debug('AuthService.refreshToken (stub)');
    return Promise.resolve(true);
  }
}
