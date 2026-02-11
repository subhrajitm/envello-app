
import { Injectable, signal, inject } from '@angular/core';
import { DatabaseService } from '../core/services/database.service';

export interface ResearchLibrary {
    id: string;
    name: string;
    description?: string;
    color?: string;
    createdDate: string;
    lastModified: string;
}

export interface ResearchSource {
    id: string;
    libraryId: string;
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
}

export interface ResearchSummary {
    id: string;
    libraryId: string;
    title: string;
    content: string;
    sourceIds: string[];
    tags: string[];
    createdDate: string;
    lastModified: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchService {
    private db = inject(DatabaseService);

    libraries = signal<ResearchLibrary[]>([]);
    sources = signal<ResearchSource[]>([]);
    summaries = signal<ResearchSummary[]>([]);

    constructor() {
        this.loadFromDb();
    }

    private async loadFromDb(): Promise<void> {
        try {
            const [libs, srcs, sums] = await Promise.all([
                this.db.getAll<ResearchLibrary>('research_libraries'),
                this.db.getAll<ResearchSource>('research_sources'),
                this.db.getAll<ResearchSummary>('research_summaries'),
            ]);
            this.libraries.set(libs);
            this.sources.set(srcs);
            this.summaries.set(sums);
        } catch (e) {
            console.error('[ResearchService] loadFromDb failed', e);
        }
    }

    private persistLibrary(lib: ResearchLibrary): void {
        this.db.upsert('research_libraries', lib).catch(e => console.error('[ResearchService] persist library failed', e));
    }

    private persistSource(s: ResearchSource): void {
        this.db.upsert('research_sources', s).catch(e => console.error('[ResearchService] persist source failed', e));
    }

    private persistSummary(s: ResearchSummary): void {
        this.db.upsert('research_summaries', s).catch(e => console.error('[ResearchService] persist summary failed', e));
    }

    // Library methods
    addLibrary(library: Omit<ResearchLibrary, 'id' | 'createdDate' | 'lastModified'>) {
        const newLibrary: ResearchLibrary = {
            ...library,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0],
            lastModified: new Date().toISOString().split('T')[0]
        };
        this.libraries.update(list => [newLibrary, ...list]);
        this.persistLibrary(newLibrary);
        return newLibrary;
    }

    updateLibrary(id: string, updates: Partial<ResearchLibrary>) {
        this.libraries.update(list =>
            list.map(lib => lib.id === id ? { ...lib, ...updates, lastModified: new Date().toISOString().split('T')[0] } : lib)
        );
        const lib = this.libraries().find(l => l.id === id);
        if (lib) this.persistLibrary(lib);
    }

    async deleteLibrary(id: string) {
        const srcs = this.sources().filter(s => s.libraryId === id);
        const sums = this.summaries().filter(s => s.libraryId === id);
        for (const s of srcs) await this.db.remove('research_sources', s.id).catch(() => { });
        for (const s of sums) await this.db.remove('research_summaries', s.id).catch(() => { });
        this.sources.update(list => list.filter(s => s.libraryId !== id));
        this.summaries.update(list => list.filter(s => s.libraryId !== id));
        this.libraries.update(list => list.filter(lib => lib.id !== id));
        await this.db.remove('research_libraries', id).catch(e => console.error('[ResearchService] remove library failed', e));
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
        this.db.remove('research_sources', id).catch(e => console.error('[ResearchService] remove source failed', e));
        this.summaries().filter(s => s.sourceIds.includes(id)).forEach(s => this.persistSummary(s));
    }

    getSourcesByLibrary(libraryId: string) {
        return this.sources().filter(s => s.libraryId === libraryId);
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
        this.db.remove('research_summaries', id).catch(e => console.error('[ResearchService] remove summary failed', e));
    }

    getSummariesByLibrary(libraryId: string) {
        return this.summaries().filter(s => s.libraryId === libraryId);
    }
}
