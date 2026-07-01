import { Injectable, inject, OnDestroy } from '@angular/core';
import { DataService } from '@envello/data';
import { ThemeService } from './theme.service';

export type AppPreferences = Record<string, unknown>;

const COLLECTION = 'user_preferences';
const SETTINGS_ID = 'app-settings';
const LS_KEY = 'envello-settings';

/**
 * Keys that are device-local and must never be written to or applied from
 * the synced DB. Each device manages these independently via localStorage.
 *
 * - Visual/rendering prefs (theme, font sizes) vary by screen and environment.
 *   Syncing them causes a flash-of-wrong-theme when sync-complete fires after
 *   the app has already rendered with the locally-saved value.
 * - Desktop-only prefs (alwaysOnTop, minimizeToTray) are meaningless on web.
 * - Per-device notification control should not be overridden remotely.
 */
const DEVICE_LOCAL_KEYS = new Set([
  'theme',
  'fontSize',
  'editorFont',
  'editorFontSize',
  'lineHeight',
  'compactMode',
  'desktopNotifications',
  'alwaysOnTop',
  'minimizeToTray',
]);

@Injectable({ providedIn: 'root' })
export class UserPreferencesService implements OnDestroy {
  private readonly dataService = inject(DataService);
  private readonly themeService = inject(ThemeService);

  private readonly syncHandler    = () => this.syncFromDb();
  private readonly dbReadyHandler = () => this.onDbReady();

  constructor() {
    // sync-complete: fired by PowerSync, PouchDB, and desktop after restoreCollection
    window.addEventListener('envello:sync-complete', this.syncHandler);
    // db-ready: fired when the local DB is initialised — pull remote state first
    window.addEventListener('envello:db-ready',     this.dbReadyHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('envello:sync-complete', this.syncHandler);
    window.removeEventListener('envello:db-ready',     this.dbReadyHandler);
  }

  private async onDbReady(): Promise<void> {
    await this.dataService.pullFromRemote(COLLECTION).catch(() => {});
    await this.syncFromDb();
  }

  /**
   * Persist preferences to localStorage (instant) and the synced DB.
   * Device-local keys are written to localStorage only — never to the DB.
   */
  async save(prefs: AppPreferences): Promise<void> {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    const syncable = this.stripDeviceLocal(prefs);
    try {
      await this.dataService.upsert(COLLECTION, { id: SETTINGS_ID, ...syncable });
    } catch (e) {
      console.error('[UserPreferences] DB save failed', e);
    }
  }

  /** Load the canonical preferences from the synced DB. Returns null on miss. */
  async loadFromDb(): Promise<AppPreferences | null> {
    try {
      const items = await this.dataService.getAll<any>(COLLECTION);
      const found = items.find((i: any) => i.id === SETTINGS_ID);
      if (found) {
        const { id, ...prefs } = found;
        return prefs as AppPreferences;
      }
    } catch (e) {
      console.error('[UserPreferences] DB load failed', e);
    }
    return null;
  }

  /**
   * Apply a preferences object to the running app.
   *
   * When called from a DB sync event, device-local keys in the incoming payload
   * are ignored — localStorage (already applied at boot by ThemeService etc.)
   * wins. This prevents the flash-of-wrong-theme on sync-complete.
   *
   * When called with fromSync=false (explicit user action in Settings), all keys
   * including device-local ones are applied immediately.
   */
  apply(prefs: AppPreferences, fromSync = false): void {
    if (fromSync) {
      // Merge: synced prefs fill in the gaps, but device-local keys from
      // localStorage always take precedence.
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '{}') as AppPreferences;
      const merged: AppPreferences = { ...prefs };
      for (const key of DEVICE_LOCAL_KEYS) {
        if (local[key] !== undefined) merged[key] = local[key];
        else delete merged[key];
      }
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
      this.applyToDOM(merged);
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(prefs));
      this.applyToDOM(prefs);
    }
  }

  private applyToDOM(prefs: AppPreferences): void {
    if (prefs['theme'])
      this.themeService.setTheme(prefs['theme'] as any);

    if (prefs['fontSize'])
      document.documentElement.style.setProperty('--base-font-size', `${prefs['fontSize']}px`);
    if (prefs['editorFont'])
      document.documentElement.style.setProperty('--editor-font', this.fontFamily(prefs['editorFont'] as string));
    if (prefs['editorFontSize'])
      document.documentElement.style.setProperty('--editor-font-size', `${prefs['editorFontSize']}px`);
    if (prefs['lineHeight'])
      document.documentElement.style.setProperty('--editor-line-height', String(prefs['lineHeight']));

    document.body.classList.toggle('compact-mode',  !!prefs['compactMode']);
    document.body.classList.toggle('no-animations', prefs['animations'] === false);

    if (prefs['navigationLayout'])
      window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: prefs['navigationLayout'] }));
    if (prefs['hiddenNavItems'])
      window.dispatchEvent(new CustomEvent('navVisibilityChanged',    { detail: prefs['hiddenNavItems'] }));
    if (prefs['focusMode'] !== undefined)
      window.dispatchEvent(new CustomEvent('focusModeChanged',        { detail: prefs['focusMode'] }));
  }

  private async syncFromDb(): Promise<void> {
    const prefs = await this.loadFromDb();
    if (prefs) this.apply(prefs, true);
  }

  /** Remove device-local keys before writing to the synced DB. */
  private stripDeviceLocal(prefs: AppPreferences): AppPreferences {
    return Object.fromEntries(
      Object.entries(prefs).filter(([k]) => !DEVICE_LOCAL_KEYS.has(k))
    );
  }

  private fontFamily(font: string): string {
    const map: Record<string, string> = {
      serif: 'var(--font-serif)',
      sans:  'var(--font-sans)',
      mono:  'var(--font-mono)',
    };
    return map[font] ?? map['sans'];
  }
}
