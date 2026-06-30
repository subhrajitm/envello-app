import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, ContextService } from '@envello/core';

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
  private contextService = inject(ContextService);

  isOpen = signal(false);
  prompt = signal('');
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);

  toggle() { this.isOpen.update(v => !v); }
  close()  { this.isOpen.set(false); }

  async send() {
    const text = this.prompt().trim();
    if (!text || this.isLoading()) return;

    this.messages.update(m => [...m, { role: 'user' as const, content: text }]);
    this.prompt.set('');
    this.isLoading.set(true);
    this.messages.update(m => [...m, { role: 'assistant' as const, content: '' }]);

    try {
      for await (const chunk of this.contextService.streamWithContext(text, text)) {
        this.messages.update(msgs => {
          const last = msgs[msgs.length - 1];
          return last.role === 'assistant'
            ? [...msgs.slice(0, -1), { ...last, content: last.content + chunk }]
            : msgs;
        });
      }
    } catch {
      this.messages.update(msgs => {
        const last = msgs[msgs.length - 1];
        return last.role === 'assistant' && !last.content
          ? [...msgs.slice(0, -1), { role: 'assistant' as const, content: 'Sorry, I encountered an error. Please check your AI settings.' }]
          : msgs;
      });
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
