import { Component, signal, computed, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { EnvLogoComponent } from '../logo/logo.component';
import { ThemeService, Theme, StoreService, UserPreferencesService, APP_VERSION } from '@envello/core';
import { AiService, AiProvider, AiFeature } from '@envello/core';
import { SmartMonitorService, MONITOR_RULES, MonitorRuleId } from '@envello/core';
import { GoogleAuthService, GoogleCalendarService, GoogleContactsService, GoogleGmailService } from '@envello/core';
import { Task } from '@envello/domain';
import { DesktopSyncSettingsService, DesktopDataService, BACKUP_ELIGIBLE_COLLECTIONS, BookContentService, TauriService, SyncService } from '@envello/core';
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
  readonly appVersion = inject(APP_VERSION);
  aiService     = inject(AiService);
  monitorService   = inject(SmartMonitorService);
  googleAuth       = inject(GoogleAuthService);
  googleCalendar   = inject(GoogleCalendarService);
  googleContacts   = inject(GoogleContactsService);
  googleGmail      = inject(GoogleGmailService);
  readonly monitorRules = MONITOR_RULES;

  /** All tasks auto-created by Smart Monitor, newest first. */
  readonly monitorHistory = computed(() =>
    this.storeService.tasks()
      .filter((t: Task) => t.labels?.includes('⚡ monitor'))
      .sort((a: Task, b: Task) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  );

  /** Returns the first label that is not the monitor marker, or '—'. */
  monitorTaskRule(task: Task): string {
    return task.labels?.find(l => l !== '⚡ monitor') ?? '—';
  }

  // Navigation / dialog state
  activeSection = signal('general');
  resetConfirm = signal(false);
  clearDataConfirm = signal(false);
  unsavedConfirm = signal(false);

  // Dirty tracking & feedback
  isDirty = signal(false);
  lastSectionError = signal<'web' | 'desktop' | null>(null);
  saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  exportDone = signal(false);

  // Settings signals
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
  // Desktop-only window settings
  launchAtLogin = signal(false);
  alwaysOnTop = signal(false);
  minimizeToTray = signal(false);
  // OS info (populated async on desktop)
  osType = signal('');
  osArch = signal('');

  readonly syncSettings = inject(DesktopSyncSettingsService);
  private readonly dataService = inject(DataService);
  private readonly bookContent = inject(BookContentService);
  private readonly tauri = inject(TauriService);
  readonly syncService = inject(SyncService);
  readonly backupCollections = BACKUP_ELIGIBLE_COLLECTIONS;
  readonly isDesktop = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  restoreStatus = signal<Record<string, 'idle' | 'restoring' | 'done' | 'error'>>({});

  formatSyncTime(iso: string | null): string {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

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

  // AI signals
  aiProvider = signal<AiProvider>('mock');
  aiModel = signal('');
  aiKey = signal('');
  showApiKey = signal(false);
  testStatus = signal<'idle' | 'testing' | 'success' | 'error'>('idle');
  testMessage = signal('');

  /** Feature overrides whose provider has no API key configured — shown as warnings. */
  featureOverridesWithMissingKey = computed<AiFeature[]>(() => {
    const configs = this.aiService.featureConfigs();
    const globalProvider = this.aiProvider();
    const globalKey = this.aiKey();
    const extraKeys = this.aiService.extraProviderKeys();
    return this.aiFeatureDefs
      .filter(feat => {
        const cfg = configs[feat.id];
        if (!cfg) return false;
        const p = cfg.provider;
        if (p === 'mock' || p === 'local' || p === 'ollama') return false;
        return p === globalProvider ? !globalKey : !extraKeys[p];
      })
      .map(f => f.id);
  });

  activeLabel = computed(() => this.sections.find(s => s.id === this.activeSection())?.label ?? 'Settings');

  sections: SettingsSection[] = [
    { id: 'general',       label: 'General',          description: 'Navigation, layout and accessibility',  icon: 'tune' },
    { id: 'sections',      label: 'Sections',          description: 'Show or hide navigation sections',      icon: 'grid_view' },
    { id: 'appearance',    label: 'Appearance',        description: 'Colors, themes and fonts',              icon: 'palette' },
    { id: 'editor',        label: 'Editor',            description: 'Writing experience and tools',          icon: 'edit_note' },
    { id: 'connected',     label: 'Connected Accounts', description: 'Google, calendar, contacts and Gmail', icon: 'link' },
    { id: 'ai',            label: 'AI & Integrations', description: 'Configure AI providers and API keys',   icon: 'smart_toy' },
    { id: 'monitor',       label: 'Smart Monitor',     description: 'Auto-create tasks from your data 24/7', icon: 'bolt' },
    { id: 'notifications', label: 'Notifications',     description: 'Alerts and reminders',                  icon: 'notifications' },
    { id: 'data',          label: 'Data & Sync',       description: 'Backup, storage and sync options',      icon: 'sync' },
    { id: 'about',         label: 'About',             description: 'Version and system information',        icon: 'info' }
  ];

  readonly allNavItemDefs = [
    { id: 'tasks',         label: 'Tasks',         icon: 'checklist',      desktopOnly: false },
    { id: 'meetings',      label: 'Meetings',       icon: 'calendar_month', desktopOnly: false },
    { id: 'daily-notes',   label: 'Notes',          icon: 'note',           desktopOnly: false },
    { id: 'knowledge',     label: 'Knowledge',      icon: 'hub',            desktopOnly: false },
    { id: 'write',         label: 'Write',          icon: 'edit',           desktopOnly: false },
    { id: 'vault',         label: 'Vault',          icon: 'lock',           desktopOnly: true  },
    { id: 'transactions',  label: 'Transactions',   icon: 'receipt_long',   desktopOnly: false },
    { id: 'bookmarks',     label: 'Bookmarks',      icon: 'bookmarks',      desktopOnly: false },
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
    if (visibleCount === 0) {
      this.lastSectionError.set(platform);
      setTimeout(() => this.lastSectionError.set(null), 2500);
      return;
    }
    this.lastSectionError.set(null);
    this.isDirty.set(true);
    const next = { ...current, [platform]: nextList };
    this.hiddenNavItems.set(next);
    window.dispatchEvent(new CustomEvent('navVisibilityChanged', { detail: next }));
  }

  themes: ThemeOption[] = [
    { value: 'dark',            label: 'Midnight',   icon: 'nights_stay' },
    { value: 'enterprise-dark', label: 'Pro Dark',   icon: 'dark_mode' },
    { value: 'light',           label: 'Paper',      icon: 'light_mode' },
    { value: 'typewriter',      label: 'Typewriter', icon: 'article' }
  ];

  aiProviders: AiProviderOption[] = [
    { value: 'mock',      label: 'Demo Mode',           icon: 'science' },
    { value: 'local',     label: 'On-Device AI',        icon: 'memory' },
    { value: 'openai',    label: 'OpenAI (GPT)',         icon: 'psychology' },
    { value: 'anthropic', label: 'Anthropic (Claude)',  icon: 'smart_toy' },
    { value: 'gemini',    label: 'Google (Gemini)',      icon: 'auto_awesome' },
    { value: 'grok',      label: 'xAI (Grok)',           icon: 'bolt' },
    { value: 'deepseek',  label: 'DeepSeek',             icon: 'water' },
    { value: 'ollama',    label: 'Ollama (Local)',        icon: 'terminal' },
  ];

  readonly aiFeatureDefs: { id: AiFeature; label: string; icon: string; hint: string }[] = [
    { id: 'writing',   label: 'Writing',   icon: 'edit',           hint: 'Editor assist, improve, expand' },
    { id: 'research',  label: 'Research',  icon: 'travel_explore', hint: 'Web research & sourcing' },
    { id: 'summarize', label: 'Summarize', icon: 'summarize',      hint: 'Article & content summaries' },
    { id: 'chat',      label: 'Chat',      icon: 'chat',           hint: 'General AI assistant' },
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
    } else {
      const p = provider as AiProvider;
      this.aiService.updateFeatureConfig(feature, { provider: p, model: this.getDefaultModelForProvider(p) });
    }
    this.isDirty.set(true);
  }

  setFeatureModel(feature: AiFeature, model: string) {
    const existing = this.aiService.featureConfigs()[feature];
    if (existing) {
      this.aiService.updateFeatureConfig(feature, { ...existing, model });
      this.isDirty.set(true);
    }
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
      case 'openai': return [
        { value: 'gpt-4o',       label: 'gpt-4o (Recommended)' },
        { value: 'gpt-4o-mini',  label: 'gpt-4o-mini (Faster & Cheaper)' },
        { value: 'o1-preview',   label: 'o1-preview (Advanced Reasoning)' },
        { value: 'o1-mini',      label: 'o1-mini (Reasoning, Fast)' },
      ];
      case 'anthropic': return [
        { value: 'claude-opus-4-6',           label: 'claude-opus-4-6 (Most Capable)' },
        { value: 'claude-sonnet-4-6',          label: 'claude-sonnet-4-6 (Recommended)' },
        { value: 'claude-haiku-4-5-20251001',  label: 'claude-haiku-4-5 (Fastest)' },
      ];
      case 'gemini': return [
        { value: 'gemini-2.5-pro',   label: 'gemini-2.5-pro (Most Capable)' },
        { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Recommended)' },
        { value: 'gemini-1.5-pro',   label: 'gemini-1.5-pro (Stable)' },
      ];
      case 'grok': return [
        { value: 'grok-3',      label: 'grok-3 (Latest)' },
        { value: 'grok-3-mini', label: 'grok-3-mini (Faster)' },
        { value: 'grok-2',      label: 'grok-2 (Stable)' },
      ];
      case 'deepseek': return [
        { value: 'deepseek-chat',     label: 'deepseek-chat (Recommended)' },
        { value: 'deepseek-reasoner', label: 'deepseek-reasoner (R1, Chain-of-Thought)' },
      ];
      case 'ollama': return [
        { value: 'llama3',         label: 'llama3' },
        { value: 'llama3.2',       label: 'llama3.2' },
        { value: 'mistral',        label: 'mistral' },
        { value: 'gemma3',         label: 'gemma3' },
        { value: 'deepseek-coder', label: 'deepseek-coder' },
      ];
      case 'local': return [
        { value: 'HuggingFaceTB/SmolLM2-360M-Instruct', label: 'SmolLM2 360M (Recommended)' },
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
    this.userPrefsService.loadFromDb().then(prefs => {
      if (prefs) this.applyToSignals(prefs);
    });
    if (this.isDesktop) {
      this.tauri.isAutoStartEnabled().then(v => this.launchAtLogin.set(v));
      this.tauri.getOsType().then(v => this.osType.set(v));
      this.tauri.getOsArch().then(v => this.osArch.set(v));
    }
  }

  @HostListener('document:keydown.escape')
  goBack() {
    if (this.isDirty()) {
      this.unsavedConfirm.set(true);
      return;
    }
    this.location.back();
  }

  confirmLeave() {
    this.isDirty.set(false);
    this.unsavedConfirm.set(false);
    this.location.back();
  }

  setActiveSection(sectionId: string) {
    this.activeSection.set(sectionId);
    this.router.navigate([], { queryParams: { section: sectionId }, replaceUrl: true });
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    this.themeService.setTheme(theme);
    const stored = JSON.parse(localStorage.getItem('envello-settings') || '{}');
    this.userPrefsService.save({ ...stored, theme });
  }

  setFontSize(event: Event) {
    this.fontSize.set(parseInt((event.target as HTMLInputElement).value));
    document.documentElement.style.setProperty('--base-font-size', `${this.fontSize()}px`);
    this.isDirty.set(true);
  }

  toggleCompactMode() {
    this.compactMode.set(!this.compactMode());
    document.body.classList.toggle('compact-mode', this.compactMode());
    this.isDirty.set(true);
  }

  toggleAnimations() {
    this.animations.set(!this.animations());
    document.body.classList.toggle('no-animations', !this.animations());
    this.isDirty.set(true);
  }

  setNavigationLayout(layout: 'vertical' | 'horizontal' | 'minimized') {
    this.navigationLayout.set(layout);
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: layout }));
    this.isDirty.set(true);
  }

  setEditorFont(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.editorFont.set(value);
    document.documentElement.style.setProperty('--editor-font', this.getFontFamily(value));
    this.isDirty.set(true);
  }

  setEditorFontSize(event: Event) {
    this.editorFontSize.set(parseInt((event.target as HTMLInputElement).value));
    document.documentElement.style.setProperty('--editor-font-size', `${this.editorFontSize()}px`);
    this.isDirty.set(true);
  }

  setLineHeight(event: Event) {
    this.lineHeight.set(parseFloat((event.target as HTMLInputElement).value));
    document.documentElement.style.setProperty('--editor-line-height', this.lineHeight().toString());
    this.isDirty.set(true);
  }

  toggleAutoSave()    { this.autoSave.set(!this.autoSave());       this.isDirty.set(true); }
  toggleSpellCheck()  {
    this.spellCheck.set(!this.spellCheck());
    document.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el =>
      el.setAttribute('spellcheck', this.spellCheck() ? 'true' : 'false')
    );
    this.isDirty.set(true);
  }
  toggleFocusMode()   {
    this.focusMode.set(!this.focusMode());
    window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: this.focusMode() }));
    this.isDirty.set(true);
  }
  toggleDesktopNotifications() {
    this.desktopNotifications.set(!this.desktopNotifications());
    if (this.desktopNotifications() && 'Notification' in window) Notification.requestPermission();
    this.isDirty.set(true);
  }
  toggleSoundEffects() { this.soundEffects.set(!this.soundEffects()); this.isDirty.set(true); }
  toggleDailySummary() { this.dailySummary.set(!this.dailySummary()); this.isDirty.set(true); }
  toggleAnalytics()    { this.analytics.set(!this.analytics());       this.isDirty.set(true); }

  async toggleLaunchAtLogin() {
    const next = !this.launchAtLogin();
    this.launchAtLogin.set(next);
    await this.tauri.setAutoStart(next);
    this.isDirty.set(true);
  }

  async toggleAlwaysOnTop() {
    const next = !this.alwaysOnTop();
    this.alwaysOnTop.set(next);
    await this.tauri.setAlwaysOnTop(next);
    this.isDirty.set(true);
  }

  toggleMinimizeToTray() {
    this.minimizeToTray.set(!this.minimizeToTray());
    this.isDirty.set(true);
  }

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
    this.aiModel.set(this.getDefaultModelForProvider(provider));
    this.isDirty.set(true);
  }

  setAiKey(key: string)   { this.aiKey.set(key);     this.testStatus.set('idle'); this.isDirty.set(true); }
  setAiModel(model: string) { this.aiModel.set(model); this.testStatus.set('idle'); this.isDirty.set(true); }

  setVersionHistoryLimit(event: Event) {
    this.versionHistoryLimit.set(parseInt((event.target as HTMLInputElement).value));
    this.isDirty.set(true);
  }

  async saveSettings() {
    this.saveStatus.set('saving');
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
      alwaysOnTop: this.alwaysOnTop(),
      minimizeToTray: this.minimizeToTray(),
    };
    await this.userPrefsService.save(settings);
    this.aiService.updateConfig(this.aiProvider(), this.aiModel(), this.aiKey());
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: this.navigationLayout() }));
    this.isDirty.set(false);
    this.saveStatus.set('saved');
    setTimeout(() => { this.saveStatus.set('idle'); this.location.back(); }, 800);
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
    this.exportDone.set(true);
    setTimeout(() => this.exportDone.set(false), 2500);
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
    this.isDirty.set(false);
    this.location.back();
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
    this.alwaysOnTop.set(false);
    this.minimizeToTray.set(false);
    this.aiProvider.set('mock');
    this.aiModel.set('');
    this.aiKey.set('');
    const emptyVisibility = { web: [], desktop: [] };
    this.hiddenNavItems.set(emptyVisibility);
    window.dispatchEvent(new CustomEvent('navVisibilityChanged', { detail: emptyVisibility }));
    this.aiService.updateConfig('mock', '', '');
    this.themeService.setTheme('light');
    this.tauri.setAlwaysOnTop(false).catch(() => {});
    localStorage.removeItem('envello-settings');
    localStorage.setItem('theme', 'light');
    document.documentElement.style.removeProperty('--base-font-size');
    document.documentElement.style.removeProperty('--editor-font');
    document.documentElement.style.removeProperty('--editor-font-size');
    document.documentElement.style.removeProperty('--editor-line-height');
    document.body.classList.remove('compact-mode', 'no-animations');
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: 'minimized' }));
    this.userPrefsService.save({
      theme: 'light', fontSize: 14, compactMode: false, animations: true,
      navigationLayout: 'minimized', editorFont: 'sans', editorFontSize: 16,
      lineHeight: 1.8, autoSave: true, spellCheck: true, focusMode: false,
      desktopNotifications: false, soundEffects: true, dailySummary: false,
      analytics: true, versionHistoryLimit: 50, hiddenNavItems: { web: [], desktop: [] },
      alwaysOnTop: false, minimizeToTray: false,
    });
    this.isDirty.set(false);
  }

  checkUpdates() { this.tauri.openUrl('https://github.com/subhrajitm/envello-app/releases'); }
  openDocs()     { this.tauri.openUrl('https://github.com/subhrajitm/envello-app/wiki'); }
  reportIssue()  { this.tauri.openUrl('https://github.com/subhrajitm/envello-app/issues/new'); }

  private loadSettings() {
    const saved = localStorage.getItem('envello-settings');
    if (!saved) return;
    try { this.applyToSignals(JSON.parse(saved)); }
    catch (e) { console.error('Failed to load settings:', e); }
  }

  private applyToSignals(s: Record<string, any>) {
    if (s['theme'])                        this.currentTheme.set(s['theme']);
    if (s['fontSize'])                     this.fontSize.set(s['fontSize']);
    if (s['compactMode'] !== undefined)    this.compactMode.set(s['compactMode']);
    if (s['animations'] !== undefined)     this.animations.set(s['animations'] !== false);
    if (s['navigationLayout'])             this.navigationLayout.set(s['navigationLayout']);
    if (s['editorFont'])                   this.editorFont.set(s['editorFont']);
    if (s['editorFontSize'])               this.editorFontSize.set(s['editorFontSize']);
    if (s['lineHeight'])                   this.lineHeight.set(s['lineHeight']);
    if (s['autoSave'] !== undefined)       this.autoSave.set(s['autoSave'] !== false);
    if (s['spellCheck'] !== undefined)     this.spellCheck.set(s['spellCheck'] !== false);
    if (s['focusMode'] !== undefined)      this.focusMode.set(s['focusMode']);
    if (s['desktopNotifications'] !== undefined) this.desktopNotifications.set(s['desktopNotifications']);
    if (s['soundEffects'] !== undefined)   this.soundEffects.set(s['soundEffects'] !== false);
    if (s['dailySummary'] !== undefined)   this.dailySummary.set(s['dailySummary']);
    if (s['analytics'] !== undefined)      this.analytics.set(s['analytics'] !== false);
    if (s['versionHistoryLimit'])          this.versionHistoryLimit.set(s['versionHistoryLimit']);
    if (s['alwaysOnTop'] !== undefined)    this.alwaysOnTop.set(!!s['alwaysOnTop']);
    if (s['minimizeToTray'] !== undefined) this.minimizeToTray.set(!!s['minimizeToTray']);
    const hn = s['hiddenNavItems'];
    if (hn && !Array.isArray(hn)) {
      this.hiddenNavItems.set({ web: hn.web ?? [], desktop: hn.desktop ?? [] });
    }
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
