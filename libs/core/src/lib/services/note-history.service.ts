import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { NoteHistoryEntry } from '@envello/domain';
import { StoreService } from './store.service';

const MAX_SNAPSHOTS    = 30;
const AUTO_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable({ providedIn: 'root' })
export class NoteHistoryService {
  private db    = inject(DataService);
  private store = inject(StoreService);

  // In-memory cache: avoids full-table getAll on every call (A)
  private historyCache      = new Map<string, NoteHistoryEntry[]>();
  // Per-note last-snapshot timestamp (seeds from DB on first call)
  private lastSnapshotAt    = new Map<string, number>();
  // Per-note last-snapshot plain-text fingerprint for content-diff (B, C)
  private lastSnapshotText  = new Map<string, string>();

  private textOf(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Auto-snapshot: saves a snapshot if ≥30 min have passed AND content changed
   * since the last snapshot. Seeds in-memory state from DB on first call.
   */
  async autoSnapshot(noteId: string, title: string, content: string): Promise<void> {
    if (!this.textOf(content)) return;

    // Seed from DB on first call per note (A — uses cache)
    if (!this.lastSnapshotAt.has(noteId)) {
      const history = await this.getHistory(noteId);
      if (history.length > 0) {
        this.lastSnapshotAt.set(noteId, new Date(history[0].snapshotAt).getTime());
        this.lastSnapshotText.set(noteId, this.textOf(history[0].content));
      }
    }

    const last = this.lastSnapshotAt.get(noteId) ?? 0;
    if (Date.now() - last < AUTO_INTERVAL_MS) return;

    // C: skip if content hasn't changed since last snapshot
    const lastText = this.lastSnapshotText.get(noteId) ?? '';
    if (lastText && lastText === this.textOf(content)) return;

    await this.saveSnapshot(noteId, title, content);
  }

  /**
   * Always saves a snapshot (manual save). Returns true if a snapshot was
   * actually written, false if blocked (empty content or identical to last).
   */
  async saveSnapshot(noteId: string, title: string, content: string, label?: string): Promise<boolean> {
    if (!this.textOf(content)) return false;

    // B: skip if content is identical to the most-recent snapshot
    const existing = await this.getHistory(noteId);
    if (existing.length > 0 && !label && this.textOf(existing[0].content) === this.textOf(content)) {
      return false;
    }

    const entry: NoteHistoryEntry = {
      id: crypto.randomUUID(),
      noteId,
      title,
      content,
      snapshotAt: new Date().toISOString(),
      label,
    };

    await this.db.upsert('note_history', entry);
    this.lastSnapshotAt.set(noteId, Date.now());
    this.lastSnapshotText.set(noteId, this.textOf(content));

    // Prepend to cache and prune
    const updated = [entry, ...existing];
    if (updated.length > MAX_SNAPSHOTS) {
      const toDelete = updated.splice(MAX_SNAPSHOTS);
      await Promise.all(toDelete.map(e => this.db.remove('note_history', e.id)));
    }
    this.historyCache.set(noteId, updated);

    return true;
  }

  /** Returns history for a note, newest first. Uses in-memory cache (A). */
  async getHistory(noteId: string): Promise<NoteHistoryEntry[]> {
    if (this.historyCache.has(noteId)) {
      return this.historyCache.get(noteId)!;
    }
    const all = await this.db.getAll<NoteHistoryEntry>('note_history');
    const filtered = all
      .filter(e => e.noteId === noteId)
      .sort((a, b) => (b.snapshotAt ?? '').localeCompare(a.snapshotAt ?? ''));
    this.historyCache.set(noteId, filtered);
    return filtered;
  }

  /** Restores a snapshot. Saves a 'Before restore' checkpoint first. */
  async restore(entry: NoteHistoryEntry): Promise<void> {
    const note = this.store.notes().find(n => n.id === entry.noteId);
    if (note?.content) {
      await this.saveSnapshot(entry.noteId, note.title, note.content, 'Before restore');
    }
    this.store.updateNote(entry.noteId, {
      content: entry.content,
      preview: entry.content.replace(/<[^>]*>/g, '').substring(0, 100),
    });
  }

  /** Deletes a single snapshot. Invalidates cache. */
  async deleteSnapshot(id: string): Promise<void> {
    await this.db.remove('note_history', id);
    // Invalidate any cached list that contains this id
    for (const [noteId, entries] of this.historyCache) {
      if (entries.some(e => e.id === id)) {
        this.historyCache.delete(noteId);
        break;
      }
    }
  }

  /** Deletes all history for a note. Invalidates cache. */
  async deleteAllForNote(noteId: string): Promise<void> {
    const entries = await this.getHistory(noteId);
    await Promise.all(entries.map(e => this.db.remove('note_history', e.id)));
    this.historyCache.delete(noteId);
    this.lastSnapshotAt.delete(noteId);
    this.lastSnapshotText.delete(noteId);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
