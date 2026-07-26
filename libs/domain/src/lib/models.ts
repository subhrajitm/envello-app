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
    /** Set when moved to bin; null/undefined means active */
    deleted_at?: string | null;
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
    deleted_at?: string | null;
}

export interface NoteHistoryEntry {
    id: string;
    noteId: string;
    title: string;
    content: string; // HTML snapshot
    snapshotAt: string; // ISO timestamp
    label?: string; // optional user-provided label e.g. "Before big edit"
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

export interface Book {
    id: string;
    title: string;
    icon: string;
    status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
    writingType?: WritingType;
    wordCount: number;
    targetWordCount: number;
    progress: number;
    chapters: number;
    notesCount: number;
    createdDate: string;
    lastUpdated: string;
    createdAt?: string;
    genre: string[];
    isRecentlyUpdated: boolean;
    coverImage?: string;
    deleted_at?: string | null;
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
    words: number;
    updated: string;
    icon: string;
    /** Accent color synced across devices via the projects collection. */
    color?: string;
    dueDate?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    progress?: number;
    team?: string[];
    tags?: string[];

    // New fields for complex projects
    type?: 'SINGLE' | 'MULTI'; // Single task oriented or multi-faceted
    linkedResources?: {
        books?: string[];
        notes?: string[];
        meetings?: string[];
        research?: string[];
        articles?: string[];
        snippets?: string[];
        bookmarks?: string[];
    };
}

/** @deprecated Use BinEntryType */
export type BinItemType = BinEntryType;
/** @deprecated Use BinEntry */
export type BinItem = BinEntry;

export type BinEntryType =
    | 'task'
    | 'daily-note'
    | 'write'
    | 'meeting'
    | 'bookmark'
    | 'credential'
    | 'transaction';

export interface BinEntry {
    id: string;
    type: BinEntryType;
    title?: string;
    deleted_at: string;
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
    deleted_at?: string | null;
}

export type TransactionType = 'recurring' | 'one-time' | 'bill' | 'purchase' | 'refund';

export interface TransactionEvent {
    date: string;   // ISO datetime
    kind: 'created' | 'billed' | 'amount_changed' | 'status_changed' | 'date_changed' | 'name_changed' | 'cycle_changed';
    label: string;
    detail?: string;  // e.g. "$10.00 → $15.00"
}

export interface Transaction {
    id: string;
    name: string;
    type: TransactionType;
    category?: string;
    amount: number;
    currency?: string;
    /** Next due date (recurring/bill) or transaction date (one-time/purchase/refund). ISO string. */
    date: string;
    /** Only relevant for type === 'recurring'. */
    billingCycle?: 'monthly' | 'yearly' | 'weekly';
    status?: 'active' | 'paused' | 'cancelled' | 'completed';
    ownerId?: string;
    projectId?: string;
    notes?: string;
    createdAt?: string;
    history?: TransactionEvent[];
    deleted_at?: string | null;
}

/** @deprecated Use Transaction instead. Kept as alias for migration compatibility. */
export type Subscription = Transaction;

export interface CredentialTransactionLink {
    id: string;
    credentialId: string;
    transactionId: string;
}

/** @deprecated Use CredentialTransactionLink instead. */
export type CredentialSubscriptionLink = CredentialTransactionLink;

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
    deleted_at?: string | null;
}

export interface StorageFile {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    storagePath: string;
    publicUrl?: string;
    uploadedAt: string;
    collectionId?: string;
    sourceType?: 'task' | 'note' | 'research' | 'bookmark' | 'direct';
    sourceId?: string;
    description?: string;
    tags?: string[];
}

export interface BookmarkFolder {
    id: string;
    name: string;
    parentId?: string;
    icon?: string;
    color?: string;
    createdAt: string;
}

export type RelationshipType = 'friend' | 'colleague' | 'client' | 'family' | 'mentor' | 'acquaintance';

export interface Person {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
    avatar?: string;
    tags?: string[];
    notes?: string;
    // CRM fields
    birthday?: string;           // YYYY-MM-DD (year optional but stored for display)
    lastContacted?: string;      // ISO datetime — manually logged
    reminderDate?: string;       // YYYY-MM-DD — next follow-up date
    relationshipType?: RelationshipType;
    location?: string;
    socialLinks?: { linkedin?: string; twitter?: string; website?: string };
    lastInteraction?: string;    // ISO date of most recent interaction
    createdAt: string;
    deleted_at?: string | null;
}

export type HabitFrequency = 'daily' | 'weekly';
export type HabitCategory = 'health' | 'fitness' | 'mindfulness' | 'learning' | 'productivity' | 'social' | 'other';

export interface HabitLog {
    date: string;  // YYYY-MM-DD
}

export interface Habit {
    id: string;
    title: string;
    description?: string;
    category?: HabitCategory;
    frequency: HabitFrequency;
    targetDays?: number[];   // weekly: [0-6] where 0=Sun; undefined = all days
    color?: string;
    icon?: string;           // material symbol name
    logs: HabitLog[];        // last 365 days max
    createdAt: string;
    archivedAt?: string;     // set when archived, cleared on restore
    deleted_at?: string | null;
}

export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink' | 'other';

export interface RecipeIngredient {
    id: string;
    amount: string;   // "1", "1/2", "2–3"
    unit: string;     // "cup", "tbsp", "g", "" (empty = no unit)
    name: string;
    note?: string;    // "finely chopped", "room temperature"
}

export interface RecipeStep {
    id: string;
    order: number;
    instruction: string;
    duration?: string;  // "5 minutes"
}

export interface Recipe {
    id: string;
    title: string;
    description?: string;
    category?: RecipeCategory;
    servings?: number;
    prepTime?: number;    // minutes
    cookTime?: number;    // minutes
    ingredients: RecipeIngredient[];
    steps: RecipeStep[];
    tags?: string[];
    sourceUrl?: string;
    notes?: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt?: string;
    deleted_at?: string | null;
}

export type ListType = 'shopping' | 'packing' | 'checklist' | 'todo';

export interface ListItem {
    id: string;
    text: string;
    checked: boolean;
    quantity?: string;  // "2 kg", "3 bottles", etc.
    order: number;
}

export interface UserList {
    id: string;
    title: string;
    type: ListType;
    color?: string;         // hex accent colour
    items: ListItem[];      // stored as JSON
    isRecurring: boolean;   // if true, Reset unchecks all items for reuse
    lastResetAt?: string;   // ISO datetime
    createdAt: string;
    updatedAt?: string;
    deleted_at?: string | null;
}

export type GoalStatus   = 'active' | 'completed' | 'paused' | 'abandoned';
export type GoalCategory = 'health' | 'career' | 'finance' | 'learning' | 'personal' | 'relationships' | 'creative' | 'other';

export interface Milestone {
    id: string;
    title: string;
    completedAt?: string;  // ISO datetime — null/undefined = not done
    dueDate?: string;      // YYYY-MM-DD optional
    order: number;
}

export interface Goal {
    id: string;
    title: string;
    description?: string;
    category?: GoalCategory;
    status: GoalStatus;
    targetDate?: string;       // YYYY-MM-DD
    progress: number;          // 0–100; auto-computed when progressMode='milestones'
    progressMode: 'manual' | 'milestones';
    milestones?: Milestone[];  // stored as JSON
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    completedAt?: string;
    deleted_at?: string | null;
}

export type JournalMood = 'great' | 'good' | 'okay' | 'bad' | 'awful';

export interface JournalEntry {
    id: string;
    date: string;          // YYYY-MM-DD — one per day (enforced by component)
    content?: string;      // HTML from Tiptap
    mood?: JournalMood;
    tags?: string[];
    wordCount?: number;
    createdAt: string;
    updatedAt?: string;
    deleted_at?: string | null;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderStatus = 'pending' | 'done' | 'snoozed';

export interface Reminder {
    id: string;
    title: string;
    notes?: string;
    dueAt: string;              // ISO datetime e.g. "2026-07-26T09:00:00"
    repeat: ReminderRepeat;
    status: ReminderStatus;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    createdAt: string;
    updatedAt?: string;
    snoozedUntil?: string;
    deleted_at?: string | null;
}

export type MediaType   = 'movie' | 'show' | 'book' | 'podcast';
export type MediaStatus = 'want' | 'watching' | 'watched' | 'dropped';

export interface MediaItem {
    id: string;
    title: string;
    type: MediaType;
    status: MediaStatus;
    creator?: string;        // Director / Author / Host
    year?: number;
    genre?: string;
    rating?: number;         // 1–5
    notes?: string;
    link?: string;           // URL to watch / read / listen
    episode?: number;        // current episode (shows/podcasts)
    totalEpisodes?: number;
    startedAt?: string;      // ISO date
    finishedAt?: string;     // ISO date
    createdAt: string;
    deleted_at?: string | null;
}
