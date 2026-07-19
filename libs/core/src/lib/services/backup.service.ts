import { Injectable, inject, signal } from '@angular/core';
import { DataService } from '@envello/data';
import { TauriService } from './tauri.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { APP_VERSION } from '../tokens/app-version.token';
import { EXPORT_COLLECTIONS } from './data-export.service';

export interface BackupSnapshot {
  version: 2;
  exportedAt: string;
  appVersion: string;
  platform: 'web' | 'desktop';
  user: { id: string; email: string } | null;
  collections: Record<string, unknown[]>;
}

export interface BackupProgress {
  current: string;
  done: number;
  total: number;
}

export interface BackupResult {
  filename: string;
  sizeBytes: number;
  path?: string;
  driveFileId?: string;
}

const LAST_LOCAL_KEY = 'envello-last-local-backup';

/**
 * Owns the full-data snapshot lifecycle.
 *
 * Non-goals: no scheduler, no restore/import UI, no ZIP bundling.
 * Attachments under ~/Documents/envello/ are NOT included — only their DB rows.
 * On desktop, credential values are ciphertext; on web they are plaintext —
 * the UI must show a clear sensitivity warning.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly data    = inject(DataService);
  private readonly tauri   = inject(TauriService);
  private readonly notify  = inject(NotificationService);
  private readonly auth    = inject(AuthService);
  private readonly appVersion = inject(APP_VERSION);

  readonly running  = signal(false);
  readonly progress = signal<BackupProgress | null>(null);
  readonly lastLocal = signal<string | null>(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(LAST_LOCAL_KEY)
      : null
  );

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Builds a full JSON snapshot of all collections including vault. */
  async buildSnapshot(): Promise<BackupSnapshot> {
    // EXPORT_COLLECTIONS covers all standard + vault collections.
    // Vault rows (credentials, credential_transaction_links) are fetched via
    // dedicated DataService methods that handle platform-specific decryption.
    const stdCollections = EXPORT_COLLECTIONS.filter(
      c => c.id !== 'credentials' && c.id !== 'credential_transaction_links'
    );
    const total = stdCollections.length + 2; // +2 for credentials + links
    let done = 0;

    const collections: Record<string, unknown[]> = {};

    for (const col of stdCollections) {
      this.progress.set({ current: col.label, done, total });
      try {
        collections[col.id] = await this.data.getAll(col.id);
      } catch {
        collections[col.id] = [];
      }
      done++;
    }

    // Vault — use dedicated methods
    this.progress.set({ current: 'Credentials', done, total });
    try { collections['credentials'] = await this.data.getCredentials(); }
    catch { collections['credentials'] = []; }
    done++;

    this.progress.set({ current: 'Credential links', done, total });
    try { collections['credential_transaction_links'] = await this.data.getLinks(); }
    catch { collections['credential_transaction_links'] = []; }
    done++;

    this.progress.set({ current: 'Done', done, total });

    const user = this.auth.currentUser();

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      appVersion: this.appVersion ?? '',
      platform: this.tauri.isTauri() ? 'desktop' : 'web',
      user: user ? { id: user.id, email: user.email ?? '' } : null,
      collections,
    };
  }

  /** Downloads / saves a JSON backup file. Web: browser download. Desktop: save dialog. */
  async backupToFile(): Promise<BackupResult> {
    if (this.running()) throw new Error('Backup already running');
    this.running.set(true);
    this.progress.set(null);
    try {
      const snap = await this.buildSnapshot();
      const json = this.serialize(snap);
      const fname = this.filename();
      const bytes = new TextEncoder().encode(json).length;

      if (this.tauri.isTauri()) {
        const path = await this.tauri.saveFile({
          defaultPath: fname,
          filters: [{ name: 'JSON Backup', extensions: ['json'] }],
        });
        if (!path) return { filename: fname, sizeBytes: bytes }; // user cancelled
        await this.tauri.writeTextFile(path, json);
        this.recordSuccess(fname);
        return { filename: fname, sizeBytes: bytes, path };
      } else {
        this.triggerDownload(json, fname);
        this.recordSuccess(fname);
        return { filename: fname, sizeBytes: bytes };
      }
    } finally {
      this.running.set(false);
      this.progress.set(null);
    }
  }

  /** Uploads a JSON backup to Google Drive. Wired by GoogleDriveService. */
  async backupToDrive(
    uploadFn: (json: string, filename: string) => Promise<string>
  ): Promise<BackupResult> {
    if (this.running()) throw new Error('Backup already running');
    this.running.set(true);
    this.progress.set(null);
    try {
      const snap = await this.buildSnapshot();
      const json = this.serialize(snap);
      const fname = this.filename();
      const bytes = new TextEncoder().encode(json).length;
      const driveFileId = await uploadFn(json, fname);
      this.notify.add({
        type: 'success',
        title: 'Drive backup saved',
        message: fname,
        icon: 'cloud_done',
      });
      return { filename: fname, sizeBytes: bytes, driveFileId };
    } finally {
      this.running.set(false);
      this.progress.set(null);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private serialize(snap: BackupSnapshot): string {
    return JSON.stringify(snap, null, 2);
  }

  private filename(): string {
    const date = new Date().toISOString().slice(0, 10);
    return `envello-backup-${date}.json`;
  }

  private recordSuccess(filename: string): void {
    const iso = new Date().toISOString();
    try { localStorage.setItem(LAST_LOCAL_KEY, iso); } catch { /* ok */ }
    this.lastLocal.set(iso);
    this.notify.add({
      type: 'success',
      title: 'Backup saved',
      message: filename,
      icon: 'save',
    });
  }

  private triggerDownload(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
