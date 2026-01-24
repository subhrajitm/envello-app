import { Injectable, signal, inject } from '@angular/core';
import { StoreService } from './store.service';
import { BinService } from './bin.service';

export interface NovelContent {
    id: string; // Links to StoreService Novel.id
    title: string;
    synopsis: {
        logline: string;
        theme: string;
    };
    frontMatter: FrontMatterItem[];
    prologue?: Prologue;
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
    summary?: string; // Chapter summary
    tags?: string[]; // Tags for organization
    template?: string; // Template used
    plotPoints?: {
        firstSlap?: string; // Inciting incident
        secondSlap?: string; // Midpoint
        climax?: string; // Resolution
    };
}

export interface FrontMatterItem {
    id: string;
    type: 'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface';
    title: string;
    content: string; // HTML content
    wordCount: number;
    lastEdited: string;
}

export interface Prologue {
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
        frontMatter: [],
        chapters: [
            {
                id: 'g1', title: 'Part I: The Awakening', expanded: true, children: [
                    {
                        id: 'c1', title: 'Chapter 1: Static Noise', status: 'DONE', wordCount: 3200, lastEdited: '2 days ago',
                        content: `<h2>Chapter 1: Static Noise</h2>
<p>The static was the only constant. It was a comfort, really. The predictable hiss of the universe expanding, cooling, dying. Jara adjusted the frequency dial with practiced precision, her eyes scanning the holographic display that floated before her in the dim control room.</p>
<p>Twenty years. Twenty years of listening to nothing. Twenty years of cataloging cosmic background radiation, mapping dead zones, and filing reports that no one would ever read. The Outpost 42 was humanity's furthest listening post, a solitary beacon on the edge of explored space.</p>
<p>"Computer, run diagnostic on array seven," she said, her voice hoarse from disuse. Days could pass without her speaking to anyone but the ship's AI.</p>
<blockquote>"Array seven nominal. All systems functioning within expected parameters."</blockquote>
<p>She nodded, satisfied. The routine was comforting. Predictable. Safe. Outside the reinforced windows, the void stretched endlessly, a canvas of absolute darkness punctuated by distant stars that would take lifetimes to reach.</p>
<p>Jara stood, stretching muscles that had grown stiff from hours at the console. She walked to the observation deck, her footsteps echoing in the empty corridor. The station was designed for a crew of twelve. She was the only one who had stayed.</p>`
                    },
                    {
                        id: 'c2', title: 'Chapter 2: The Signal', status: 'EDITING', wordCount: 2405, lastEdited: 'Just now',
                        content: `<p>The signal was faint at first, barely a whisper against the background radiation of the cosmos. But it was there, a persistent rhythm that defied the random chaos of the void.</p>
<p>Jara adjusted the gain on her receiver, her fingers dancing across the haptic interface. "Computer, isolate frequency band 402. Is that... is that structure?"</p>
<blockquote>"Confirmed. Pattern analysis indicates artificial origin. Probability 99.9%."</blockquote>
<p>She leaned back, the breath catching in her throat. For twenty years she had listened to the static. Twenty years of silence. And now, finally, a voice.</p>
<p>Her hands trembled as she initiated the recording protocol. The signal pulsed with mathematical precision—three short bursts, two long, a pause, then the pattern repeated. It was deliberate. Intentional. Intelligent.</p>
<p>"Computer, triangulate source."</p>
<blockquote>"Source located in sector 7-7-Alpha. Distance: 4.2 light years. Origin point: The Void Expanse."</blockquote>
<p>The Void Expanse. The dead zone. The region of space so empty, so devoid of matter, that it had been written off as a cosmic anomaly. Nothing could survive there. Nothing should exist there.</p>
<p>And yet, something was calling out.</p>`
                    },
                    {
                        id: 'c3', title: 'Chapter 3: The Protocol', status: 'DRAFT', wordCount: 1850, lastEdited: '1 day ago',
                        content: `<p>The emergency protocol was buried deep in the station's archives, a relic from the early days of deep space exploration when humanity still feared what might be listening back.</p>
<p>Jara pulled up the file, her eyes scanning the dense technical language. "First Contact Protocol Alpha-7: In the event of confirmed extraterrestrial intelligence signal..."</p>
<p>Her finger hovered over the transmission button. Once she sent this, there would be no going back. Command would know. The military would mobilize. Her quiet life of solitude would end.</p>
<p>But the signal continued, pulsing with patient insistence. Waiting.</p>
<p>"What are you?" she whispered to the void.</p>`
                    },
                    {
                        id: 'c4', title: 'Chapter 4: The Response', status: 'EMPTY', wordCount: 0, lastEdited: 'Never',
                        content: ''
                    }
                ]
            },
            {
                id: 'g2', title: 'Part II: Contact', expanded: false, children: [
                    {
                        id: 'c5', title: 'Chapter 5: Arrival', status: 'EMPTY', wordCount: 0, lastEdited: 'Never',
                        content: ''
                    },
                    {
                        id: 'c6', title: 'Chapter 6: Commander Rike', status: 'EMPTY', wordCount: 0, lastEdited: 'Never',
                        content: ''
                    }
                ]
            },
            {
                id: 'g3', title: 'Part III: The Truth', expanded: false, children: []
            }
        ],
        characters: [
            { id: 'ch1', name: 'Jara Vance', role: 'Protagonist', archetype: 'Scientist', description: 'A brilliant but isolated astrophysicist who has spent 20 years alone on Outpost 42. Driven by curiosity and haunted by the choice between duty and discovery.' },
            { id: 'ch2', name: 'Commander Rike', role: 'Antagonist', archetype: 'Military Officer', description: 'Pragmatic military commander who sees the signal as a threat. Fearful of the unknown and willing to destroy what he cannot control.' },
            { id: 'ch3', name: 'Unit 734', role: 'Support', archetype: 'AI Companion', description: 'The station\'s artificial intelligence. Logical, precise, and Jara\'s only companion for two decades. Develops unexpected empathy.' },
            { id: 'ch4', name: 'Dr. Elena Marsh', role: 'Ally', archetype: 'Linguist', description: 'Expert in xenolinguistics sent to help decode the signal. Optimistic and idealistic, she believes the signal is a gift, not a threat.' },
            { id: 'ch5', name: 'The Sender', role: 'Mystery', archetype: 'Unknown Entity', description: 'The source of the signal. Its true nature and intentions remain unclear until the final act.' }
        ],
        locations: [
            { id: 'l1', name: 'Outpost 42', type: 'Space Station', description: 'A remote listening post on the edge of explored space. Designed for 12 crew members but currently operated by Jara alone. Features advanced sensor arrays and minimal life support.' },
            { id: 'l2', name: 'The Void Expanse', type: 'Space Region', description: 'An impossibly empty region of space, devoid of stars, planets, or detectable matter. The source of the mysterious signal.' },
            { id: 'l3', name: 'Control Room Alpha', type: 'Interior', description: 'The main operations center of Outpost 42. Filled with holographic displays, sensor readouts, and communication equipment.' },
            { id: 'l4', name: 'Observation Deck', type: 'Interior', description: 'A quiet space with reinforced windows overlooking the void. Jara\'s refuge for contemplation.' },
            { id: 'l5', name: 'UNSC Vigilant', type: 'Military Vessel', description: 'Commander Rike\'s flagship. A heavily armed destroyer sent to investigate and potentially neutralize the signal source.' }
        ],
        notes: [
            { id: 'n1', title: 'The Signal Pattern', body: 'The signal follows a mathematical sequence: 3 short, 2 long, pause. Could be prime numbers? Need to analyze deeper structure.', date: '2h ago' },
            { id: 'n2', title: 'Character Arc: Jara', body: 'She needs to hesitate before calling it in. The moment she transmits to Command is the moment her isolation ends. Make this decision weigh heavily.', date: 'Yesterday' },
            { id: 'n3', title: 'Thematic Notes', body: 'Core theme: What do we owe to humanity vs. what do we owe to discovery? Jara represents curiosity, Rike represents fear. Both are valid responses to the unknown.', date: '3 days ago' },
            { id: 'n4', title: 'Plot Twist Idea', body: 'What if the signal isn\'t a greeting, but a warning? Something is coming, and the sender is trying to help us prepare.', date: '1 week ago' },
            { id: 'n5', title: 'Pacing Notes', body: 'Part I should be slow, contemplative. Part II introduces conflict and urgency. Part III reveals the truth and forces impossible choices.', date: '2 weeks ago' }
        ]
    }
};

@Injectable({
    providedIn: 'root'
})
export class NovelContentService {
    // Current active novel state
    activeNovel = signal<NovelContent | null>(null);
    store = inject(StoreService);
  private bin = inject(BinService);

    constructor() { }

    loadNovel(id: string) {
        // Simulate API Fetch - instant synchronous load
        const data = INITIAL_DATA[id];
        if (data) {
            // Use structuredClone for fast deep copy (available in modern browsers)
            // This is much faster than JSON.parse/JSON.stringify
            if (typeof structuredClone !== 'undefined') {
                try {
                    this.activeNovel.set(structuredClone(data));
                } catch (e) {
                    // Fallback to JSON if structuredClone fails (rare edge cases)
                    this.activeNovel.set(JSON.parse(JSON.stringify(data)));
                }
            } else {
                // Fallback for older browsers: use JSON (slower but compatible)
                this.activeNovel.set(JSON.parse(JSON.stringify(data)));
            }
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

    updateChapterTitle(chapterId: string, title: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newChapters = novel.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, title };
                    }
                    return chap;
                })
            }));

            return { ...novel, chapters: newChapters };
        });
    }

    updateChapterTags(chapterId: string, tags: string[]) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newChapters = novel.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, tags };
                    }
                    return chap;
                })
            }));

            return { ...novel, chapters: newChapters };
        });
    }

    updateChapterSummary(chapterId: string, summary: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newChapters = novel.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, summary };
                    }
                    return chap;
                })
            }));

            return { ...novel, chapters: newChapters };
        });
    }

    // Chapter Management
    addChapter(groupId: string, title: string = 'Untitled Chapter') {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newChapters = novel.chapters.map(group => {
                if (group.id === groupId) {
                    const newChapter: Chapter = {
                        id: `c${Date.now()}`,
                        title,
                        content: '',
                        status: 'EMPTY',
                        wordCount: 0,
                        lastEdited: 'Never'
                    };
                    return { ...group, children: [...group.children, newChapter] };
                }
                return group;
            });
            this.store.addActivity(`Created new chapter '${title}'`, 'entry');
            return { ...novel, chapters: newChapters };
        });
    }

    deleteChapter(chapterId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            // Capture the chapter before removing it so we can move it to the bin
            let chapterToDelete: Chapter | undefined;
            let groupIdForChapter: string | undefined;

            for (const group of novel.chapters) {
                const found = group.children.find(c => c.id === chapterId);
                if (found) {
                    chapterToDelete = found;
                    groupIdForChapter = group.id;
                    break;
                }
            }

            if (chapterToDelete) {
                this.bin.addToBin({
                    type: 'novel-chapter',
                    originalId: chapterToDelete.id,
                    contextId: novel.id,
                    title: chapterToDelete.title,
                    payload: {
                        ...chapterToDelete,
                        groupId: groupIdForChapter
                    }
                });
            }

            const newChapters = novel.chapters.map(group => ({
                ...group,
                children: group.children.filter(chap => chap.id !== chapterId)
            }));
            this.store.addActivity('Deleted chapter', 'system');
            return { ...novel, chapters: newChapters };
        });
    }

    addChapterGroup(title: string = 'New Part') {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newGroup: ChapterGroup = {
                id: `g${Date.now()}`,
                title,
                expanded: true,
                children: []
            };

            return { ...novel, chapters: [...novel.chapters, newGroup] };
        });
    }

    reorderChapterGroup(fromIndex: number, toIndex: number) {
        this.activeNovel.update(novel => {
            if (!novel) return null;
            const groups = [...novel.chapters];
            const [moved] = groups.splice(fromIndex, 1);
            groups.splice(toIndex, 0, moved);
            return { ...novel, chapters: groups };
        });
    }

    reorderChapter(groupId: string, fromIndex: number, toIndex: number) {
        this.activeNovel.update(novel => {
            if (!novel) return null;
            const newChapters = novel.chapters.map(group => {
                if (group.id === groupId) {
                    const children = [...group.children];
                    const [moved] = children.splice(fromIndex, 1);
                    children.splice(toIndex, 0, moved);
                    return { ...group, children };
                }
                return group;
            });
            return { ...novel, chapters: newChapters };
        });
    }

    deleteChapterGroup(groupId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            // Capture the group before removing it so we can move it to the bin
            const groupToDelete = novel.chapters.find(g => g.id === groupId);
            
            if (groupToDelete) {
                // Move all chapters in the group to bin
                groupToDelete.children.forEach(chapter => {
                    this.bin.addToBin({
                        type: 'novel-chapter',
                        originalId: chapter.id,
                        contextId: novel.id,
                        title: chapter.title,
                        payload: {
                            ...chapter,
                            groupId: groupId
                        }
                    });
                });

                // Move the group itself to bin
                this.bin.addToBin({
                    type: 'novel-group',
                    originalId: groupToDelete.id,
                    contextId: novel.id,
                    title: groupToDelete.title,
                    payload: groupToDelete
                });
            }

            const newChapters = novel.chapters.filter(group => group.id !== groupId);
            this.store.addActivity('Deleted act/part', 'system');
            return { ...novel, chapters: newChapters };
        });
    }

    // Note Management
    addNote(title: string, body: string = '', chapterId?: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newNote: EditorNote = {
                id: `n${Date.now()}`,
                title,
                body,
                date: 'Just now',
                chapterId
            };
            this.store.addActivity(`Added note '${title}'`, 'entry');
            return { ...novel, notes: [...novel.notes, newNote] };
        });
    }

    updateNote(noteId: string, title: string, body: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newNotes = novel.notes.map(note =>
                note.id === noteId ? { ...note, title, body, date: 'Just now' } : note
            );

            return { ...novel, notes: newNotes };
        });
    }

    deleteNote(noteId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const noteToDelete = novel.notes.find(note => note.id === noteId);
            if (noteToDelete) {
                this.bin.addToBin({
                    type: 'novel-note',
                    originalId: noteToDelete.id,
                    contextId: novel.id,
                    title: noteToDelete.title,
                    payload: noteToDelete
                });
            }

            return { ...novel, notes: novel.notes.filter(note => note.id !== noteId) };
        });
    }

    // Character Management
    addCharacter(name: string, role: string = 'Supporting', archetype: string = '', description: string = '') {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newCharacter: Character = {
                id: `ch${Date.now()}`,
                name,
                role,
                archetype,
                description
            };
            this.store.addActivity(`Added character '${name}'`, 'entry');
            return { ...novel, characters: [...novel.characters, newCharacter] };
        });
    }

    updateCharacter(characterId: string, updates: Partial<Character>) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newCharacters = novel.characters.map(char =>
                char.id === characterId ? { ...char, ...updates } : char
            );

            return { ...novel, characters: newCharacters };
        });
    }

    deleteCharacter(characterId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const characterToDelete = novel.characters.find(char => char.id === characterId);
            if (characterToDelete) {
                this.bin.addToBin({
                    type: 'novel-character',
                    originalId: characterToDelete.id,
                    contextId: novel.id,
                    title: characterToDelete.name,
                    payload: characterToDelete
                });
            }

            return { ...novel, characters: novel.characters.filter(char => char.id !== characterId) };
        });
    }

    // Location Management
    addLocation(name: string, type: string = 'Location', description: string = '') {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newLocation: Location = {
                id: `l${Date.now()}`,
                name,
                type,
                description
            };
            this.store.addActivity(`Added location '${name}'`, 'entry');
            return { ...novel, locations: [...novel.locations, newLocation] };
        });
    }

    updateLocation(locationId: string, updates: Partial<Location>) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newLocations = novel.locations.map(loc =>
                loc.id === locationId ? { ...loc, ...updates } : loc
            );

            return { ...novel, locations: newLocations };
        });
    }

    deleteLocation(locationId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const locationToDelete = novel.locations.find(loc => loc.id === locationId);
            if (locationToDelete) {
                this.bin.addToBin({
                    type: 'novel-location',
                    originalId: locationToDelete.id,
                    contextId: novel.id,
                    title: locationToDelete.name,
                    payload: locationToDelete
                });
            }

            return { ...novel, locations: novel.locations.filter(loc => loc.id !== locationId) };
        });
    }

    // Novel Metadata
    updateNovelTitle(title: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;
            return { ...novel, title };
        });
    }

    updateSynopsis(logline: string, theme: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;
            return { ...novel, synopsis: { logline, theme } };
        });
    }

    // Front Matter Management
    addFrontMatterItem(type: FrontMatterItem['type'], title: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const newItem: FrontMatterItem = {
                id: `fm${Date.now()}`,
                type,
                title,
                content: '',
                wordCount: 0,
                lastEdited: 'Never'
            };

            this.store.addActivity(`Added ${title}`, 'entry');
            return { ...novel, frontMatter: [...novel.frontMatter, newItem] };
        });
    }

    updateFrontMatterContent(itemId: string, content: string, wordCount: number) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const updatedFrontMatter = novel.frontMatter.map(item =>
                item.id === itemId
                    ? { ...item, content, wordCount, lastEdited: 'Just now' }
                    : item
            );

            return { ...novel, frontMatter: updatedFrontMatter };
        });
    }

    updateFrontMatterTitle(itemId: string, title: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const updatedFrontMatter = novel.frontMatter.map(item =>
                item.id === itemId ? { ...item, title } : item
            );

            return { ...novel, frontMatter: updatedFrontMatter };
        });
    }

    deleteFrontMatterItem(itemId: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const itemToDelete = novel.frontMatter.find(item => item.id === itemId);
            if (itemToDelete) {
                this.bin.addToBin({
                    type: 'novel-note', // Reuse note type for now
                    originalId: itemToDelete.id,
                    contextId: novel.id,
                    title: itemToDelete.title,
                    payload: itemToDelete
                });
            }

            this.store.addActivity('Deleted front matter item', 'system');
            return { ...novel, frontMatter: novel.frontMatter.filter(item => item.id !== itemId) };
        });
    }

    // Prologue Management
    addPrologue(title: string = 'Prologue') {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const prologue: Prologue = {
                id: `pro${Date.now()}`,
                title,
                content: '',
                status: 'EMPTY',
                wordCount: 0,
                lastEdited: 'Never'
            };

            this.store.addActivity('Added prologue', 'entry');
            return { ...novel, prologue };
        });
    }

    updatePrologueContent(content: string, wordCount: number) {
        this.activeNovel.update(novel => {
            if (!novel || !novel.prologue) return null;

            return {
                ...novel,
                prologue: {
                    ...novel.prologue,
                    content,
                    wordCount,
                    lastEdited: 'Just now'
                }
            };
        });
    }

    updatePrologueTitle(title: string) {
        this.activeNovel.update(novel => {
            if (!novel || !novel.prologue) return null;

            return {
                ...novel,
                prologue: { ...novel.prologue, title }
            };
        });
    }

    deletePrologue() {
        this.activeNovel.update(novel => {
            if (!novel || !novel.prologue) return null;

            this.bin.addToBin({
                type: 'novel-note',
                originalId: novel.prologue.id,
                contextId: novel.id,
                title: novel.prologue.title,
                payload: novel.prologue
            });

            this.store.addActivity('Deleted prologue', 'system');
            const { prologue, ...rest } = novel;
            return rest;
        });
    }

    // Plot Points Management
    updateChapterPlotPoint(chapterId: string, plotPoint: 'firstSlap' | 'secondSlap' | 'climax', content: string) {
        this.activeNovel.update(novel => {
            if (!novel) return null;

            const updatedChapters = novel.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return {
                            ...chap,
                            plotPoints: {
                                ...chap.plotPoints,
                                [plotPoint]: content
                            }
                        };
                    }
                    return chap;
                })
            }));

            return { ...novel, chapters: updatedChapters };
        });
    }

    // Helpers
    private createEmptyNovel(id: string): NovelContent {
        return {
            id,
            title: 'Untitled Novel',
            synopsis: { logline: '', theme: '' },
            frontMatter: [],
            chapters: [
                { id: 'g1', title: 'Part 1', expanded: true, children: [] }
            ],
            characters: [],
            locations: [],
            notes: []
        };
    }
}
