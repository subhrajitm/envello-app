import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { SemanticSearchService } from './semantic-search.service';
import { AiService } from './ai.service';
import { RecentActivityService } from './recent-activity.service';

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

interface ScoredBlock extends ContextBlock {
  score: number;
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
  private activity = inject(RecentActivityService);

  /**
   * Build a cross-module context string for a given topic/query.
   * Keyword candidates are ranked by combined relevance + recency score.
   * Results are filled until tokenBudget (estimated at 4 chars/token) is exhausted.
   */
  async buildContext(query: string, tokenBudget = 2000): Promise<CrossModuleContext> {
    const blocks: ContextBlock[] = [];
    let usedTokens = 0;

    // 1. Semantic search — already ranked by cosine similarity
    if (this.semantic.available) {
      try {
        const results = await this.semantic.search(query, 10);
        for (const r of results) {
          const block: ContextBlock = {
            module: r.type.charAt(0).toUpperCase() + r.type.slice(1),
            title: r.title,
            content: r.preview,
          };
          const cost = this.estimateTokens(`[${block.module}] ${block.title}: ${block.content}`);
          if (usedTokens + cost > tokenBudget) break;
          blocks.push(block);
          usedTokens += cost;
        }
      } catch { /* semantic search may fail — fall through to keyword */ }
    }

    // 2. Keyword candidates with relevance + recency scoring
    const q = query.toLowerCase();
    const candidates: ScoredBlock[] = [];

    for (const n of this.store.notes()) {
      if (!this.matches(q, [n.title, n.preview, ...(n.tags ?? [])])) continue;
      candidates.push({
        module: 'Note', title: n.title, content: n.preview,
        score: this.combinedScore(q, n.title, [n.preview, ...(n.tags ?? [])], n.id, n.lastEdited ?? n.date),
      });
    }

    for (const t of this.store.tasks()) {
      if (!this.matches(q, [t.title, t.description, t.notes, t.project])) continue;
      const content = [t.status, t.priority, t.due ? `due ${t.due}` : '', t.project].filter(Boolean).join(' · ');
      candidates.push({
        module: 'Task', title: t.title, content,
        score: this.combinedScore(q, t.title, [t.description, t.notes, t.project], t.id, t.createdAt),
      });
    }

    for (const m of this.meetings.meetings()) {
      if (!this.matches(q, [m.title, m.description, m.project, ...(m.labels ?? [])])) continue;
      const attendeeNames = m.attendees.map(a => a.name).join(', ');
      const content = [m.date, m.status, attendeeNames ? `with ${attendeeNames}` : ''].filter(Boolean).join(' · ');
      candidates.push({
        module: 'Meeting', title: m.title, content,
        score: this.combinedScore(q, m.title, [m.description, m.project, ...(m.labels ?? [])], m.id, m.updatedAt ?? m.date),
      });
    }

    for (const b of this.store.bookmarks()) {
      if (!this.matches(q, [b.title, b.description, b.url, b.notes, ...(b.tags ?? [])])) continue;
      candidates.push({
        module: 'Bookmark', title: b.title, content: b.url,
        score: this.combinedScore(q, b.title, [b.description, b.url, b.notes, ...(b.tags ?? [])], b.id, b.lastVisited ?? b.createdAt),
      });
    }

    for (const b of this.store.books()) {
      if (!this.matches(q, [b.title, b.writingType, ...(b.genre ?? [])])) continue;
      const meta = [b.status, b.writingType, b.genre?.join(', '), b.wordCount ? `${b.wordCount} words` : ''].filter(Boolean).join(' · ');
      candidates.push({
        module: 'Book', title: b.title, content: meta,
        score: this.combinedScore(q, b.title, [b.writingType, ...(b.genre ?? [])], b.id, b.lastUpdated ?? b.createdAt),
      });
    }

    // 3. Sort by score desc, dedup with semantic results, fill remaining token budget
    candidates.sort((a, b) => b.score - a.score);
    for (const c of candidates) {
      if (blocks.find(b => b.title === c.title)) continue;
      const cost = this.estimateTokens(`[${c.module}] ${c.title}: ${c.content}`);
      if (usedTokens + cost > tokenBudget) break;
      blocks.push({ module: c.module, title: c.title, content: c.content });
      usedTokens += cost;
    }

    const formatted = this.format(query, blocks);
    return { query, blocks, formatted };
  }

  /**
   * Build context specifically around a person's name — used by Relationship Intelligence.
   * Uses recency scoring to surface the most recent interactions first.
   */
  async buildPersonContext(name: string): Promise<CrossModuleContext> {
    const blocks: ContextBlock[] = [];
    const q = name.toLowerCase();

    const scoredMeetings = this.meetings.meetings()
      .filter(m => m.attendees.some(a => a.name.toLowerCase().includes(q)) ||
                   (m.title + ' ' + (m.description ?? '')).toLowerCase().includes(q))
      .map(m => ({ m, score: this.recencyScore(m.updatedAt ?? m.date) }))
      .sort((a, b) => b.score - a.score);
    for (const { m } of scoredMeetings.slice(0, 5)) {
      blocks.push({
        module: 'Meeting',
        title: m.title,
        content: `${m.date} · ${m.status} · ${m.attendees.map(a => a.name).join(', ')}`,
      });
    }

    const scoredTasks = this.store.tasks()
      .filter(t => (t.title + ' ' + (t.description ?? '') + ' ' + (t.notes ?? '')).toLowerCase().includes(q))
      .map(t => ({ t, score: this.recencyScore(t.createdAt) }))
      .sort((a, b) => b.score - a.score);
    for (const { t } of scoredTasks.slice(0, 5)) {
      blocks.push({ module: 'Task', title: t.title, content: `${t.status} · ${t.priority}${t.due ? ` · due ${t.due}` : ''}` });
    }

    const scoredNotes = this.store.notes()
      .filter(n => (n.title + ' ' + n.preview).toLowerCase().includes(q))
      .map(n => ({ n, score: this.recencyScore(n.lastEdited ?? n.date) }))
      .sort((a, b) => b.score - a.score);
    for (const { n } of scoredNotes.slice(0, 5)) {
      blocks.push({ module: 'Note', title: n.title, content: n.preview });
    }

    const scoredBooks = this.store.books()
      .filter(b => (b.title + ' ' + (b.genre ?? []).join(' ')).toLowerCase().includes(q))
      .map(b => ({ b, score: this.recencyScore(b.lastUpdated ?? b.createdAt) }))
      .sort((a, b) => b.score - a.score);
    for (const { b } of scoredBooks.slice(0, 3)) {
      const meta = [b.status, b.writingType, b.genre?.join(', ')].filter(Boolean).join(' · ');
      blocks.push({ module: 'Book', title: b.title, content: meta });
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

  /**
   * Combined score:
   *   65% relevance — title match = 2pts, other fields = 1pt each, normalized
   *   20% recency   — linear decay from 1.0 (today) to 0.0 (≥1 year ago)
   *   15% activity  — boost based on how recently the user opened this item
   */
  private combinedScore(
    query: string,
    title: string,
    otherFields: (string | undefined | null)[],
    id: string,
    dateStr?: string,
  ): number {
    const q = query.toLowerCase();
    let relevance = title.toLowerCase().includes(q) ? 2 : 0;
    for (const f of otherFields) {
      if (f && f.toLowerCase().includes(q)) relevance += 1;
    }
    const normalizedRelevance = relevance / (2 + otherFields.length);
    return normalizedRelevance * 0.65
      + this.recencyScore(dateStr) * 0.20
      + this.activity.getBoost(id) * 0.15;
  }

  /** Linear recency decay: 1.0 = today, 0.0 = ≥1 year ago. */
  private recencyScore(dateStr?: string): number {
    if (!dateStr) return 0;
    const ageMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, 1 - ageMs / (365 * 24 * 60 * 60 * 1000));
  }

  /** Rough token estimate: 4 characters ≈ 1 token. */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

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
