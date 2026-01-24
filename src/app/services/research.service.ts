import { Injectable, signal } from '@angular/core';

export interface ResearchEntry {
    id: string;
    title: string;
    sourceType: 'WEB' | 'PDF' | 'INTERVIEW' | 'PHYSICAL' | 'VIDEO' | 'ARTICLE';
    url?: string;
    description?: string;
    author?: string;
    publishDate?: string;
    tags: string[];
    projectId?: string; // Links to a specific project
    status: 'UNREAD' | 'READING' | 'PROCESSED';
    relevanceScore?: number; // 1-10
    notes?: string;
    createdDate: string;
    lastAccessed?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchService {
    entries = signal<ResearchEntry[]>([
        {
            id: '1',
            title: 'Victorian London Architecture',
            sourceType: 'WEB',
            url: 'https://britishlibrary.org.uk/arch-history-1850',
            description: 'Comprehensive guide to 1850s urban planning and aesthetics.',
            author: 'British Library',
            tags: ['History', 'Urban', 'Architecture'],
            projectId: 'p1', // Mock Project ID
            status: 'PROCESSED',
            relevanceScore: 9,
            createdDate: '2026-01-10',
            lastAccessed: '2026-01-22'
        },
        {
            id: '2',
            title: 'Martian Soil Composition (Survey-2044)',
            sourceType: 'PDF',
            description: 'Technical report on soil acidity and terraforming viability.',
            author: 'ESA / NASA Joint Taskforce',
            tags: ['Science', 'Environment', 'Mars'],
            projectId: 'p2',
            status: 'READING',
            relevanceScore: 10,
            createdDate: '2026-01-15',
            lastAccessed: '2026-01-24'
        },
        {
            id: '3',
            title: 'Interview with Dr. Aris Thorne',
            sourceType: 'INTERVIEW',
            description: 'Transcript of conversation regarding botany in low-light environments.',
            author: 'Dr. Aris Thorne',
            tags: ['Botany', 'Expert', 'Character-Ref'],
            projectId: 'p3',
            status: 'UNREAD',
            relevanceScore: 7,
            createdDate: '2026-01-20'
        },
        {
            id: '4',
            title: 'The Industrial Evolution',
            sourceType: 'PHYSICAL',
            description: 'Reference book, pages 112-145 covering steam engines.',
            author: 'Samuel H. Sterling',
            tags: ['Steampunk', 'Technology'],
            projectId: 'p1',
            status: 'PROCESSED',
            relevanceScore: 5,
            createdDate: '2025-12-05'
        },
        {
            id: '5',
            title: 'Atmospheric Pressure on Highlands',
            sourceType: 'WEB',
            url: 'https://nasa.gov/mars/atmosphere-data',
            description: 'Raw data tables for altitude pressure variances.',
            tags: ['Physics', 'Atmosphere', 'Hard-Sci'],
            projectId: 'p2',
            status: 'UNREAD',
            relevanceScore: 8,
            createdDate: '2026-01-23'
        }
    ]);

    addEntry(entry: Omit<ResearchEntry, 'id' | 'createdDate'>) {
        const newEntry: ResearchEntry = {
            ...entry,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString().split('T')[0]
        };
        this.entries.update(list => [newEntry, ...list]);
        return newEntry;
    }

    updateEntry(id: string, updates: Partial<ResearchEntry>) {
        this.entries.update(list =>
            list.map(e => e.id === id ? { ...e, ...updates } : e)
        );
    }

    deleteEntry(id: string) {
        this.entries.update(list => list.filter(e => e.id !== id));
    }

    getEntry(id: string) {
        return this.entries().find(e => e.id === id);
    }
}
