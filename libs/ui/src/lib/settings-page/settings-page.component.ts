import { Component, signal, computed, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { EnvLogoComponent } from '../logo/logo.component';
import { ThemeService, Theme, StoreService } from '@envello/core';
import { AiService, AiProvider } from '@envello/core';
import { DesktopSyncSettingsService, DesktopDataService, BACKUP_ELIGIBLE_COLLECTIONS, BookContentService, TauriService } from '@envello/core';
import { DataService } from '@envello/data';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface SettingsSection {
  id: string;
  label: string;
  description: string;
  icon: string;
}

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
}

interface AiProviderOption {
  value: AiProvider;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, EnvLogoComponent, ConfirmDialogComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent implements OnInit {
  private themeService = inject(ThemeService);
  private storeService = inject(StoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  aiService = inject(AiService);

  activeSection = signal('general');
  resetConfirm = signal(false);
  clearDataConfirm = signal(false);

  currentTheme = signal<Theme>('dark');
  fontSize = signal(14);
  compactMode = signal(false);
  animations = signal(true);
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>('minimized');
  editorFont = signal('sans');
  editorFontSize = signal(16);
  lineHeight = signal(1.8);
  autoSave = signal(true);
  spellCheck = signal(true);
  focusMode = signal(false);
  desktopNotifications = signal(false);
  soundEffects = signal(true);
  dailySummary = signal(false);
  analytics = signal(true);
  versionHistoryLimit = signal(50);

  readonly syncSettings = inject(DesktopSyncSettingsService);
  private readonly dataService = inject(DataService);
  private readonly bookContent = inject(BookContentService);
  private readonly tauri = inject(TauriService);
  readonly backupCollections = BACKUP_ELIGIBLE_COLLECTIONS;
  readonly isDesktop = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  restoreStatus = signal<Record<string, 'idle' | 'restoring' | 'done' | 'error'>>({});

  async restoreCollection(id: string): Promise<void> {
    this.restoreStatus.update(s => ({ ...s, [id]: 'restoring' }));
    try {
      if (id === 'book_content') {
        await this.bookContent.restoreFromBackup();
      } else if (this.dataService instanceof DesktopDataService) {
        await this.dataService.restoreCollection(id);
      }
      this.restoreStatus.update(s => ({ ...s, [id]: 'done' }));
    } catch {
      this.restoreStatus.update(s => ({ ...s, [id]: 'error' }));
    }
  }

  aiProvider = signal<AiProvider>('mock');
  aiModel = signal('');
  aiKey = signal('');
  showApiKey = signal(false);
  testStatus = signal<'idle' | 'testing' | 'success' | 'error'>('idle');
  testMessage = signal('');

  activeLabel = computed(() => this.sections.find(s => s.id === this.activeSection())?.label ?? 'Settings');

  sections: SettingsSection[] = [
    { id: 'general',       label: 'General',          description: 'Navigation, layout and accessibility',  icon: 'tune' },
    { id: 'sections',      label: 'Sections',          description: 'Show or hide navigation sections',      icon: 'grid_view' },
    { id: 'appearance',    label: 'Appearance',        description: 'Colors, themes and fonts',              icon: 'palette' },
    { id: 'editor',        label: 'Editor',            description: 'Writing experience and tools',          icon: 'edit_note' },
    { id: 'ai',            label: 'AI & Integrations', description: 'Configure AI providers and API keys',   icon: 'smart_toy' },
    { id: 'notifications', label: 'Notifications',     description: 'Alerts and reminders',                  icon: 'notifications' },
    { id: 'data',          label: 'Data & Sync',       description: 'Backup, storage and sync options',      icon: 'sync' },
    { id: 'about',         label: 'About',             description: 'Version and system information',        icon: 'info' }
  ];

  readonly allNavItemDefs = [
    { id: 'tasks',         label: 'Tasks',         icon: 'checklist',    desktopOnly: false },
    { id: 'meetings',      label: 'Meetings',       icon: 'calendar_month', desktopOnly: false },
    { id: 'daily-notes',   label: 'Notes',          icon: 'note',         desktopOnly: false },
    { id: 'knowledge',     label: 'Knowledge',      icon: 'hub',          desktopOnly: false },
    { id: 'write',         label: 'Write',          icon: 'edit',         desktopOnly: false },
    { id: 'vault',         label: 'Vault',          icon: 'lock',         desktopOnly: true  },
    { id: 'subscriptions', label: 'Subscriptions',  icon: 'credit_card',  desktopOnly: false },
    { id: 'bookmarks',     label: 'Bookmarks',      icon: 'bookmarks',    desktopOnly: false },
  ];

  hiddenNavItems = signal<string[]>([]);

  isNavItemHidden(id: string): boolean {
    return this.hiddenNavItems().includes(id);
  }

  toggleNavItemVisibility(id: string) {
    const current = this.hiddenNavItems();
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    const visibleCount = this.allNavItemDefs.filter(item => {
      if (item.desktopOnly && !this.isDesktop) return false;
      return !next.includes(item.id);
    }).length;
    if (visibleCount === 0) return;
    this.hiddenNavItems.set(next);
    window.dispatchEvent(new CustomEvent('navVisibilityChanged', { detail: next }));
  }

  themes: ThemeOption[] = [
    { value: 'dark',             label: 'Midnight',   icon: 'nights_stay' },
    { value: 'enterprise-dark',  label: 'Pro Dark',   icon: 'dark_mode' },
    { value: 'enterprise-light', label: 'Pro Light',  icon: 'wb_sunny' },
    { value: 'light',            label: 'Paper',      icon: 'light_mode' },
    { value: 'colorful',         label: 'Colorful',   icon: 'palette' },
    { value: 'typewriter',       label: 'Typewriter', icon: 'article' }
  ];

  aiProviders: AiProviderOption[] = [
    { value: 'mock',      label: 'Demo Mode',          icon: 'science' },
    { value: 'local',     label: 'On-Device AI',       icon: 'memory' },
    { value: 'openai',    label: 'OpenAI (GPT)',        icon: 'psychology' },
    { value: 'anthropic', label: 'Anthropic (Claude)', icon: 'smart_toy' },
    { value: 'gemini',    label: 'Google (Gemini)',     icon: 'auto_awesome' },
    { value: 'grok',      label: 'xAI (Grok)',          icon: 'bolt' },
    { value: 'deepseek',  label: 'DeepSeek',            icon: 'water' },
    { value: 'ollama',    label: 'Ollama (Local)',       icon: 'terminal' },
  ];

  constructor() {
    this.currentTheme.set(this.themeService.theme());
    this.loadSettings();
    this.aiProvider.set(this.aiService.provider());
    this.aiModel.set(this.aiService.modelName());
    this.aiKey.set(this.aiService.apiKey());
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');
      if (section && this.sections.some(s => s.id === section)) {
        this.activeSection.set(section);
      }
    });
  }

  @HostListener('document:keydown.escape')
  goBack() {
    this.location.back();
  }

  setActiveSection(sectionId: string) {
    this.activeSection.set(sectionId);
    this.router.navigate([], { queryParams: { section: sectionId }, replaceUrl: true });
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    this.themeService.setTheme(theme);
  }

  setFontSize(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.fontSize.set(value);
    document.documentElement.style.setProperty('--base-font-size', `${value}px`);
  }

  toggleCompactMode() {
    this.compactMode.set(!this.compactMode());
    document.body.classList.toggle('compact-mode', this.compactMode());
  }

  toggleAnimations() {
    this.animations.set(!this.animations());
    document.body.classList.toggle('no-animations', !this.animations());
  }

  setNavigationLayout(layout: 'vertical' | 'horizontal' | 'minimized') {
    this.navigationLayout.set(layout);
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: layout }));
  }

  setEditorFont(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.editorFont.set(value);
    document.documentElement.style.setProperty('--editor-font', this.getFontFamily(value));
  }

  setEditorFontSize(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.editorFontSize.set(value);
    document.documentElement.style.setProperty('--editor-font-size', `${value}px`);
  }

  setLineHeight(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.lineHeight.set(value);
    document.documentElement.style.setProperty('--editor-line-height', value.toString());
  }

  toggleAutoSave() { this.autoSave.set(!this.autoSave()); }

  toggleSpellCheck() {
    this.spellCheck.set(!this.spellCheck());
    document.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el => {
      el.setAttribute('spellcheck', this.spellCheck() ? 'true' : 'false');
    });
  }

  toggleFocusMode() {
    this.focusMode.set(!this.focusMode());
    window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: this.focusMode() }));
  }

  toggleDesktopNotifications() {
    this.desktopNotifications.set(!this.desktopNotifications());
    if (this.desktopNotifications() && 'Notification' in window) {
      Notification.requestPermission();
    }
  }

  toggleSoundEffects() { this.soundEffects.set(!this.soundEffects()); }
  toggleDailySummary() { this.dailySummary.set(!this.dailySummary()); }
  toggleAnalytics() { this.analytics.set(!this.analytics()); }

  async testConnection() {
    this.testStatus.set('testing');
    this.testMessage.set('');
    try {
      await this.aiService.testConfig(this.aiProvider(), this.aiModel(), this.aiKey());
      this.testStatus.set('success');
      if (this.aiProvider() === 'local') {
        const status = this.aiService.localModelStatus();
        this.testMessage.set(status === 'ready' ? 'Model ready!' : 'Downloading… check progress above.');
      } else {
        this.testMessage.set('Connection successful!');
      }
    } catch (e: any) {
      this.testStatus.set('error');
      this.testMessage.set(e?.message ?? 'Connection failed. Check your key and model.');
    }
  }

  getApiKeyPlaceholder(): string {
    switch (this.aiProvider()) {
      case 'openai':    return 'sk-...';
      case 'anthropic': return 'sk-ant-...';
      case 'gemini':    return 'AIza...';
      case 'grok':      return 'xai-...';
      case 'deepseek':  return 'sk-...';
      default:          return 'Enter API key';
    }
  }

  setAiProvider(provider: AiProvider) {
    this.testStatus.set('idle');
    this.testMessage.set('');
    this.aiProvider.set(provider);
    if (provider === 'openai')    this.aiModel.set('gpt-4o');
    else if (provider === 'anthropic') this.aiModel.set('claude-sonnet-4-6');
    else if (provider === 'gemini')    this.aiModel.set('gemini-2.5-flash');
    else if (provider === 'grok')      this.aiModel.set('grok-3');
    else if (provider === 'deepseek')  this.aiModel.set('deepseek-chat');
    else if (provider === 'ollama')    this.aiModel.set('llama3');
    else if (provider === 'local')     this.aiModel.set('HuggingFaceTB/SmolLM2-360M-Instruct');
    else this.aiModel.set('');
  }

  setVersionHistoryLimit(event: Event) {
    this.versionHistoryLimit.set(parseInt((event.target as HTMLInputElement).value));
  }

  saveSettings() {
    const settings = {
      theme: this.currentTheme(),
      fontSize: this.fontSize(),
      compactMode: this.compactMode(),
      animations: this.animations(),
      navigationLayout: this.navigationLayout(),
      editorFont: this.editorFont(),
      editorFontSize: this.editorFontSize(),
      lineHeight: this.lineHeight(),
      autoSave: this.autoSave(),
      spellCheck: this.spellCheck(),
      focusMode: this.focusMode(),
      desktopNotifications: this.desktopNotifications(),
      soundEffects: this.soundEffects(),
      dailySummary: this.dailySummary(),
      analytics: this.analytics(),
      versionHistoryLimit: this.versionHistoryLimit(),
      hiddenNavItems: this.hiddenNavItems(),
    };
    localStorage.setItem('envello-settings', JSON.stringify(settings));
    this.aiService.updateConfig(this.aiProvider(), this.aiModel(), this.aiKey());
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: this.navigationLayout() }));
    this.goBack();
  }

  exportAllData() {
    const data = {
      exportedAt: new Date().toISOString(),
      tasks: this.storeService.tasks(),
      notes: this.storeService.notes(),
      books: this.storeService.books(),
      bookmarks: this.storeService.bookmarks(),
      bookmarkFolders: this.storeService.bookmarkFolders(),
      planningItems: this.storeService.planningItems(),
      spaces: this.storeService.spaces(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `envello-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearAllData() { this.clearDataConfirm.set(true); }

  async doClearAllData() {
    this.clearDataConfirm.set(false);
    localStorage.removeItem('envello-settings');
    localStorage.removeItem('theme');
    this.storeService.tasks.set([]);
    this.storeService.notes.set([]);
    this.storeService.books.set([]);
    this.storeService.bookmarks.set([]);
    this.storeService.bookmarkFolders.set([]);
    this.storeService.planningItems.set([]);
    this.storeService.spaces.set([]);
    this.goBack();
  }

  resetToDefaults() { this.resetConfirm.set(true); }

  doResetToDefaults() {
    this.resetConfirm.set(false);
    this.currentTheme.set('light');
    this.fontSize.set(14);
    this.compactMode.set(false);
    this.animations.set(true);
    this.navigationLayout.set('minimized');
    this.editorFont.set('sans');
    this.editorFontSize.set(16);
    this.lineHeight.set(1.8);
    this.autoSave.set(true);
    this.spellCheck.set(true);
    this.focusMode.set(false);
    this.desktopNotifications.set(false);
    this.soundEffects.set(true);
    this.dailySummary.set(false);
    this.analytics.set(true);
    this.aiProvider.set('mock');
    this.aiModel.set('');
    this.aiKey.set('');
    this.hiddenNavItems.set([]);
    window.dispatchEvent(new CustomEvent('navVisibilityChanged', { detail: [] }));
    this.aiService.updateConfig('mock', '', '');
    this.themeService.theme.set('light');
    localStorage.removeItem('envello-settings');
    localStorage.setItem('theme', 'light');
    document.documentElement.style.removeProperty('--base-font-size');
    document.documentElement.style.removeProperty('--editor-font');
    document.documentElement.style.removeProperty('--editor-font-size');
    document.documentElement.style.removeProperty('--editor-line-height');
    document.body.classList.remove('compact-mode', 'no-animations');
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: 'minimized' }));
  }

  checkUpdates() { this.tauri.openUrl('https://github.com/envello-app/envello/releases'); }
  openDocs() { this.tauri.openUrl('https://github.com/envello-app/envello/wiki'); }
  reportIssue() { this.tauri.openUrl('https://github.com/envello-app/envello/issues/new'); }

  private loadSettings() {
    const saved = localStorage.getItem('envello-settings');
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      this.fontSize.set(s.fontSize || 14);
      this.compactMode.set(s.compactMode || false);
      this.animations.set(s.animations !== false);
      this.navigationLayout.set(s.navigationLayout || 'minimized');
      this.editorFont.set(s.editorFont || 'sans');
      this.editorFontSize.set(s.editorFontSize || 16);
      this.lineHeight.set(s.lineHeight || 1.8);
      this.autoSave.set(s.autoSave !== false);
      this.spellCheck.set(s.spellCheck !== false);
      this.focusMode.set(s.focusMode || false);
      this.desktopNotifications.set(s.desktopNotifications || false);
      this.soundEffects.set(s.soundEffects !== false);
      this.dailySummary.set(s.dailySummary || false);
      this.analytics.set(s.analytics !== false);
      this.versionHistoryLimit.set(s.versionHistoryLimit || 50);
      this.hiddenNavItems.set(s.hiddenNavItems ?? []);
      if (s.fontSize)     document.documentElement.style.setProperty('--base-font-size', `${s.fontSize}px`);
      if (s.editorFont)   document.documentElement.style.setProperty('--editor-font', this.getFontFamily(s.editorFont));
      if (s.editorFontSize) document.documentElement.style.setProperty('--editor-font-size', `${s.editorFontSize}px`);
      if (s.lineHeight)   document.documentElement.style.setProperty('--editor-line-height', s.lineHeight.toString());
      if (!s.spellCheck)  document.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el => el.setAttribute('spellcheck', 'false'));
      if (s.compactMode)  document.body.classList.add('compact-mode');
      if (s.animations === false) document.body.classList.add('no-animations');
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  private getFontFamily(font: string): string {
    const fonts: Record<string, string> = {
      serif: 'var(--font-serif)',
      sans:  'var(--font-sans)',
      mono:  'var(--font-mono)'
    };
    return fonts[font] || fonts['sans'];
  }
}
