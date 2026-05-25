import { Component, input, output, computed, ViewChild, ElementRef, ChangeDetectionStrategy, ViewEncapsulation, inject, effect, SecurityContext } from '@angular/core';
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
export class AiPanelComponent {
  private sanitizer = inject(DomSanitizer);

  constructor() {
    effect(() => {
      this.aiMessages().length;
      this.scrollToBottom();
    });
  }
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

  readonly isDocumentType = computed(() => {
    const t = this.writingType();
    return t === 'ESSAY' || t === 'ARTICLE' || t === 'BLOG_POST' || t === 'RESEARCH';
  });

  readonly panelTitle = computed(() => {
    switch (this.writingType()) {
      case 'ESSAY':      return 'Essay Assistant';
      case 'ARTICLE':    return 'Article Assistant';
      case 'BLOG_POST':  return 'Blog Assistant';
      case 'RESEARCH':   return 'Research Assistant';
      case 'POETRY':     return 'Poetry Assistant';
      case 'SCRIPT':     return 'Script Assistant';
      case 'SHORT_STORY':return 'Story Assistant';
      default:           return 'Writing Assistant';
    }
  });

  readonly placeholder = computed(() => {
    switch (this.writingType()) {
      case 'ESSAY':      return 'Ask about arguments, structure, or evidence…';
      case 'ARTICLE':    return 'Ask about clarity, tone, or accuracy…';
      case 'BLOG_POST':  return 'Ask about engagement, SEO, or flow…';
      case 'RESEARCH':   return 'Ask about findings, citations, or gaps…';
      case 'POETRY':     return 'Ask about meter, imagery, or emotion…';
      case 'SCRIPT':     return 'Ask about dialogue, scene structure, or pacing…';
      default:           return 'Ask about plot, characters, or style…';
    }
  });

  readonly continueLabel = computed(() => {
    switch (this.writingType()) {
      case 'ESSAY':      return 'Continue Argument';
      case 'RESEARCH':   return 'Continue Analysis';
      case 'POETRY':     return 'Continue Poem';
      case 'SCRIPT':     return 'Continue Scene';
      default:           return 'Continue Writing';
    }
  });

  readonly summarizeLabel = computed(() => {
    switch (this.writingType()) {
      case 'ESSAY':
      case 'ARTICLE':
      case 'BLOG_POST':  return 'Summarize Doc';
      case 'RESEARCH':   return 'Key Findings';
      case 'POETRY':     return 'Analyse Poem';
      default:           return 'Summarize';
    }
  });

  readonly primaryActions = computed(() => {
    switch (this.writingType()) {
      case 'SCRIPT': return [
        { key: 'refine-dialogue',  label: 'Refine Dialogue',  icon: 'record_voice_over' },
        { key: 'scene-analysis',   label: 'Scene Analysis',   icon: 'theaters'          },
      ];
      case 'POETRY': return [
        { key: 'analyze-meter',    label: 'Analyze Meter',    icon: 'music_note'        },
        { key: 'check-rhyme',      label: 'Check Rhyme',      icon: 'spellcheck'        },
      ];
      case 'ARTICLE':
      case 'BLOG_POST': return [
        { key: 'improve-clarity',  label: 'Improve Clarity',  icon: 'auto_fix_high'     },
        { key: 'check-flow',       label: 'Check Flow',       icon: 'trending_up'       },
      ];
      case 'ESSAY': return [
        { key: 'strengthen-args',  label: 'Strengthen Args',  icon: 'gavel'             },
        { key: 'check-structure',  label: 'Check Structure',  icon: 'account_tree'      },
      ];
      case 'RESEARCH': return [
        { key: 'summarize-findings', label: 'Summarize',      icon: 'summarize'         },
        { key: 'check-consistency',  label: 'Consistency',    icon: 'fact_check'        },
      ];
      default: return [ // NOVEL, SHORT_STORY
        { key: 'tone-pacing', label: 'Tone & Pacing',         icon: 'auto_fix_high'     },
        { key: 'suggest',     label: 'Suggestions',           icon: 'menu_book'         },
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
  cancelAi = output<void>();
  
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
    const safe = this.sanitizer.sanitize(SecurityContext.HTML, formatted) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(safe);
  }

  formatTime(date: Date | undefined): string {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
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
