import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiProvider } from '@envello/core';
import { AdminService } from '../../services/admin.service';

const MODEL_PLACEHOLDERS: Record<AiProvider, string> = {
  mock: 'mock-model',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  ollama: 'llama3',
  grok: 'grok-2',
  gemini: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
};

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-settings.component.html',
  styleUrl: './ai-settings.component.css',
})
export class AiSettingsComponent implements OnInit {
  private admin = inject(AdminService);

  readonly providers: AiProvider[] = ['mock', 'openai', 'anthropic', 'ollama', 'grok', 'gemini', 'deepseek'];

  provider = signal<AiProvider>('mock');
  modelName = signal<string>('');
  apiKey = signal<string>('');
  aiEnabled = signal<boolean>(true);
  showKey = signal<boolean>(false);
  toast = signal<string>('');
  saving = signal(false);
  loading = signal(true);

  readonly modelPlaceholder = computed(() => MODEL_PLACEHOLDERS[this.provider()]);
  readonly needsKey = computed(() => this.provider() !== 'mock' && this.provider() !== 'ollama');

  async ngOnInit() {
    const config = await this.admin.loadAiConfig();
    if (config) {
      this.provider.set((config.provider as AiProvider) ?? 'mock');
      this.modelName.set(config.model_name ?? '');
      this.apiKey.set(config.api_key ?? '');
      this.aiEnabled.set(config.ai_enabled ?? true);
    }
    this.loading.set(false);
  }

  async save() {
    this.saving.set(true);
    const { error } = await this.admin.saveAiConfig({
      provider: this.provider(),
      model_name: this.modelName(),
      api_key: this.apiKey(),
      ai_enabled: this.aiEnabled(),
    });
    this.saving.set(false);
    this.toast.set(error ? `Error: ${error}` : 'Settings saved successfully.');
    setTimeout(() => this.toast.set(''), 3000);
  }

  async testConnection() {
    this.toast.set('Testing connection...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    this.toast.set('Connection test passed (mock).');
    setTimeout(() => this.toast.set(''), 3000);
  }

  onProviderChange(value: string) {
    this.provider.set(value as AiProvider);
    this.modelName.set('');
    this.apiKey.set('');
  }
}
