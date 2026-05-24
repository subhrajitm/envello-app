import { Component, input, output, computed, ViewChild, ElementRef, DoCheck, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
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
  writingType = input<string>('NOVEL');

  @ViewChild('aiMessagesContainer') aiMessagesContainer!: ElementRef<HTMLDivElement>;

  readonly primaryActions = computed(() => {
    switch (this.writingType()) {
      case 'SCRIPT': return [
        { key: 'refine-dialogue',  label: 'Refine Dialogue',  icon: 'record_voice_over', primary: true },
        { key: 'scene-analysis',   label: 'Scene Analysis',   icon: 'theaters',          primary: false },
      ];
      case 'POETRY': return [
        { key: 'analyze-meter',    label: 'Analyze Meter',    icon: 'music_note',        primary: true },
        { key: 'check-rhyme',      label: 'Check Rhyme',      icon: 'spellcheck',        primary: false },
      ];
      case 'ARTICLE':
      case 'BLOG_POST': return [
        { key: 'improve-clarity',  label: 'Improve Clarity',  icon: 'auto_fix_high',     primary: true },
        { key: 'check-flow',       label: 'Check Flow',       icon: 'trending_up',       primary: false },
      ];
      case 'ESSAY': return [
        { key: 'strengthen-args',  label: 'Strengthen Arguments', icon: 'gavel',         primary: true },
        { key: 'check-structure',  label: 'Check Structure',  icon: 'account_tree',      primary: false },
      ];
      case 'RESEARCH': return [
        { key: 'summarize-findings', label: 'Summarize Findings', icon: 'summarize',     primary: true },
        { key: 'check-consistency',  label: 'Check Consistency',  icon: 'fact_check',    primary: false },
      ];
      default: return [ // NOVEL, SHORT_STORY
        { key: 'tone-pacing', label: 'Analyze Tone & Pacing', icon: 'auto_fix_high',     primary: true },
        { key: 'suggest',     label: 'Suggest',               icon: 'menu_book',         primary: false },
      ];
    }
  });

  sendMessage = output<string | void>();
  quickAction = output<string>();
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
