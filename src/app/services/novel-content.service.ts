import { Injectable, signal } from '@angular/core';

export interface NovelContent {
    id: string; // Links to StoreService Novel.id
    title: string;
    synopsis: {
        logline: string;
        theme: string;
    };
    chapters: ChapterGroup[];
    characters: Character[];
    locations: Location[];
    notes: EditorNote[];
}

export interface ChapterGroup {
    id: string;
    title: string;
    expanded: boolean;
    children: Chapter[];
}

export interface Chapter {
    id: string;
    title: string;
    content: string; // HTML content
    status: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY';
    wordCount: number;
    lastEdited: string;
}

export interface Character {
    id: string;
    name: string;
    role: string;
    archetype: string;
    description: string;
}

export interface Location {
    id: string;
    name: string;
    type: string;
    description: string;
}

export interface EditorNote {
    id: string;
    title: string;
    body: string;
    date: string;
    chapterId?: string; // Optional link to specific chapter
}

// Initial Mock Data Structure
const INITIAL_DATA: Record<string, NovelContent> = {
    '1': {
        id: '1',
        title: 'The Silent Echo',
        synopsis: {
            logline: 'A lone scientist discovers a structured signal from the void, triggering a protocol that was never meant to be activated.',
            theme: 'Isolation vs. Duty'
        },
        chapters: [
            {
                id: 'g1', title: 'Part I: The Awakening', expanded: true, children: [
                    {
                        id: 'c1', title: 'Chapter 1: Static Noise', status: 'DRAFT', wordCount: 3200, lastEdited: '2 days ago',
                        content: `<h2>Chapter 1: Static Noise</h2><p>The static was the only constant. It was a comfort, really. The predictable hiss of the universe expanding, cooling, dying. Jara adjusted the frequency...</p>`
                    },
                    {
                        id: 'c2', title: 'Chapter 2: The Signal', status: 'EDITING', wordCount: 2405, lastEdited: 'Just now',
                        content: `<p>The signal was faint at first, barely a whisper against the background radiation of the cosmos. But it was there, a persistent rhythm that defied the random chaos of the void.</p>
            <p>Jara adjusted the gain on her receiver, her fingers dancing across the haptic interface. "Computer, isolate frequency band 402. Is that... is that structure?"</p>
            <blockquote>"Confirmed. Pattern analysis indicates artificial origin. Probability 99.9%."</blockquote>
            <p>She leaned back, the breath catching in her throat. For twenty years she had listened to the static. Twenty years of silence. And now, finally, a voice.</p>`
                    },
                    {
                        id: 'c3', title: 'Chapter 3: Silence', status: 'EMPTY', wordCount: 0, lastEdited: 'Never',
                        content: ''
                    }
                ]
            },
            {
                id: 'g2', title: 'Part II: Ascension', expanded: false, children: []
            }
        ],
        characters: [
            { id: 'ch1', name: 'Jara Vance', role: 'Protagonist', archetype: 'Scientist', description: 'Driven, isolated, brilliant.' },
            { id: 'ch2', name: 'Commander Rike', role: 'Antagonist', archetype: 'Military', description: 'Pragmatic, fearful of the unknown.' },
            { id: 'ch3', name: 'Unit 734', role: 'Support', archetype: 'Droid', description: 'Logical foil to Jara.' }
        ],
        locations: [
            { id: 'l1', name: 'Outpost 42', type: 'Station', description: 'A listening post on the edge of the system.' },
            { id: 'l2', name: 'The Void Expanse', type: 'Space', description: 'The empty sector where the signal originated.' }
        ],
        notes: [
            { id: 'n1', title: 'The Signal Protocol', body: 'Remember to define the frequency modulation clearly.', date: '2h ago' },
            { id: 'n2', title: 'Character Arc: Jara', body: 'She needs to hesitate before calling it in.', date: 'Yesterday' }
        ]
    }
};

@Injectable({
    providedIn: 'root'
})
export class NovelContentService {
    // Current active novel state
    activeNovel = signal<NovelContent | null>(null);

    constructor() { }

    loadNovel(id: string) {
        // Simulate API Fetch
        const data = INITIAL_DATA[id];
        if (data) {
            // Deep copy to simulate fresh load
            this.activeNovel.set(JSON.parse(JSON.stringify(data)));
        } else {
            // Create empty/new if not found (or handle error)
            this.activeNovel.set(this.createEmptyNovel(id));
        }
    }

    getChapter(chapterId: string): Chapter | undefined {
        const novel = this.activeNovel();
        if (!novel) return undefined;

        for (const group of novel.chapters) {
            const found = group.children.find(c => c.id === chapterId);
            if (found) return found;
        }
        return undefined;
    }

    updateChapterContent(chapterId: string, content: string, wordCount: number) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newChapters = novel.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, content, wordCount, lastEdited: 'Just Now', status: 'EDITING' as const };
                    }
                    return chap;
                })
            }));

            return { ...novel, chapters: newChapters };
        });
    }

    toggleGroupExpand(groupId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;
            return {
                ...novel,
                chapters: novel.chapters.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
            };
        });
    }

    // Helpers
    private createEmptyNovel(id: string): NovelContent {
        return {
            id,
            title: 'Untitled Novel',
            synopsis: { logline: '', theme: '' },
            chapters: [
                { id: 'g1', title: 'Part 1', expanded: true, children: [] }
            ],
            characters: [],
            locations: [],
            notes: []
        };
    }
}
