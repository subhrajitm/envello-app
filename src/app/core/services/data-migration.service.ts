import { Injectable } from '@angular/core';
import { RxDBService } from './rxdb.service';
import { SqliteService } from './sqlite.service';

/**
 * Service to migrate data from RxDB (IndexedDB) to SQLite.
 * This should be run once during the transition period.
 */
@Injectable({
    providedIn: 'root'
})
export class DataMigrationService {
    private migrationKey = 'envello_migration_completed';

    constructor(
        private rxdb: RxDBService,
        private sqlite: SqliteService
    ) { }

    /**
     * Check if migration has already been completed
     */
    isMigrationCompleted(): boolean {
        return localStorage.getItem(this.migrationKey) === 'true';
    }

    /**
     * Mark migration as completed
     */
    private markMigrationCompleted(): void {
        localStorage.setItem(this.migrationKey, 'true');
    }

    /**
     * Perform the complete migration from RxDB to SQLite
     */
    async migrateAllData(): Promise<void> {
        if (this.isMigrationCompleted()) {
            console.log('[DataMigration] Migration already completed, skipping...');
            return;
        }

        console.log('[DataMigration] Starting migration from RxDB to SQLite...');

        try {
            // Migrate each entity type
            await this.migrateTasks();
            await this.migrateNotes();
            await this.migratePlanningItems();
            await this.migrateActivities();
            await this.migrateNovels();
            await this.migrateNovelContent();
            await this.migrateBinItems();
            await this.migrateSnippets();
            await this.migrateBooks();
            await this.migrateMeetings();
            await this.migrateArticles();
            await this.migrateJournalProjects();
            await this.migrateJournalEntries();
            await this.migrateJournalColumns();
            await this.migrateResearchLibraries();
            await this.migrateResearchSources();
            await this.migrateResearchSummaries();

            this.markMigrationCompleted();
            console.log('[DataMigration] Migration completed successfully!');
        } catch (error) {
            console.error('[DataMigration] Migration failed:', error);
            throw error;
        }
    }

    private async migrateTasks(): Promise<void> {
        console.log('[DataMigration] Migrating tasks...');
        const tasks = await this.rxdb.getAllTasks();
        for (const task of tasks) {
            await this.sqlite.upsertTask(task);
        }
        console.log(`[DataMigration] Migrated ${tasks.length} tasks`);
    }

    private async migrateNotes(): Promise<void> {
        console.log('[DataMigration] Migrating notes...');
        const notes = await this.rxdb.getAllNotes();
        for (const note of notes) {
            await this.sqlite.upsertNote(note);
        }
        console.log(`[DataMigration] Migrated ${notes.length} notes`);
    }

    private async migratePlanningItems(): Promise<void> {
        console.log('[DataMigration] Migrating planning items...');
        const items = await this.rxdb.getAllPlanningItems();
        for (const item of items) {
            await this.sqlite.upsertPlanningItem(item);
        }
        console.log(`[DataMigration] Migrated ${items.length} planning items`);
    }

    private async migrateActivities(): Promise<void> {
        console.log('[DataMigration] Migrating activities...');
        const activities = await this.rxdb.getAllActivities();
        for (const activity of activities) {
            await this.sqlite.upsertActivity(activity);
        }
        console.log(`[DataMigration] Migrated ${activities.length} activities`);
    }

    private async migrateNovels(): Promise<void> {
        console.log('[DataMigration] Migrating novels...');
        const novels = await this.rxdb.getAllNovels();
        for (const novel of novels) {
            await this.sqlite.upsertNovel(novel);
        }
        console.log(`[DataMigration] Migrated ${novels.length} novels`);
    }

    private async migrateNovelContent(): Promise<void> {
        console.log('[DataMigration] Migrating novel content...');
        const novels = await this.rxdb.getAllNovels();
        let count = 0;
        for (const novel of novels) {
            const content = await this.rxdb.getNovelContent(novel.id);
            if (content) {
                await this.sqlite.setNovelContent(novel.id, content);
                count++;
            }
        }
        console.log(`[DataMigration] Migrated ${count} novel content entries`);
    }

    private async migrateBinItems(): Promise<void> {
        console.log('[DataMigration] Migrating bin items...');
        const items = await this.rxdb.getAllBinItems();
        for (const item of items) {
            await this.sqlite.upsertBinItem(item);
        }
        console.log(`[DataMigration] Migrated ${items.length} bin items`);
    }

    private async migrateSnippets(): Promise<void> {
        console.log('[DataMigration] Migrating snippets...');
        const snippets = await this.rxdb.getAllSnippets();
        for (const snippet of snippets) {
            await this.sqlite.upsertSnippet(snippet);
        }
        console.log(`[DataMigration] Migrated ${snippets.length} snippets`);
    }

    private async migrateBooks(): Promise<void> {
        console.log('[DataMigration] Migrating books...');
        const books = await this.rxdb.getAllBooks();
        for (const book of books) {
            await this.sqlite.upsertBook(book);
        }
        console.log(`[DataMigration] Migrated ${books.length} books`);
    }

    private async migrateMeetings(): Promise<void> {
        console.log('[DataMigration] Migrating meetings...');
        const meetings = await this.rxdb.getAllMeetings();
        for (const meeting of meetings) {
            await this.sqlite.upsertMeeting(meeting);
        }
        console.log(`[DataMigration] Migrated ${meetings.length} meetings`);
    }

    private async migrateArticles(): Promise<void> {
        console.log('[DataMigration] Migrating articles...');
        const articles = await this.rxdb.getAllArticles();
        for (const article of articles) {
            await this.sqlite.upsertArticle(article);
        }
        console.log(`[DataMigration] Migrated ${articles.length} articles`);
    }

    private async migrateJournalProjects(): Promise<void> {
        console.log('[DataMigration] Migrating journal projects...');
        const projects = await this.rxdb.getAllJournalProjects();
        for (const project of projects) {
            await this.sqlite.upsertJournalProject(project);
        }
        console.log(`[DataMigration] Migrated ${projects.length} journal projects`);
    }

    private async migrateJournalEntries(): Promise<void> {
        console.log('[DataMigration] Migrating journal entries...');
        const entries = await this.rxdb.getAllJournalEntries();
        for (const entry of entries) {
            await this.sqlite.upsertJournalEntry(entry);
        }
        console.log(`[DataMigration] Migrated ${entries.length} journal entries`);
    }

    private async migrateJournalColumns(): Promise<void> {
        console.log('[DataMigration] Migrating journal columns...');
        const columns = await this.rxdb.getAllJournalColumns();
        for (const column of columns) {
            await this.sqlite.upsertJournalColumn(column);
        }
        console.log(`[DataMigration] Migrated ${columns.length} journal columns`);
    }

    private async migrateResearchLibraries(): Promise<void> {
        console.log('[DataMigration] Migrating research libraries...');
        const libraries = await this.rxdb.getAllResearchLibraries();
        for (const library of libraries) {
            await this.sqlite.upsertResearchLibrary(library);
        }
        console.log(`[DataMigration] Migrated ${libraries.length} research libraries`);
    }

    private async migrateResearchSources(): Promise<void> {
        console.log('[DataMigration] Migrating research sources...');
        const sources = await this.rxdb.getAllResearchSources();
        for (const source of sources) {
            await this.sqlite.upsertResearchSource(source);
        }
        console.log(`[DataMigration] Migrated ${sources.length} research sources`);
    }

    private async migrateResearchSummaries(): Promise<void> {
        console.log('[DataMigration] Migrating research summaries...');
        const summaries = await this.rxdb.getAllResearchSummaries();
        for (const summary of summaries) {
            await this.sqlite.upsertResearchSummary(summary);
        }
        console.log(`[DataMigration] Migrated ${summaries.length} research summaries`);
    }

    /**
     * Reset migration flag (for testing purposes)
     */
    resetMigrationFlag(): void {
        localStorage.removeItem(this.migrationKey);
        console.log('[DataMigration] Migration flag reset');
    }
}
