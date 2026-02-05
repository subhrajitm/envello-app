import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from './logging.service';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly logging = inject(LoggingService);
  private readonly supabase = inject(SupabaseService);

  private readonly _session = signal<Session | null>(null);
  private readonly _user = signal<User | null>(null);

  isAuthenticated = computed(() => !!this._session() || this._isGuest());
  currentUser = computed(() => this._user());
  initialized = computed(() => this._initialized());
  isGuest = computed(() => this._isGuest());

  private readonly _initialized = signal(false);
  private readonly _isGuest = signal(false);

  constructor() {
    // Initial session load
    this.supabase.getSession().then(({ data: { session } }) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);

      // If no session, check for Guest Mode
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
    });

    // Listen for changes
    this.supabase.authChanges((event, session) => {
      this.logging.info(`Auth event: ${event}`);
      this._session.set(session);
      this._user.set(session?.user ?? null);

      if (event === 'SIGNED_OUT') {
        // Only clear guest mode if explicit logout happens (which clears both)
        // But SIGNED_OUT comes from Supabase. 
        // If we are guest, we are not interacting with Supabase auth changes usually.
        // However, if we were signed in and signed out, we go to login.
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

  async signUp(email: string, password: string): Promise<boolean> {
    this.logging.info('AuthService.signUp');
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
    });

    if (error) {
      this.logging.error('Sign up failed', error.message);
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
}
