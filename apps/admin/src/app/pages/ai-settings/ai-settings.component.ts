import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiProvider, AiService } from '@envello/core';
import { AdminService } from '../../services/admin.service';

const MODEL_PLACEHOLDERS: Record<AiProvider, string> = {
  mock: 'mock-model',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  ollama: 'llama3',
  grok: 'grok-2',
  gemini: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
  local: 'local-model',
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
  private aiService = inject(AiService);

  readonly providers: AiProvider[] = ['mock', 'openai', 'anthropic', 'ollama', 'grok', 'gemini', 'deepseek'];

  provider = signal<AiProvider>('mock');
  modelName = signal<string>('');
  aiEnabled = signal<boolean>(true);
  showKey = signal<boolean>(false);
  toast = signal<{ text: string; isError: boolean }>({ text: '', isError: false });
  toastTimer?: ReturnType<typeof setTimeout>;
  saving = signal(false);
  testing = signal(false);
  loading = signal(true);

  // Key management — the actual key is kept in memory but never shown in the input
  private _loadedKey = '';
  newKey = signal<string>('');        // what the user typed; empty = unchanged
  hasExistingKey = signal<boolean>(false);
  keyEditing = signal<boolean>(false);

  readonly modelPlaceholder = computed(() => MODEL_PLACEHOLDERS[this.provider()]);
  readonly needsKey = computed(() => this.provider() !== 'mock' && this.provider() !== 'ollama');

  async ngOnInit() {
    const config = await this.admin.loadAiConfig();
    if (config) {
      this.provider.set((config.provider as AiProvider) ?? 'mock');
      this.modelName.set(config.model_name ?? '');
      this.aiEnabled.set(config.ai_enabled ?? true);
      // Keep key in memory; never bind it to the input
      this._loadedKey = config.api_key ?? '';
      this.hasExistingKey.set(!!this._loadedKey);
    }
    this.loading.set(false);
  }

  startEditKey() {
    this.keyEditing.set(true);
    this.newKey.set('');
  }

  cancelEditKey() {
    this.keyEditing.set(false);
    this.newKey.set('');
  }

  async save() {
    this.saving.set(true);
    const payload: Parameters<typeof this.admin.saveAiConfig>[0] = {
      provider: this.provider(),
      model_name: this.modelName(),
      ai_enabled: this.aiEnabled(),
    };
    // Only update the key if the admin explicitly typed a new one
    if (this.keyEditing() && this.newKey()) {
      payload.api_key = this.newKey();
      this._loadedKey = this.newKey();
      this.hasExistingKey.set(true);
      this.keyEditing.set(false);
      this.newKey.set('');
    }
    const { error } = await this.admin.saveAiConfig(payload);
    this.saving.set(false);
    this.showToast(error ? `Error: ${error}` : 'Settings saved successfully.', !!error);
  }

  async testConnection() {
    if (this.testing()) return;
    const effectiveKey = this.keyEditing() ? this.newKey() : this._loadedKey;
    if (this.needsKey() && !effectiveKey) {
      this.showToast('Enter an API key to test the connection.', true);
      return;
    }
    this.testing.set(true);
    this.showToast('Testing connection…', false);
    try {
      await this.aiService.testConfig(this.provider(), this.modelName(), effectiveKey);
      this.showToast(`Connection to ${this.provider()} successful.`, false);
    } catch (e: any) {
      this.showToast(`Connection failed: ${e?.message ?? 'Unknown error'}`, true);
    } finally {
      this.testing.set(false);
    }
  }

  onProviderChange(value: string) {
    this.provider.set(value as AiProvider);
    this.modelName.set('');
    this.keyEditing.set(false);
    this.newKey.set('');
  }

  private showToast(text: string, isError: boolean) {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, isError });
    this.toastTimer = setTimeout(() => this.toast.set({ text: '', isError: false }), isError ? 6000 : 3000);
  }
}
