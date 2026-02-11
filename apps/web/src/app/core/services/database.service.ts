import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    private dbs: { [key: string]: PouchDB.Database } = {};

    constructor() {
        this.init();
    }

    init() {
        const collections = [
            'tasks', 'notes', 'planning_items', 'activities', 'novels',
            'novel_content', 'bin_items', 'snippets', 'books', 'meetings',
            'articles', 'journal_projects', 'journal_entries', 'journal_columns',
            'research_libraries', 'research_sources', 'research_summaries',
            'files'
        ];

        collections.forEach(name => {
            this.dbs[name] = new PouchDB(name);
        });
        console.log('[DatabaseService] PouchDB initialized');
    }

    getDb(name: string): PouchDB.Database {
        if (!this.dbs[name]) {
            this.dbs[name] = new PouchDB(name);
        }
        return this.dbs[name];
    }

    async getAll<T>(collection: string): Promise<T[]> {
        try {
            const db = this.getDb(collection);
            const result = await db.allDocs({ include_docs: true });
            return result.rows.map(row => {
                const doc = row.doc as any;
                // PouchDB uses _id, but app uses id. Map _id to id if missing?
                // Most app docs have 'id' property.
                return doc as T;
            });
        } catch (e) {
            console.error(`[DatabaseService] getAll failed for ${collection}:`, e);
            return [];
        }
    }

    async get<T>(collection: string, id: string): Promise<T | null> {
        try {
            const db = this.getDb(collection);
            return await db.get(id) as unknown as T;
        } catch (e: any) {
            if (e.status === 404) return null;
            throw e;
        }
    }

    async upsert(collection: string, doc: any): Promise<void> {
        try {
            const db = this.getDb(collection);
            // Ensure _id exists. Use doc.id if _id is missing.
            const docToSave = { ...doc };
            if (!docToSave._id && docToSave.id) {
                docToSave._id = docToSave.id;
            } else if (!docToSave._id) {
                // If no id, let PouchDB generate one? App usually expects 'id'.
                // But strict strict types might assume 'id' exists.
                // We'll proceed.
            }

            try {
                const existing = await db.get(docToSave._id);
                docToSave._rev = existing._rev;
            } catch (e: any) {
                if (e.status !== 404) throw e;
            }

            await db.put(docToSave);
            // console.log(`[DatabaseService] upserted ${collection}/${docToSave._id}`);
        } catch (e) {
            console.error(`[DatabaseService] upsert failed for ${collection}:`, e);
            throw e;
        }
    }

    async remove(collection: string, id: string): Promise<void> {
        try {
            const db = this.getDb(collection);
            const doc = await db.get(id);
            await db.remove(doc);
        } catch (e: any) {
            if (e.status !== 404) {
                console.error(`[DatabaseService] remove failed for ${collection}:`, e);
                throw e;
            } else {
                console.warn(`[DatabaseService] remove failed - doc not found in ${collection}:`, id);
            }
        }
    }

    async clear(collection: string): Promise<void> {
        try {
            const db = this.getDb(collection);
            const result = await db.allDocs({ include_docs: true });
            const docsToDelete = result.rows.map(row => ({
                ...(row.doc as any),
                _deleted: true
            }));
            if (docsToDelete.length > 0) {
                await db.bulkDocs(docsToDelete);
            }
        } catch (e) {
            console.error(`[DatabaseService] clear failed for ${collection}:`, e);
            throw e;
        }
    }
}
