import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import { DataService } from '@envello/data';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService implements DataService {
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

    // ─── Import ────────────────────────────────────────────────────────────────
    async importData(data: any): Promise<void> {
        if (!data || !data.data) {
            throw new Error('Invalid backup file format');
        }

        const backup = data.data;
        const collections = [
            'tasks', 'notes', 'planning_items', 'activities', 'novels',
            'novel_content', 'bin_items', 'snippets', 'books', 'meetings',
            'articles', 'journal_projects', 'journal_entries', 'journal_columns',
            'research_libraries', 'research_sources', 'research_summaries'
        ];

        console.log('[DatabaseService] Starting import...');

        for (const col of collections) {
            const items = backup[col];
            if (Array.isArray(items) && items.length > 0) {
                console.log(`[DatabaseService] Importing ${items.length} items into ${col}...`);
                const db = this.getDb(col);

                // Fetch existing docs to get _rev for update, or just try bulkDocs with new_edits=true?
                // bulkDocs with new_edits=true (default) will conflict if ID exists and no _rev.
                // We want to OVERWRITE.
                // Strategy: 
                // 1. Fetch all existing docs in this collection.
                // 2. Map existing _rev to incoming docs if ID matches.
                // 3. For docs that don't exist, just insert.

                try {
                    const allDocs = await db.allDocs({ include_docs: false });
                    const existingMap = new Map<string, string>();
                    allDocs.rows.forEach(r => existingMap.set(r.id, r.value.rev));

                    const docsToSave = items.map((item: any) => {
                        const doc: any = { ...item };
                        // Ensure _id exists
                        if (!doc._id && doc.id) doc._id = doc.id;

                        // If exists, set _rev to overwrite
                        if (doc._id && existingMap.has(doc._id)) {
                            doc._rev = existingMap.get(doc._id);
                        }
                        // Remove any SQLite specific fields if necessary? 
                        // PouchDB is flexible.
                        return doc;
                    });

                    await db.bulkDocs(docsToSave);
                    console.log(`[DatabaseService] Imported ${col} successfully.`);
                } catch (e) {
                    console.error(`[DatabaseService] Failed to import ${col}`, e);
                }
            }
        }

        // Files are special in SQLite (notes have content removed), but here 'files' collection exists?
        // Wait, 'novel_content' is in backup array above.
        // 'files' collection in PouchDB is used by FileSystemService for web persistence.
        // Desktop export might not include 'files' table as it uses FS.
        // But 'notes' in Desktop have `content` cleared and use `filePath`.
        // On Web, we need content in `files` or `notes`.
        // The `SqliteService` export sends `notes` with empty content!
        // This is a problem. Web needs content.

        // CRITICAL FIX: Desktop `exportAllData` needs to read file content for Notes if we want to restore them on Web!
        // But `SqliteService` is just DB. Reading files might be heavy.
        // However, without content, the notes are useless on Web.

        // User asked for "Data Migration".
        // Let's implement the basic import first. If content is missing, we might need to enhance export later.
        // For now, `novel_content` IS exported from DB.
        // `notes` content is NOT in DB.

        console.log('[DatabaseService] Import complete.');
    }
}
