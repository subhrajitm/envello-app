import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { SqliteService } from './sqlite.service';
import { TauriService } from './tauri.service';
import { Task, Note, PlanningItem, Activity, Novel, BinItem } from '@envello/domain';

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
            // Projects not yet implemented in SqliteService, returning empty for now
            case 'projects': return [] as T[];
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
            // Projects todo
            case 'projects': break;
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
            // Planning items remove method? Check SqliteService
            case 'novels': return await this.sqlite.removeNovel(id);
            case 'bin_items': return await this.sqlite.removeBinItem(id);
            case 'novel_content': return await this.sqlite.removeNovelContent(id);
            default: console.warn(`[SqliteDataService] Unknown collection ${collection} for remove`);
        }
    }

    async importData(data: any): Promise<void> {
        // Sqlite export/import logic is in SqliteService
        // If we need import logic here, we can delegate or implement
    }
}
