import { __decorate } from "tslib";
import { Injectable, signal, inject } from '@angular/core';
import { DataService } from '@envello/data';
let BinService = class BinService {
    items = signal([]);
    db = inject(DataService);
    constructor() {
        this.loadFromDb();
    }
    async loadFromDb() {
        try {
            const list = await this.db.getAll('bin_items');
            this.items.set(list);
        }
        catch (e) {
            console.error('[BinService] loadFromDb failed', e);
        }
    }
    addToBin(item) {
        const now = new Date().toISOString();
        const binItem = {
            id: `bin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            deletedAt: now,
            ...item
        };
        this.items.update(list => [binItem, ...list]);
        this.db.upsert('bin_items', binItem).catch(e => console.error('[BinService] persist bin item failed', e));
    }
    permanentlyDelete(binItemId) {
        this.items.update(list => list.filter(i => i.id !== binItemId));
        this.db.remove('bin_items', binItemId).catch(e => console.error('[BinService] remove bin item failed', e));
    }
    emptyBin() {
        // This is tricky. DataService generic 'remove' is by ID.
        // DataService might need 'clear' or 'removeAll'.
        // Or we iterate and delete.
        const items = this.items();
        this.items.set([]);
        // For now, let's just warn or skip database clear if not supported
        // But we should probably extend DataService or loop delete.
        // Iterating is safe fallback.
        items.forEach(item => {
            this.db.remove('bin', item.id).catch(console.error);
        });
    }
};
BinService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], BinService);
export { BinService };
