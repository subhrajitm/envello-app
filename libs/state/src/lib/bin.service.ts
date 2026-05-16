import { Injectable, signal, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { BinItem, BinItemType } from '@envello/domain';

const COLLECTION_MAP: Partial<Record<BinItemType, string>> = {
    'task': 'tasks',
    'daily-note': 'notes',
    'novel': 'novels',
    'meeting': 'meetings',
};

@Injectable({
    providedIn: 'root'
})
export class BinService {
    readonly items = signal<BinItem[]>([]);
    private db = inject(DataService);

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

    /** Restore a bin item back to its original collection, then remove it from the bin. */
    async restore(binItemId: string): Promise<boolean> {
        const item = this.items().find(i => i.id === binItemId);
        if (!item) return false;

        const collection = COLLECTION_MAP[item.type];
        if (!collection) return false;

        try {
            await this.db.upsert(collection, item.payload);
            this.permanentlyDelete(binItemId);
            // Signal StoreService to reload so the restored item appears immediately.
            window.dispatchEvent(new CustomEvent('envello:sync-complete'));
            return true;
        } catch (e) {
            console.error('[BinService] restore failed', e);
            return false;
        }
    }

    /** Check if a bin item's type is restorable. */
    canRestore(type: BinItemType): boolean {
        return type in COLLECTION_MAP;
    }

    permanentlyDelete(binItemId: string) {
        this.items.update(list => list.filter(i => i.id !== binItemId));
        this.db.remove('bin_items', binItemId).catch(e => console.error('[BinService] remove bin item failed', e));
    }

    emptyBin() {
        const items = this.items();
        this.items.set([]);
        items.forEach(item => {
            this.db.remove('bin_items', item.id).catch(console.error);
        });
    }
}
