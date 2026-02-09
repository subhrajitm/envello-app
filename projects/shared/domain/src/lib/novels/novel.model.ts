/**
 * Novel Domain Models
 */

export interface Novel {
    id: string;
    title: string;
    status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
    wordCount: number;
    targetWordCount: number;
    progress: number; // percentage
    chapters: number;
    notesCount: number;
    createdDate: string; // ISO or Display String
    lastUpdated: string;
    genre: string[];
    isRecentlyUpdated: boolean;
    coverImage?: string;
    icon: string;
}

export interface NovelContent {
    id: string; // Links to Novel.id
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
    timeline?: TimelineEvent[];
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
    summary?: string;
    tags?: string[];
    template?: string;
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
    content: string;
    wordCount: number;
    lastEdited: string;
}

export interface Prologue {
    id: string;
    title: string;
    content: string;
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
    imageUrl?: string;
    goals?: string;
    conflicts?: string;
}

export interface Location {
    id: string;
    name: string;
    type: string;
    description: string;
    imageUrl?: string;
    significance?: string;
}

export interface EditorNote {
    id: string;
    title: string;
    body: string;
    date: string;
    chapterId?: string;
}

export interface TimelineEvent {
    id: string;
    title: string;
    date: string;
    description: string;
    chapterId?: string;
    characters?: string[];
    locations?: string[];
}
