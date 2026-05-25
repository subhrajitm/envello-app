import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, signal, inject } from '@angular/core';
import { StoreService } from './store.service';
import { BinService } from './bin.service';
import { SqliteService } from './sqlite.service';

export interface BookContent {
    id: string; // Links to StoreService Book.id
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

const PERSIST_DEBOUNCE_MS = 500;

@Injectable({
    providedIn: 'root'
})
export class BookContentService {
    activeBook = signal<BookContent | null>(null);
    store = inject(StoreService);
    private bin = inject(BinService);
    private db = inject(SqliteService);
    private persistTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() { }

    async loadBook(id: string): Promise<void> {
        this.activeBook.set(null);
        try {
            const raw = await this.db.getBookContent(id);
            if (raw) {
                const data = JSON.parse(raw) as BookContent;
                this.activeBook.set(data);
                return;
            }
            const data = this.createEmptyBook(id);
            this.activeBook.set(data);
            await this.db.setBookContent(id, JSON.stringify(data));
        } catch (e) {
            logIfTauri('[BookContentService] loadBook failed', e);

            // Fallback to LocalStorage for browser development
            const localData = localStorage.getItem(`book_content_${id}`);
            if (localData) {
                try {
                    this.activeBook.set(JSON.parse(localData));
                } catch (parseError) {
                    console.error('Failed to parse local storage book data', parseError);
                    this.activeBook.set(this.createEmptyBook(id));
                }
            } else {
                const empty = this.createEmptyBook(id);
                this.activeBook.set(empty);
                localStorage.setItem(`book_content_${id}`, JSON.stringify(empty));
            }
        }
    }

    private schedulePersist(): void {
        if (this.persistTimeout) clearTimeout(this.persistTimeout);
        this.persistTimeout = setTimeout(() => {
            this.persistTimeout = null;
            const n = this.activeBook();
            if (!n) return;

            this.db.setBookContent(n.id, JSON.stringify(n)).catch(e => {
                logIfTauri('[BookContentService] persist failed', e);
                // Fallback to LocalStorage
                localStorage.setItem(`book_content_${n.id}`, JSON.stringify(n));
            });
        }, PERSIST_DEBOUNCE_MS);
    }

    getChapter(chapterId: string): Chapter | undefined {
        const book = this.activeBook();
        if (!book) return undefined;

        for (const group of book.chapters) {
            const found = group.children.find(c => c.id === chapterId);
            if (found) return found;
        }
        return undefined;
    }

    updateChapterContent(chapterId: string, content: string, wordCount: number) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newChapters = book.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, content, wordCount, lastEdited: 'Just Now', status: 'EDITING' as const };
                    }
                    return chap;
                })
            }));

            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    toggleGroupExpand(groupId: string) {
        this.activeBook.update(book => {
            if (!book) return null;
            return {
                ...book,
                chapters: book.chapters.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
            };
        });
        this.schedulePersist();
    }

    updateChapterTitle(chapterId: string, title: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newChapters = book.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, title };
                    }
                    return chap;
                })
            }));

            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    updateChapterStatus(chapterId: string, status: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY') {
        this.activeBook.update(book => {
            if (!book) return null;
            return {
                ...book,
                chapters: book.chapters.map(group => ({
                    ...group,
                    children: group.children.map(chap =>
                        chap.id === chapterId ? { ...chap, status } : chap
                    )
                }))
            };
        });
        this.schedulePersist();
    }

    updateChapterTags(chapterId: string, tags: string[]) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newChapters = book.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, tags };
                    }
                    return chap;
                })
            }));

            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    updateChapterSummary(chapterId: string, summary: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newChapters = book.chapters.map(group => ({
                ...group,
                children: group.children.map(chap => {
                    if (chap.id === chapterId) {
                        return { ...chap, summary };
                    }
                    return chap;
                })
            }));

            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    // Chapter Management
    addChapter(groupId: string, title: string = 'Untitled Chapter') {
        this.activeBook.update(book => {
            if (!book) return null;

            const newChapters = book.chapters.map(group => {
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
            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    deleteChapter(chapterId: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            // Capture the chapter before removing it so we can move it to the bin
            let chapterToDelete: Chapter | undefined;
            let groupIdForChapter: string | undefined;

            for (const group of book.chapters) {
                const found = group.children.find(c => c.id === chapterId);
                if (found) {
                    chapterToDelete = found;
                    groupIdForChapter = group.id;
                    break;
                }
            }

            if (chapterToDelete) {
                this.bin.addToBin({
                    type: 'book-chapter',
                    originalId: chapterToDelete.id,
                    contextId: book.id,
                    title: chapterToDelete.title,
                    payload: {
                        ...chapterToDelete,
                        groupId: groupIdForChapter
                    }
                });
            }

            const newChapters = book.chapters.map(group => ({
                ...group,
                children: group.children.filter(chap => chap.id !== chapterId)
            }));
            this.store.addActivity('Deleted chapter', 'system');
            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    addChapterGroup(title: string = 'New Part') {
        this.activeBook.update(book => {
            if (!book) return null;

            const newGroup: ChapterGroup = {
                id: `g${Date.now()}`,
                title,
                expanded: true,
                children: []
            };

            return { ...book, chapters: [...book.chapters, newGroup] };
        });
        this.schedulePersist();
    }

    moveChapterToGroup(chapterId: string, targetGroupId: string) {
        this.activeBook.update(book => {
            if (!book) return null;
            let chapter: any = null;
            const stripped = book.chapters.map(group => {
                const found = group.children.find(c => c.id === chapterId);
                if (found) chapter = found;
                return { ...group, children: group.children.filter(c => c.id !== chapterId) };
            });
            if (!chapter) return book;
            const newChapters = stripped.map(group =>
                group.id === targetGroupId
                    ? { ...group, children: [...group.children, chapter] }
                    : group
            );
            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    moveChapterBetweenGroups(chapterId: string, targetGroupId: string, targetIndex: number) {
        this.activeBook.update(book => {
            if (!book) return null;
            let chapter: any = null;
            const stripped = book.chapters.map(group => {
                const found = group.children.find(c => c.id === chapterId);
                if (found) chapter = found;
                return { ...group, children: group.children.filter(c => c.id !== chapterId) };
            });
            if (!chapter) return book;
            const newChapters = stripped.map(group => {
                if (group.id === targetGroupId) {
                    const children = [...group.children];
                    children.splice(targetIndex, 0, chapter);
                    return { ...group, children };
                }
                return group;
            });
            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    updateChapterGroupTitle(groupId: string, title: string) {
        this.activeBook.update(book => {
            if (!book) return null;
            return { ...book, chapters: book.chapters.map(g => g.id === groupId ? { ...g, title } : g) };
        });
        this.schedulePersist();
    }

    reorderChapterGroup(fromIndex: number, toIndex: number) {
        this.activeBook.update(book => {
            if (!book) return null;
            const groups = [...book.chapters];
            const [moved] = groups.splice(fromIndex, 1);
            groups.splice(toIndex, 0, moved);
            return { ...book, chapters: groups };
        });
        this.schedulePersist();
    }

    reorderChapter(groupId: string, fromIndex: number, toIndex: number) {
        this.activeBook.update(book => {
            if (!book) return null;
            const newChapters = book.chapters.map(group => {
                if (group.id === groupId) {
                    const children = [...group.children];
                    const [moved] = children.splice(fromIndex, 1);
                    children.splice(toIndex, 0, moved);
                    return { ...group, children };
                }
                return group;
            });
            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    deleteChapterGroup(groupId: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            // Capture the group before removing it so we can move it to the bin
            const groupToDelete = book.chapters.find(g => g.id === groupId);

            if (groupToDelete) {
                // Move all chapters in the group to bin
                groupToDelete.children.forEach(chapter => {
                    this.bin.addToBin({
                        type: 'book-chapter',
                        originalId: chapter.id,
                        contextId: book.id,
                        title: chapter.title,
                        payload: {
                            ...chapter,
                            groupId: groupId
                        }
                    });
                });

                // Move the group itself to bin
                this.bin.addToBin({
                    type: 'book-group',
                    originalId: groupToDelete.id,
                    contextId: book.id,
                    title: groupToDelete.title,
                    payload: groupToDelete
                });
            }

            const newChapters = book.chapters.filter(group => group.id !== groupId);
            this.store.addActivity('Deleted act/part', 'system');
            return { ...book, chapters: newChapters };
        });
        this.schedulePersist();
    }

    // Note Management
    addNote(title: string, body: string = '', chapterId?: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newNote: EditorNote = {
                id: `n${Date.now()}`,
                title,
                body,
                date: 'Just now',
                chapterId
            };
            this.store.addActivity(`Added note '${title}'`, 'entry');
            return { ...book, notes: [...book.notes, newNote] };
        });
        this.schedulePersist();
    }

    updateNote(noteId: string, title: string, body: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newNotes = book.notes.map(note =>
                note.id === noteId ? { ...note, title, body, date: 'Just now' } : note
            );

            return { ...book, notes: newNotes };
        });
        this.schedulePersist();
    }

    deleteNote(noteId: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const noteToDelete = book.notes.find(note => note.id === noteId);
            if (noteToDelete) {
                this.bin.addToBin({
                    type: 'book-note',
                    originalId: noteToDelete.id,
                    contextId: book.id,
                    title: noteToDelete.title,
                    payload: noteToDelete
                });
            }

            return { ...book, notes: book.notes.filter(note => note.id !== noteId) };
        });
        this.schedulePersist();
    }

    // Character Management
    addCharacter(name: string, role: string = 'Supporting', archetype: string = '', description: string = '') {
        this.activeBook.update(book => {
            if (!book) return null;

            const newCharacter: Character = {
                id: `ch${Date.now()}`,
                name,
                role,
                archetype,
                description
            };
            this.store.addActivity(`Added character '${name}'`, 'entry');
            return { ...book, characters: [...book.characters, newCharacter] };
        });
        this.schedulePersist();
    }

    updateCharacter(characterId: string, updates: Partial<Character>) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newCharacters = book.characters.map(char =>
                char.id === characterId ? { ...char, ...updates } : char
            );

            return { ...book, characters: newCharacters };
        });
        this.schedulePersist();
    }

    deleteCharacter(characterId: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const characterToDelete = book.characters.find(char => char.id === characterId);
            if (characterToDelete) {
                this.bin.addToBin({
                    type: 'book-character',
                    originalId: characterToDelete.id,
                    contextId: book.id,
                    title: characterToDelete.name,
                    payload: characterToDelete
                });
            }

            return { ...book, characters: book.characters.filter(char => char.id !== characterId) };
        });
        this.schedulePersist();
    }

    // Location Management
    addLocation(name: string, type: string = 'Location', description: string = '') {
        this.activeBook.update(book => {
            if (!book) return null;

            const newLocation: Location = {
                id: `l${Date.now()}`,
                name,
                type,
                description
            };
            this.store.addActivity(`Added location '${name}'`, 'entry');
            return { ...book, locations: [...book.locations, newLocation] };
        });
        this.schedulePersist();
    }

    updateLocation(locationId: string, updates: Partial<Location>) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newLocations = book.locations.map(loc =>
                loc.id === locationId ? { ...loc, ...updates } : loc
            );

            return { ...book, locations: newLocations };
        });
        this.schedulePersist();
    }

    deleteLocation(locationId: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const locationToDelete = book.locations.find(loc => loc.id === locationId);
            if (locationToDelete) {
                this.bin.addToBin({
                    type: 'book-location',
                    originalId: locationToDelete.id,
                    contextId: book.id,
                    title: locationToDelete.name,
                    payload: locationToDelete
                });
            }

            return { ...book, locations: book.locations.filter(loc => loc.id !== locationId) };
        });
        this.schedulePersist();
    }

    // Book Metadata
    updateBookTitle(title: string) {
        this.activeBook.update(book => {
            if (!book) return null;
            return { ...book, title };
        });
        this.schedulePersist();
    }

    updateSynopsis(logline: string, theme: string) {
        this.activeBook.update(book => {
            if (!book) return null;
            return { ...book, synopsis: { logline, theme } };
        });
        this.schedulePersist();
    }

    // Front Matter Management
    addFrontMatterItem(type: FrontMatterItem['type'], title: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const newItem: FrontMatterItem = {
                id: `fm${Date.now()}`,
                type,
                title,
                content: '',
                wordCount: 0,
                lastEdited: 'Never'
            };

            this.store.addActivity(`Added ${title}`, 'entry');
            return { ...book, frontMatter: [...book.frontMatter, newItem] };
        });
        this.schedulePersist();
    }

    updateFrontMatterContent(itemId: string, content: string, wordCount: number) {
        this.activeBook.update(book => {
            if (!book) return null;

            const updatedFrontMatter = book.frontMatter.map(item =>
                item.id === itemId
                    ? { ...item, content, wordCount, lastEdited: 'Just now' }
                    : item
            );

            return { ...book, frontMatter: updatedFrontMatter };
        });
        this.schedulePersist();
    }

    updateFrontMatterTitle(itemId: string, title: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const updatedFrontMatter = book.frontMatter.map(item =>
                item.id === itemId ? { ...item, title } : item
            );

            return { ...book, frontMatter: updatedFrontMatter };
        });
        this.schedulePersist();
    }

    deleteFrontMatterItem(itemId: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const itemToDelete = book.frontMatter.find(item => item.id === itemId);
            if (itemToDelete) {
                this.bin.addToBin({
                    type: 'book-note', // Reuse note type for now
                    originalId: itemToDelete.id,
                    contextId: book.id,
                    title: itemToDelete.title,
                    payload: itemToDelete
                });
            }

            this.store.addActivity('Deleted front matter item', 'system');
            return { ...book, frontMatter: book.frontMatter.filter(item => item.id !== itemId) };
        });
        this.schedulePersist();
    }

    // Prologue Management
    addPrologue(title: string = 'Prologue') {
        this.activeBook.update(book => {
            if (!book) return null;

            const prologue: Prologue = {
                id: `pro${Date.now()}`,
                title,
                content: '',
                status: 'EMPTY',
                wordCount: 0,
                lastEdited: 'Never'
            };

            this.store.addActivity('Added prologue', 'entry');
            return { ...book, prologue };
        });
        this.schedulePersist();
    }

    updatePrologueContent(content: string, wordCount: number) {
        this.activeBook.update(book => {
            if (!book || !book.prologue) return null;

            return {
                ...book,
                prologue: {
                    ...book.prologue,
                    content,
                    wordCount,
                    lastEdited: 'Just now'
                }
            };
        });
        this.schedulePersist();
    }

    updatePrologueTitle(title: string) {
        this.activeBook.update(book => {
            if (!book || !book.prologue) return null;

            return {
                ...book,
                prologue: { ...book.prologue, title }
            };
        });
        this.schedulePersist();
    }

    deletePrologue() {
        this.activeBook.update(book => {
            if (!book || !book.prologue) return null;

            this.bin.addToBin({
                type: 'book-note',
                originalId: book.prologue.id,
                contextId: book.id,
                title: book.prologue.title,
                payload: book.prologue
            });

            this.store.addActivity('Deleted prologue', 'system');
            const { prologue, ...rest } = book;
            return rest;
        });
        this.schedulePersist();
    }

    // Plot Points Management
    updateChapterPlotPoint(chapterId: string, plotPoint: 'firstSlap' | 'secondSlap' | 'climax', content: string) {
        this.activeBook.update(book => {
            if (!book) return null;

            const updatedChapters = book.chapters.map(group => ({
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

            return { ...book, chapters: updatedChapters };
        });
        this.schedulePersist();
    }

    /** Clone the content of an existing book into a new one with a fresh id. */
    async cloneBookContent(sourceId: string, newId: string, newTitle: string): Promise<void> {
        let raw: string | null = null;
        try {
            raw = await this.db.getBookContent(sourceId);
        } catch {
            raw = localStorage.getItem(`book_content_${sourceId}`);
        }
        const data: BookContent = raw
            ? { ...(JSON.parse(raw) as BookContent), id: newId, title: newTitle }
            : this.createEmptyBook(newId, newTitle);
        try {
            await this.db.setBookContent(newId, JSON.stringify(data));
        } catch {
            localStorage.setItem(`book_content_${newId}`, JSON.stringify(data));
        }
    }

    /** Create and persist empty novel content (e.g. when adding a new book from the list). */
    async createAndPersistEmptyBook(id: string, title: string): Promise<void> {
        const data = this.createEmptyBook(id, title);
        try {
            await this.db.setBookContent(id, JSON.stringify(data));
        } catch (e) {
            logIfTauri('[BookContentService] Persist failed, falling back to LocalStorage', e);
            localStorage.setItem(`book_content_${id}`, JSON.stringify(data));
        }
    }

    private createEmptyBook(id: string, title: string = 'Untitled Book'): BookContent {
        return {
            id,
            title,
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
