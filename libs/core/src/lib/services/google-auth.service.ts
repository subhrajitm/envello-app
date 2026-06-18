import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { TauriService } from './tauri.service';
import { NotificationService } from './notification.service';

export interface GoogleAccount {
  email: string;
  name: string;
  avatar?: string;
}

const STORAGE_KEY = 'envello-google-provider-token';
const REFRESH_KEY  = 'envello-google-refresh-token';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private supabase      = inject(SupabaseService);
  private tauri         = inject(TauriService);
  private notify        = inject(NotificationService);

  readonly connected    = signal(false);
  readonly account      = signal<GoogleAccount | null>(null);
  readonly connecting   = signal(false);

  private _token        = signal<string | null>(null);

  // Google API scopes requested
  static readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/contacts.readonly',
  ].join(' ');

  constructor() {
    this.restoreFromSession();
    this.supabase.authChanges((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.provider_token) {
        this.setToken(session.provider_token, session.provider_refresh_token ?? null);
        this.setAccount(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.clearToken();
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Launch Google OAuth in the user's default browser.
   * On Tauri: opens browser, waits for deep-link callback.
   * On web: Supabase handles the redirect automatically.
   */
  async connect(): Promise<void> {
    this.connecting.set(true);
    try {
      const redirectTo = this.tauri.isTauri()
        ? 'envello://auth-callback'
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await this.supabase.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          scopes: GoogleAuthService.SCOPES,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      // Open in system browser (Tauri) or new tab (web)
      await this.tauri.openUrl(data.url);
    } catch (e: any) {
      this.notify.add({ type: 'error', title: 'Google sign-in failed', message: e?.message ?? String(e), icon: 'error' });
      this.connecting.set(false);
    }
    // connecting stays true until handleCallback() resolves it
  }

  /**
   * Called by the deep-link / auth-callback handler with the callback URL.
   * Exchanges the PKCE code for a session and extracts the Google token.
   */
  async handleCallback(url: string): Promise<void> {
    try {
      const u = new URL(url.includes('://') ? url.replace(/^[a-z]+:\/\//, 'https://x.x/') : url);
      const code = u.searchParams.get('code');
      if (!code) return;

      const { data, error } = await this.supabase.client.auth.exchangeCodeForSession(code);
      if (error) throw error;

      if (data.session?.provider_token) {
        this.setToken(data.session.provider_token, data.session.provider_refresh_token ?? null);
        this.setAccount(data.session.user);
        this.notify.add({ type: 'success', title: 'Google connected', message: `Signed in as ${this.account()?.email}`, icon: 'check_circle' });
      }
    } catch (e: any) {
      this.notify.add({ type: 'error', title: 'Google auth failed', message: e?.message ?? String(e), icon: 'error' });
    } finally {
      this.connecting.set(false);
    }
  }

  disconnect(): void {
    this.clearToken();
    this.notify.add({ type: 'info', title: 'Google disconnected', message: 'Calendar, contacts and Gmail sync paused.', icon: 'link_off' });
  }

  /** Returns the current Google access token, or null if not connected. */
  getToken(): string | null {
    return this._token();
  }

  // ── HTTP helper ─────────────────────────────────────────────────────────────

  /**
   * Makes an authenticated GET request to a Google API endpoint.
   * Uses Tauri HTTP plugin on desktop (bypasses CORS), browser fetch on web.
   */
  async get<T>(url: string): Promise<T> {
    const token = this._token();
    if (!token) throw new Error('Google account not connected');

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    let res: Response;
    if (isTauri) {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      res = await tauriFetch(url, { method: 'GET', headers }) as unknown as Response;
    } else {
      res = await fetch(url, { headers });
    }

    if (res.status === 401) {
      this.clearToken();
      throw new Error('Google token expired — please reconnect.');
    }
    if (!res.ok) throw new Error(`Google API error ${res.status}`);
    return res.json() as Promise<T>;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async restoreFromSession(): Promise<void> {
    const { data: { session } } = await this.supabase.getSession();
    if (session?.provider_token && session.user?.app_metadata?.['provider'] === 'google') {
      this.setToken(session.provider_token, session.provider_refresh_token ?? null);
      this.setAccount(session.user);
    }
  }

  private setToken(token: string, refresh: string | null): void {
    this._token.set(token);
    this.connected.set(true);
    try {
      localStorage.setItem(STORAGE_KEY, token);
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    } catch { /* storage unavailable */ }
  }

  private clearToken(): void {
    this._token.set(null);
    this.connected.set(false);
    this.account.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch { /* storage unavailable */ }
  }

  private setAccount(user: any): void {
    if (!user) return;
    this.account.set({
      email: user.email ?? '',
      name:  user.user_metadata?.['full_name'] ?? user.email ?? '',
      avatar: user.user_metadata?.['avatar_url'] ?? undefined,
    });
  }
}
