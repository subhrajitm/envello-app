import { Injectable, inject, OnDestroy } from '@angular/core';
import { DataService } from '@envello/data';
import { ThemeService } from './theme.service';

export type AppPreferences = Record<string, unknown>;

const COLLECTION = 'user_preferences';
const SETTINGS_ID = 'app-settings';
const LS_KEY = 'envello-settings';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService implements OnDestroy {
  private readonly dataService = inject(DataService);
  private readonly themeService = inject(ThemeService);

  private readonly syncHandler = () => this.syncFromDb();

  constructor() {
    window.addEventListener('envello:sync-complete', this.syncHandler);
    window.addEventListener('envello:db-ready',     this.syncHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('envello:sync-complete', this.syncHandler);
    window.removeEventListener('envello:db-ready',     this.syncHandler);
  }

  /** Persist preferences to both localStorage (instant) and the synced DB. */
  async save(prefs: AppPreferences): Promise<void> {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    try {
      await this.dataService.upsert(COLLECTION, { id: SETTINGS_ID, ...prefs });
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
   * Apply a preferences object to the running app without requiring a page reload.
   * Also updates localStorage so other components (header, app.component) pick it up.
   */
  apply(prefs: AppPreferences): void {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));

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

    document.body.classList.toggle('compact-mode',   !!prefs['compactMode']);
    document.body.classList.toggle('no-animations',  prefs['animations'] === false);

    if (prefs['navigationLayout'])
      window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: prefs['navigationLayout'] }));
    if (prefs['hiddenNavItems'])
      window.dispatchEvent(new CustomEvent('navVisibilityChanged',    { detail: prefs['hiddenNavItems'] }));
    if (prefs['focusMode'] !== undefined)
      window.dispatchEvent(new CustomEvent('focusModeChanged',        { detail: prefs['focusMode'] }));
  }

  private async syncFromDb(): Promise<void> {
    const prefs = await this.loadFromDb();
    if (prefs) this.apply(prefs);
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
