import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'session_revoke_others'
  | 'session_revoke_all'
  | 'key_saved'
  | 'key_removed';

export interface ActivityEntry {
  id: string;
  action: ActivityAction;
  details?: string;
  device?: string;
  timestamp: string;
}

const STORAGE_KEY = 'envello-activity-log';
const MAX_ENTRIES = 100;

@Injectable({ providedIn: 'root' })
export class UserActivityLogService {
  private readonly sb = inject(SupabaseService);
  /** Set to true once we confirm the remote table doesn't exist, to avoid repeated 404s. */
  private remoteUnavailable = false;

  log(action: ActivityAction, details?: string): void {
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      action,
      details,
      device: this.deviceLabel(),
      timestamp: new Date().toISOString(),
    };
    const entries = this.loadLocal();
    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(MAX_ENTRIES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
    this.persistToSupabase(entry);
  }

  loadRecent(limit = 50): ActivityEntry[] {
    return this.loadLocal().slice(0, limit);
  }

  private loadLocal(): ActivityEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ActivityEntry[];
    } catch {}
    return [];
  }

  private async persistToSupabase(entry: ActivityEntry): Promise<void> {
    if (this.remoteUnavailable) return;
    try {
      const { data: { user } } = await this.sb.client.auth.getUser();
      if (!user) return;
      const { error } = await this.sb.client.from('user_activity_log').insert({
        user_id: user.id,
        action: entry.action,
        details: entry.details ?? null,
        device: entry.device ?? null,
        created_at: entry.timestamp,
      });
      // 42P01 = relation does not exist (table missing); treat any 404/table error as permanent
      if (error && (error.code === '42P01' || (error as any).status === 404)) {
        this.remoteUnavailable = true;
      }
    } catch {}
  }

  private deviceLabel(): string {
    if (typeof navigator === 'undefined') return 'Unknown device';
    const ua = navigator.userAgent;
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) return 'Desktop app';
    if (ua.includes('Macintosh')) return 'Mac browser';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows browser';
    if (ua.includes('Linux')) return 'Linux browser';
    return 'Unknown device';
  }
}
