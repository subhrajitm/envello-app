import { Component, input, output, ViewChild, ElementRef, DoCheck, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Editor } from '@tiptap/core';
import { AiMessage, AiSuggestion } from '@envello/core';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-panel.component.html',
  styleUrls: [
    './ai-panel.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AiPanelComponent implements DoCheck {
  private sanitizer = inject(DomSanitizer);
  private lastMessageCount = 0;
  aiMessages = input.required<AiMessage[]>();
  aiLoading = input.required<boolean>();
  aiError = input<string | null>(null);
  aiPrompt = input.required<string>();
  aiSuggestions = input.required<AiSuggestion[]>();
  showContextPreview = input.required<boolean>();
  tokenCount = input.required<number>();
  context = input.required<string>();
  activeChapter = input<any>(null);
  editor = input<Editor | null>(null);
  
  @ViewChild('aiMessagesContainer') aiMessagesContainer!: ElementRef<HTMLDivElement>;
  
  sendMessage = output<string | void>();
  analyzeToneAndPacing = output<void>();
  generateSuggestions = output<void>();
  summarizeChapter = output<void>();
  continueWriting = output<void>();
  applySuggestion = output<AiSuggestion>();
  clearConversation = output<void>();
  clearSuggestions = output<void>();
  toggleContextPreview = output<void>();
  promptChange = output<string>();
  
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  formatMessage(content: string): SafeHtml {
    const escaped = this.escapeHtml(content);
    const formatted = escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

  ngDoCheck() {
    const count = this.aiMessages().length;
    if (count !== this.lastMessageCount) {
      this.lastMessageCount = count;
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.aiMessagesContainer?.nativeElement) {
        const container = this.aiMessagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  handleChatEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage.emit();
    }
  }
}
