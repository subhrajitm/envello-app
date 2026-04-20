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

export interface Novel {
    id: string;
    title: string;
    icon: string;
    status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
    wordCount: number;
    targetWordCount: number;
    progress: number; // percentage
    chapters: number;
    notesCount: number;
    createdDate: string;
    lastUpdated: string;
    genre: string[];
    isRecentlyUpdated: boolean;
    coverImage?: string; // For thumbnail view
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
    words: string;
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
        novels?: string[]; // IDs of linked novels
        journals?: string[]; // IDs of linked journals/notes
        snippets?: string[]; // IDs of linked code snippets
        meetings?: string[]; // IDs of linked meetings
        research?: string[]; // IDs of linked research sources/libraries
        books?: string[]; // IDs of linked books
        articles?: string[]; // IDs of linked articles
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
    | 'journal-entry'
    | 'journal-project'
    | 'task'
    | 'meeting'
    | 'book'
    | 'snippet';

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
