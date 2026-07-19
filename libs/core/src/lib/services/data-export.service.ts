import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';

export interface ExportCollectionMeta {
  id: string;
  label: string;
  includeInMarkdown: boolean;
}

export const EXPORT_COLLECTIONS: ExportCollectionMeta[] = [
  { id: 'tasks',                label: 'Tasks',                includeInMarkdown: true  },
  { id: 'notes',                label: 'Notes',                includeInMarkdown: true  },
  { id: 'planning_items',       label: 'Planning',             includeInMarkdown: false },
  { id: 'activities',           label: 'Activities',           includeInMarkdown: false },
  { id: 'books',                label: 'Books',                includeInMarkdown: false },
  { id: 'book_content',         label: 'Book Content',         includeInMarkdown: true  },
  { id: 'meetings',             label: 'Meetings',             includeInMarkdown: true  },
  { id: 'articles',             label: 'Articles',             includeInMarkdown: true  },
  { id: 'research_collections', label: 'Research Collections', includeInMarkdown: false },
  { id: 'research_sources',     label: 'Research Sources',     includeInMarkdown: false },
  { id: 'research_summaries',   label: 'Research Summaries',   includeInMarkdown: true  },
  { id: 'projects',             label: 'Projects',             includeInMarkdown: false },
  { id: 'note_folders',         label: 'Note Folders',         includeInMarkdown: false },
  { id: 'bookmarks',            label: 'Bookmarks',            includeInMarkdown: false },
  { id: 'bookmark_folders',     label: 'Bookmark Folders',     includeInMarkdown: false },
  { id: 'people',               label: 'People',               includeInMarkdown: false },
  { id: 'transactions',         label: 'Transactions',         includeInMarkdown: false },
  // Vault — included in backup only (not in the user-facing export picker)
  { id: 'credentials',                label: 'Credentials',                includeInMarkdown: false },
  { id: 'credential_transaction_links', label: 'Credential Links',           includeInMarkdown: false },
];

export type ExportFormat = 'json' | 'markdown';

@Injectable({ providedIn: 'root' })
export class DataExportService {
  private readonly data = inject(DataService);

  async export(format: ExportFormat, collectionIds: string[]): Promise<void> {
    const selected = EXPORT_COLLECTIONS.filter(c => collectionIds.includes(c.id));

    if (format === 'json') {
      await this.downloadJson(selected);
    } else {
      await this.downloadMarkdown(selected);
    }
  }

  private async downloadJson(collections: ExportCollectionMeta[]): Promise<void> {
    const exportedAt = new Date().toISOString();
    const result: Record<string, any[]> = {};

    await Promise.all(
      collections.map(async col => {
        try {
          result[col.id] = await this.data.getAll(col.id);
        } catch {
          result[col.id] = [];
        }
      })
    );

    const payload = { exportedAt, version: 1, collections: result };
    this.triggerDownload(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `envello-export-${exportedAt.slice(0, 10)}.json`
    );
  }

  private async downloadMarkdown(collections: ExportCollectionMeta[]): Promise<void> {
    const parts: string[] = [`# Envello Export\n\n_Exported ${new Date().toLocaleString()}_\n`];
    const markdownCols = collections.filter(c => c.includeInMarkdown);

    for (const col of markdownCols) {
      let items: any[] = [];
      try { items = await this.data.getAll(col.id); } catch { continue; }
      if (!items.length) continue;

      parts.push(`\n---\n\n## ${col.label}\n`);
      parts.push(this.collectionToMarkdown(col.id, items));
    }

    this.triggerDownload(
      new Blob([parts.join('\n')], { type: 'text/markdown' }),
      `envello-export-${new Date().toISOString().slice(0, 10)}.md`
    );
  }

  private collectionToMarkdown(collection: string, items: any[]): string {
    const lines: string[] = [];

    for (const item of items) {
      switch (collection) {
        case 'tasks':
          lines.push(`### ${item.title ?? 'Untitled'}`);
          if (item.status)   lines.push(`**Status:** ${item.status}`);
          if (item.priority) lines.push(`**Priority:** ${item.priority}`);
          if (item.due)      lines.push(`**Due:** ${item.due}`);
          if (item.notes)    lines.push(`\n${item.notes}`);
          lines.push('');
          break;

        case 'notes':
          lines.push(`### ${item.title ?? item.date ?? 'Untitled'}`);
          if (item.tags?.length) lines.push(`**Tags:** ${(item.tags as string[]).join(', ')}`);
          if (item.content) lines.push(`\n${this.stripHtml(item.content)}`);
          lines.push('');
          break;

        case 'meetings':
          lines.push(`### ${item.title ?? 'Untitled Meeting'}`);
          if (item.date)      lines.push(`**Date:** ${item.date}`);
          if (item.status)    lines.push(`**Status:** ${item.status}`);
          if (item.notes && Array.isArray(item.notes)) {
            const noteLines = (item.notes as any[]).map((n: any) => `- ${n.text ?? n}`).join('\n');
            lines.push(`\n**Notes:**\n${noteLines}`);
          }
          lines.push('');
          break;

        case 'articles':
          lines.push(`### ${item.title ?? 'Untitled'}`);
          if (item.platform) lines.push(`**Platform:** ${item.platform}`);
          if (item.url)      lines.push(`**URL:** ${item.url}`);
          if (item.excerpt)  lines.push(`\n${item.excerpt}`);
          if (item.content)  lines.push(`\n${this.stripHtml(item.content)}`);
          lines.push('');
          break;

        case 'book_content': {
          const parsed = typeof item.data === 'string' ? (() => { try { return JSON.parse(item.data); } catch { return null; } })() : item.data;
          if (parsed?.title) lines.push(`### ${parsed.title}`);
          if (parsed?.content) lines.push(`\n${this.stripHtml(parsed.content)}`);
          lines.push('');
          break;
        }

        case 'research_summaries':
          lines.push(`### ${item.title ?? 'Summary'}`);
          if (item.summary) lines.push(`\n${item.summary}`);
          lines.push('');
          break;

        default:
          lines.push(`- ${JSON.stringify(item)}`);
      }
    }

    return lines.join('\n');
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(h[1-6]|li|tr|td|th|blockquote)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
