import { Component, signal, computed, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { EnvLogoComponent } from '../logo/logo.component';
import { ThemeService, Theme, StoreService, UserPreferencesService } from '@envello/core';
import { AiService, AiProvider, AiFeature, AiFeatureConfig } from '@envello/core';
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
  private userPrefsService = inject(UserPreferencesService);
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

  hiddenNavItems = signal<{ web: string[]; desktop: string[] }>({ web: [], desktop: [] });

  isNavItemHidden(id: string, platform: 'web' | 'desktop'): boolean {
    return this.hiddenNavItems()[platform].includes(id);
  }

  toggleNavItemVisibility(id: string, platform: 'web' | 'desktop') {
    const current = this.hiddenNavItems();
    const list = current[platform];
    const nextList = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
    const visibleCount = this.allNavItemDefs.filter(item => {
      if (item.desktopOnly && platform === 'web') return false;
      return !nextList.includes(item.id);
    }).length;
    if (visibleCount === 0) return;
    const next = { ...current, [platform]: nextList };
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

  readonly aiFeatureDefs: { id: AiFeature; label: string; icon: string; hint: string }[] = [
    { id: 'writing',   label: 'Writing',     icon: 'edit',           hint: 'Editor assist, improve, expand' },
    { id: 'research',  label: 'Research',    icon: 'travel_explore', hint: 'Web research & sourcing' },
    { id: 'summarize', label: 'Summarize',   icon: 'summarize',      hint: 'Article & content summaries' },
    { id: 'chat',      label: 'Chat',        icon: 'chat',           hint: 'General AI assistant' },
  ];

  extraProvidersNeeded = computed<AiProvider[]>(() => {
    const global = this.aiProvider();
    const seen = new Set<AiProvider>();
    for (const fc of Object.values(this.aiService.featureConfigs())) {
      if (fc && fc.provider !== global && fc.provider !== 'mock' && fc.provider !== 'local' && fc.provider !== 'ollama') {
        seen.add(fc.provider);
      }
    }
    return [...seen];
  });

  getFeatureProvider(feature: AiFeature): string {
    return this.aiService.featureConfigs()[feature]?.provider ?? '';
  }

  getFeatureModel(feature: AiFeature): string {
    return this.aiService.featureConfigs()[feature]?.model ?? '';
  }

  setFeatureProvider(feature: AiFeature, provider: string) {
    if (!provider) {
      this.aiService.updateFeatureConfig(feature, null);
      return;
    }
    const p = provider as AiProvider;
    const model = this.getDefaultModelForProvider(p);
    this.aiService.updateFeatureConfig(feature, { provider: p, model });
  }

  setFeatureModel(feature: AiFeature, model: string) {
    const existing = this.aiService.featureConfigs()[feature];
    if (existing) this.aiService.updateFeatureConfig(feature, { ...existing, model });
  }

  getDefaultModelForProvider(provider: AiProvider): string {
    switch (provider) {
      case 'openai':    return 'gpt-4o';
      case 'anthropic': return 'claude-sonnet-4-6';
      case 'gemini':    return 'gemini-2.5-flash';
      case 'grok':      return 'grok-3';
      case 'deepseek':  return 'deepseek-chat';
      case 'ollama':    return 'llama3';
      case 'local':     return 'HuggingFaceTB/SmolLM2-360M-Instruct';
      default:          return '';
    }
  }

  getModelsForProvider(provider: AiProvider): { value: string; label: string }[] {
    switch (provider) {
      case 'openai':    return [
        { value: 'gpt-4o',      label: 'gpt-4o' },
        { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Faster)' },
        { value: 'o1-mini',     label: 'o1-mini (Reasoning)' },
      ];
      case 'anthropic': return [
        { value: 'claude-opus-4-6',          label: 'claude-opus-4-6 (Powerful)' },
        { value: 'claude-sonnet-4-6',         label: 'claude-sonnet-4-6' },
        { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5 (Fastest)' },
      ];
      case 'gemini': return [
        { value: 'gemini-2.5-pro',   label: 'gemini-2.5-pro' },
        { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
      ];
      case 'grok': return [
        { value: 'grok-3',      label: 'grok-3' },
        { value: 'grok-3-mini', label: 'grok-3-mini (Faster)' },
      ];
      case 'deepseek': return [
        { value: 'deepseek-chat',     label: 'deepseek-chat' },
        { value: 'deepseek-reasoner', label: 'deepseek-reasoner (R1)' },
      ];
      case 'ollama': return [
        { value: 'llama3',   label: 'llama3' },
        { value: 'mistral',  label: 'mistral' },
        { value: 'gemma3',   label: 'gemma3' },
      ];
      case 'local': return [
        { value: 'HuggingFaceTB/SmolLM2-360M-Instruct', label: 'SmolLM2 360M' },
        { value: 'HuggingFaceTB/SmolLM2-135M-Instruct', label: 'SmolLM2 135M (Fastest)' },
      ];
      default: return [];
    }
  }

  getProviderLabel(provider: AiProvider): string {
    return this.aiProviders.find(p => p.value === provider)?.label ?? provider;
  }

  getApiKeyPlaceholderFor(provider: AiProvider): string {
    switch (provider) {
      case 'openai':    return 'sk-...';
      case 'anthropic': return 'sk-ant-...';
      case 'gemini':    return 'AIza...';
      case 'grok':      return 'xai-...';
      case 'deepseek':  return 'sk-...';
      default:          return 'Enter API key';
    }
  }

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

    // Refresh signals from DB (catches settings synced from another device)
    this.userPrefsService.loadFromDb().then(prefs => {
      if (prefs) this.applyToSignals(prefs);
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
    // Persist immediately so sync-complete events don't revert the preview
    const stored = JSON.parse(localStorage.getItem('envello-settings') || '{}');
    this.userPrefsService.save({ ...stored, theme });
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

  async saveSettings() {
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
    await this.userPrefsService.save(settings);
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
    const emptyVisibility = { web: [], desktop: [] };
    this.hiddenNavItems.set(emptyVisibility);
    window.dispatchEvent(new CustomEvent('navVisibilityChanged', { detail: emptyVisibility }));
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
      this.applyToSignals(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  private applyToSignals(s: Record<string, any>) {
    if (s['theme'])              this.currentTheme.set(s['theme']);
    if (s['fontSize'])           this.fontSize.set(s['fontSize']);
    if (s['compactMode'] !== undefined) this.compactMode.set(s['compactMode']);
    if (s['animations'] !== undefined)  this.animations.set(s['animations'] !== false);
    if (s['navigationLayout'])   this.navigationLayout.set(s['navigationLayout']);
    if (s['editorFont'])         this.editorFont.set(s['editorFont']);
    if (s['editorFontSize'])     this.editorFontSize.set(s['editorFontSize']);
    if (s['lineHeight'])         this.lineHeight.set(s['lineHeight']);
    if (s['autoSave'] !== undefined)    this.autoSave.set(s['autoSave'] !== false);
    if (s['spellCheck'] !== undefined)  this.spellCheck.set(s['spellCheck'] !== false);
    if (s['focusMode'] !== undefined)   this.focusMode.set(s['focusMode']);
    if (s['desktopNotifications'] !== undefined) this.desktopNotifications.set(s['desktopNotifications']);
    if (s['soundEffects'] !== undefined) this.soundEffects.set(s['soundEffects'] !== false);
    if (s['dailySummary'] !== undefined) this.dailySummary.set(s['dailySummary']);
    if (s['analytics'] !== undefined)    this.analytics.set(s['analytics'] !== false);
    if (s['versionHistoryLimit'])        this.versionHistoryLimit.set(s['versionHistoryLimit']);
    const hn = s['hiddenNavItems'];
    if (hn && !Array.isArray(hn)) {
      this.hiddenNavItems.set({ web: hn.web ?? [], desktop: hn.desktop ?? [] });
    }
    // Apply DOM effects
    if (s['fontSize'])       document.documentElement.style.setProperty('--base-font-size', `${s['fontSize']}px`);
    if (s['editorFont'])     document.documentElement.style.setProperty('--editor-font', this.getFontFamily(s['editorFont']));
    if (s['editorFontSize']) document.documentElement.style.setProperty('--editor-font-size', `${s['editorFontSize']}px`);
    if (s['lineHeight'])     document.documentElement.style.setProperty('--editor-line-height', String(s['lineHeight']));
    if (!s['spellCheck'])    document.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el => el.setAttribute('spellcheck', 'false'));
    document.body.classList.toggle('compact-mode',  !!s['compactMode']);
    document.body.classList.toggle('no-animations', s['animations'] === false);
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
