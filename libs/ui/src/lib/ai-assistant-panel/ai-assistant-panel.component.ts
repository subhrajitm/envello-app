import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AiPanelMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'env-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrl: './ai-assistant-panel.component.css',
})
export class AiAssistantPanelComponent {
  title       = input('AI Assistant');
  placeholder = input('Ask me anything…');
  suggestions = input<string[]>([]);
  messages    = input<AiPanelMessage[]>([]);
  loading     = input(false);

  send    = output<string>();
  cleared = output<void>();
  closed  = output<void>();

  inputText = signal('');

  onSend() {
    const text = this.inputText().trim();
    if (!text || this.loading()) return;
    this.send.emit(text);
    this.inputText.set('');
  }

  onSuggestionClick(text: string) {
    this.send.emit(text);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.onSend();
    }
  }
}
