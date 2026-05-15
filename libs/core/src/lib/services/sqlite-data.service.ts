import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { SqliteService } from './sqlite.service';
import { TauriService } from './tauri.service';
import { Task, Note, PlanningItem, Activity, Novel, BinItem, Project } from '@envello/domain';

@Injectable({
    providedIn: 'root'
})
export class SqliteDataService implements DataService {
    private sqlite = inject(SqliteService);
    private tauri = inject(TauriService);

    private getFallbackKey(collection: string) {
        return `envello_local_${collection}`;
    }

    async getAll<T>(collection: string): Promise<T[]> {
        if (!this.tauri.isTauri()) {
            try {
                const data = localStorage.getItem(this.getFallbackKey(collection));
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.warn(`[SqliteDataService fallback] Error parsing ${collection}`, e);
                return [];
            }
        }

        try {
            await this.sqlite.getDb();
        } catch (e) {
            console.warn('[SqliteDataService] getDb failed, skipping local load', e);
        }

        switch (collection) {
            case 'tasks': return await this.sqlite.getAllTasks() as unknown as T[];
            case 'notes': return await this.sqlite.getAllNotes() as unknown as T[];
            case 'planning_items': return await this.sqlite.getAllPlanningItems() as unknown as T[];
            case 'activities': return await this.sqlite.getAllActivities() as unknown as T[];
            case 'novels': return await this.sqlite.getAllNovels() as unknown as T[];
            case 'bin_items': return await this.sqlite.getAllBinItems() as unknown as T[];

            case 'books': return await this.sqlite.getAllBooks() as unknown as T[];
            case 'meetings': return await this.sqlite.getAllMeetings() as unknown as T[];
            case 'articles': return await this.sqlite.getAllArticles() as unknown as T[];
            case 'research_libraries': return await this.sqlite.getAllResearchLibraries() as unknown as T[];
            case 'research_sources': return await this.sqlite.getAllResearchSources() as unknown as T[];
            case 'research_summaries': return await this.sqlite.getAllResearchSummaries() as unknown as T[];
            case 'projects': return await this.sqlite.getAllProjects() as unknown as T[];
            case 'credentials': return await this.sqlite.getAllCredentials() as unknown as T[];
            case 'subscriptions': return await this.sqlite.getAllSubscriptions() as unknown as T[];
            case 'credential_subscription_links': return await this.sqlite.getAllLinks() as unknown as T[];
            case 'note_folders': return await this.sqlite.getAllNoteFolders() as unknown as T[];
            case 'bookmarks': return await this.sqlite.getAllBookmarks() as unknown as T[];
            case 'bookmark_folders': return await this.sqlite.getAllBookmarkFolders() as unknown as T[];
            default:
                console.warn(`[SqliteDataService] Unknown collection ${collection}`);
                return [];
        }
    }

    async upsert<T>(collection: string, item: T): Promise<void> {
        if (!this.tauri.isTauri()) {
            try {
                const items = await this.getAll<T>(collection);
                const index = items.findIndex((i: any) => i.id === (item as any).id);
                if (index >= 0) {
                    items[index] = item;
                } else {
                    items.push(item);
                }
                localStorage.setItem(this.getFallbackKey(collection), JSON.stringify(items));
            } catch (e) {
                console.warn(`[SqliteDataService fallback] Error upserting ${collection}`, e);
            }
            return;
        }

        switch (collection) {
            case 'tasks': return await this.sqlite.upsertTask(item as unknown as Task);
            case 'notes': return await this.sqlite.upsertNote(item as unknown as Note);
            case 'planning_items': return await this.sqlite.upsertPlanningItem(item as unknown as PlanningItem);
            case 'activities': return await this.sqlite.upsertActivity(item as unknown as Activity);
            case 'novels': return await this.sqlite.upsertNovel(item as unknown as Novel);
            case 'bin_items': return await this.sqlite.upsertBinItem(item as unknown as BinItem);

            case 'books': return await this.sqlite.upsertBook(item as any);
            case 'meetings': return await this.sqlite.upsertMeeting(item as any);
            case 'articles': return await this.sqlite.upsertArticle(item as any);
            case 'research_libraries': return await this.sqlite.upsertResearchLibrary(item as any);
            case 'research_sources': return await this.sqlite.upsertResearchSource(item as any);
            case 'research_summaries': return await this.sqlite.upsertResearchSummary(item as any);
            case 'projects': return await this.sqlite.upsertProject(item as unknown as Project);
            case 'credentials': return await this.sqlite.upsertCredential(item as any);
            case 'subscriptions': return await this.sqlite.upsertSubscription(item as any);
            case 'credential_subscription_links': return await this.sqlite.upsertLink(item as any);
            case 'note_folders': return await this.sqlite.upsertNoteFolder(item as any);
            case 'bookmarks': return await this.sqlite.upsertBookmark(item as any);
            case 'bookmark_folders': return await this.sqlite.upsertBookmarkFolder(item as any);
            default: console.warn(`[SqliteDataService] Unknown collection ${collection} for upsert`);
        }
    }

    async remove(collection: string, id: string): Promise<void> {
        if (!this.tauri.isTauri()) {
            try {
                const items = await this.getAll<any>(collection);
                const filtered = items.filter((i: any) => i.id !== id);
                localStorage.setItem(this.getFallbackKey(collection), JSON.stringify(filtered));
            } catch (e) {
                console.warn(`[SqliteDataService fallback] Error removing ${collection}`, e);
            }
            return;
        }

        switch (collection) {
            case 'tasks': return await this.sqlite.removeTask(id);
            case 'notes': return await this.sqlite.removeNote(id);
            case 'planning_items': return await this.sqlite.removePlanningItem(id);
            case 'novels': return await this.sqlite.removeNovel(id);
            case 'bin_items': return await this.sqlite.removeBinItem(id);
            case 'novel_content': return await this.sqlite.removeNovelContent(id);

            case 'books': return await this.sqlite.removeBook(id);
            case 'meetings': return await this.sqlite.removeMeeting(id);
            case 'articles': return await this.sqlite.removeArticle(id);
            case 'research_libraries': return await this.sqlite.removeResearchLibrary(id);
            case 'research_sources': return await this.sqlite.removeResearchSource(id);
            case 'research_summaries': return await this.sqlite.removeResearchSummary(id);
            case 'projects': return await this.sqlite.removeProject(id);
            case 'credentials': return await this.sqlite.removeCredential(id);
            case 'subscriptions': return await this.sqlite.removeSubscription(id);
            case 'credential_subscription_links': return await this.sqlite.removeLink(id);
            case 'note_folders': return await this.sqlite.removeNoteFolder(id);
            case 'bookmarks': return await this.sqlite.removeBookmark(id);
            case 'bookmark_folders': return await this.sqlite.removeBookmarkFolder(id);
            default: console.warn(`[SqliteDataService] Unknown collection ${collection} for remove`);
        }
    }

    async importData(data: any): Promise<void> {
        // Sqlite export/import logic is in SqliteService
        // If we need import logic here, we can delegate or implement
    }

    // ─── Vault & Subscriptions ──────────────────────────────────────────────────
    async saveCredential(credential: any): Promise<void> { return this.upsert('credentials', credential); }
    async getCredentials(): Promise<any[]> { return this.getAll('credentials'); }
    async deleteCredential(id: string): Promise<void> { return this.remove('credentials', id); }

    async saveSubscription(subscription: any): Promise<void> { return this.upsert('subscriptions', subscription); }
    async getSubscriptions(): Promise<any[]> { return this.getAll('subscriptions'); }
    async deleteSubscription(id: string): Promise<void> { return this.remove('subscriptions', id); }

    async saveLink(link: any): Promise<void> { return this.upsert('credential_subscription_links', link); }
    async getLinks(): Promise<any[]> { return this.getAll('credential_subscription_links'); }
    async deleteLink(id: string): Promise<void> { return this.remove('credential_subscription_links', id); }
}
