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
  readonly initialized = signal<boolean>(true); // Stub: immediately initialized

  isAuthenticated = computed(() => this.isAuthenticatedSignal());

  getToken(): string | null {
    // Stub: no real token. When backend exists: return from secure storage or cookie.
    return null;
  }

  login(_email: string, _password: string): Promise<boolean> {
    this.logging.info('AuthService.login (stub)');
    this.isAuthenticatedSignal.set(true);
    localStorage.setItem('envello-auth', 'true');
    return Promise.resolve(true);
  }

  signUp(_email: string, _password: string): Promise<boolean> {
    this.logging.info('AuthService.signUp (stub)');
    this.isAuthenticatedSignal.set(true);
    localStorage.setItem('envello-auth', 'true');
    return Promise.resolve(true);
  }

  loginAsGuest(): void {
    this.logging.info('AuthService.loginAsGuest (stub)');
    this.isAuthenticatedSignal.set(true);
    localStorage.setItem('envello-auth', 'true');
    this.router.navigate(['/overview']).catch(() => { });
  }

  logout(): void {
    this.logging.info('AuthService.logout');
    this.isAuthenticatedSignal.set(false);
    localStorage.removeItem('envello-auth');
    this.router.navigate(['/login']).catch(() => { });
  }

  refreshToken(): Promise<boolean> {
    this.logging.debug('AuthService.refreshToken (stub)');
    return Promise.resolve(true);
  }
}
