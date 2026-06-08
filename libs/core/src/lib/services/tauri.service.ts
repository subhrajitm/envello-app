import { Injectable, signal, computed } from '@angular/core';

/**
 * Provides Tauri desktop APIs when running inside Tauri; no-op or fallback in browser.
 * Use isTauri() before calling native APIs.
 */
@Injectable({ providedIn: 'root' })
export class TauriService {
  private _isTauri = signal<boolean>(
    typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );

  /** True when running inside Tauri; false in browser. */
  isTauri = computed(() => this._isTauri());

  constructor() {}

  // ── App info ──────────────────────────────────────────────────────────────

  async getName(): Promise<string> {
    if (!this._isTauri()) return 'Envello';
    const { getName } = await import('@tauri-apps/api/app');
    return getName();
  }

  async getVersion(): Promise<string> {
    if (!this._isTauri()) return '';
    const { getVersion } = await import('@tauri-apps/api/app');
    return getVersion();
  }

  // ── Window ────────────────────────────────────────────────────────────────

  async setTitle(title: string): Promise<void> {
    if (!this._isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setTitle(title);
  }

  async minimize(): Promise<void> {
    if (!this._isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  }

  async showWindow(): Promise<void> {
    if (!this._isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    await win.show();
    await win.unminimize();
    await win.setFocus();
  }

  async hideWindow(): Promise<void> {
    if (!this._isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().hide();
  }

  async setAlwaysOnTop(enabled: boolean): Promise<void> {
    if (!this._isTauri()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setAlwaysOnTop(enabled);
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  async openUrl(url: string): Promise<void> {
    if (this._isTauri()) {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } else {
      window.open(url, '_blank');
    }
  }

  async openInWebview(url: string, title = 'Envello — Web Preview'): Promise<void> {
    if (!this._isTauri()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const win = new WebviewWindow(`preview-${Date.now()}`, {
        url, title, width: 1100, height: 750, center: true, resizable: true, decorations: true,
      });
      win.once('tauri://error', () => this.openUrl(url));
    } catch {
      await this.openUrl(url);
    }
  }

  // ── File system ───────────────────────────────────────────────────────────

  async saveFile(options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null> {
    if (!this._isTauri()) return null;
    const { save } = await import('@tauri-apps/plugin-dialog');
    return save(options);
  }

  async openFile(options: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }): Promise<string | string[] | null> {
    if (!this._isTauri()) return null;
    const { open } = await import('@tauri-apps/plugin-dialog');
    return open({ ...options, directory: false });
  }

  async writeTextFile(path: string, contents: string): Promise<void> {
    if (!this._isTauri()) return;
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, contents);
  }

  async readTextFile(path: string): Promise<string> {
    if (!this._isTauri()) return '';
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return readTextFile(path);
  }

  async onFileDrop(callback: (paths: string[]) => void): Promise<() => void> {
    if (!this._isTauri()) return () => {};
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<{ paths: string[] }>('tauri://file-drop', (e) => callback(e.payload.paths));
    return () => { unlisten(); };
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async notify(options: { title: string; body?: string }): Promise<void> {
    if (!this._isTauri()) return;
    const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      await sendNotification({ title: options.title, body: options.body ?? '' });
    }
  }

  // ── Clipboard ─────────────────────────────────────────────────────────────

  async readClipboard(): Promise<string> {
    if (!this._isTauri()) {
      try { return await navigator.clipboard.readText(); } catch { return ''; }
    }
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
    return readText();
  }

  async writeClipboard(text: string): Promise<void> {
    if (!this._isTauri()) {
      await navigator.clipboard.writeText(text).catch(() => {});
      return;
    }
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
  }

  // ── Global shortcuts ──────────────────────────────────────────────────────

  async registerShortcut(shortcut: string, handler: () => void): Promise<void> {
    if (!this._isTauri()) return;
    const { register } = await import('@tauri-apps/plugin-global-shortcut');
    await register(shortcut, handler);
  }

  async unregisterShortcut(shortcut: string): Promise<void> {
    if (!this._isTauri()) return;
    const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
    await unregister(shortcut);
  }

  async unregisterAllShortcuts(): Promise<void> {
    if (!this._isTauri()) return;
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    await unregisterAll();
  }

  // ── Deep links ────────────────────────────────────────────────────────────

  /** Subscribe to incoming envello:// deep-link URLs. Returns unsubscribe fn. */
  async onDeepLink(callback: (url: string) => void): Promise<() => void> {
    if (!this._isTauri()) return () => {};
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
    return onOpenUrl((urls: string[]) => urls.forEach(callback));
  }

  /** Returns the deep-link URL that launched this instance, if any. */
  async getLaunchDeepLink(): Promise<string | null> {
    if (!this._isTauri()) return null;
    const { getCurrent } = await import('@tauri-apps/plugin-deep-link');
    const urls = await getCurrent();
    return urls?.[0] ?? null;
  }

  // ── Tray events ───────────────────────────────────────────────────────────

  async onTrayNewNote(callback: () => void): Promise<() => void> {
    if (!this._isTauri()) return () => {};
    const { listen } = await import('@tauri-apps/api/event');
    return listen('tray://new-note', () => callback());
  }

  // ── Autostart ─────────────────────────────────────────────────────────────

  async isAutoStartEnabled(): Promise<boolean> {
    if (!this._isTauri()) return false;
    const { isEnabled } = await import('@tauri-apps/plugin-autostart');
    return isEnabled();
  }

  async setAutoStart(enabled: boolean): Promise<void> {
    if (!this._isTauri()) return;
    const { enable, disable } = await import('@tauri-apps/plugin-autostart');
    if (enabled) await enable(); else await disable();
  }

  // ── OS info ───────────────────────────────────────────────────────────────

  async getOsType(): Promise<string> {
    if (!this._isTauri()) return 'browser';
    const { type: osType } = await import('@tauri-apps/plugin-os');
    return osType();
  }

  async getOsArch(): Promise<string> {
    if (!this._isTauri()) return '';
    const { arch } = await import('@tauri-apps/plugin-os');
    return arch();
  }

  async getOsVersion(): Promise<string> {
    if (!this._isTauri()) return '';
    const { version: osVersion } = await import('@tauri-apps/plugin-os');
    return osVersion();
  }
}
