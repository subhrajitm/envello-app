import {
  Component, input, output, signal,
  computed, inject, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiService, BookContentService } from '@envello/core';

export type CoachAnalysis =
  | 'character-consistency'
  | 'plot-threads'
  | 'pacing'
  | 'overused-words'
  | 'beta-reader'
  | 'show-dont-tell';

interface CoachCard {
  key: CoachAnalysis;
  label: string;
  icon: string;
  description: string;
  requiresManuscript: boolean;
}

@Component({
  selector: 'app-writing-coach',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './writing-coach.component.html',
  styleUrls: ['./writing-coach.component.css', '../../../composer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WritingCoachComponent {
  private ai        = inject(AiService);
  private book      = inject(BookContentService);
  private cdr       = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  closed = output<void>();

  activeAnalysis = signal<CoachAnalysis | null>(null);
  result         = signal('');
  isGenerating   = signal(false);
  aborted        = false;

  readonly cards: CoachCard[] = [
    {
      key: 'beta-reader',
      label: 'Beta Reader',
      icon: 'rate_review',
      description: 'Full manuscript read-through with honest beta-reader feedback on story, pacing, characters, and engagement.',
      requiresManuscript: true,
    },
    {
      key: 'character-consistency',
      label: 'Character Consistency',
      icon: 'manage_accounts',
      description: 'Checks whether character descriptions, voices, and behaviour stay consistent across all chapters.',
      requiresManuscript: true,
    },
    {
      key: 'plot-threads',
      label: 'Plot Threads',
      icon: 'account_tree',
      description: 'Identifies story threads that were opened but never resolved by the final chapter.',
      requiresManuscript: true,
    },
    {
      key: 'pacing',
      label: 'Pacing Overview',
      icon: 'speed',
      description: 'Analyses the distribution of action, dialogue, and description across chapters to flag pacing issues.',
      requiresManuscript: true,
    },
    {
      key: 'overused-words',
      label: 'Overused Words',
      icon: 'format_color_text',
      description: 'Finds the most frequently repeated words and phrases across your manuscript.',
      requiresManuscript: false,
    },
    {
      key: 'show-dont-tell',
      label: 'Show, Don\'t Tell',
      icon: 'visibility',
      description: 'Scans for common "telling" patterns and suggests more immersive showing alternatives.',
      requiresManuscript: true,
    },
  ];

  hasContent = computed(() => {
    const b = this.book.activeBook();
    return b ? b.chapters.flatMap(g => g.children).some(c => c.content?.trim()) : false;
  });

  async run(key: CoachAnalysis) {
    if (this.isGenerating()) { this.aborted = true; }
    const b = this.book.activeBook();
    if (!b) return;

    if (key === 'overused-words') {
      this.activeAnalysis.set(key);
      this.result.set(this.computeOverusedWords(b.chapters.flatMap(g => g.children).map(c => c.content).join(' ')));
      this.cdr.markForCheck();
      return;
    }

    const allChapters = b.chapters.flatMap(g => g.children);
    const manuscriptText = allChapters
      .filter(c => c.content?.trim())
      .map(c => `## ${c.title}\n${c.content.replace(/<[^>]*>/g, '')}`)
      .join('\n\n');

    if (!manuscriptText.trim()) {
      this.result.set('No chapter content found. Write some chapters first.');
      this.activeAnalysis.set(key);
      this.cdr.markForCheck();
      return;
    }

    const characterList = b.characters.length
      ? b.characters.map(c => `- ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n')
      : 'No characters defined.';

    const { system, user } = this.buildPrompt(key, manuscriptText, characterList, b.synopsis);

    this.activeAnalysis.set(key);
    this.result.set('');
    this.isGenerating.set(true);
    this.aborted = false;

    try {
      for await (const chunk of this.ai.streamMessage(user, system, 'writing')) {
        if (this.aborted) break;
        this.result.update(r => r + chunk);
        this.cdr.markForCheck();
      }
    } catch {
      this.result.set('Analysis failed. Please check your AI configuration in Settings.');
    } finally {
      this.isGenerating.set(false);
      this.cdr.markForCheck();
    }
  }

  cancel() {
    this.aborted = true;
    this.isGenerating.set(false);
  }

  clear() {
    this.aborted = true;
    this.isGenerating.set(false);
    this.activeAnalysis.set(null);
    this.result.set('');
  }

  private buildPrompt(
    key: CoachAnalysis,
    manuscript: string,
    characters: string,
    synopsis: { logline: string; theme: string },
  ): { system: string; user: string } {
    const cap = manuscript.substring(0, 18000); // stay within context limits

    switch (key) {
      case 'beta-reader':
        return {
          system: 'You are an experienced beta reader who has read thousands of novels. Give honest, constructive feedback as if writing notes to a first-time author you want to help succeed. Use markdown headings to organize your feedback.',
          user: `Please read the following manuscript and give me honest beta-reader feedback. Cover: overall impression, what works well, what confused you, pacing, character engagement, and your top 3 suggestions for improvement.\n\nManuscript:\n${cap}`,
        };

      case 'character-consistency':
        return {
          system: 'You are a meticulous developmental editor specializing in character continuity. Use markdown for your response.',
          user: `Analyze character consistency across the following manuscript.\n\nCharacters defined:\n${characters}\n\nManuscript:\n${cap}\n\nFor each main character, note: (1) any inconsistencies in description or personality across chapters, (2) moments where their voice sounds off, (3) any continuity errors (e.g. eye colour, backstory). If everything is consistent, say so.`,
        };

      case 'plot-threads':
        return {
          system: 'You are a structural editor who specializes in plot architecture. Use markdown for your response.',
          user: `Book logline: ${synopsis.logline || 'Not provided'}\nTheme: ${synopsis.theme || 'Not provided'}\n\nManuscript:\n${cap}\n\nIdentify all story threads — subplots, mysteries, promises made to the reader, character arcs, foreshadowing. Then note which threads are satisfyingly resolved, which are left dangling, and which need more development.`,
        };

      case 'pacing':
        return {
          system: 'You are a pacing specialist and developmental editor. Use markdown for your response.',
          user: `Analyze the pacing of the following manuscript chapter by chapter.\n\nManuscript:\n${cap}\n\nFor each chapter or section, briefly note: dominant mode (action / dialogue / description / introspection), energy level (high / medium / low), and any pacing problems. Then give an overall pacing assessment and 3 specific recommendations.`,
        };

      case 'show-dont-tell':
        return {
          system: 'You are a creative writing coach specializing in prose craft. Use markdown for your response.',
          user: `Scan the following manuscript for "telling" rather than "showing". Look for: emotion words stated directly (e.g. "she felt angry"), adverbs that substitute for stronger verbs, explanatory sentences that underestimate the reader, and passages that describe what characters think without dramatizing it.\n\nManuscript:\n${cap}\n\nList the 10 most egregious examples with the original passage and a suggested revision. Then give a general assessment.`,
        };

      default:
        return { system: 'You are a writing coach.', user: manuscript };
    }
  }

  formatResult(text: string): SafeHtml {
    const html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^(\d+)\. /gm, '<span class="wc-num">$1.</span> ')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(`<p>${html}</p>`);
  }

  private computeOverusedWords(text: string): string {
    const plain = text.replace(/<[^>]*>/g, ' ').toLowerCase();
    const words = plain.match(/\b[a-z]{4,}\b/g) ?? [];

    const STOP = new Set([
      'that','this','with','from','have','been','were','they','their','there',
      'would','could','should','will','about','which','when','what','then','than',
      'into','some','your','more','also','just','like','said','even','much',
      'very','only','such','over','after','before','where','while','through',
      'being','these','those','having','going','because','though','still',
      'each','both','here','come','down','does','them','made','most','many',
    ]);

    const freq = new Map<string, number>();
    for (const w of words) {
      if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    }

    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    if (!sorted.length) return 'No content to analyse yet.';

    const totalWords = words.length;
    const lines = [
      `**Manuscript word count:** ${totalWords.toLocaleString()} words\n`,
      '**Top 30 most-used words** (excluding common stop words):\n',
      ...sorted.map(([w, n], i) =>
        `${i + 1}. **${w}** — ${n} times (${((n / totalWords) * 100).toFixed(2)}%)`,
      ),
      '\n_Words appearing more than 0.5% of the time may feel repetitive to readers._',
    ];
    return lines.join('\n');
  }
}
