import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { SemanticSearchService } from './semantic-search.service';
import { AiService } from './ai.service';

export interface ContextBlock {
  module: string;
  title: string;
  content: string;
}

export interface CrossModuleContext {
  query: string;
  blocks: ContextBlock[];
  formatted: string;
}

/**
 * Collects relevant cross-module context for AI prompts.
 * This is the foundation of Envello's Context Engine — because all data
 * lives in one place, the AI can see the full picture no other tool can.
 */
@Injectable({ providedIn: 'root' })
export class ContextService {
  private store    = inject(StoreService);
  private meetings = inject(MeetingsService);
  private semantic = inject(SemanticSearchService);
  private ai       = inject(AiService);

  /**
   * Build a cross-module context string for a given topic/query.
   * Used to inject relevant background into any AI prompt.
   */
  async buildContext(query: string, maxBlocksPerModule = 3): Promise<CrossModuleContext> {
    const blocks: ContextBlock[] = [];

    // 1. Semantic search across notes, tasks, bookmarks, books
    if (this.semantic.available) {
      try {
        const results = await this.semantic.search(query, maxBlocksPerModule * 2);
        for (const r of results.slice(0, maxBlocksPerModule * 2)) {
          blocks.push({
            module: r.type.charAt(0).toUpperCase() + r.type.slice(1),
            title: r.title,
            content: r.preview,
          });
        }
      } catch { /* semantic search may fail — fall through to keyword */ }
    }

    // 2. Keyword search as fallback / supplement
    const q = query.toLowerCase();

    const noteMatches = this.store.notes()
      .filter(n => this.matches(q, [n.title, n.preview, ...(n.tags ?? [])]))
      .slice(0, maxBlocksPerModule);
    for (const n of noteMatches) {
      if (!blocks.find(b => b.title === n.title)) {
        blocks.push({ module: 'Note', title: n.title, content: n.preview });
      }
    }

    const taskMatches = this.store.tasks()
      .filter(t => this.matches(q, [t.title, t.description, t.notes, t.project]))
      .slice(0, maxBlocksPerModule);
    for (const t of taskMatches) {
      if (!blocks.find(b => b.title === t.title)) {
        blocks.push({
          module: 'Task',
          title: t.title,
          content: [t.status, t.priority, t.due ? `due ${t.due}` : '', t.project].filter(Boolean).join(' · '),
        });
      }
    }

    const meetingMatches = this.meetings.meetings()
      .filter(m => this.matches(q, [m.title, m.description, m.project, ...(m.labels ?? [])]))
      .slice(0, maxBlocksPerModule);
    for (const m of meetingMatches) {
      const attendeeNames = m.attendees.map(a => a.name).join(', ');
      if (!blocks.find(b => b.title === m.title)) {
        blocks.push({
          module: 'Meeting',
          title: m.title,
          content: [m.date, m.status, attendeeNames ? `with ${attendeeNames}` : ''].filter(Boolean).join(' · '),
        });
      }
    }

    const bookmarkMatches = this.store.bookmarks()
      .filter(b => this.matches(q, [b.title, b.description, b.url, b.notes, ...(b.tags ?? [])]))
      .slice(0, maxBlocksPerModule);
    for (const b of bookmarkMatches) {
      if (!blocks.find(bk => bk.title === b.title)) {
        blocks.push({ module: 'Bookmark', title: b.title, content: b.url });
      }
    }

    const formatted = this.format(query, blocks);
    return { query, blocks, formatted };
  }

  /**
   * Build context specifically around a person's name — used by Relationship Intelligence.
   */
  async buildPersonContext(name: string): Promise<CrossModuleContext> {
    const blocks: ContextBlock[] = [];
    const q = name.toLowerCase();

    const meetings = this.meetings.meetings()
      .filter(m => m.attendees.some(a => a.name.toLowerCase().includes(q)) ||
                   (m.title + ' ' + (m.description ?? '')).toLowerCase().includes(q));
    for (const m of meetings.slice(0, 5)) {
      blocks.push({
        module: 'Meeting',
        title: m.title,
        content: `${m.date} · ${m.status} · ${m.attendees.map(a => a.name).join(', ')}`,
      });
    }

    const tasks = this.store.tasks()
      .filter(t => (t.title + ' ' + (t.description ?? '') + ' ' + (t.notes ?? '')).toLowerCase().includes(q));
    for (const t of tasks.slice(0, 5)) {
      blocks.push({ module: 'Task', title: t.title, content: `${t.status} · ${t.priority}${t.due ? ` · due ${t.due}` : ''}` });
    }

    const notes = this.store.notes()
      .filter(n => (n.title + ' ' + n.preview).toLowerCase().includes(q));
    for (const n of notes.slice(0, 5)) {
      blocks.push({ module: 'Note', title: n.title, content: n.preview });
    }

    return { query: name, blocks, formatted: this.format(name, blocks) };
  }

  /**
   * Enrich an AI prompt with cross-module context.
   * Drop-in wrapper around AiService.sendMessage.
   */
  async sendWithContext(
    prompt: string,
    query: string,
    systemContext?: string,
    feature?: Parameters<AiService['sendMessage']>[2],
  ): Promise<string> {
    const ctx = await this.buildContext(query);
    const enriched = ctx.blocks.length
      ? `${systemContext ?? ''}\n\n--- Relevant context from user's data ---\n${ctx.formatted}\n--- End context ---`
      : systemContext;
    return this.ai.sendMessage(prompt, enriched, feature);
  }

  /** Stream variant of sendWithContext. */
  async *streamWithContext(
    prompt: string,
    query: string,
    systemContext?: string,
    feature?: Parameters<AiService['streamMessage']>[2],
  ): AsyncIterable<string> {
    const ctx = await this.buildContext(query);
    const enriched = ctx.blocks.length
      ? `${systemContext ?? ''}\n\n--- Relevant context from user's data ---\n${ctx.formatted}\n--- End context ---`
      : systemContext;
    yield* this.ai.streamMessage(prompt, enriched, feature);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private matches(query: string, fields: (string | undefined | null)[]): boolean {
    return fields.some(f => f && f.toLowerCase().includes(query));
  }

  private format(query: string, blocks: ContextBlock[]): string {
    if (!blocks.length) return '';
    const lines = [`Relevant context for "${query}":`];
    for (const b of blocks) {
      lines.push(`[${b.module}] ${b.title}: ${b.content}`);
    }
    return lines.join('\n');
  }
}
