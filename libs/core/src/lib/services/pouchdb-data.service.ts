import { Injectable } from '@angular/core';
import { DataService } from '@envello/data';
import PouchDB from 'pouchdb';

@Injectable({
    providedIn: 'root'
})
export class PouchDbDataService implements DataService {
    private dbs: Record<string, PouchDB.Database> = {};

    private getDb(collection: string): PouchDB.Database {
        if (!this.dbs[collection]) {
            // We use 'envello_' prefix so the IndexedDB instances don't collide broadly
            this.dbs[collection] = new PouchDB(`envello_${collection}`);
        }
        return this.dbs[collection];
    }

    async getAll<T>(collection: string): Promise<T[]> {
        try {
            const db = this.getDb(collection);
            const result = await db.allDocs({ include_docs: true });
            // The document inside PouchDB has _id and _rev, plus our item fields. 
            // We map out the pure doc object.
            return result.rows.map(row => row.doc as unknown as T);
        } catch (e) {
            console.error(`[PouchDbDataService] Failed to get all from ${collection}`, e);
            return [];
        }
    }

    async upsert<T>(collection: string, item: T): Promise<void> {
        try {
            const db = this.getDb(collection);
            const docId = (item as any).id;

            if (!docId) {
                console.warn(`[PouchDbDataService] Item missing 'id' property. PouchDB requires _id. Upsert failed for ${collection}.`);
                return;
            }

            try {
                const existing = await db.get(docId);
                // Put updating the properties and ensuring we send the current _rev
                await db.put({
                    ...item,
                    _id: docId,
                    _rev: existing._rev
                });
            } catch (err: any) {
                if (err.name === 'not_found' || err.status === 404) {
                    // Item doesn't exist, create it anew
                    await db.put({
                        ...item,
                        _id: docId
                    });
                } else {
                    throw err; // Propagate real errors
                }
            }
        } catch (e) {
            console.error(`[PouchDbDataService] Failed to upsert to ${collection}`, e);
        }
    }

    async remove(collection: string, id: string): Promise<void> {
        try {
            const db = this.getDb(collection);
            const existing = await db.get(id);
            await db.remove(existing._id, existing._rev);
        } catch (err: any) {
            // If it's not found, it's already 'removed' essentially. Ignore 404s.
            if (err.name !== 'not_found' && err.status !== 404) {
                console.error(`[PouchDbDataService] Failed to remove ${id} from ${collection}`, err);
            }
        }
    }

    async importData(data: any): Promise<void> {
        // Reserved for bulk import implementation scaling.
        console.log('[PouchDbDataService] importData invoked.', data);
    }
}
