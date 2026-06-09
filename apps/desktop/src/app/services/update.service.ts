import { Injectable, signal } from '@angular/core';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

@Injectable({ providedIn: 'root' })
export class UpdateService {
  available = signal(false);
  version = signal('');
  notes = signal('');
  downloading = signal(false);
  progress = signal(0);
  error = signal('');

  private pending: Update | null = null;

  async checkForUpdate(): Promise<void> {
    if (!isTauri()) return;
    try {
      const update = await check();
      if (update?.available) {
        this.pending = update;
        this.version.set(update.version);
        this.notes.set(update.body ?? '');
        this.available.set(true);
      }
    } catch (e: any) {
      // Silently ignore — network unavailable or no release found yet
    }
  }

  async installUpdate(): Promise<void> {
    if (!this.pending) return;
    this.downloading.set(true);
    this.progress.set(0);
    this.error.set('');

    try {
      let downloaded = 0;
      let total = 0;
      await this.pending.downloadAndInstall(event => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          this.progress.set(total ? Math.round((downloaded / total) * 100) : 0);
        }
      });
      await relaunch();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Update failed. Please try again.');
      this.downloading.set(false);
    }
  }

  dismiss(): void {
    this.available.set(false);
  }
}
