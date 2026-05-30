import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { EnvLogoComponent } from '../logo/logo.component';
import { ThemeService, Theme, StoreService } from '@envello/core';
import { AiService, AiProvider } from '@envello/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface SettingsSection {
  id: string;
  label: string;
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
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconButtonComponent, EnvLogoComponent, ConfirmDialogComponent],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.css'
})
export class SettingsModalComponent {
  private themeService = inject(ThemeService);
  private storeService = inject(StoreService);
  aiService = inject(AiService);

  isOpen = signal(false);
  activeSection = signal('general');
  resetConfirm = signal(false);
  clearDataConfirm = signal(false);

  // Settings state
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

  // AI State
  aiProvider = signal<AiProvider>('mock');
  aiModel = signal('');
  aiKey = signal('');
  showApiKey = signal(false);
  testStatus = signal<'idle' | 'testing' | 'success' | 'error'>('idle');
  testMessage = signal('');

  sections: SettingsSection[] = [
    { id: 'general',       label: 'General',           icon: 'tune' },
    { id: 'appearance',    label: 'Appearance',         icon: 'palette' },
    { id: 'editor',        label: 'Editor',             icon: 'edit_note' },
    { id: 'ai',            label: 'AI & Integrations',  icon: 'smart_toy' },
    { id: 'notifications', label: 'Notifications',      icon: 'notifications' },
    { id: 'data',          label: 'Data & Sync',        icon: 'sync' },
    { id: 'about',         label: 'About',              icon: 'info' }
  ];

  themes: ThemeOption[] = [
    { value: 'dark', label: 'Midnight', icon: 'nights_stay' },
    { value: 'enterprise-dark', label: 'Pro Dark', icon: 'dark_mode' },
    { value: 'enterprise-light', label: 'Pro Light', icon: 'wb_sunny' },
    { value: 'light', label: 'Paper', icon: 'light_mode' },
    { value: 'colorful', label: 'Colorful', icon: 'palette' },
    { value: 'typewriter', label: 'Typewriter', icon: 'article' }
  ];

  aiProviders: AiProviderOption[] = [
    { value: 'mock',      label: 'Demo Mode',            icon: 'science' },
    { value: 'local',     label: 'On-Device AI',         icon: 'memory' },
    { value: 'openai',    label: 'OpenAI (GPT)',          icon: 'psychology' },
    { value: 'anthropic', label: 'Anthropic (Claude)',    icon: 'smart_toy' },
    { value: 'gemini',    label: 'Google (Gemini)',       icon: 'auto_awesome' },
    { value: 'grok',      label: 'xAI (Grok)',            icon: 'bolt' },
    { value: 'deepseek',  label: 'DeepSeek',              icon: 'water' },
    { value: 'ollama',    label: 'Ollama (Local)',         icon: 'terminal' },
  ];

  constructor() {
    // Load current theme
    this.currentTheme.set(this.themeService.theme());

    // Load settings from localStorage
    this.loadSettings();

    // Load AI settings
    this.aiProvider.set(this.aiService.provider());
    this.aiModel.set(this.aiService.modelName());
    this.aiKey.set(this.aiService.apiKey());
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event) {
    const e = event as KeyboardEvent;
    if (this.isOpen()) {
      e.preventDefault();
      this.close();
    }
  }

  open() {
    this.isOpen.set(true);
    this.currentTheme.set(this.themeService.theme());
    this.testStatus.set('idle');
    this.testMessage.set('');

    // Refresh AI settings from service in case they changed elsewhere
    this.aiProvider.set(this.aiService.provider());
    this.aiModel.set(this.aiService.modelName());
    this.aiKey.set(this.aiService.apiKey());

    // Reload settings to get current navigation layout
    this.loadSettings();
  }

  close() {
    this.isOpen.set(false);
    this.showApiKey.set(false);
  }

  setActiveSection(sectionId: string) {
    this.activeSection.set(sectionId);
  }

  // Appearance settings
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
    // Dispatch custom event to notify header component
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: layout }));
  }

  // Editor settings
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

  toggleAutoSave() {
    this.autoSave.set(!this.autoSave());
  }

  toggleSpellCheck() {
    this.spellCheck.set(!this.spellCheck());
    const enabled = this.spellCheck();
    document.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el => {
      el.setAttribute('spellcheck', enabled ? 'true' : 'false');
    });
  }

  toggleFocusMode() {
    this.focusMode.set(!this.focusMode());
    window.dispatchEvent(new CustomEvent('focusModeChanged', { detail: this.focusMode() }));
  }

  // Notification settings
  toggleDesktopNotifications() {
    this.desktopNotifications.set(!this.desktopNotifications());
    if (this.desktopNotifications() && 'Notification' in window) {
      Notification.requestPermission();
    }
  }

  toggleSoundEffects() {
    this.soundEffects.set(!this.soundEffects());
  }

  toggleDailySummary() {
    this.dailySummary.set(!this.dailySummary());
  }

  // Privacy settings
  toggleAnalytics() {
    this.analytics.set(!this.analytics());
  }

  // AI Actions
  async testConnection() {
    this.testStatus.set('testing');
    this.testMessage.set('');
    try {
      await this.aiService.testConfig(this.aiProvider(), this.aiModel(), this.aiKey());
      this.testStatus.set('success');
      this.testMessage.set('Connection successful!');
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
    // Set real default model IDs for each provider
    if (provider === 'openai') this.aiModel.set('gpt-4o');
    else if (provider === 'anthropic') this.aiModel.set('claude-sonnet-4-6');
    else if (provider === 'gemini') this.aiModel.set('gemini-2.5-flash');
    else if (provider === 'grok') this.aiModel.set('grok-3');
    else if (provider === 'deepseek') this.aiModel.set('deepseek-chat');
    else if (provider === 'ollama') this.aiModel.set('llama3');
    else if (provider === 'local') this.aiModel.set('HuggingFaceTB/SmolLM2-360M-Instruct');
    else this.aiModel.set('');
  }

  // Actions
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
    };

    localStorage.setItem('envello-settings', JSON.stringify(settings));

    // Save AI Config
    this.aiService.updateConfig(this.aiProvider(), this.aiModel(), this.aiKey());

    // Dispatch event to notify header component
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: this.navigationLayout() }));
    this.close();
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

  clearAllData() {
    this.clearDataConfirm.set(true);
  }

  async doClearAllData() {
    this.clearDataConfirm.set(false);
    localStorage.removeItem('envello-settings');
    localStorage.removeItem('theme');
    // Clear all in-memory store signals and close modal
    this.storeService.tasks.set([]);
    this.storeService.notes.set([]);
    this.storeService.books.set([]);
    this.storeService.bookmarks.set([]);
    this.storeService.bookmarkFolders.set([]);
    this.storeService.planningItems.set([]);
    this.storeService.spaces.set([]);
    this.close();
  }

  resetToDefaults() {
    this.resetConfirm.set(true);
  }

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

    // Reset AI
    this.aiProvider.set('mock');
    this.aiModel.set('mock-model');
    this.aiKey.set('');
    this.aiService.updateConfig('mock', '', '');

    this.themeService.theme.set('light');
    localStorage.removeItem('envello-settings');
    localStorage.setItem('theme', 'light');

    // Reset CSS variables
    document.documentElement.style.removeProperty('--base-font-size');
    document.documentElement.style.removeProperty('--editor-font');
    document.documentElement.style.removeProperty('--editor-font-size');
    document.documentElement.style.removeProperty('--editor-line-height');
    document.body.classList.remove('compact-mode', 'no-animations');

    // Dispatch event to reset navigation layout
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: 'minimized' }));
  }

  private loadSettings() {
    const saved = localStorage.getItem('envello-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.fontSize.set(settings.fontSize || 14);
        this.compactMode.set(settings.compactMode || false);
        this.animations.set(settings.animations !== false);
        this.navigationLayout.set(settings.navigationLayout || 'minimized');
        this.editorFont.set(settings.editorFont || 'sans');
        this.editorFontSize.set(settings.editorFontSize || 16);
        this.lineHeight.set(settings.lineHeight || 1.8);
        this.autoSave.set(settings.autoSave !== false);
        this.spellCheck.set(settings.spellCheck !== false);
        this.focusMode.set(settings.focusMode || false);
        this.desktopNotifications.set(settings.desktopNotifications || false);
        this.soundEffects.set(settings.soundEffects !== false);
        this.dailySummary.set(settings.dailySummary || false);
        this.analytics.set(settings.analytics !== false);
        this.versionHistoryLimit.set(settings.versionHistoryLimit || 50);

        // Apply saved settings
        if (settings.fontSize) {
          document.documentElement.style.setProperty('--base-font-size', `${settings.fontSize}px`);
        }
        if (settings.editorFont) {
          document.documentElement.style.setProperty('--editor-font', this.getFontFamily(settings.editorFont));
        }
        if (settings.editorFontSize) {
          document.documentElement.style.setProperty('--editor-font-size', `${settings.editorFontSize}px`);
        }
        if (settings.lineHeight) {
          document.documentElement.style.setProperty('--editor-line-height', settings.lineHeight.toString());
        }
        if (!settings.spellCheck) {
          document.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el => {
            el.setAttribute('spellcheck', 'false');
          });
        }
        if (settings.compactMode) {
          document.body.classList.add('compact-mode');
        }
        if (settings.animations === false) {
          document.body.classList.add('no-animations');
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }

  checkUpdates() {
    window.open('https://github.com/envello-app/envello/releases', '_blank');
  }

  openDocs() {
    window.open('https://github.com/envello-app/envello/wiki', '_blank');
  }

  reportIssue() {
    window.open('https://github.com/envello-app/envello/issues/new', '_blank');
  }

  private getFontFamily(font: string): string {
    const fonts: Record<string, string> = {
      'serif': 'var(--font-serif)',
      'sans': 'var(--font-sans)',
      'mono': 'var(--font-mono)'
    };
    return fonts[font] || fonts['serif'];
  }
}

