import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@envello/ui';
import { IconButtonComponent } from '@envello/ui';
import { EnvLogoComponent } from '@envello/ui';
import { ThemeService, Theme } from '@envello/core';
import { AiService, AiProvider } from '@envello/core';

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
  imports: [CommonModule, FormsModule, ButtonComponent, IconButtonComponent, EnvLogoComponent],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.css'
})
export class SettingsModalComponent {
  private themeService = inject(ThemeService);
  aiService = inject(AiService);

  isOpen = signal(false);
  activeSection = signal('appearance');

  // Settings state
  currentTheme = signal<Theme>('dark');
  fontSize = signal(14);
  compactMode = signal(false);
  animations = signal(true);
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>('minimized');
  editorFont = signal('serif');
  lineHeight = signal(1.8);
  autoSave = signal(true);
  spellCheck = signal(true);
  focusMode = signal(false);
  desktopNotifications = signal(false);
  soundEffects = signal(true);
  dailySummary = signal(false);
  analytics = signal(true);

  // AI State
  aiProvider = signal<AiProvider>('mock');
  aiModel = signal('');
  aiKey = signal('');

  sections: SettingsSection[] = [
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'editor', label: 'Editor', icon: 'edit_note' },
    { id: 'ai', label: 'AI & Intelligence', icon: 'smart_toy' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'privacy', label: 'Privacy & Data', icon: 'shield' },
    { id: 'about', label: 'About', icon: 'info' }
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
    { value: 'mock', label: 'Demo Mode (Offline)', icon: 'science' },
    { value: 'openai', label: 'OpenAI (GPT-4)', icon: 'psychology' },
    { value: 'anthropic', label: 'Anthropic (Claude)', icon: 'smart_toy' },
    { value: 'ollama', label: 'Ollama (Local)', icon: 'terminal' }
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

    // Refresh AI settings from service in case they changed elsewhere
    this.aiProvider.set(this.aiService.provider());
    this.aiModel.set(this.aiService.modelName());
    this.aiKey.set(this.aiService.apiKey());

    // Reload settings to get current navigation layout
    this.loadSettings();
  }

  close() {
    this.isOpen.set(false);
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
  }

  toggleFocusMode() {
    this.focusMode.set(!this.focusMode());
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
  setAiProvider(provider: AiProvider) {
    this.aiProvider.set(provider);
    // Set default models
    if (provider === 'openai') this.aiModel.set('gpt-4-turbo');
    else if (provider === 'anthropic') this.aiModel.set('claude-3-opus-20240229');
    else if (provider === 'ollama') this.aiModel.set('llama3');
  }

  // Actions
  saveSettings() {
    const settings = {
      theme: this.currentTheme(),
      fontSize: this.fontSize(),
      compactMode: this.compactMode(),
      animations: this.animations(),
      navigationLayout: this.navigationLayout(),
      editorFont: this.editorFont(),
      lineHeight: this.lineHeight(),
      autoSave: this.autoSave(),
      spellCheck: this.spellCheck(),
      focusMode: this.focusMode(),
      desktopNotifications: this.desktopNotifications(),
      soundEffects: this.soundEffects(),
      dailySummary: this.dailySummary(),
      analytics: this.analytics()
    };

    localStorage.setItem('envello-settings', JSON.stringify(settings));

    // Save AI Config
    this.aiService.updateConfig(this.aiProvider(), this.aiModel(), this.aiKey());

    // Dispatch event to notify header component
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: this.navigationLayout() }));
    this.close();
  }

  resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.currentTheme.set('light');
      this.fontSize.set(14);
      this.compactMode.set(false);
      this.animations.set(true);
      this.navigationLayout.set('minimized');
      this.editorFont.set('serif');
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
      this.aiModel.set('gpt-4-turbo');
      this.aiKey.set('');
      this.aiService.updateConfig('mock', '', '');

      this.themeService.theme.set('light');
      localStorage.removeItem('envello-settings');
      localStorage.setItem('theme', 'light');

      // Reset CSS variables
      document.documentElement.style.removeProperty('--base-font-size');
      document.documentElement.style.removeProperty('--editor-font');
      document.documentElement.style.removeProperty('--editor-line-height');
      document.body.classList.remove('compact-mode', 'no-animations');

      // Dispatch event to reset navigation layout
      window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: 'minimized' }));
    }
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
        this.editorFont.set(settings.editorFont || 'serif');
        this.lineHeight.set(settings.lineHeight || 1.8);
        this.autoSave.set(settings.autoSave !== false);
        this.spellCheck.set(settings.spellCheck !== false);
        this.focusMode.set(settings.focusMode || false);
        this.desktopNotifications.set(settings.desktopNotifications || false);
        this.soundEffects.set(settings.soundEffects !== false);
        this.dailySummary.set(settings.dailySummary || false);
        this.analytics.set(settings.analytics !== false);

        // Apply saved settings
        if (settings.fontSize) {
          document.documentElement.style.setProperty('--base-font-size', `${settings.fontSize}px`);
        }
        if (settings.editorFont) {
          document.documentElement.style.setProperty('--editor-font', this.getFontFamily(settings.editorFont));
        }
        if (settings.lineHeight) {
          document.documentElement.style.setProperty('--editor-line-height', settings.lineHeight.toString());
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

  private getFontFamily(font: string): string {
    const fonts: Record<string, string> = {
      'serif': 'var(--font-serif)',
      'sans': 'var(--font-sans)',
      'mono': 'var(--font-mono)'
    };
    return fonts[font] || fonts['serif'];
  }
}

