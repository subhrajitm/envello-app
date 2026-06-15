import { Injectable, signal, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { BinEntry, BinEntryType } from '@envello/domain';

const COLLECTION_MAP: Record<BinEntryType, string> = {
    task: 'tasks',
    'daily-note': 'notes',
    write: 'books',
    meeting: 'meetings',
    bookmark: 'bookmarks',
    credential: 'credentials',
    transaction: 'transactions',
};

const TITLE_FIELD: Partial<Record<BinEntryType, string>> = {
    credential: 'name',
    transaction: 'name',
    bookmark: 'url',
};

@Injectable({ providedIn: 'root' })
export class BinService {
    readonly items = signal<BinEntry[]>([]);
    private db = inject(DataService);

    constructor() {
        this.loadFromDb();
        window.addEventListener('envello:db-ready', () => this.loadFromDb());
        window.addEventListener('envello:sync-complete', () => this.loadFromDb());
    }

    async loadFromDb(): Promise<void> {
        try {
            await this.migrateLegacyBinItems();

            const [tasks, notes, books, meetings, bookmarks] = await Promise.all([
                this.db.getAll<any>('tasks'),
                this.db.getAll<any>('notes'),
                this.db.getAll<any>('books'),
                this.db.getAll<any>('meetings'),
                this.db.getAll<any>('bookmarks'),
            ]);

            let credentials: any[] = [];
            let transactions: any[] = [];
            try { credentials = await this.db.getCredentials(); } catch { /* vault may not be ready */ }
            try { transactions = await this.db.getTransactions(); } catch { /* */ }

            const toEntries = (items: any[], type: BinEntryType): BinEntry[] =>
                items
                    .filter(i => !!i.deleted_at)
                    .map(i => ({
                        id: i.id,
                        type,
                        title: i[TITLE_FIELD[type] ?? 'title'] || i.id,
                        deleted_at: i.deleted_at,
                        payload: i,
                    }));

            this.items.set([
                ...toEntries(tasks, 'task'),
                ...toEntries(notes, 'daily-note'),
                ...toEntries(books, 'write'),
                ...toEntries(meetings, 'meeting'),
                ...toEntries(bookmarks, 'bookmark'),
                ...toEntries(credentials, 'credential'),
                ...toEntries(transactions, 'transaction'),
            ].sort((a, b) => b.deleted_at.localeCompare(a.deleted_at)));
        } catch (e) {
            console.error('[BinService] loadFromDb failed', e);
        }
    }

    /** One-time migration: move old bin_items records into their original collections. */
    private async migrateLegacyBinItems(): Promise<void> {
        try {
            const legacy = await this.db.getAll<any>('bin_items');
            if (!legacy.length) return;
            for (const item of legacy) {
                const collection = COLLECTION_MAP[item.type as BinEntryType];
                if (collection && item.payload?.id) {
                    await this.db.upsert(collection, { ...item.payload, deleted_at: item.deletedAt ?? new Date().toISOString() });
                }
                await this.db.remove('bin_items', item.id);
            }
        } catch { /* bin_items table may not exist on fresh installs */ }
    }

    async restore(id: string): Promise<boolean> {
        const entry = this.items().find(i => i.id === id);
        if (!entry) return false;
        try {
            const restored = { ...(entry.payload as any), deleted_at: null };
            if (entry.type === 'credential') {
                await this.db.saveCredential(restored);
            } else if (entry.type === 'transaction') {
                await this.db.saveTransaction(restored);
            } else {
                await this.db.upsert(COLLECTION_MAP[entry.type], restored);
            }
            this.items.update(list => list.filter(i => i.id !== id));
            window.dispatchEvent(new CustomEvent('envello:sync-complete'));
            return true;
        } catch (e) {
            console.error('[BinService] restore failed', e);
            return false;
        }
    }

    async permanentlyDelete(id: string): Promise<void> {
        const entry = this.items().find(i => i.id === id);
        if (!entry) return;
        this.items.update(list => list.filter(i => i.id !== id));
        await this.db.remove(COLLECTION_MAP[entry.type], id).catch(e =>
            console.error('[BinService] permanentlyDelete failed', e)
        );
    }

    async emptyBin(): Promise<void> {
        const entries = this.items();
        this.items.set([]);
        await Promise.all(
            entries.map(e => this.db.remove(COLLECTION_MAP[e.type], e.id).catch(console.error))
        );
    }
}
