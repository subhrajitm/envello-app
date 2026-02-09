import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SqliteService } from './sqlite.service';

@Injectable({
    providedIn: 'root'
})
export class SyncService {
    private supabase = inject(SupabaseService);
    private db = inject(SqliteService);

    private isSyncing = false;

    constructor() { }

    async syncAll() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        console.log('[SyncService] Starting sync...');

        try {
            // 1. Tasks
            await this.syncCollection('tasks', 'tasks',
                async (item) => await this.db.upsertTask(item, { isSync: true }),
                async () => await this.db.getAllTasks()
            );

            // 2. Notes
            await this.syncCollection('notes', 'notes',
                async (item) => await this.db.upsertNote(item, { isSync: true }),
                async () => await this.db.getAllNotes()
            );

            // 3. Activities
            await this.syncCollection('activities', 'activities',
                async (item) => await this.db.upsertActivity(item, { isSync: true }),
                async () => await this.db.getAllActivities()
            );

            // 4. Novels
            await this.syncCollection('novels', 'novels',
                async (item) => await this.db.upsertNovel(item, { isSync: true }),
                async () => await this.db.getAllNovels()
            );

            // 5. Journal Projects
            await this.syncCollection('journal_projects', 'journals', // Supabase table is 'journals' based on schema? Wait.
                async (item) => await this.db.upsertJournalProject(item, { isSync: true }),
                async () => await this.db.getAllJournalProjects(),
                'journal_projects' // local collection name
            );

            // 6. Journal Entries
            await this.syncCollection('journal_entries', 'journal_entries',
                async (item) => await this.db.upsertJournalEntry(item, { isSync: true }),
                async () => await this.db.getAllJournalEntries()
            );

            // 7. Research Libraries
            await this.syncCollection('research_libraries', 'research_libraries',
                async (item) => await this.db.upsertResearchLibrary(item, { isSync: true }),
                async () => await this.db.getAllResearchLibraries()
            );

            // 8. Research Sources
            await this.syncCollection('research_sources', 'research_sources',
                async (item) => await this.db.upsertResearchSource(item, { isSync: true }),
                async () => await this.db.getAllResearchSources()
            );

            // 9. Research Summaries
            await this.syncCollection('research_summaries', 'research_summaries',
                async (item) => await this.db.upsertResearchSummary(item, { isSync: true }),
                async () => await this.db.getAllResearchSummaries()
            );

            console.log('[SyncService] Sync completed successfully.');
        } catch (error) {
            console.error('[SyncService] Sync failed', error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncCollection(
        localCollectionName: string,
        tableName: string,
        upsertLocal: (item: any) => Promise<void>,
        getAllLocal: () => Promise<any[]>,
        overrideRemoteTableName?: string
    ) {
        const remoteTable = overrideRemoteTableName || tableName;

        // --- PULL ---
        const lastPull = await this.db.getLastSync(localCollectionName);
        const { data: remoteData, error: pullError } = await this.supabase.from(remoteTable)
            .select('*')
            .gt('updated_at', lastPull);

        if (pullError) {
            console.error(`[SyncService] Pull failed for ${remoteTable}`, pullError);
            throw pullError;
        }

        if (remoteData && remoteData.length > 0) {
            console.log(`[SyncService] Pulling ${remoteData.length} items for ${remoteTable}`);
            for (const item of remoteData) {
                await upsertLocal(item);
            }
            // Update last_sync to now (or max updated_at from received data, but now is safer/easier)
            await this.db.setLastSync(localCollectionName, new Date().toISOString());
        }

        // --- PUSH ---
        const lastPush = await this.db.getLastPush(localCollectionName);
        const allLocal = await getAllLocal();
        // Filter for items modified since last push
        // Note: This relies on local time being somewhat synchronized or using UTC.
        // Ideally we track 'dirty' flags, but 'updated_at > lastPush' is a decent approximation if clocks aren't wild.
        const toPush = allLocal.filter(item => item.updated_at && item.updated_at > lastPush);

        if (toPush.length > 0) {
            console.log(`[SyncService] Pushing ${toPush.length} items for ${remoteTable}`);
            const { error: pushError } = await this.supabase.from(remoteTable).upsert(toPush);

            if (pushError) {
                console.error(`[SyncService] Push failed for ${remoteTable}`, pushError);
                throw pushError;
            }

            await this.db.setLastPush(localCollectionName, new Date().toISOString());
        }
    }
}
