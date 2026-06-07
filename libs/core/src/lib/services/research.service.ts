import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, signal, inject } from '@angular/core';
import { DataService } from '@envello/data';

export interface ResearchCollection {
    id: string;
    name: string;
    description?: string;
    color?: string;
    createdDate: string;
    lastModified: string;
}


export interface ResearchSource {
    id: string;
    collectionId?: string;
    title: string;
    sourceType: 'WEB' | 'PDF' | 'INTERVIEW' | 'PHYSICAL' | 'VIDEO' | 'ARTICLE';
    url?: string;
    description?: string;
    author?: string;
    publishDate?: string;
    tags: string[];
    status: 'UNREAD' | 'READING' | 'PROCESSED';
    notes?: string;
    createdDate: string;
    lastAccessed?: string;
    linkedTaskIds?: string[];
}

export interface ResearchSummary {
    id: string;
    collectionId: string;
    title: string;
    content: string;
    sourceIds: string[];
    fileIds?: string[];
    tags: string[];
    createdDate: string;
    lastModified: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchService {
    private db = inject(DataService);

    collections = signal<ResearchCollection[]>([]);
    sources = signal<ResearchSource[]>([]);
    summaries = signal<ResearchSummary[]>([]);


    constructor() {
        this.loadFromDb();
        window.addEventListener('envello:db-ready',      () => this.loadFromDb());
        window.addEventListener('envello:sync-complete', () => this.loadFromDb());
    }

    private async loadFromDb(): Promise<void> {
        try {
            const [cols, srcs, sums] = await Promise.all([
                this.db.getAll<ResearchCollection>('research_collections'),
                this.db.getAll<ResearchSource>('research_sources'),
                this.db.getAll<ResearchSummary>('research_summaries'),
            ]);
            this.collections.set(cols);
            this.sources.set(srcs);
            this.summaries.set(sums);
        } catch (e) {
            logIfTauri('[ResearchService] loadFromDb failed', e);
        }
    }

    private persistCollection(col: ResearchCollection): void {
        this.db.upsert('research_collections', col).catch(e => logIfTauri('[ResearchService] persist collection failed', e));
    }

    private persistSource(s: ResearchSource): void {
        this.db.upsert('research_sources', s).catch(e => logIfTauri('[ResearchService] persist source failed', e));
    }

    private persistSummary(s: ResearchSummary): void {
        this.db.upsert('research_summaries', s).catch(e => logIfTauri('[ResearchService] persist summary failed', e));
    }

    // Collection methods
    addCollection(collection: Omit<ResearchCollection, 'id' | 'createdDate' | 'lastModified'>) {
        const newCollection: ResearchCollection = {
            ...collection,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0],
            lastModified: new Date().toISOString().split('T')[0]
        };
        this.collections.update(list => [newCollection, ...list]);
        this.persistCollection(newCollection);
        return newCollection;
    }


    updateCollection(id: string, updates: Partial<ResearchCollection>) {
        this.collections.update(list =>
            list.map(col => col.id === id ? { ...col, ...updates, lastModified: new Date().toISOString().split('T')[0] } : col)
        );
        const col = this.collections().find(c => c.id === id);
        if (col) this.persistCollection(col);
    }


    async deleteCollection(id: string) {
        const srcs = this.sources().filter(s => s.collectionId === id);
        const sums = this.summaries().filter(s => s.collectionId === id);
        for (const s of srcs) await this.db.remove('research_sources', s.id).catch(() => { });
        for (const s of sums) await this.db.remove('research_summaries', s.id).catch(() => { });
        this.sources.update(list => list.filter(s => s.collectionId !== id));
        this.summaries.update(list => list.filter(s => s.collectionId !== id));
        this.collections.update(list => list.filter(col => col.id !== id));
        await this.db.remove('research_collections', id).catch(e => logIfTauri('[ResearchService] remove collection failed', e));
    }


    // Source methods
    addSource(source: Omit<ResearchSource, 'id' | 'createdDate'>) {
        const newSource: ResearchSource = {
            ...source,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0]
        };
        this.sources.update(list => [newSource, ...list]);
        this.persistSource(newSource);
        return newSource;
    }

    updateSource(id: string, updates: Partial<ResearchSource>) {
        this.sources.update(list =>
            list.map(s => s.id === id ? { ...s, ...updates } : s)
        );
        const s = this.sources().find(x => x.id === id);
        if (s) this.persistSource(s);
    }

    deleteSource(id: string) {
        this.sources.update(list => list.filter(s => s.id !== id));
        this.summaries.update(list =>
            list.map(summary => ({
                ...summary,
                sourceIds: summary.sourceIds.filter(sid => sid !== id)
            }))
        );
        this.db.remove('research_sources', id).catch(e => logIfTauri('[ResearchService] remove source failed', e));
        this.summaries().filter(s => s.sourceIds.includes(id)).forEach(s => this.persistSummary(s));
    }

    getSourcesByCollection(collectionId: string) {
        return this.sources().filter(s => s.collectionId === collectionId);
    }


    // Summary methods
    addSummary(summary: Omit<ResearchSummary, 'id' | 'createdDate' | 'lastModified'>) {
        const newSummary: ResearchSummary = {
            ...summary,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0],
            lastModified: new Date().toISOString().split('T')[0]
        };
        this.summaries.update(list => [newSummary, ...list]);
        this.persistSummary(newSummary);
        return newSummary;
    }

    updateSummary(id: string, updates: Partial<ResearchSummary>) {
        this.summaries.update(list =>
            list.map(s => s.id === id ? { ...s, ...updates, lastModified: new Date().toISOString().split('T')[0] } : s)
        );
        const s = this.summaries().find(x => x.id === id);
        if (s) this.persistSummary(s);
    }

    deleteSummary(id: string) {
        this.summaries.update(list => list.filter(s => s.id !== id));
        this.db.remove('research_summaries', id).catch(e => logIfTauri('[ResearchService] remove summary failed', e));
    }

    getSummariesByCollection(collectionId: string) {
        return this.summaries().filter(s => s.collectionId === collectionId);
    }

}
