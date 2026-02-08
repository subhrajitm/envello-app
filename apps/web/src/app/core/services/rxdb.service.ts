import { Injectable } from '@angular/core';
import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { SCHEMAS } from './rxdb-schemas';
import { BehaviorSubject, Observable, from } from 'rxjs'; // For compatibility API

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);

// Enable dev mode in development
if (process.env['NODE_ENV'] === 'development') {
    import('rxdb/plugins/dev-mode').then(module => {
        addRxPlugin(module.RxDBDevModePlugin);
    });
}

@Injectable({
    providedIn: 'root'
})
export class RxdbService {
    private dbPromise: Promise<RxDatabase> | null = null;

    // Compatibility Subjects (Optional: RxDB is reactive by default)
    // We maintain these to minimize changes in consumers if they rely on these specific subjects
    // though consumers should ideally switch to RxDB observables.

    constructor() {
        this.initDb();
    }

    async initDb() {
        if (this.dbPromise) return this.dbPromise;

        console.log('[RxdbService] Initializing RxDB...');
        try {
            this.dbPromise = createRxDatabase({
                name: 'envello_db_v3', // bumped to v3 to include 'files' collection
                storage: getRxStorageDexie(),
                multiInstance: true,
                eventReduce: true
            });

            const db = await this.dbPromise;
            console.log('[RxdbService] Database created, adding collections...');

            // Create Collections
            await db.addCollections({
                tasks: { schema: SCHEMAS.tasks },
                notes: { schema: SCHEMAS.notes },
                planning_items: { schema: SCHEMAS.planning_items },
                activities: { schema: SCHEMAS.activities },
                novels: { schema: SCHEMAS.novels },
                novel_content: { schema: SCHEMAS.novel_content },
                bin_items: { schema: SCHEMAS.bin_items },
                snippets: { schema: SCHEMAS.snippets },
                books: { schema: SCHEMAS.books },
                meetings: { schema: SCHEMAS.meetings },
                articles: { schema: SCHEMAS.articles },
                journal_projects: { schema: SCHEMAS.journal_projects },
                journal_entries: { schema: SCHEMAS.journal_entries },
                journal_columns: { schema: SCHEMAS.journal_columns },
                research_libraries: { schema: SCHEMAS.research_libraries },
                research_sources: { schema: SCHEMAS.research_sources },
                research_dummies: { schema: SCHEMAS.research_summaries }, // Fallback to avoid error if extra key needed? No, better safe.
                files: { schema: SCHEMAS.files }
            });

            console.log('[RxdbService] RxDB initialized successfully with collections');
            return db;
        } catch (e) {
            console.error('[RxdbService] Failed to initialize RxDB:', e);
            throw e;
        }
    }

    private async getCollection(name: string): Promise<RxCollection> {
        try {
            const db = await this.initDb();
            if (!db.collections[name]) {
                console.error(`[RxdbService] Collection '${name}' not found!`);
                throw new Error(`Collection ${name} not found`);
            }
            return db.collections[name];
        } catch (e) {
            console.error(`[RxdbService] Failed to get collection ${name}:`, e);
            throw e;
        }
    }

    // ─── Generic Helpers ───────────────────────────────────────────────────────

    async getAll<T>(collectionName: string): Promise<T[]> {
        try {
            const collection = await this.getCollection(collectionName);
            const docs = await collection.find().exec();
            // console.log(`[RxdbService] getAll ${collectionName}: found ${docs.length} docs`);
            return docs.map(d => d.toJSON()) as T[];
        } catch (e) {
            console.error(`[RxdbService] getAll failed for ${collectionName}:`, e);
            return [];
        }
    }

    async upsert<T>(collectionName: string, doc: any): Promise<void> {
        try {
            const collection = await this.getCollection(collectionName);
            await collection.upsert(doc);
            // console.log(`[RxdbService] upsert to ${collectionName}:`, doc.id);
        } catch (e) {
            console.error(`[RxdbService] upsert failed for ${collectionName}:`, e);
            throw e;
        }
    }

    async remove(collectionName: string, id: string): Promise<void> {
        try {
            const collection = await this.getCollection(collectionName);
            const doc = await collection.findOne(id).exec();
            if (doc) {
                await doc.remove();
                // console.log(`[RxdbService] removed from ${collectionName}:`, id);
            } else {
                console.warn(`[RxdbService] remove failed - doc not found in ${collectionName}:`, id);
            }
        } catch (e) {
            console.error(`[RxdbService] remove failed for ${collectionName}:`, e);
            throw e;
        }
    }

    // ... existing initialization code ...

    // Files (New)
    async getFile(category: string, fileId: string): Promise<any | null> {
        const id = `${category}_${fileId}`;
        const collection = await this.getCollection('files');
        const doc = await collection.findOne(id).exec();
        return doc ? doc.toJSON() : null;
    }

    async upsertFile(category: string, fileId: string, content: string): Promise<void> {
        const id = `${category}_${fileId}`;
        const doc = {
            id,
            category,
            fileId,
            content,
            lastModified: new Date().toISOString()
        };
        return this.upsert('files', doc);
    }

    async removeFile(category: string, fileId: string): Promise<void> {
        const id = `${category}_${fileId}`;
        return this.remove('files', id);
    }

    // Research
    async getAllResearchLibraries(): Promise<any[]> { return this.getAll('research_libraries'); }
    async upsertResearchLibrary(doc: any) { return this.upsert('research_libraries', doc); }
    async removeResearchLibrary(id: string) { return this.remove('research_libraries', id); }

    async getAllResearchSources(): Promise<any[]> { return this.getAll('research_sources'); }
    async upsertResearchSource(doc: any) { return this.upsert('research_sources', doc); }
    async removeResearchSource(id: string) { return this.remove('research_sources', id); }

    async getAllResearchSummaries(): Promise<any[]> { return this.getAll('research_summaries'); }
    async upsertResearchSummary(doc: any) { return this.upsert('research_summaries', doc); }
    async removeResearchSummary(id: string) { return this.remove('research_summaries', id); }
}
