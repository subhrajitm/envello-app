import { Injectable, signal } from '@angular/core';

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
    sourceIds: string[]; // References to sources used
    tags: string[];
    createdDate: string;
    lastModified: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchService {
    libraries = signal<ResearchLibrary[]>([
        {
            id: '1',
            name: 'Victorian London Research',
            description: 'Historical research for steampunk novel',
            color: '#8b5cf6',
            createdDate: '2026-01-10',
            lastModified: '2026-01-24'
        },
        {
            id: '2',
            name: 'Mars Colonization',
            description: 'Scientific research for sci-fi project',
            color: '#f97316',
            createdDate: '2026-01-15',
            lastModified: '2026-01-23'
        }
    ]);

    sources = signal<ResearchSource[]>([
        {
            id: '1',
            libraryId: '1',
            title: 'Victorian London Architecture',
            sourceType: 'WEB',
            url: 'https://britishlibrary.org.uk/arch-history-1850',
            description: 'Comprehensive guide to 1850s urban planning and aesthetics.',
            author: 'British Library',
            tags: ['History', 'Urban', 'Architecture'],
            status: 'PROCESSED',
            createdDate: '2026-01-10',
            lastAccessed: '2026-01-22'
        },
        {
            id: '2',
            libraryId: '2',
            title: 'Martian Soil Composition (Survey-2044)',
            sourceType: 'PDF',
            description: 'Technical report on soil acidity and terraforming viability.',
            author: 'ESA / NASA Joint Taskforce',
            tags: ['Science', 'Environment', 'Mars'],
            status: 'READING',
            createdDate: '2026-01-15',
            lastAccessed: '2026-01-24'
        },
        {
            id: '3',
            libraryId: '1',
            title: 'The Industrial Evolution',
            sourceType: 'PHYSICAL',
            description: 'Reference book, pages 112-145 covering steam engines.',
            author: 'Samuel H. Sterling',
            tags: ['Steampunk', 'Technology'],
            status: 'PROCESSED',
            createdDate: '2025-12-05'
        }
    ]);

    summaries = signal<ResearchSummary[]>([
        {
            id: '1',
            libraryId: '1',
            title: 'Victorian Architecture Summary',
            content: 'Key findings from Victorian architecture research...',
            sourceIds: ['1', '3'],
            tags: ['Architecture', 'Summary'],
            createdDate: '2026-01-22',
            lastModified: '2026-01-22'
        }
    ]);

    // Library methods
    addLibrary(library: Omit<ResearchLibrary, 'id' | 'createdDate' | 'lastModified'>) {
        const newLibrary: ResearchLibrary = {
            ...library,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0],
            lastModified: new Date().toISOString().split('T')[0]
        };
        this.libraries.update(list => [newLibrary, ...list]);
        return newLibrary;
    }

    updateLibrary(id: string, updates: Partial<ResearchLibrary>) {
        this.libraries.update(list =>
            list.map(lib => lib.id === id ? { ...lib, ...updates, lastModified: new Date().toISOString().split('T')[0] } : lib)
        );
    }

    deleteLibrary(id: string) {
        // Also delete all sources and summaries in this library
        this.sources.update(list => list.filter(s => s.libraryId !== id));
        this.summaries.update(list => list.filter(s => s.libraryId !== id));
        this.libraries.update(list => list.filter(lib => lib.id !== id));
    }

    // Source methods
    addSource(source: Omit<ResearchSource, 'id' | 'createdDate'>) {
        const newSource: ResearchSource = {
            ...source,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0]
        };
        this.sources.update(list => [newSource, ...list]);
        return newSource;
    }

    updateSource(id: string, updates: Partial<ResearchSource>) {
        this.sources.update(list =>
            list.map(s => s.id === id ? { ...s, ...updates } : s)
        );
    }

    deleteSource(id: string) {
        this.sources.update(list => list.filter(s => s.id !== id));
        // Remove from summaries
        this.summaries.update(list =>
            list.map(summary => ({
                ...summary,
                sourceIds: summary.sourceIds.filter(sid => sid !== id)
            }))
        );
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
        return newSummary;
    }

    updateSummary(id: string, updates: Partial<ResearchSummary>) {
        this.summaries.update(list =>
            list.map(s => s.id === id ? { ...s, ...updates, lastModified: new Date().toISOString().split('T')[0] } : s)
        );
    }

    deleteSummary(id: string) {
        this.summaries.update(list => list.filter(s => s.id !== id));
    }

    getSummariesByLibrary(libraryId: string) {
        return this.summaries().filter(s => s.libraryId === libraryId);
    }
}
