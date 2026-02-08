
import { Injectable, inject, signal, computed } from '@angular/core';
import { BinService } from './bin.service';
import { RxdbService } from '../core/services/rxdb.service';

export type SnippetLang =
  | 'Python'
  | 'JavaScript'
  | 'TypeScript'
  | 'Markdown'
  | 'SQL'
  | 'HTML'
  | 'CSS'
  | 'JSON'
  | 'Shell'
  | 'Other';

export interface Snippet {
  id: string;
  title: string;
  lang: SnippetLang;
  tags: string[];
  content: string;
  filename: string;
  path: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}

export type SnippetViewFilter = 'all' | SnippetLang;
export type SnippetViewMode = 'list' | 'grid';
export type SnippetSortBy = 'title' | 'lastModified' | 'lang' | 'path';

const LANGS: SnippetLang[] = ['Python', 'JavaScript', 'TypeScript', 'Markdown', 'SQL', 'HTML', 'CSS', 'JSON', 'Shell', 'Other'];

@Injectable({ providedIn: 'root' })
export class SnippetsService {
  private bin = inject(BinService);
  private rxdb = inject(RxdbService);

  readonly snippets = signal<Snippet[]>([]);
  selectedSnippetId = signal<string | null>(null);
  viewFilter = signal<SnippetViewFilter>('all');
  viewMode = signal<SnippetViewMode>('list');
  sortBy = signal<SnippetSortBy>('lastModified');
  sortDirection = signal<'asc' | 'desc'>('desc');
  searchQuery = signal('');
  selectedLang = signal<SnippetLang | ''>('');
  selectedTag = signal<string>('');

  readonly LANGS = LANGS;

  constructor() {
    this.loadFromRxDB();
  }

  private async loadFromRxDB(): Promise<void> {
    try {
      const list = await this.rxdb.getAllSnippets();
      this.snippets.set(list);
    } catch (e) {
      console.error('[SnippetsService] loadFromRxDB failed', e);
    }
  }

  readonly selectedSnippet = computed(() => {
    const id = this.selectedSnippetId();
    return id ? this.snippets().find(s => s.id === id) ?? null : null;
  });

  readonly allTags = computed(() => {
    const set = new Set<string>();
    this.snippets().forEach(s => s.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  });

  readonly filteredSnippets = computed(() => {
    let list = [...this.snippets()];
    const filter = this.viewFilter();
    if (filter !== 'all') list = list.filter(s => s.lang === filter);
    const lang = this.selectedLang();
    if (lang) list = list.filter(s => s.lang === lang);
    const tag = this.selectedTag();
    if (tag) list = list.filter(s => s.tags.includes(tag));
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.path.toLowerCase().includes(q) ||
        s.creator.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    const field = this.sortBy();
    const dir = this.sortDirection();
    list.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'lastModified': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
        case 'lang': cmp = a.lang.localeCompare(b.lang); break;
        case 'path': cmp = a.path.localeCompare(b.path); break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  readonly stats = computed(() => {
    const all = this.snippets();
    const byLang = new Map<SnippetLang, number>();
    all.forEach(s => byLang.set(s.lang, (byLang.get(s.lang) ?? 0) + 1));
    return { total: all.length, byLang: Object.fromEntries(byLang) };
  });

  readonly snippetsByLang = computed(() => {
    const map = new Map<SnippetLang, number>();
    this.snippets().forEach(s => map.set(s.lang, (map.get(s.lang) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  });

  addSnippet(snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Snippet {
    const now = new Date().toISOString();
    const created: Snippet = {
      ...snippet,
      id: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.snippets.update(list => [...list, created]);
    this.rxdb.upsertSnippet(created).catch(e => console.error('[SnippetsService] persist failed', e));
    return created;
  }

  updateSnippet(id: string, patch: Partial<Snippet>): void {
    const now = new Date().toISOString();
    this.snippets.update(list =>
      list.map(s => (s.id === id ? { ...s, ...patch, updatedAt: now } : s))
    );
    const updated = this.snippets().find(s => s.id === id);
    if (updated) this.rxdb.upsertSnippet(updated).catch(e => console.error('[SnippetsService] persist failed', e));
  }

  deleteSnippet(id: string): void {
    const s = this.snippets().find(x => x.id === id);
    if (!s) return;
    this.bin.addToBin({ type: 'snippet', originalId: id, title: s.title, payload: s });
    this.snippets.update(list => list.filter(x => x.id !== id));
    if (this.selectedSnippetId() === id) this.selectedSnippetId.set(null);
    this.rxdb.removeSnippet(id).catch(e => console.error('[SnippetsService] remove failed', e));
  }

  copyContent(id: string): string | null {
    const s = this.snippets().find(x => x.id === id);
    return s ? s.content : null;
  }
}
