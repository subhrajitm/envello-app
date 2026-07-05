import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { APP_VERSION } from '../tokens/app-version.token';

export interface CrashReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
  platform: 'desktop' | 'web';
  appVersion: string;
  userId?: string;
}

const STORAGE_KEY = 'envello_crash_reports';
const MAX_LOCAL = 50;

/** Error types that are always noise — suppress before recording. */
const SUPPRESSED_PATTERNS = [
  'NavigatorLockAcquireTimeoutError',
  'ResizeObserver loop',
  'Non-Error promise rejection captured with keys: handled',
];

@Injectable({ providedIn: 'root' })
export class CrashReportingService {
  private readonly supabase = inject(SupabaseService);
  private readonly appVersion = inject(APP_VERSION);

  private readonly platform: 'desktop' | 'web' =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? 'desktop' : 'web';

  capture(error: unknown, userId?: string): void {
    const message = error instanceof Error ? error.message : String(error);

    if (SUPPRESSED_PATTERNS.some(p => message.includes(p))) return;

    const report: CrashReport = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      message,
      stack: error instanceof Error ? error.stack : undefined,
      url: typeof location !== 'undefined' ? location.pathname : undefined,
      platform: this.platform,
      appVersion: this.appVersion,
      userId,
    };

    this.saveLocal(report);
    this.pushToSupabase(report);
  }

  getRecent(limit = 20): CrashReport[] {
    return this.loadLocal().slice(0, limit);
  }

  clear(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  private saveLocal(report: CrashReport): void {
    try {
      const existing = this.loadLocal();
      const next = [report, ...existing].slice(0, MAX_LOCAL);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* localStorage full or unavailable */ }
  }

  private loadLocal(): CrashReport[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CrashReport[]) : [];
    } catch {
      return [];
    }
  }

  private pushToSupabase(report: CrashReport): void {
    // Fire-and-forget — never throw, never block the error handler.
    const req = this.supabase.client
      .from('crash_reports')
      .insert({
        id:          report.id,
        timestamp:   report.timestamp,
        message:     report.message,
        stack:       report.stack ?? null,
        url:         report.url ?? null,
        platform:    report.platform,
        app_version: report.appVersion,
        user_id:     report.userId ?? null,
      });

    Promise.resolve(req)
      .then(({ error }: { error: { code: string; message: string } | null }) => {
        // 42P01 = relation does not exist — table not yet created, silently skip
        if (error && error.code !== '42P01') {
          console.warn('[CrashReporting] Supabase insert failed:', error.message);
        }
      })
      .catch(() => { /* network offline — local buffer is the fallback */ });
  }
}
