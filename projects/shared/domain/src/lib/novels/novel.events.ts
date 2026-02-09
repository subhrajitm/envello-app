import { Novel, NovelContent, Chapter, Character, Location, ChapterGroup, FrontMatterItem, Prologue, EditorNote } from './novel.model';

export enum NovelEvents {
    // Novel Lifecycle
    CREATED = 'novel.created',
    UPDATED = 'novel.updated',
    DELETED = 'novel.deleted',
    CONTENT_LOADED = 'novel.content_loaded',

    // Content Structure
    CHAPTER_CREATED = 'novel.chapter.created',
    CHAPTER_UPDATED = 'novel.chapter.updated',
    CHAPTER_DELETED = 'novel.chapter.deleted',
    CHAPTER_MOVED = 'novel.chapter.moved',

    GROUP_CREATED = 'novel.group.created',
    GROUP_UPDATED = 'novel.group.updated',
    GROUP_DELETED = 'novel.group.deleted',
    GROUP_MOVED = 'novel.group.moved',

    // Entities
    CHARACTER_CREATED = 'novel.character.created',
    CHARACTER_UPDATED = 'novel.character.updated',
    CHARACTER_DELETED = 'novel.character.deleted',

    LOCATION_CREATED = 'novel.location.created',
    LOCATION_UPDATED = 'novel.location.updated',
    LOCATION_DELETED = 'novel.location.deleted',

    // Front Matter
    FRONT_MATTER_CREATED = 'novel.front_matter.created',
    FRONT_MATTER_UPDATED = 'novel.front_matter.updated',
    FRONT_MATTER_DELETED = 'novel.front_matter.deleted',

    // Prologue
    PROLOGUE_CREATED = '[Novel] Prologue Created',
    PROLOGUE_UPDATED = '[Novel] Prologue Updated',
    PROLOGUE_DELETED = '[Novel] Prologue Deleted',

    // Novel Notes
    NOTE_CREATED = 'novel.note.created',
    NOTE_UPDATED = 'novel.note.updated',
    NOTE_DELETED = 'novel.note.deleted',

    // Content Loading
    LOAD_CONTENT = 'novel.load_content',
}

// Payloads
export interface NovelCreatedPayload {
    novel: Novel;
    content?: NovelContent; // Optional initial content
}

export interface NovelUpdatedPayload {
    id: string;
    updates: Partial<Novel>;
}

export interface NovelDeletedPayload {
    id: string;
}

export interface NovelContentLoadedPayload {
    id: string;
    content: NovelContent;
}

// Chapter Payloads
export interface ChapterCreatedPayload {
    novelId: string;
    groupId: string;
    chapter: Chapter;
}

export interface ChapterUpdatedPayload {
    novelId: string;
    chapterId: string;
    updates: Partial<Chapter>;
}

export interface ChapterDeletedPayload {
    novelId: string;
    chapterId: string;
}

export interface ChapterMovedPayload {
    novelId: string;
    chapterId: string;
    fromGroupId: string;
    toGroupId: string;
    newIndex: number;
}

// Group Payloads
export interface GroupCreatedPayload {
    novelId: string;
    group: ChapterGroup;
}

export interface GroupUpdatedPayload {
    novelId: string;
    groupId: string;
    updates: Partial<ChapterGroup>;
}

export interface GroupDeletedPayload {
    novelId: string;
    groupId: string;
}

export interface GroupMovedPayload {
    novelId: string;
    groupId: string;
    newIndex: number;
}

// Entity Payloads
export interface CharacterCreatedPayload {
    novelId: string;
    character: Character;
}

export interface CharacterUpdatedPayload {
    novelId: string;
    characterId: string;
    updates: Partial<Character>;
}

export interface CharacterDeletedPayload {
    novelId: string;
    characterId: string;
}

export interface LocationCreatedPayload {
    novelId: string;
    location: Location;
}

export interface LocationUpdatedPayload {
    novelId: string;
    locationId: string;
    updates: Partial<Location>;
}

export interface LocationDeletedPayload {
    novelId: string;
    locationId: string;
}

// Front Matter Payloads
export interface FrontMatterCreatedPayload {
    novelId: string;
    item: FrontMatterItem;
}

export interface FrontMatterUpdatedPayload {
    novelId: string;
    itemId: string;
    updates: Partial<FrontMatterItem>;
}

export interface FrontMatterDeletedPayload {
    novelId: string;
    itemId: string;
}

// Prologue Payloads
export interface PrologueUpdatedPayload {
    novelId: string;
    prologue: Prologue;
}

export interface PrologueDeletedPayload {
    novelId: string;
}

// Note Payloads
export interface NovelNoteCreatedPayload {
    novelId: string;
    note: EditorNote;
}

export interface NovelNoteUpdatedPayload {
    novelId: string;
    noteId: string;
    updates: Partial<EditorNote>;
}

export interface NovelNoteDeletedPayload {
    novelId: string;
    noteId: string;
}

// Load Content Payload
export interface LoadContentPayload {
    novelId: string;
}
