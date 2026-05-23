export interface IFileSystem {
    saveNote(id: string, content: string): Promise<string>;
    readNote(id: string): Promise<string | null>;
    deleteNote(id: string): Promise<void>;
    // Add other methods as needed: saveFile, readFile, etc.
}

export interface Task {
    id: string;
    title: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    hours: string;
    status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
    project?: string;
    due?: string;
    /** Optional labels/tags associated with this task */
    labels?: string[];
    /** Optional reminders metadata (simple strings for now) */
    reminders?: string[];
    /** Subtasks for nested task structure */
    subtasks?: Task[];
    /** Parent task ID if this is a subtask */
    parentId?: string;
    /** Task dependencies - IDs of tasks that must be completed first */
    dependencies?: string[];
    /** Recurring task pattern */
    recurring?: {
        pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
        interval?: number;
        endDate?: string;
        nextDue?: string;
    };
    /** Time tracking */
    timeSpent?: number; // in minutes
    /** Notes/description with markdown support */
    notes?: string;
    /** Attachments */
    attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
        uploadedAt: string;
    }>;
    /** Rich notes/description with markdown support */
    description?: string;
    /** Task start date for timeline view */
    startDate?: string;
    /** Estimated duration in hours */
    estimatedDuration?: number;
    /** ISO timestamp when the task was created */
    createdAt?: string;
}

export interface Note {
    id: string;
    date: string;
    title: string;
    preview: string;
    content?: string; // HTML content (In-memory cache)
    tags?: string[];
    lastEdited?: string;
    filePath?: string;
    lastSynced?: string; // ISO date
    /** Folder id for daily-notes organization; defaults to first folder if missing */
    folderId?: string;
    /** Background color class for the editor (e.g. 'note-bg--rose') */
    bgColor?: string;
}

export interface PlanningItem {
    id: string;
    title: string;
    tag: string;
    stage: string;
    active: boolean;
}

export interface Activity {
    id: string;
    text: string;
    time: string;
    type: 'entry' | 'sync' | 'ai' | 'system';
}

export type WritingType =
    | 'NOVEL'
    | 'SHORT_STORY'
    | 'ARTICLE'
    | 'ESSAY'
    | 'SCRIPT'
    | 'POETRY'
    | 'BLOG_POST'
    | 'RESEARCH';

export interface Novel {
    id: string;
    title: string;
    icon: string;
    status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
    writingType?: WritingType;
    wordCount: number;
    targetWordCount: number;
    progress: number; // percentage
    chapters: number;
    notesCount: number;
    createdDate: string;
    lastUpdated: string;
    createdAt?: string; // ISO date string for reliable sorting
    genre: string[];
    isRecentlyUpdated: boolean;
    coverImage?: string; // For thumbnail view
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
    words: number;
    updated: string;
    icon: string;
    dueDate?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    progress?: number;
    team?: string[];
    tags?: string[];

    // New fields for complex projects
    type?: 'SINGLE' | 'MULTI'; // Single task oriented or multi-faceted
    linkedResources?: {
        novels?: string[];
        notes?: string[];
        meetings?: string[];
        research?: string[];
        articles?: string[];
        snippets?: string[];
        bookmarks?: string[];
    };
}

export type BinItemType =
    | 'daily-note'
    | 'novel'
    | 'novel-chapter'
    | 'novel-group'
    | 'novel-note'
    | 'novel-character'
    | 'novel-location'
    | 'task'
    | 'meeting';

export interface BinItem {
    id: string;
    type: BinItemType;
    originalId: string;
    contextId?: string;
    title?: string;
    deletedAt: string;
    payload: unknown;
}

export interface Credential {
    id: string;
    name: string;
    type: 'login' | 'api_key' | 'ssh' | 'db' | 'note';
    value: string; // encrypted string
    username?: string;
    url?: string;
    notes?: string;
    projectId?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt?: string;
    lastAccessedAt?: string;
}

export interface Subscription {
    id: string;
    name: string;
    category: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    renewalDate: string;
    status?: 'active' | 'paused' | 'cancelled';
    currency?: string;
    ownerId?: string;
    projectId?: string;
    notes?: string;
}

export interface CredentialSubscriptionLink {
    id: string;
    credentialId: string;
    subscriptionId: string;
}

export interface WorkspaceProfile {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    createdAt: string;
    lastAccessed: string;
}

export interface Bookmark {
    id: string;
    title: string;
    url: string;
    description?: string;
    faviconUrl?: string;
    tags?: string[];
    folderId?: string;
    createdAt: string;
    lastVisited?: string;
    visitCount?: number;
    notes?: string;
    color?: string;
    isArchived?: boolean;
    isPinned?: boolean;
}

export interface StorageFile {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    storagePath: string;
    publicUrl?: string;
    uploadedAt: string;
    libraryId?: string;
    sourceType?: 'task' | 'note' | 'research' | 'bookmark' | 'direct';
    sourceId?: string;
    description?: string;
    tags?: string[];
}

/** @deprecated Use StorageFile */
export type LibraryFile = StorageFile;

export interface BookmarkFolder {
    id: string;
    name: string;
    parentId?: string;
    icon?: string;
    color?: string;
    createdAt: string;
}
