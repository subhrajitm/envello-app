import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '@envello/core';
import { AiService, AiProvider } from '@envello/core';

const ONBOARDING_KEY = 'envello-onboarding-complete';

type UseCase = 'writing' | 'tasks' | 'research' | 'all';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent implements OnInit {
  private themeService = inject(ThemeService);
  private aiService = inject(AiService);

  isOpen = signal(false);
  step = signal(1);
  totalSteps = 3;

  selectedUseCase = signal<UseCase | null>(null);
  selectedTheme = signal<string>('dark');
  selectedAiProvider = signal<AiProvider>('mock');

  useCases: { id: UseCase; label: string; icon: string; desc: string }[] = [
    { id: 'writing', label: 'Creative Writing',  icon: 'menu_book',    desc: 'Books, stories & manuscripts' },
    { id: 'tasks',   label: 'Task Management',   icon: 'task_alt',     desc: 'Projects, todos & planning' },
    { id: 'research',label: 'Research & Notes',  icon: 'science',      desc: 'Sources, journals & knowledge' },
    { id: 'all',     label: 'All of the above',  icon: 'all_inclusive', desc: 'Full productivity suite' },
  ];

  themes: { id: string; label: string; icon: string }[] = [
    { id: 'dark',              label: 'Midnight',   icon: 'nights_stay' },
    { id: 'enterprise-dark',   label: 'Pro Dark',   icon: 'dark_mode' },
    { id: 'enterprise-light',  label: 'Pro Light',  icon: 'wb_sunny' },
    { id: 'light',             label: 'Paper',      icon: 'light_mode' },
    { id: 'colorful',          label: 'Colorful',   icon: 'palette' },
  ];

  aiProviders: { id: AiProvider; label: string; icon: string }[] = [
    { id: 'mock',      label: 'Demo (Offline)',    icon: 'science' },
    { id: 'openai',    label: 'OpenAI (GPT)',       icon: 'psychology' },
    { id: 'anthropic', label: 'Anthropic (Claude)', icon: 'smart_toy' },
    { id: 'gemini',    label: 'Google (Gemini)',    icon: 'auto_awesome' },
    { id: 'deepseek',  label: 'DeepSeek',           icon: 'water' },
    { id: 'ollama',    label: 'Ollama (Local)',     icon: 'terminal' },
  ];

  ngOnInit() {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the app shell renders first
      setTimeout(() => this.isOpen.set(true), 800);
    }
  }

  next() {
    if (this.step() < this.totalSteps) {
      this.step.update(s => s + 1);
    } else {
      this.finish();
    }
  }

  back() {
    if (this.step() > 1) this.step.update(s => s - 1);
  }

  selectUseCase(id: UseCase) { this.selectedUseCase.set(id); }

  selectTheme(id: string) {
    this.selectedTheme.set(id);
    this.themeService.setTheme(id as any);
  }

  selectAiProvider(id: AiProvider) { this.selectedAiProvider.set(id); }

  finish() {
    // Apply theme
    this.themeService.setTheme(this.selectedTheme() as any);
    // Apply AI provider
    this.aiService.updateConfig(this.selectedAiProvider(), '', '');
    // Persist settings
    const saved = localStorage.getItem('envello-settings');
    const settings = saved ? JSON.parse(saved) : {};
    settings.theme = this.selectedTheme();
    settings.onboardingUseCase = this.selectedUseCase();
    localStorage.setItem('envello-settings', JSON.stringify(settings));
    localStorage.setItem(ONBOARDING_KEY, 'true');
    this.isOpen.set(false);
  }

  skip() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    this.isOpen.set(false);
  }

  get canProceed(): boolean {
    if (this.step() === 1) return this.selectedUseCase() !== null;
    return true;
  }

  get stepLabel(): string {
    switch (this.step()) {
      case 1: return 'What will you use Envello for?';
      case 2: return 'Choose your theme';
      case 3: return 'Set up AI assistance (optional)';
      default: return '';
    }
  }
}
