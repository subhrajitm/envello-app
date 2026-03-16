import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ViewChild,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
let AiPanelComponent = class AiPanelComponent {
  aiMessages = input.required();
  aiLoading = input.required();
  aiError = input(null);
  aiPrompt = input.required();
  aiSuggestions = input.required();
  showContextPreview = input.required();
  tokenCount = input.required();
  context = input.required();
  activeChapter = input(null);
  editor = input(null);
  aiMessagesContainer;
  sendMessage = output();
  analyzeToneAndPacing = output();
  generateSuggestions = output();
  summarizeChapter = output();
  continueWriting = output();
  applySuggestion = output();
  clearConversation = output();
  clearSuggestions = output();
  toggleContextPreview = output();
  promptChange = output();
  formatMessage(content) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
  formatTime(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  scrollToBottom() {
    setTimeout(() => {
      if (this.aiMessagesContainer?.nativeElement) {
        const container = this.aiMessagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
  handleChatEnter(event) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage.emit();
    }
  }
};
__decorate(
  [ViewChild('aiMessagesContainer')],
  AiPanelComponent.prototype,
  'aiMessagesContainer',
  void 0,
);
AiPanelComponent = __decorate(
  [
    Component({
      selector: 'app-ai-panel',
      standalone: true,
      imports: [CommonModule, FormsModule],
      templateUrl: './ai-panel.component.html',
      styleUrls: [
        './ai-panel.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  AiPanelComponent,
);
export { AiPanelComponent };
