import { Injectable, signal } from '@angular/core';

export type BinItemType =
  | 'daily-note'
  | 'novel-chapter'
  | 'novel-note'
  | 'novel-character'
  | 'novel-location';

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

  /** Add a new entry into the bin. */
  addToBin(item: Omit<BinItem, 'id' | 'deletedAt'>) {
    const now = new Date().toISOString();
    const binItem: BinItem = {
      id: `bin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deletedAt: now,
      ...item
    };
    this.items.update(list => [binItem, ...list]);
  }

  /** Permanently remove a single item from the bin. */
  permanentlyDelete(binItemId: string) {
    this.items.update(list => list.filter(i => i.id !== binItemId));
  }

  /** Empty the entire bin. This is irreversible. */
  emptyBin() {
    this.items.set([]);
  }
}

