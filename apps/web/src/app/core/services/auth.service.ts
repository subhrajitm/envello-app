import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  private readonly _user = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);

  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => !!this._user());

  getToken(): string | null {
    return this._session()?.access_token || null;
  }

  constructor() {
    // Initialize state from Supabase service
    this.supabase.currentUser$.subscribe(user => {
      this._user.set(user);
    });

    this.supabase.getSession().then(({ data }) => {
      this._session.set(data.session);
    });

    // Listen for auth changes and update router if needed
    this.supabase.authChanges((event: string, session: Session | null) => {
      this._session.set(session);
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  async signInWithGoogle() {
    return this.supabase.signInWithGoogle();
  }

  async signInWithGithub() {
    return this.supabase.signInWithGithub();
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
