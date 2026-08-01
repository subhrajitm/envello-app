import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from './logging.service';
import { SupabaseService } from './supabase.service';
import { TauriService } from './tauri.service';
import { UserActivityLogService } from './user-activity-log.service';
import { User, Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router      = inject(Router);
  private readonly logging     = inject(LoggingService);
  private readonly supabase    = inject(SupabaseService);
  private readonly tauri       = inject(TauriService);
  private readonly activityLog = inject(UserActivityLogService);

  private readonly _session = signal<Session | null>(null);
  private readonly _user = signal<User | null>(null);

  isAuthenticated = computed(() => !!this._session() || this._isGuest());
  currentUser = computed(() => this._user());
  initialized = computed(() => this._initialized());
  isGuest = computed(() => this._isGuest());

  private readonly _initialized = signal(false);
  private readonly _isGuest = signal(false);

  constructor() {
    // getSession() is safe to call here: on desktop (Tauri) autoRefreshToken is
    // disabled in SupabaseService so it returns immediately from localStorage
    // with no network call, even when offline.
    this.supabase.getSession().then(({ data: { session } }) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);

      if (!session) {
        const isGuest = localStorage.getItem('envello-guest-mode') === 'true';
        if (isGuest) {
          this._isGuest.set(true);
          this.logging.info('AuthService initialized', 'Guest Mode');
        } else {
          this.logging.info('AuthService initialized', 'Unauthenticated');
        }
      } else {
        this.logging.info('AuthService initialized', 'Authenticated');
      }

      this._initialized.set(true);
    }).catch(() => {
      this._initialized.set(true);
    });

    // Listen for changes
    this.supabase.authChanges((event, session) => {
      this.logging.info(`Auth event: ${event}`);
      this._session.set(session);
      this._user.set(session?.user ?? null);

      if (event === 'SIGNED_IN') {
        this.activityLog.log('login', session?.user?.email ?? undefined);
      } else if (event === 'SIGNED_OUT') {
        this.activityLog.log('logout');
        this._isGuest.set(false);
        localStorage.removeItem('envello-guest-mode');
        this.router.navigate(['/login']);
      }
    });
  }

  getToken(): string | null {
    return this._session()?.access_token ?? null;
  }

  loginAsGuest() {
    this._isGuest.set(true);
    localStorage.setItem('envello-guest-mode', 'true');
    this.router.navigate(['/workspace']);
  }

  async loginWithGoogle(): Promise<void> {
    this.logging.info('AuthService.loginWithGoogle');
    const redirectTo = this.tauri.isTauri()
      ? 'envello://auth-callback'
      : `${window.location.origin}/auth/callback`;

    const { data, error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/contacts.readonly',
        ].join(' '),
        skipBrowserRedirect: this.tauri.isTauri(),
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) { this.logging.error('Google OAuth failed', error.message); throw error; }

    if (this.tauri.isTauri() && data.url) {
      await this.tauri.openUrl(data.url);
      // Session completion handled by deep-link callback in AppComponent
    }
    // On web: browser redirects automatically, Supabase detects session on return
  }

  async handleOAuthCallback(url: string): Promise<void> {
    const u = new URL(url.includes('://') ? url.replace(/^[a-z]+:\/\//, 'https://x.x/') : url);
    const code = u.searchParams.get('code');
    if (!code) return;
    const { error } = await this.supabase.client.auth.exchangeCodeForSession(code);
    if (error) this.logging.error('OAuth callback failed', error.message);
  }

  async login(email: string, password: string): Promise<boolean> {
    this.logging.info('AuthService.login');
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.logging.error('Login failed', error.message);
      return false;
    }
    return true;
  }

  async signUp(email: string, password: string): Promise<string | null> {
    this.logging.info('AuthService.signUp');
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
    });

    if (error) {
      this.logging.error('Sign up failed', error.message);
      return error.message;
    }
    return null;
  }

  async verifySignupOtp(email: string, token: string): Promise<boolean> {
    this.logging.info('AuthService.verifySignupOtp');
    const { error } = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) {
      this.logging.error('OTP verification failed', error.message);
      return false;
    }
    return true;
  }

  async resendSignupOtp(email: string): Promise<boolean> {
    this.logging.info('AuthService.resendSignupOtp');
    const { error } = await this.supabase.client.auth.resend({
      type: 'signup',
      email,
    });
    if (error) {
      this.logging.error('Resend OTP failed', error.message);
      return false;
    }
    return true;
  }

  async logout(): Promise<void> {
    this.logging.info('AuthService.logout');

    if (this._isGuest()) {
      this._isGuest.set(false);
      localStorage.removeItem('envello-guest-mode');
      this.router.navigate(['/login']);
      return;
    }

    const { error } = await this.supabase.signOut();
    if (error) {
      this.logging.error('Logout failed', error.message);
    }
    // Router navigation is handled by auth state change listener usually, 
    // but we can force it if needed.
  }

  async refreshToken(): Promise<boolean> {
    const { data, error } = await this.supabase.getSession();
    if (error || !data.session) return false;
    this._session.set(data.session);
    return true;
  }

  /** Signs out all sessions except the current one. */
  async signOutOtherDevices(): Promise<void> {
    this.logging.info('AuthService.signOutOtherDevices');
    const { error } = await this.supabase.client.auth.signOut({ scope: 'others' });
    if (error) {
      this.logging.error('signOutOtherDevices failed', error.message);
      return;
    }
    this.activityLog.log('session_revoke_others');
  }

  /** Signs out all sessions including the current one. */
  async signOutAllDevices(): Promise<void> {
    this.logging.info('AuthService.signOutAllDevices');
    const { error } = await this.supabase.client.auth.signOut({ scope: 'global' });
    if (error) {
      this.logging.error('signOutAllDevices failed', error.message);
    }
    // The SIGNED_OUT event listener handles navigation and cleanup.
  }

  /** Updates the authenticated user's email address. Supabase sends a confirmation to the new address. */
  async updateEmail(newEmail: string): Promise<void> {
    const { error } = await this.supabase.client.auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);
    this.activityLog.log('key_saved', 'Email change requested');
  }

  /** Updates the authenticated user's password. */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    this.activityLog.log('key_saved', 'Password changed');
  }
}
