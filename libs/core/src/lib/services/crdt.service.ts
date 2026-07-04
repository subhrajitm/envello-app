import { Injectable, inject } from '@angular/core';
import * as A from '@automerge/automerge/slim';
import { PowerSyncService } from './powersync.service';

export interface CrdtNoteDoc extends Record<string, unknown> {
  content: string;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class CrdtService {
  private readonly ps = inject(PowerSyncService);

  private ready: Promise<void> | null = null;
  private cache = new Map<string, A.Doc<CrdtNoteDoc>>();

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = A.initializeWasm('/assets/automerge.wasm').then(() => {});
    }
    return this.ready;
  }

  async getOrCreate(noteId: string, content = '', title = ''): Promise<A.Doc<CrdtNoteDoc>> {
    await this.ensureReady();
    if (this.cache.has(noteId)) return this.cache.get(noteId)!;

    const row = await this.ps.db.getOptional<{ state_b64: string }>(
      'SELECT state_b64 FROM note_crdt WHERE id = ?',
      [noteId]
    );

    let doc: A.Doc<CrdtNoteDoc>;
    if (row?.state_b64) {
      try {
        doc = A.load<CrdtNoteDoc>(this.b64ToBytes(row.state_b64));
      } catch {
        doc = A.from<CrdtNoteDoc>({ content, title });
      }
    } else {
      doc = A.from<CrdtNoteDoc>({ content, title });
    }

    this.cache.set(noteId, doc);
    return doc;
  }

  /** Called when the user saves a note locally. Returns the full Automerge state as base64. */
  async recordLocalEdit(noteId: string, content: string, title: string): Promise<string> {
    await this.ensureReady();
    const base = await this.getOrCreate(noteId, content, title);
    const updated = A.change(base, d => {
      d.content = content;
      d.title = title;
    });
    this.cache.set(noteId, updated);
    await this.persist(noteId, updated);
    return this.bytesToB64(A.save(updated));
  }

  /**
   * Called when a remote note arrives via PowerSync.
   * Merges the remote Automerge state with the local one.
   * Returns the merged { content, title }, or null if merge failed.
   */
  async mergeRemote(noteId: string, remoteStateB64: string): Promise<{ content: string; title: string } | null> {
    await this.ensureReady();
    try {
      const remoteDoc = A.load<CrdtNoteDoc>(this.b64ToBytes(remoteStateB64));
      const localDoc  = await this.getOrCreate(noteId, remoteDoc.content, remoteDoc.title);
      const merged    = A.merge(A.clone(localDoc), remoteDoc);
      this.cache.set(noteId, merged);
      await this.persist(noteId, merged);
      return { content: merged.content ?? '', title: merged.title ?? '' };
    } catch (e) {
      console.error('[CrdtService] mergeRemote failed for', noteId, e);
      return null;
    }
  }

  /** Remove cached doc and persisted state when a note is deleted. */
  async remove(noteId: string): Promise<void> {
    this.cache.delete(noteId);
    await this.ps.db.execute('DELETE FROM note_crdt WHERE id = ?', [noteId]).catch(() => {});
  }

  private async persist(noteId: string, doc: A.Doc<CrdtNoteDoc>): Promise<void> {
    const stateB64 = this.bytesToB64(A.save(doc));
    await this.ps.db.execute(
      'INSERT OR REPLACE INTO note_crdt (id, state_b64) VALUES (?, ?)',
      [noteId, stateB64]
    );
  }

  private bytesToB64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private b64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
