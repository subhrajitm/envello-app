import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'envello_backup_collections';

export const BACKUP_ELIGIBLE_COLLECTIONS = [
  { id: 'tasks',                 label: 'Tasks' },
  { id: 'notes',                 label: 'Notes' },
  { id: 'planning_items',        label: 'Planning' },
  { id: 'activities',            label: 'Activities' },
  { id: 'books',                 label: 'Books' },
  { id: 'meetings',              label: 'Meetings' },
  { id: 'articles',              label: 'Articles' },
  { id: 'research_collections',  label: 'Research Collections' },
  { id: 'research_sources',      label: 'Research Sources' },
  { id: 'research_summaries',    label: 'Research Summaries' },
  { id: 'projects',              label: 'Projects' },
  { id: 'note_folders',          label: 'Note Folders' },
  { id: 'bookmarks',             label: 'Bookmarks' },
  { id: 'bookmark_folders',      label: 'Bookmark Folders' },
  { id: 'subscriptions',         label: 'Subscriptions' },
  { id: 'book_content',          label: 'Book Content' },
] as const;

@Injectable({ providedIn: 'root' })
export class DesktopSyncSettingsService {
  private readonly _enabled = signal<Set<string>>(this.load());

  readonly enabledCollections = this._enabled.asReadonly();
  readonly enabledList = computed(() => [...this._enabled()]);

  isEnabled(collection: string): boolean {
    return this._enabled().has(collection);
  }

  toggle(collection: string): void {
    const next = new Set(this._enabled());
    if (next.has(collection)) {
      next.delete(collection);
    } else {
      next.add(collection);
    }
    this._enabled.set(next);
    this.save(next);
  }

  enableAll(): void {
    const all = new Set(BACKUP_ELIGIBLE_COLLECTIONS.map(c => c.id));
    this._enabled.set(all);
    this.save(all);
  }

  disableAll(): void {
    this._enabled.set(new Set());
    this.save(new Set());
  }

  private load(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw
        ? new Set(JSON.parse(raw) as string[])
        : new Set(BACKUP_ELIGIBLE_COLLECTIONS.map(c => c.id));
    } catch {
      return new Set(BACKUP_ELIGIBLE_COLLECTIONS.map(c => c.id));
    }
  }

  private save(s: Set<string>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  }
}
