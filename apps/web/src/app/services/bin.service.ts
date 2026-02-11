
import { Injectable, signal, inject } from '@angular/core';
import { DatabaseService } from '../core/services/database.service';

export type BinItemType =
  | 'daily-note'
  | 'novel'
  | 'novel-chapter'
  | 'novel-group'
  | 'novel-note'
  | 'novel-character'
  | 'novel-location'
  | 'journal-entry'
  | 'journal-project'
  | 'task'
  | 'meeting'
  | 'book'
  | 'snippet';

export interface BinItem {
  /** Unique id for the bin entry itself */
  id: string;
  /** Entity type that was deleted */
  type: BinItemType;
  /** Original entity id */
  originalId: string;
  /** Optional higher-level context, e.g. novel id */
  contextId?: string;
  /** Optional human-readable title/name */
  title?: string;
  /** ISO timestamp string when the item was moved to bin */
  deletedAt: string;
  /** Raw payload so we can potentially restore later */
  payload: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class BinService {
  /** All items currently in the bin (most recent first). */
  readonly items = signal<BinItem[]>([]);

  private db = inject(DatabaseService);

  constructor() {
    this.loadFromDb();
  }

  private async loadFromDb(): Promise<void> {
    try {
      const list = await this.db.getAll<BinItem>('bin_items');
      this.items.set(list);
    } catch (e) {
      console.error('[BinService] loadFromDb failed', e);
    }
  }

  /** Add a new entry into the bin. */
  addToBin(item: Omit<BinItem, 'id' | 'deletedAt'>) {
    const now = new Date().toISOString();
    const binItem: BinItem = {
      id: `bin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deletedAt: now,
      ...item
    };
    this.items.update(list => [binItem, ...list]);
    this.db.upsert('bin_items', binItem).catch(e => console.error('[BinService] persist bin item failed', e));
  }

  /** Permanently remove a single item from the bin. */
  permanentlyDelete(binItemId: string) {
    this.items.update(list => list.filter(i => i.id !== binItemId));
    this.db.remove('bin_items', binItemId).catch(e => console.error('[BinService] remove bin item failed', e));
  }

  /** Empty the entire bin. This is irreversible. */
  emptyBin() {
    this.items.set([]);
    this.db.clear('bin_items').catch(e => console.error('[BinService] clear bin failed', e));
  }
}
