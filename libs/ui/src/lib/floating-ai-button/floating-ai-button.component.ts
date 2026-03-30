import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '@envello/core';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'env-floating-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './floating-ai-button.component.html',
  styleUrl: './floating-ai-button.component.css',
})
export class FloatingAiButtonComponent {
  private aiService = inject(AiService);

  isOpen = signal(false);
  prompt = signal('');
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);

  toggle() { this.isOpen.update(v => !v); }
  close()  { this.isOpen.set(false); }

  async send() {
    const text = this.prompt().trim();
    if (!text || this.isLoading()) return;

    this.messages.update(m => [...m, { role: 'user', content: text }]);
    this.prompt.set('');
    this.isLoading.set(true);

    try {
      const response = await this.aiService.sendMessage(text);
      this.messages.update(m => [...m, { role: 'assistant', content: response }]);
    } catch {
      this.messages.update(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your AI settings.' }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
