import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { SqliteService } from './sqlite.service';
import { TauriService } from './tauri.service';
let SqliteDataService = class SqliteDataService {
    sqlite = inject(SqliteService);
    tauri = inject(TauriService);
    getFallbackKey(collection) {
        return `envello_local_${collection}`;
    }
    async getAll(collection) {
        if (!this.tauri.isTauri()) {
            try {
                const data = localStorage.getItem(this.getFallbackKey(collection));
                return data ? JSON.parse(data) : [];
            }
            catch (e) {
                console.warn(`[SqliteDataService fallback] Error parsing ${collection}`, e);
                return [];
            }
        }
        try {
            await this.sqlite.getDb();
        }
        catch (e) {
            console.warn('[SqliteDataService] getDb failed, skipping local load', e);
        }
        switch (collection) {
            case 'tasks': return await this.sqlite.getAllTasks();
            case 'notes': return await this.sqlite.getAllNotes();
            case 'planning_items': return await this.sqlite.getAllPlanningItems();
            case 'activities': return await this.sqlite.getAllActivities();
            case 'novels': return await this.sqlite.getAllNovels();
            case 'bin_items': return await this.sqlite.getAllBinItems();
            case 'snippets': return await this.sqlite.getAllSnippets();
            case 'books': return await this.sqlite.getAllBooks();
            case 'meetings': return await this.sqlite.getAllMeetings();
            case 'articles': return await this.sqlite.getAllArticles();
            case 'journal_projects': return await this.sqlite.getAllJournalProjects();
            case 'journal_entries': return await this.sqlite.getAllJournalEntries();
            case 'journal_columns': return await this.sqlite.getAllJournalColumns();
            case 'research_libraries': return await this.sqlite.getAllResearchLibraries();
            case 'research_sources': return await this.sqlite.getAllResearchSources();
            case 'research_summaries': return await this.sqlite.getAllResearchSummaries();
            // Projects not yet implemented in SqliteService, returning empty for now
            case 'projects': return [];
            default:
                console.warn(`[SqliteDataService] Unknown collection ${collection}`);
                return [];
        }
    }
    async upsert(collection, item) {
        if (!this.tauri.isTauri()) {
            try {
                const items = await this.getAll(collection);
                const index = items.findIndex((i) => i.id === item.id);
                if (index >= 0) {
                    items[index] = item;
                }
                else {
                    items.push(item);
                }
                localStorage.setItem(this.getFallbackKey(collection), JSON.stringify(items));
            }
            catch (e) {
                console.warn(`[SqliteDataService fallback] Error upserting ${collection}`, e);
            }
            return;
        }
        switch (collection) {
            case 'tasks': return await this.sqlite.upsertTask(item);
            case 'notes': return await this.sqlite.upsertNote(item);
            case 'planning_items': return await this.sqlite.upsertPlanningItem(item);
            case 'activities': return await this.sqlite.upsertActivity(item);
            case 'novels': return await this.sqlite.upsertNovel(item);
            case 'bin_items': return await this.sqlite.upsertBinItem(item);
            case 'snippets': return await this.sqlite.upsertSnippet(item);
            case 'books': return await this.sqlite.upsertBook(item);
            case 'meetings': return await this.sqlite.upsertMeeting(item);
            case 'articles': return await this.sqlite.upsertArticle(item);
            case 'journal_projects': return await this.sqlite.upsertJournalProject(item);
            case 'journal_entries': return await this.sqlite.upsertJournalEntry(item);
            case 'journal_columns': return await this.sqlite.upsertJournalColumn(item);
            case 'research_libraries': return await this.sqlite.upsertResearchLibrary(item);
            case 'research_sources': return await this.sqlite.upsertResearchSource(item);
            case 'research_summaries': return await this.sqlite.upsertResearchSummary(item);
            // Projects todo
            case 'projects': break;
            default: console.warn(`[SqliteDataService] Unknown collection ${collection} for upsert`);
        }
    }
    async remove(collection, id) {
        if (!this.tauri.isTauri()) {
            try {
                const items = await this.getAll(collection);
                const filtered = items.filter((i) => i.id !== id);
                localStorage.setItem(this.getFallbackKey(collection), JSON.stringify(filtered));
            }
            catch (e) {
                console.warn(`[SqliteDataService fallback] Error removing ${collection}`, e);
            }
            return;
        }
        switch (collection) {
            case 'tasks': return await this.sqlite.removeTask(id);
            case 'notes': return await this.sqlite.removeNote(id);
            // Planning items remove method? Check SqliteService
            case 'novels': return await this.sqlite.removeNovel(id);
            case 'bin_items': return await this.sqlite.removeBinItem(id);
            case 'novel_content': return await this.sqlite.removeNovelContent(id);
            case 'snippets': return await this.sqlite.removeSnippet(id);
            case 'books': return await this.sqlite.removeBook(id);
            case 'meetings': return await this.sqlite.removeMeeting(id);
            case 'articles': return await this.sqlite.removeArticle(id);
            case 'journal_projects': return await this.sqlite.removeJournalProject(id);
            case 'journal_entries': return await this.sqlite.removeJournalEntry(id);
            case 'journal_columns': return await this.sqlite.removeJournalColumn(id);
            case 'research_libraries': return await this.sqlite.removeResearchLibrary(id);
            case 'research_sources': return await this.sqlite.removeResearchSource(id);
            case 'research_summaries': return await this.sqlite.removeResearchSummary(id);
            default: console.warn(`[SqliteDataService] Unknown collection ${collection} for remove`);
        }
    }
    async importData(data) {
        // Sqlite export/import logic is in SqliteService
        // If we need import logic here, we can delegate or implement
    }
};
SqliteDataService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], SqliteDataService);
export { SqliteDataService };
