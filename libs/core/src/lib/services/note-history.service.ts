import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { NoteHistoryEntry } from '@envello/domain';
import { StoreService } from './store.service';

const MAX_SNAPSHOTS   = 30;
const AUTO_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable({ providedIn: 'root' })
export class NoteHistoryService {
  private db    = inject(DataService);
  private store = inject(StoreService);

  // Tracks last auto-snapshot time per note (in-memory, resets on reload)
  private lastSnapshotAt = new Map<string, number>();

  /**
   * Auto-snapshot: saves a snapshot if ≥30 min have passed since the last one.
   * Seeds the in-memory timer from the DB on first call per note so restarts
   * don't reset the 30-minute window.
   */
  async autoSnapshot(noteId: string, title: string, content: string): Promise<void> {
    if (!content?.replace(/<[^>]*>/g, '').trim()) return;

    // Seed from DB if not yet tracked in this session
    if (!this.lastSnapshotAt.has(noteId)) {
      const history = await this.getHistory(noteId);
      if (history.length > 0) {
        this.lastSnapshotAt.set(noteId, new Date(history[0].snapshotAt).getTime());
      }
    }

    const last = this.lastSnapshotAt.get(noteId) ?? 0;
    if (Date.now() - last < AUTO_INTERVAL_MS) return;
    await this.saveSnapshot(noteId, title, content);
  }

  /** Always saves a snapshot regardless of timing. Used for manual "Save version". */
  async saveSnapshot(noteId: string, title: string, content: string, label?: string): Promise<void> {
    if (!content?.replace(/<[^>]*>/g, '').trim()) return;

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

    // Prune old snapshots — keep newest MAX_SNAPSHOTS
    const all = await this.getHistory(noteId);
    if (all.length > MAX_SNAPSHOTS) {
      const toDelete = all.slice(MAX_SNAPSHOTS);
      await Promise.all(toDelete.map(e => this.db.remove('note_history', e.id)));
    }
  }

  /** Returns history for a note, newest first. */
  async getHistory(noteId: string): Promise<NoteHistoryEntry[]> {
    const all = await this.db.getAll<NoteHistoryEntry>('note_history');
    return all
      .filter(e => e.noteId === noteId)
      .sort((a, b) => b.snapshotAt.localeCompare(a.snapshotAt));
  }

  /** Restores a snapshot into the active note. Saves the current content first so it's recoverable. */
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

  /** Deletes a single snapshot. */
  async deleteSnapshot(id: string): Promise<void> {
    await this.db.remove('note_history', id);
  }

  /** Deletes all history for a note (e.g. when note is deleted). */
  async deleteAllForNote(noteId: string): Promise<void> {
    const entries = await this.getHistory(noteId);
    await Promise.all(entries.map(e => this.db.remove('note_history', e.id)));
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
