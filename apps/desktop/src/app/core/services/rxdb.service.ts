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
                name: 'envello_db_v5', // bumped to v5 for clean state & schema fix
                storage: getRxStorageDexie(),
                multiInstance: true,
                eventReduce: true,
                ignoreDuplicate: true
            });
            console.log('[RxdbService] Using database: envello_db_v5');

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
                research_summaries: { schema: SCHEMAS.research_summaries },
                files: { schema: SCHEMAS.files },
                versions: { schema: SCHEMAS.versions }
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

    // ─── Specific API Implementation (Matching SqliteService) ──────────────────

    // Tasks
    async getAllTasks(): Promise<any[]> { return this.getAll('tasks'); }
    async upsertTask(doc: any) { return this.upsert('tasks', doc); }
    async removeTask(id: string) { return this.remove('tasks', id); }

    // Notes
    async getAllNotes(): Promise<any[]> { return this.getAll('notes'); }
    async upsertNote(doc: any) { return this.upsert('notes', doc); }
    async removeNote(id: string) { return this.remove('notes', id); }

    // PlanningItems
    async getAllPlanningItems(): Promise<any[]> { return this.getAll('planning_items'); }
    async upsertPlanningItem(doc: any) { return this.upsert('planning_items', doc); }

    // Activities
    async getAllActivities(): Promise<any[]> { return this.getAll('activities'); }
    async upsertActivity(doc: any) { return this.upsert('activities', doc); }

    // Novels
    async getAllNovels(): Promise<any[]> { return this.getAll('novels'); }
    async upsertNovel(doc: any) { return this.upsert('novels', doc); }
    async removeNovel(id: string) { return this.remove('novels', id); }

    // Novel Content
    async getNovelContent(id: string): Promise<string | null> {
        const collection = await this.getCollection('novel_content');
        const doc = await collection.findOne(id).exec();
        return doc ? doc.data : null;
    }
    async setNovelContent(id: string, data: string) {
        return this.upsert('novel_content', { id, data });
    }
    async removeNovelContent(id: string) { return this.remove('novel_content', id); }

    // BinItems
    async getAllBinItems(): Promise<any[]> { return this.getAll('bin_items'); }
    async upsertBinItem(doc: any) { return this.upsert('bin_items', doc); }
    async removeBinItem(id: string) { return this.remove('bin_items', id); }
    async clearBin() {
        const collection = await this.getCollection('bin_items');
        await collection.find().remove();
    }

    // Snippets
    async getAllSnippets(): Promise<any[]> { return this.getAll('snippets'); }
    async upsertSnippet(doc: any) { return this.upsert('snippets', doc); }
    async removeSnippet(id: string) { return this.remove('snippets', id); }

    // Books
    async getAllBooks(): Promise<any[]> { return this.getAll('books'); }
    async upsertBook(doc: any) { return this.upsert('books', doc); }
    async removeBook(id: string) { return this.remove('books', id); }

    // Meetings
    async getAllMeetings(): Promise<any[]> { return this.getAll('meetings'); }
    async upsertMeeting(doc: any) { return this.upsert('meetings', doc); }
    async removeMeeting(id: string) { return this.remove('meetings', id); }

    // Articles
    async getAllArticles(): Promise<any[]> { return this.getAll('articles'); }
    async upsertArticle(doc: any) { return this.upsert('articles', doc); }
    async removeArticle(id: string) { return this.remove('articles', id); }

    // Journal
    async getAllJournalProjects(): Promise<any[]> { return this.getAll('journal_projects'); }
    async upsertJournalProject(doc: any) { return this.upsert('journal_projects', doc); }
    async removeJournalProject(id: string) { return this.remove('journal_projects', id); }

    async getAllJournalEntries(): Promise<any[]> { return this.getAll('journal_entries'); }
    async upsertJournalEntry(doc: any) { return this.upsert('journal_entries', doc); }
    async removeJournalEntry(id: string) { return this.remove('journal_entries', id); }

    async getAllJournalColumns(): Promise<any[]> { return this.getAll('journal_columns'); }
    async upsertJournalColumn(doc: any) { return this.upsert('journal_columns', doc); }
    async removeJournalColumn(id: string) { return this.remove('journal_columns', id); }

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

    // Files
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

    // Versions
    async getAllVersions(contentId: string, contentType: string): Promise<any[]> {
        try {
            const collection = await this.getCollection('versions');
            const docs = await collection.find({
                selector: {
                    contentId: contentId,
                    contentType: contentType
                }
            }).exec();
            // Sort in memory or use index if added
            return docs.map(d => d.toJSON()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } catch (e) {
            console.error(`[RxdbService] getAllVersions failed for ${contentId}:`, e);
            return [];
        }
    }

    async upsertVersion(doc: any) { return this.upsert('versions', doc); }
    async removeVersion(id: string) { return this.remove('versions', id); }
    async clearVersions(contentId: string, contentType: string) {
        try {
            const collection = await this.getCollection('versions');
            await collection.find({ selector: { contentId, contentType } }).remove();
        } catch (e) {
            console.error(`[RxdbService] clearVersions failed for ${contentId}:`, e);
        }
    }
}
