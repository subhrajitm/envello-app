import { Injectable, isDevMode } from '@angular/core';
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
if (isDevMode()) {
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
                name: 'envello_db_v4', // bumped to v4 for consolidated collections
                storage: getRxStorageDexie(),
                multiInstance: true,
                eventReduce: true
            });

            const db = await this.dbPromise;
            console.log('[RxdbService] Database created, adding collections...');

            // Create Collections (Consolidated: 18 → 13 collections)
            await db.addCollections({
                tasks: { schema: SCHEMAS.tasks },
                notes: { schema: SCHEMAS.notes },
                planning_items: { schema: SCHEMAS.planning_items },
                activities: { schema: SCHEMAS.activities },
                novels: { schema: SCHEMAS.novels }, // Now includes content
                bin_items: { schema: SCHEMAS.bin_items },
                snippets: { schema: SCHEMAS.snippets },
                books: { schema: SCHEMAS.books },
                meetings: { schema: SCHEMAS.meetings },
                articles: { schema: SCHEMAS.articles },
                journals: { schema: SCHEMAS.journals }, // Consolidated: projects + entries + columns
                research: { schema: SCHEMAS.research }, // Consolidated: libraries + sources + summaries
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

    // ─── Consolidated Collection Helpers ───────────────────────────────────────

    // Journals (consolidated: projects + entries + columns)
    async getAllJournalProjects(): Promise<any[]> {
        const collection = await this.getCollection('journals');
        const docs = await collection.find({ selector: { entityType: 'project' } }).exec();
        return docs.map(d => d.toJSON());
    }

    async getAllJournalEntries(): Promise<any[]> {
        const collection = await this.getCollection('journals');
        const docs = await collection.find({ selector: { entityType: 'entry' } }).exec();
        return docs.map(d => d.toJSON());
    }

    async getAllJournalColumns(): Promise<any[]> {
        const collection = await this.getCollection('journals');
        const docs = await collection.find({ selector: { entityType: 'column' } }).exec();
        return docs.map(d => d.toJSON());
    }

    async upsertJournalProject(doc: any) {
        return this.upsert('journals', { ...doc, entityType: 'project' });
    }

    async upsertJournalEntry(doc: any) {
        return this.upsert('journals', { ...doc, entityType: 'entry' });
    }

    async upsertJournalColumn(doc: any) {
        return this.upsert('journals', { ...doc, entityType: 'column' });
    }

    async removeJournalProject(id: string) { return this.remove('journals', id); }
    async removeJournalEntry(id: string) { return this.remove('journals', id); }
    async removeJournalColumn(id: string) { return this.remove('journals', id); }

    // Research (consolidated: libraries + sources + summaries)
    async getAllResearchLibraries(): Promise<any[]> {
        const collection = await this.getCollection('research');
        const docs = await collection.find({ selector: { entityType: 'library' } }).exec();
        return docs.map(d => d.toJSON());
    }

    async getAllResearchSources(): Promise<any[]> {
        const collection = await this.getCollection('research');
        const docs = await collection.find({ selector: { entityType: 'source' } }).exec();
        return docs.map(d => d.toJSON());
    }

    async getAllResearchSummaries(): Promise<any[]> {
        const collection = await this.getCollection('research');
        const docs = await collection.find({ selector: { entityType: 'summary' } }).exec();
        return docs.map(d => d.toJSON());
    }

    async upsertResearchLibrary(doc: any) {
        return this.upsert('research', { ...doc, entityType: 'library' });
    }

    async upsertResearchSource(doc: any) {
        return this.upsert('research', { ...doc, entityType: 'source' });
    }

    async upsertResearchSummary(doc: any) {
        return this.upsert('research', { ...doc, entityType: 'summary' });
    }

    async removeResearchLibrary(id: string) { return this.remove('research', id); }
    async removeResearchSource(id: string) { return this.remove('research', id); }
    async removeResearchSummary(id: string) { return this.remove('research', id); }

    // Novels (now includes content)
    async getAllNovels(): Promise<any[]> { return this.getAll('novels'); }
    async upsertNovel(doc: any) { return this.upsert('novels', doc); }
    async removeNovel(id: string) { return this.remove('novels', id); }

    // Novel content is now part of novels collection
    async getNovelContent(id: string): Promise<string | null> {
        const collection = await this.getCollection('novels');
        const doc = await collection.findOne(id).exec();
        return doc ? (doc.toJSON().content || null) : null;
    }

    async upsertNovelContent(id: string, content: string): Promise<void> {
        const collection = await this.getCollection('novels');
        const doc = await collection.findOne(id).exec();
        if (doc) {
            await doc.update({ $set: { content } });
        }
    }

    async removeNovelContent(id: string): Promise<void> {
        // Content is part of novel, just clear it
        const collection = await this.getCollection('novels');
        const doc = await collection.findOne(id).exec();
        if (doc) {
            await doc.update({ $set: { content: '' } });
        }
    }

    // Other collections (unchanged)
    async getAllTasks(): Promise<any[]> { return this.getAll('tasks'); }
    async upsertTask(doc: any) { return this.upsert('tasks', doc); }
    async removeTask(id: string) { return this.remove('tasks', id); }

    async getAllNotes(): Promise<any[]> { return this.getAll('notes'); }
    async upsertNote(doc: any) { return this.upsert('notes', doc); }
    async removeNote(id: string) { return this.remove('notes', id); }

    async getAllPlanningItems(): Promise<any[]> { return this.getAll('planning_items'); }
    async upsertPlanningItem(doc: any) { return this.upsert('planning_items', doc); }
    async removePlanningItem(id: string) { return this.remove('planning_items', id); }

    async getAllActivities(): Promise<any[]> { return this.getAll('activities'); }
    async upsertActivity(doc: any) { return this.upsert('activities', doc); }
    async removeActivity(id: string) { return this.remove('activities', id); }

    async getAllBooks(): Promise<any[]> { return this.getAll('books'); }
    async upsertBook(doc: any) { return this.upsert('books', doc); }
    async removeBook(id: string) { return this.remove('books', id); }

    async getAllMeetings(): Promise<any[]> { return this.getAll('meetings'); }
    async upsertMeeting(doc: any) { return this.upsert('meetings', doc); }
    async removeMeeting(id: string) { return this.remove('meetings', id); }

    async getAllSnippets(): Promise<any[]> { return this.getAll('snippets'); }
    async upsertSnippet(doc: any) { return this.upsert('snippets', doc); }
    async removeSnippet(id: string) { return this.remove('snippets', id); }

    async getAllArticles(): Promise<any[]> { return this.getAll('articles'); }
    async upsertArticle(doc: any) { return this.upsert('articles', doc); }
    async removeArticle(id: string) { return this.remove('articles', id); }

    async getAllBinItems(): Promise<any[]> { return this.getAll('bin_items'); }
    async upsertBinItem(doc: any) { return this.upsert('bin_items', doc); }
    async removeBinItem(id: string) { return this.remove('bin_items', id); }

    async clearBin(): Promise<void> {
        const collection = await this.getCollection('bin_items');
        const docs = await collection.find().exec();
        await Promise.all(docs.map(doc => doc.remove()));
    }

    // Alias for novel content setter (used by novel-content.service)
    async setNovelContent(id: string, content: string): Promise<void> {
        return this.upsertNovelContent(id, content);
    }
}
