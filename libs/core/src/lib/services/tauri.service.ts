import { Injectable, signal, computed } from '@angular/core';

/**
 * Provides Tauri desktop APIs when running inside Tauri; no-op or fallback in browser.
 * Use isTauri() before calling native APIs.
 */
@Injectable({ providedIn: 'root' })
export class TauriService {
  private _isTauri = signal<boolean | null>(null);

  /** True when running inside Tauri; false in browser; null before first check. */
  isTauri = computed(() => this._isTauri());

  constructor() {
    this.detectTauri();
  }

  private async detectTauri(): Promise<void> {
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      await getVersion();
      this._isTauri.set(true);
    } catch {
      this._isTauri.set(false);
    }
  }

  /** App name (Tauri only). */
  async getName(): Promise<string> {
    if (!this._isTauri()) return 'Envello';
    const { getName } = await import('@tauri-apps/api/app');
    return getName();
  }

  /** App version from Tauri binary (Tauri only). */
  async getVersion(): Promise<string> {
    if (!this._isTauri()) return '';
    const { getVersion } = await import('@tauri-apps/api/app');
    return getVersion();
  }

  /** Set window title (Tauri only). */
  async setTitle(title: string): Promise<void> {
    if (!this._isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    await win.setTitle(title);
  }

  /** Open URL in system default browser (Tauri only). In browser, falls back to window.open. */
  async openUrl(url: string): Promise<void> {
    if (this._isTauri()) {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } else {
      window.open(url, '_blank');
    }
  }

  /** Show native save dialog and return selected path, or null if cancelled (Tauri only). */
  async saveFile(options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null> {
    if (!this._isTauri()) return null;
    const { save } = await import('@tauri-apps/plugin-dialog');
    return save(options);
  }

  /** Show native open file dialog and return selected path(s) (Tauri only). */
  async openFile(options: {
    multiple?: boolean;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | string[] | null> {
    if (!this._isTauri()) return null;
    const { open } = await import('@tauri-apps/plugin-dialog');
    return open({ ...options, directory: false });
  }

  /** Write text to a file path (Tauri only). Path must be from save dialog or within allowed scope. */
  async writeTextFile(path: string, contents: string): Promise<void> {
    if (!this._isTauri()) return;
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, contents);
  }

  /** Read text file (Tauri only). */
  async readTextFile(path: string): Promise<string> {
    if (!this._isTauri()) return '';
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return readTextFile(path);
  }

  /** Listen for file drop on the window (Tauri only). Returns unsubscribe. */
  async onFileDrop(callback: (paths: string[]) => void): Promise<() => void> {
    if (!this._isTauri()) return () => {};
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<{ paths: string[] }>(
      'tauri://file-drop',
      (e) => callback(e.payload.paths),
    );
    return () => {
      unlisten();
    };
  }

  /** Send native desktop notification (Tauri only). */
  async notify(options: { title: string; body?: string }): Promise<void> {
    if (!this._isTauri()) return;
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification');
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      await sendNotification({
        title: options.title,
        body: options.body ?? '',
      });
    }
  }
}
