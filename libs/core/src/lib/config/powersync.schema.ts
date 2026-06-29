import { column, Schema, Table } from '@powersync/web';

/**
 * PowerSync local SQLite schema.
 *
 * `user_data` — synced with Supabase via PowerSync. Stores every item as a
 *               JSON string in `data`. PowerSync upload/download uses this table.
 *
 * Typed collection tables — localOnly, never synced by PowerSync directly.
 *   Written by PowerSyncDataService on every upsert/delete, and repopulated from
 *   `user_data` whenever PowerSync delivers a sync batch (onChange handler).
 *   Provides proper column types, indexes, and avoids JSON.parse on every read.
 *
 * `local_vault` — local-only encrypted credentials, never leaves the device.
 */

// ── Synced ───────────────────────────────────────────────────────────────────

const user_data = new Table(
  {
    user_id:    column.text,
    profile_id: column.text,
    collection: column.text,
    data:       column.text,
    deleted:    column.integer,
    updated_at: column.text,
  },
  {
    indexes: {
      by_collection: ['collection'],
      by_profile:    ['profile_id'],
    },
  }
);

// ── Local-only vault ─────────────────────────────────────────────────────────

const local_vault = new Table(
  { type: column.text, data: column.text },
  { localOnly: true }
);

// ── Typed collection tables (localOnly) ──────────────────────────────────────

const tasks = new Table(
  {
    profile_id:        column.text,
    title:             column.text,
    priority:          column.text,
    hours:             column.text,
    status:            column.text,
    project:           column.text,
    due:               column.text,
    labels:            column.text,
    reminders:         column.text,
    subtasks:          column.text,
    parentId:          column.text,
    dependencies:      column.text,
    recurring:         column.text,
    timeSpent:         column.real,
    notes:             column.text,
    attachments:       column.text,
    description:       column.text,
    startDate:         column.text,
    estimatedDuration: column.real,
    createdAt:         column.text,
    deleted_at:        column.text,
  },
  {
    localOnly: true,
    indexes: {
      by_profile_status: ['profile_id', 'status'],
      by_due:            ['due'],
    },
  }
);

const notes = new Table(
  {
    profile_id: column.text,
    date:       column.text,
    title:      column.text,
    preview:    column.text,
    content:    column.text,
    tags:       column.text,
    lastEdited: column.text,
    filePath:   column.text,
    lastSynced: column.text,
    folderId:   column.text,
    bgColor:    column.text,
    deleted_at: column.text,
  },
  {
    localOnly: true,
    indexes: { by_profile_folder: ['profile_id', 'folderId'] },
  }
);

const planning_items = new Table(
  {
    profile_id: column.text,
    title:      column.text,
    tag:        column.text,
    stage:      column.text,
    active:     column.integer,
  },
  { localOnly: true, indexes: { by_profile: ['profile_id'] } }
);

const activities = new Table(
  {
    profile_id: column.text,
    text:       column.text,
    time:       column.text,
    type:       column.text,
  },
  { localOnly: true, indexes: { by_profile_time: ['profile_id', 'time'] } }
);

const books = new Table(
  {
    profile_id:       column.text,
    title:            column.text,
    icon:             column.text,
    status:           column.text,
    wordCount:        column.real,
    targetWordCount:  column.real,
    progress:         column.real,
    chapters:         column.real,
    notesCount:       column.real,
    writingType:      column.text,
    createdDate:      column.text,
    lastUpdated:      column.text,
    createdAt:        column.text,
    genre:            column.text,
    isRecentlyUpdated:column.integer,
    coverImage:       column.text,
    deleted_at:       column.text,
  },
  {
    localOnly: true,
    indexes: { by_profile_status: ['profile_id', 'status'] },
  }
);

const book_content = new Table(
  { profile_id: column.text, data: column.text },
  { localOnly: true }
);

const meetings = new Table(
  {
    profile_id:  column.text,
    title:       column.text,
    description: column.text,
    project:     column.text,
    date:        column.text,
    startTime:   column.text,
    endTime:     column.text,
    duration:    column.real,
    timezone:    column.text,
    location:    column.text,
    meetingLink: column.text,
    meetingType: column.text,
    platform:    column.text,
    attendees:   column.text,
    organizer:   column.text,
    agenda:      column.text,
    notes:       column.text,
    actionItems: column.text,
    status:      column.text,
    priority:    column.text,
    color:       column.text,
    labels:      column.text,
    recurring:   column.text,
    reminders:   column.text,
    attachments: column.text,
    createdAt:   column.text,
    updatedAt:   column.text,
    createdBy:   column.text,
    deleted_at:  column.text,
  },
  {
    localOnly: true,
    indexes: { by_profile_date: ['profile_id', 'date'], by_status: ['status'] },
  }
);

const articles = new Table(
  {
    profile_id:    column.text,
    title:         column.text,
    platform:      column.text,
    pipeline:      column.text,
    wordCount:     column.real,
    content:       column.text,
    url:           column.text,
    scheduledDate: column.text,
    engagement:    column.text,
    tags:          column.text,
    lastUpdated:   column.text,
    createdDate:   column.text,
    icon:          column.text,
    excerpt:       column.text,
    deleted_at:    column.text,
  },
  { localOnly: true, indexes: { by_profile: ['profile_id'] } }
);

const research_collections = new Table(
  {
    profile_id:   column.text,
    name:         column.text,
    description:  column.text,
    color:        column.text,
    createdDate:  column.text,
    lastModified: column.text,
    deleted_at:   column.text,
  },
  { localOnly: true, indexes: { by_profile: ['profile_id'] } }
);

const research_sources = new Table(
  {
    profile_id:    column.text,
    collectionId:  column.text,
    title:         column.text,
    sourceType:    column.text,
    url:           column.text,
    description:   column.text,
    author:        column.text,
    publishDate:   column.text,
    tags:          column.text,
    status:        column.text,
    notes:         column.text,
    createdDate:   column.text,
    lastAccessed:  column.text,
    deleted_at:    column.text,
  },
  {
    localOnly: true,
    indexes: { by_collection: ['collectionId'] },
  }
);

const research_summaries = new Table(
  {
    profile_id:   column.text,
    collectionId: column.text,
    title:        column.text,
    content:      column.text,
    sourceIds:    column.text,
    tags:         column.text,
    createdDate:  column.text,
    lastModified: column.text,
    deleted_at:   column.text,
  },
  {
    localOnly: true,
    indexes: { by_collection: ['collectionId'] },
  }
);

const projects = new Table(
  {
    profile_id:      column.text,
    title:           column.text,
    description:     column.text,
    status:          column.text,
    words:           column.text,
    updated:         column.text,
    icon:            column.text,
    dueDate:         column.text,
    priority:        column.text,
    progress:        column.real,
    team:            column.text,
    tags:            column.text,
    type:            column.text,
    linkedResources: column.text,
    deleted_at:      column.text,
  },
  { localOnly: true, indexes: { by_profile: ['profile_id'] } }
);

const note_folders = new Table(
  { profile_id: column.text, name: column.text, icon: column.text },
  { localOnly: true }
);

const bookmarks = new Table(
  {
    profile_id:  column.text,
    title:       column.text,
    url:         column.text,
    description: column.text,
    faviconUrl:  column.text,
    tags:        column.text,
    folderId:    column.text,
    createdAt:   column.text,
    lastVisited: column.text,
    visitCount:  column.real,
    notes:       column.text,
    color:       column.text,
    isArchived:  column.integer,
    isPinned:    column.integer,
    deleted_at:  column.text,
  },
  {
    localOnly: true,
    indexes: {
      by_profile_folder:   ['profile_id', 'folderId'],
      by_profile_archived: ['profile_id', 'isArchived'],
      by_profile_pinned:   ['profile_id', 'isPinned'],
    },
  }
);

const bookmark_folders = new Table(
  {
    profile_id: column.text,
    name:       column.text,
    parentId:   column.text,
    icon:       column.text,
    color:      column.text,
    createdAt:  column.text,
  },
  { localOnly: true }
);

const transactions = new Table(
  {
    profile_id:  column.text,
    name:        column.text,
    type:        column.text,
    category:    column.text,
    amount:      column.real,
    currency:    column.text,
    date:        column.text,
    billingCycle:column.text,
    status:      column.text,
    ownerId:     column.text,
    projectId:   column.text,
    notes:       column.text,
    createdAt:   column.text,
    history:     column.text,
    deleted_at:  column.text,
  },
  { localOnly: true, indexes: { by_profile: ['profile_id'] } }
);

const people = new Table(
  {
    profile_id:      column.text,
    name:            column.text,
    email:           column.text,
    phone:           column.text,
    company:         column.text,
    role:            column.text,
    avatar:          column.text,
    tags:            column.text,  // JSON string[]
    notes:           column.text,
    lastInteraction: column.text,
    createdAt:       column.text,
    deleted_at:      column.text,
  },
  { localOnly: true, indexes: { by_profile: ['profile_id'] } }
);

const user_preferences = new Table(
  {
    profile_id:           column.text,
    theme:                column.text,
    fontSize:             column.real,
    editorFont:           column.text,
    editorFontSize:       column.real,
    lineHeight:           column.text,
    navigationLayout:     column.text,
    versionHistoryLimit:  column.real,
    hiddenNavItems:       column.text,  // JSON string[]
    compactMode:          column.integer,
    animations:           column.integer,
    autoSave:             column.integer,
    spellCheck:           column.integer,
    focusMode:            column.integer,
    desktopNotifications: column.integer,
    soundEffects:         column.integer,
    dailySummary:         column.integer,
    analytics:            column.integer,
    alwaysOnTop:          column.integer,
    minimizeToTray:       column.integer,
  },
  { localOnly: true }
);

export const AppSchema = new Schema({
  // Synced via PowerSync ↔ Supabase
  user_data,
  // Local-only vault (credentials + links — never leave the device)
  local_vault,
  // Typed collection tables (localOnly, populated from user_data)
  tasks,
  notes,
  planning_items,
  activities,
  books,
  book_content,
  meetings,
  articles,
  research_collections,
  research_sources,
  research_summaries,
  projects,
  note_folders,
  bookmarks,
  bookmark_folders,
  transactions,
  people,
  user_preferences,
});

/**
 * Typed collection table names — the allowed whitelist for dynamic SQL.
 * Vault collections (credentials, credential_transaction_links) are intentionally
 * excluded: they live in `local_vault` and are never routed through these tables.
 */
export const TYPED_TABLES = new Set([
  'tasks', 'notes', 'planning_items', 'activities', 'books', 'book_content',
  'meetings', 'articles', 'research_collections', 'research_sources',
  'research_summaries', 'projects', 'note_folders', 'bookmarks',
  'bookmark_folders', 'transactions', 'people', 'user_preferences',
]);

/** Fields that are stored as JSON strings in SQLite. */
export const JSON_FIELDS: Record<string, string[]> = {
  tasks:                ['labels', 'reminders', 'subtasks', 'dependencies', 'recurring', 'attachments'],
  notes:                ['tags'],
  books:                ['genre'],
  meetings:             ['attendees', 'organizer', 'agenda', 'notes', 'actionItems', 'labels', 'recurring', 'reminders', 'attachments'],
  articles:             ['engagement', 'tags'],
  research_sources:     ['tags'],
  research_summaries:   ['sourceIds', 'tags'],
  projects:             ['team', 'tags', 'linkedResources'],
  bookmarks:            ['tags'],
  transactions:         ['history'],
  people:               ['tags'],
  user_preferences:     ['hiddenNavItems'],
};

/** Fields that are stored as 0/1 integers in SQLite but are booleans in TS. */
export const BOOL_FIELDS: Record<string, string[]> = {
  books:            ['isRecentlyUpdated'],
  bookmarks:        ['isArchived', 'isPinned'],
  planning_items:   ['active'],
  user_preferences: [
    'compactMode', 'animations', 'autoSave', 'spellCheck', 'focusMode',
    'desktopNotifications', 'soundEffects', 'dailySummary', 'analytics',
    'alwaysOnTop', 'minimizeToTray',
  ],
};
