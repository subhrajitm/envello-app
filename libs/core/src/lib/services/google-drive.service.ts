import { Injectable, inject, signal } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';
import { NotificationService } from './notification.service';
import { TauriService } from './tauri.service';
import { BackupService } from './backup.service';

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
}

const BACKUP_FOLDER_NAME = 'Envello Backups';
const FOLDER_ID_KEY = 'envello-drive-backup-folder-id';
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private readonly gAuth  = inject(GoogleAuthService);
  private readonly notify = inject(NotificationService);
  private readonly tauri  = inject(TauriService);
  private readonly backup = inject(BackupService);

  readonly uploading   = signal(false);
  readonly recentFiles = signal<DriveFile[]>([]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Runs a full backup to Google Drive — builds snapshot then uploads. */
  async backupNow(): Promise<void> {
    if (this.uploading()) return;
    this.uploading.set(true);
    try {
      const folderId = await this.ensureBackupFolder();
      const result = await this.backup.backupToDrive(
        (json, filename) => this.uploadBackup(json, filename, folderId).then(f => f.id)
      );
      await this.refreshList(folderId);
      // backupToDrive already notifies success
      void result;
    } catch (e: any) {
      this.notify.add({
        type: 'error',
        title: 'Drive backup failed',
        message: e?.message ?? 'Unknown error',
        icon: 'cloud_off',
      });
    } finally {
      this.uploading.set(false);
    }
  }

  /** Loads the last N backup files from Drive into `recentFiles`. */
  async loadRecentFiles(limit = 3): Promise<void> {
    try {
      const folderId = await this.ensureBackupFolder();
      await this.refreshList(folderId, limit);
    } catch { /* no-op if not connected */ }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  async ensureBackupFolder(): Promise<string> {
    // Check cache first
    const cached = this.getCachedFolderId();
    if (cached) {
      try {
        const f = await this.gAuth.get<{ id: string; trashed: boolean }>(
          `${DRIVE_BASE}/files/${cached}?fields=id,trashed`
        );
        if (!f.trashed) return cached;
      } catch { /* stale cache — fall through to search */ }
      this.setCachedFolderId(null);
    }

    // Search for existing folder
    const q = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${BACKUP_FOLDER_NAME}' and trashed=false`
    );
    const list = await this.gAuth.get<{ files: DriveFile[] }>(
      `${DRIVE_BASE}/files?q=${q}&fields=files(id,name)&pageSize=1`
    );
    if (list.files?.length) {
      this.setCachedFolderId(list.files[0].id);
      return list.files[0].id;
    }

    // Create folder
    const created = await this.post<DriveFile>(
      `${DRIVE_BASE}/files?fields=id`,
      JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
      { 'Content-Type': 'application/json' }
    );
    this.setCachedFolderId(created.id);
    return created.id;
  }

  async uploadBackup(json: string, filename: string, folderId: string): Promise<DriveFile> {
    const token = this.gAuth.getToken();
    if (!token) throw new Error('Google account not connected');

    const boundary = `-------envello${Date.now()}`;
    const metadata = { name: filename, mimeType: 'application/json', parents: [folderId] };
    const body =
      `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      json +
      `\r\n--${boundary}--`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    };

    const res = await this.rawFetch(
      `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,size,createdTime`,
      { method: 'POST', headers, body }
    );
    if (!res.ok) throw this.mapDriveError(res, await res.json().catch(() => ({})));
    return res.json() as Promise<DriveFile>;
  }

  private async refreshList(folderId: string, limit = 3): Promise<void> {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const list = await this.gAuth.get<{ files: DriveFile[] }>(
      `${DRIVE_BASE}/files?q=${q}&orderBy=createdTime+desc&pageSize=${limit}&fields=files(id,name,size,createdTime)`
    );
    this.recentFiles.set(list.files ?? []);
  }

  private async post<T>(url: string, body: BodyInit, headers: Record<string, string> = {}): Promise<T> {
    const token = this.gAuth.getToken();
    if (!token) throw new Error('Google account not connected');
    const allHeaders = { Authorization: `Bearer ${token}`, Accept: 'application/json', ...headers };
    const res = await this.rawFetch(url, { method: 'POST', headers: allHeaders, body });
    if (res.status === 401) { this.gAuth.forceDisconnect(); throw new Error('Google session expired — please reconnect.'); }
    if (!res.ok) throw this.mapDriveError(res, await res.json().catch(() => ({})));
    return res.json() as Promise<T>;
  }

  /** Platform-aware fetch — uses Tauri HTTP plugin on desktop to bypass CORS. */
  private async rawFetch(url: string, init: RequestInit): Promise<Response> {
    if (this.tauri.isTauri()) {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      return tauriFetch(url, init as any) as unknown as Response;
    }
    return fetch(url, init);
  }

  private mapDriveError(res: Response, body: any): Error {
    const reason = body?.error?.errors?.[0]?.reason ?? '';
    if (res.status === 401) {
      return new Error('Google session expired — please reconnect.');
    }
    if (res.status === 403) {
      if (reason === 'insufficientPermissions') {
        return new Error('Missing Drive permission — please reconnect to grant Drive access.');
      }
      if (reason === 'dailyLimitExceeded' || reason === 'userRateLimitExceeded') {
        return new Error('Google Drive rate limit reached — please try again later.');
      }
    }
    if (res.status === 413 || res.status === 507) {
      return new Error('Backup too large or Google Drive storage full.');
    }
    return new Error(`Google Drive error ${res.status}: ${body?.error?.message ?? 'Unknown'}`);
  }

  private getCachedFolderId(): string | null {
    try { return localStorage.getItem(FOLDER_ID_KEY); } catch { return null; }
  }
  private setCachedFolderId(id: string | null): void {
    try {
      if (id) localStorage.setItem(FOLDER_ID_KEY, id);
      else localStorage.removeItem(FOLDER_ID_KEY);
    } catch { /* ok */ }
  }
}
