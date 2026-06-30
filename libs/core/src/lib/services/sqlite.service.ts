import { Injectable, inject } from '@angular/core';
import { WorkspaceProfileService } from './workspace-profile.service';
import { LoggingService } from './logging.service';
import Database from '@tauri-apps/plugin-sql';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { BehaviorSubject, from, map, Observable } from 'rxjs';

// Import Types
import type {
    Task,
    Note,
    PlanningItem,
    Activity,
    Book,
} from './store.service';
import type { BinItem } from './bin.service';

import type { Meeting } from './meetings.service';
import type { Article } from './article.service';
import type {
    ResearchCollection,
    ResearchSource,
    ResearchSummary,
} from './research.service';
import type { Project, Credential, Transaction, CredentialTransactionLink, Bookmark, BookmarkFolder } from '@envello/domain';

// const DB_NAME = 'envello.db'; // Removed, now determined dynamically by profile

export type TaskDoc = Task;
export type NoteDoc = Note;
export type PlanningItemDoc = PlanningItem;
export type ActivityDoc = Activity;
export type BookDoc = Book;
export type BinItemDoc = BinItem;

export type MeetingDoc = Meeting;
export type ArticleDoc = Article;
export type ResearchCollectionDoc = ResearchCollection;
export type ResearchSourceDoc = ResearchSource;
export type ResearchSummaryDoc = ResearchSummary;
export type ProjectDoc = Project;
export type CredentialDoc = Credential;
export type TransactionDoc = Transaction;
export type CredentialTransactionLinkDoc = CredentialTransactionLink;
export type NoteFolderDoc = { id: string; name: string; icon: string };
export type BookmarkDoc = Bookmark;
export type BookmarkFolderDoc = BookmarkFolder;

export interface BookContentDoc {
    id: string;
    data: string;
}

@Injectable({
    providedIn: 'root',
})
export class SqliteService {
    private db: Database | null = null;
    private initPromise: Promise<Database> | null = null;

    // BehavioSubjects for Reactive Data
    private tasksSubject = new BehaviorSubject<TaskDoc[]>([]);
    private notesSubject = new BehaviorSubject<NoteDoc[]>([]);
    private planningItemsSubject = new BehaviorSubject<PlanningItemDoc[]>([]);
    private activitiesSubject = new BehaviorSubject<ActivityDoc[]>([]);
    private booksSubject = new BehaviorSubject<BookDoc[]>([]);
    private binItemsSubject = new BehaviorSubject<BinItemDoc[]>([]);

    private meetingsSubject = new BehaviorSubject<MeetingDoc[]>([]);
    private articlesSubject = new BehaviorSubject<ArticleDoc[]>([]);
    private researchCollectionsSubject = new BehaviorSubject<ResearchCollectionDoc[]>([]);
    private researchSourcesSubject = new BehaviorSubject<ResearchSourceDoc[]>([]);
    private researchSummariesSubject = new BehaviorSubject<ResearchSummaryDoc[]>([]);
    private projectsSubject = new BehaviorSubject<ProjectDoc[]>([]);
    private credentialsSubject = new BehaviorSubject<CredentialDoc[]>([]);
    private transactionsSubject = new BehaviorSubject<TransactionDoc[]>([]);
    private linksSubject = new BehaviorSubject<CredentialTransactionLinkDoc[]>([]);
    private noteFoldersSubject = new BehaviorSubject<NoteFolderDoc[]>([]);
    private bookmarksSubject = new BehaviorSubject<BookmarkDoc[]>([]);
    private bookmarkFoldersSubject = new BehaviorSubject<BookmarkFolderDoc[]>([]);
    private peopleSubject = new BehaviorSubject<any[]>([]);

    private profileService = inject(WorkspaceProfileService);
    private logging = inject(LoggingService);

    constructor() {
        // Don't initialize eagerly - only init when first database operation is called
        // This prevents errors in browser/non-Tauri environments.
        // On profile switch: close the current DB and re-open for the new active profile.
        window.addEventListener('envello:profile-switched', () => this.reinit());
    }

    /**
     * Check if running in Tauri environment.
     * Must check __TAURI_INTERNALS__ (always injected by Tauri 2) rather than __TAURI__
     * which is only present when withGlobalTauri: true.
     */
    private isTauri(): boolean {
        return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    }

    async getDb(): Promise<Database> {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.initDb();
        try {
            return await this.initPromise;
        } catch (error) {
            this.initPromise = null; // Allow retry on next call
            throw error;
        }
    }

    /** Close the current database and re-open for the active profile. Called on profile switch. */
    async reinit(): Promise<void> {
        this.db = null;
        this.initPromise = null;
        try {
            await this.getDb();
        } catch {
            // Non-Tauri environment — nothing to do
        }
    }

    private async initDb(): Promise<Database> {
        try {
            // Check if running in Tauri environment
            if (!this.isTauri()) {
                // Silently fail in non-Tauri environments (browser)
                // This is expected behavior when developing with ng serve
                throw new Error('SQLite is only available in Tauri desktop app');
            }

            const profileId = this.profileService.activeProfileId() || 'default';
            const dbName = profileId === 'default' ? 'envello.db' : `envello_${profileId}.db`;

            this.logging.info(`[SqliteService] Opening database: ${dbName}`);
            const db = await Database.load(`sqlite:${dbName}`);

            // Set this.db before createTables/loadAllData so that reloadX() methods
            // can call getDb() without deadlocking. Reset to null if setup fails.
            this.db = db;
            try {
                await this.createTables(db);
                await this.loadAllData();
            } catch (setupError) {
                this.db = null; // Connection unusable without tables/data
                throw setupError;
            }

            this.logging.info(`[SqliteService] Database ready for profile ${profileId}`);
            // Notify StoreService that DB data is now available.
            window.dispatchEvent(new CustomEvent('envello:db-ready'));
            return db;
        } catch (error) {
            if (this.isTauri()) {
                console.error('[SqliteService] Failed to initialize SQLite DB:', error);
            }
            throw error;
        }
    }

    private async createTables(db: Database) {
        // Tasks
        await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        priority TEXT,
        hours TEXT,
        status TEXT,
        project TEXT,
        due TEXT,
        labels TEXT,
        reminders TEXT,
        subtasks TEXT,
        parentId TEXT,
        dependencies TEXT,
        recurring TEXT,
        timeSpent REAL,
        notes TEXT,
        attachments TEXT,
        description TEXT,
        startDate TEXT,
        estimatedDuration REAL
      )
    `);

        // Notes
        await db.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        date TEXT,
        title TEXT,
        preview TEXT,
        content TEXT,
        tags TEXT,
        lastEdited TEXT,
        filePath TEXT,
        lastSynced TEXT,
        deleted_at TEXT,
        folderId TEXT,
        bgColor TEXT
      )
    `);

        // Planning Items
        await db.execute(`
      CREATE TABLE IF NOT EXISTS planning_items (
        id TEXT PRIMARY KEY,
        title TEXT,
        tag TEXT,
        stage TEXT,
        active BOOLEAN
      )
    `);

        // Activities
        await db.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        text TEXT,
        time TEXT,
        type TEXT
      )
    `);

        // Books (migrate from novels table if upgrading)
        try {
            await db.execute('ALTER TABLE novels RENAME TO books');
        } catch {
            // Already renamed or fresh install — both fine
        }
        await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT,
        icon TEXT,
        status TEXT,
        wordCount REAL,
        targetWordCount REAL,
        progress REAL,
        chapters REAL,
        notesCount REAL,
        createdDate TEXT,
        lastUpdated TEXT,
        genre TEXT,
        isRecentlyUpdated BOOLEAN,
        coverImage TEXT
      )
    `);

        // Book Content (migrate from novel_content table if upgrading)
        try {
            await db.execute('ALTER TABLE novel_content RENAME TO book_content');
        } catch {
            // Already renamed or fresh install — both fine
        }
        await db.execute(`
      CREATE TABLE IF NOT EXISTS book_content (
        id TEXT PRIMARY KEY,
        data TEXT
      )
    `);

        // bin_items is legacy — items now soft-deleted via deleted_at on original collections
        await db.execute('DROP TABLE IF EXISTS bin_items').catch(() => {});

        // Meetings
        await db.execute(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        project TEXT,
        date TEXT,
        startTime TEXT,
        endTime TEXT,
        duration REAL,
        timezone TEXT,
        location TEXT,
        meetingLink TEXT,
        meetingType TEXT,
        platform TEXT,
        attendees TEXT,
        organizer TEXT,
        agenda TEXT,
        notes TEXT,
        actionItems TEXT,
        status TEXT,
        priority TEXT,
        color TEXT,
        labels TEXT,
        recurring TEXT,
        reminders TEXT,
        attachments TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        createdBy TEXT
      )
    `);

        // Articles
        await db.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT,
        platform TEXT,
        pipeline TEXT,
        wordCount REAL,
        content TEXT,
        url TEXT,
        scheduledDate TEXT,
        engagement TEXT,
        tags TEXT,
        lastUpdated TEXT,
        createdDate TEXT,
        icon TEXT,
        excerpt TEXT
      )
    `);

        // Migrate: research_libraries → research_collections (safe no-op on fresh install)
        try {
            await db.execute('ALTER TABLE research_libraries RENAME TO research_collections');
        } catch {
            // Table already renamed or doesn't exist — both are fine
        }

        // Research Collections
        await db.execute(`
      CREATE TABLE IF NOT EXISTS research_collections (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        color TEXT,
        createdDate TEXT,
        lastModified TEXT
      )
    `);

        // Research Sources
        await db.execute(`
      CREATE TABLE IF NOT EXISTS research_sources (
        id TEXT PRIMARY KEY,
        collectionId TEXT,
        title TEXT,
        sourceType TEXT,
        url TEXT,
        description TEXT,
        author TEXT,
        publishDate TEXT,
        tags TEXT,
        status TEXT,
        notes TEXT,
        createdDate TEXT,
        lastAccessed TEXT
      )
    `);
        // Migrate: libraryId → collectionId column in research_sources
        try {
            await db.execute('ALTER TABLE research_sources RENAME COLUMN libraryId TO collectionId');
        } catch {
            // Column already renamed or table is fresh — both are fine
        }

        // Research Summaries
        await db.execute(`
      CREATE TABLE IF NOT EXISTS research_summaries (
        id TEXT PRIMARY KEY,
        collectionId TEXT,
        title TEXT,
        content TEXT,
        sourceIds TEXT,
        tags TEXT,
        createdDate TEXT,
        lastModified TEXT
      )
    `);
        // Migrate: libraryId → collectionId column in research_summaries
        try {
            await db.execute('ALTER TABLE research_summaries RENAME COLUMN libraryId TO collectionId');
        } catch {
            // Column already renamed or table is fresh — both are fine
        }

        // Projects
        await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        status TEXT,
        words TEXT,
        updated TEXT,
        icon TEXT,
        dueDate TEXT,
        priority TEXT,
        progress REAL,
        team TEXT,
        tags TEXT,
        type TEXT,
        linkedResources TEXT
      )
    `);

        // Credentials
        await db.execute(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        value TEXT,
        username TEXT,
        url TEXT,
        notes TEXT,
        projectId TEXT,
        createdAt TEXT,
        createdBy TEXT,
        updatedAt TEXT,
        lastAccessedAt TEXT
      )
    `);
        // Migration: add optional columns to existing databases
        try { await db.execute(`ALTER TABLE credentials ADD COLUMN username TEXT`); } catch { /* already exists */ }
        try { await db.execute(`ALTER TABLE credentials ADD COLUMN url TEXT`); } catch { /* already exists */ }
        try { await db.execute(`ALTER TABLE credentials ADD COLUMN notes TEXT`); } catch { /* already exists */ }
        try { await db.execute(`ALTER TABLE credentials ADD COLUMN updatedAt TEXT`); } catch { /* already exists */ }
        try { await db.execute(`ALTER TABLE credentials ADD COLUMN lastAccessedAt TEXT`); } catch { /* already exists */ }

        // Transactions (replaces legacy subscriptions table)
        await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT DEFAULT 'recurring',
        category TEXT,
        amount REAL,
        currency TEXT,
        date TEXT,
        billingCycle TEXT,
        status TEXT,
        ownerId TEXT,
        projectId TEXT,
        notes TEXT
      )
    `);
        // One-time migration: copy subscriptions → transactions, then drop the legacy table
        try {
            const legacy = await db.select<any[]>('SELECT * FROM subscriptions');
            for (const r of legacy) {
                await db.execute(
                    `INSERT OR IGNORE INTO transactions (id, name, type, category, amount, currency, date, billingCycle, status, ownerId, projectId, notes)
                     VALUES ($1,$2,'recurring',$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                    [r.id, r.name, r.category, r.price ?? 0, r.currency ?? 'USD', r.renewalDate ?? '', r.billingCycle ?? 'monthly', r.status ?? 'active', r.ownerId ?? null, r.projectId ?? null, r.notes ?? null]
                );
            }
            await db.execute('DROP TABLE IF EXISTS subscriptions');
        } catch { /* table already gone on fresh installs */ }

        // Credential Transaction Links (replaces credential_subscription_links)
        await db.execute(`
      CREATE TABLE IF NOT EXISTS credential_transaction_links (
        id TEXT PRIMARY KEY,
        credentialId TEXT,
        transactionId TEXT
      )
    `);
        // One-time migration from old link table, then drop it
        try {
            const legacyLinks = await db.select<any[]>('SELECT * FROM credential_subscription_links');
            for (const r of legacyLinks) {
                await db.execute(
                    'INSERT OR IGNORE INTO credential_transaction_links (id, credentialId, transactionId) VALUES ($1, $2, $3)',
                    [r.id, r.credentialId, r.subscriptionId]
                );
            }
            await db.execute('DROP TABLE IF EXISTS credential_subscription_links');
        } catch { /* table already gone on fresh installs */ }

        // Note Folders
        await db.execute(`
      CREATE TABLE IF NOT EXISTS note_folders (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT
      )
    `);

        // Bookmarks
        await db.execute(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        title TEXT,
        url TEXT,
        description TEXT,
        faviconUrl TEXT,
        tags TEXT,
        folderId TEXT,
        createdAt TEXT,
        lastVisited TEXT,
        visitCount REAL,
        notes TEXT,
        color TEXT,
        isArchived BOOLEAN,
        isPinned BOOLEAN
      )
    `);

        // Bookmark Folders
        await db.execute(`
      CREATE TABLE IF NOT EXISTS bookmark_folders (
        id TEXT PRIMARY KEY,
        name TEXT,
        parentId TEXT,
        icon TEXT,
        color TEXT,
        createdAt TEXT
      )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        role TEXT,
        avatar TEXT,
        tags TEXT,
        notes TEXT,
        lastInteraction TEXT,
        createdAt TEXT,
        deleted_at TEXT
      )
    `);

        // App metadata — stores per-app key/value pairs (e.g. vault encryption key)
        await db.execute(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS note_history (
        id         TEXT PRIMARY KEY,
        noteId     TEXT NOT NULL,
        title      TEXT,
        content    TEXT,
        snapshotAt TEXT,
        label      TEXT
      )
    `);
        try { await db.execute('CREATE INDEX IF NOT EXISTS idx_note_history_noteId ON note_history(noteId)'); } catch { /* already exists */ }

        await db.execute(`
      CREATE TABLE IF NOT EXISTS chapter_history (
        id          TEXT PRIMARY KEY,
        contentId   TEXT NOT NULL,
        contentType TEXT NOT NULL,
        title       TEXT,
        content     TEXT,
        wordCount   INTEGER DEFAULT 0,
        description TEXT,
        timestamp   TEXT
      )
    `);
        try { await db.execute('CREATE INDEX IF NOT EXISTS idx_chapter_history_contentId ON chapter_history(contentId)'); } catch { /* already exists */ }
    }

    async getAllChapterHistory(): Promise<any[]> {
        const db = await this.getDb();
        return db.select<any[]>('SELECT * FROM chapter_history ORDER BY timestamp ASC');
    }

    async getChapterHistory(contentId: string): Promise<any[]> {
        const db = await this.getDb();
        return db.select<any[]>(
            'SELECT * FROM chapter_history WHERE contentId = $1 ORDER BY timestamp ASC',
            [contentId],
        );
    }

    async upsertChapterHistory(entry: any): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM chapter_history WHERE id = $1', [entry.id]);
        if (exists.length > 0) {
            await db.execute(
                'UPDATE chapter_history SET contentId=$1, contentType=$2, title=$3, content=$4, wordCount=$5, description=$6, timestamp=$7 WHERE id=$8',
                [entry.contentId, entry.contentType, entry.title, entry.content, entry.wordCount, entry.description, entry.timestamp, entry.id],
            );
        } else {
            await db.execute(
                'INSERT INTO chapter_history (id, contentId, contentType, title, content, wordCount, description, timestamp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
                [entry.id, entry.contentId, entry.contentType, entry.title, entry.content, entry.wordCount, entry.description, entry.timestamp],
            );
        }
    }

    async removeChapterHistory(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM chapter_history WHERE id = $1', [id]);
    }

    async removeChapterHistoryForContent(contentId: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM chapter_history WHERE contentId = $1', [contentId]);
    }

    async getAllNoteHistory(): Promise<any[]> {
        const db = await this.getDb();
        return db.select<any[]>('SELECT * FROM note_history ORDER BY snapshotAt DESC');
    }

    async getNoteHistory(noteId: string): Promise<any[]> {
        const db = await this.getDb();
        return db.select<any[]>(
            'SELECT * FROM note_history WHERE noteId = $1 ORDER BY snapshotAt DESC',
            [noteId],
        );
    }

    async upsertNoteHistory(entry: any): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM note_history WHERE id = $1', [entry.id]);
        if (exists.length > 0) {
            await db.execute(
                'UPDATE note_history SET noteId=$1, title=$2, content=$3, snapshotAt=$4, label=$5 WHERE id=$6',
                [entry.noteId, entry.title, entry.content, entry.snapshotAt, entry.label ?? null, entry.id],
            );
        } else {
            await db.execute(
                'INSERT INTO note_history (id, noteId, title, content, snapshotAt, label) VALUES ($1,$2,$3,$4,$5,$6)',
                [entry.id, entry.noteId, entry.title, entry.content, entry.snapshotAt, entry.label ?? null],
            );
        }
    }

    async removeNoteHistory(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM note_history WHERE id = $1', [id]);
    }

    async removeNoteHistoryForNote(noteId: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM note_history WHERE noteId = $1', [noteId]);
    }

    async getAppMeta(key: string): Promise<string | null> {
        const db = await this.getDb();
        const rows = await db.select<{ value: string }[]>('SELECT value FROM app_meta WHERE key = $1', [key]);
        return rows.length > 0 ? rows[0].value : null;
    }

    async setAppMeta(key: string, value: string): Promise<void> {
        const db = await this.getDb();
        await db.execute(
            'INSERT INTO app_meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2',
            [key, value]
        );
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private async loadAllData() {
        await Promise.all([
            this.reloadTasks(),
            this.reloadNotes(),
            this.reloadPlanningItems(),
            this.reloadActivities(),
            this.reloadBooks(),

            this.reloadMeetings(),
            this.reloadArticles(),
            this.reloadResearchCollections(),
            this.reloadResearchSources(),
            this.reloadResearchSummaries(),
            this.reloadProjects(),
            this.reloadCredentials(),
            this.reloadTransactions(),
            this.reloadLinks(),
            this.reloadNoteFolders(),
            this.reloadBookmarks(),
            this.reloadBookmarkFolders(),
            this.reloadPeople(),
        ]);
    }

    private toJson(obj: any): string | null {
        if (obj === undefined || obj === null) return null;
        return JSON.stringify(obj);
    }

    private fromJson<T>(json: string): T {
        try {
            return JSON.parse(json);
        } catch (e) {
            return json as any;
        }
    }

    private parseRow<T>(row: any, jsonFields: string[] = [], boolFields: string[] = []): T {
        const res: any = { ...row };
        for (const field of jsonFields) {
            if (res[field]) {
                res[field] = this.fromJson(res[field]);
            }
        }
        // tauri-plugin-sql returns SQLite BOOLEAN columns as 0/1 integers (or occasionally
        // as the strings "true"/"false"). Normalize to proper JS booleans so that
        // filters like `!b.isArchived` behave correctly in all cases.
        for (const field of boolFields) {
            res[field] = res[field] === true || res[field] === 1 || res[field] === 'true';
        }
        return res as T;
    }

    // ─── Tasks ─────────────────────────────────────────────────────────────────
    private async reloadTasks() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE tasks ADD COLUMN deleted_at TEXT').catch(() => {});
        const rows = await db.select<TaskDoc[]>('SELECT * FROM tasks');
        const parsed = rows.map((r: any) => this.parseRow<TaskDoc>(r, ['labels', 'reminders', 'subtasks', 'dependencies', 'recurring', 'attachments']));
        this.tasksSubject.next(parsed);
    }

    async getAllTasks(): Promise<TaskDoc[]> {
        return this.tasksSubject.getValue();
    }

    async upsertTask(task: TaskDoc): Promise<void> {
        const db = await this.getDb();
        // Check if exists
        const exists = await db.select<any[]>('SELECT id FROM tasks WHERE id = $1', [task.id]);
        const jsonTask = {
            ...task,
            labels: this.toJson(task.labels),
            reminders: this.toJson(task.reminders),
            subtasks: this.toJson(task.subtasks),
            dependencies: this.toJson(task.dependencies),
            recurring: this.toJson(task.recurring),
            attachments: this.toJson(task.attachments)
        };

        if (exists.length > 0) {
            await db.execute(`
            UPDATE tasks SET
                title = $1, priority = $2, hours = $3, status = $4, project = $5, due = $6,
                labels = $7, reminders = $8, subtasks = $9, parentId = $10, dependencies = $11,
                recurring = $12, timeSpent = $13, notes = $14, attachments = $15, description = $16,
                startDate = $17, estimatedDuration = $18, deleted_at = $19
            WHERE id = $20`,
                [jsonTask.title, jsonTask.priority, jsonTask.hours, jsonTask.status, jsonTask.project, jsonTask.due,
                jsonTask.labels, jsonTask.reminders, jsonTask.subtasks, jsonTask.parentId, jsonTask.dependencies,
                jsonTask.recurring, jsonTask.timeSpent, jsonTask.notes, jsonTask.attachments, jsonTask.description,
                jsonTask.startDate, jsonTask.estimatedDuration, jsonTask.deleted_at ?? null, jsonTask.id]);
        } else {
            await db.execute(`
            INSERT INTO tasks (
                id, title, priority, hours, status, project, due, labels, reminders, subtasks,
                parentId, dependencies, recurring, timeSpent, notes, attachments, description, startDate, estimatedDuration, deleted_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
                [jsonTask.id, jsonTask.title, jsonTask.priority, jsonTask.hours, jsonTask.status, jsonTask.project, jsonTask.due,
                jsonTask.labels, jsonTask.reminders, jsonTask.subtasks, jsonTask.parentId, jsonTask.dependencies,
                jsonTask.recurring, jsonTask.timeSpent, jsonTask.notes, jsonTask.attachments, jsonTask.description,
                jsonTask.startDate, jsonTask.estimatedDuration, jsonTask.deleted_at ?? null]
            );
        }
        await this.reloadTasks();
    }

    async removeTask(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM tasks WHERE id = $1', [id]);
        await this.reloadTasks();
    }

    tasks$(): Observable<TaskDoc[]> {
        return this.tasksSubject.asObservable();
    }

    // ─── Notes ─────────────────────────────────────────────────────────────────
    private async reloadNotes() {
        const db = await this.getDb();
        try {
            // Column migrations — each is a no-op if the column already exists
            await db.execute('ALTER TABLE notes ADD COLUMN filePath TEXT').catch(() => { });
            await db.execute('ALTER TABLE notes ADD COLUMN lastSynced TEXT').catch(() => { });
            await db.execute('ALTER TABLE notes ADD COLUMN deleted_at TEXT').catch(() => { });
            await db.execute('ALTER TABLE notes ADD COLUMN folderId TEXT').catch(() => { });
            await db.execute('ALTER TABLE notes ADD COLUMN bgColor TEXT').catch(() => { });
        } catch (e) {
            // Ignore column exists errors
        }

        const rows = await db.select<NoteDoc[]>('SELECT * FROM notes');
        const parsed = rows.map((r: any) => this.parseRow<NoteDoc>(r, ['tags']));
        this.notesSubject.next(parsed);
    }

    async getAllNotes(): Promise<NoteDoc[]> {
        return this.notesSubject.getValue();
    }

    async upsertNote(note: NoteDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM notes WHERE id = $1', [note.id]);

        // Ensure we don't store large content in DB, but keep tags jsonified
        const jsonNote = {
            ...note,
            tags: this.toJson(note.tags),
            content: '' // CLEAR CONTENT FROM DB -> Source of truth is .md file
        };

        if (exists.length > 0) {
            await db.execute(
                `UPDATE notes SET date=$1, title=$2, preview=$3, content=$4, tags=$5, lastEdited=$6, filePath=$7, lastSynced=$8, deleted_at=$9, folderId=$10, bgColor=$11 WHERE id=$12`,
                [jsonNote.date, jsonNote.title, jsonNote.preview, jsonNote.content, jsonNote.tags,
                 jsonNote.lastEdited, jsonNote.filePath, jsonNote.lastSynced,
                 (jsonNote as any).deleted_at ?? null, (jsonNote as any).folderId ?? null,
                 (jsonNote as any).bgColor ?? null, jsonNote.id]
            );
        } else {
            await db.execute(
                `INSERT INTO notes (id, date, title, preview, content, tags, lastEdited, filePath, lastSynced, deleted_at, folderId, bgColor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [jsonNote.id, jsonNote.date, jsonNote.title, jsonNote.preview, jsonNote.content,
                 jsonNote.tags, jsonNote.lastEdited, jsonNote.filePath, jsonNote.lastSynced,
                 (jsonNote as any).deleted_at ?? null, (jsonNote as any).folderId ?? null,
                 (jsonNote as any).bgColor ?? null]
            );
        }
        await this.reloadNotes();
    }

    async removeNote(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM notes WHERE id = $1', [id]);
        await this.reloadNotes();
    }

    notes$(): Observable<NoteDoc[]> {
        return this.notesSubject.asObservable();
    }

    // ─── Planning Items ────────────────────────────────────────────────────────
    private async reloadPlanningItems() {
        const db = await this.getDb();
        const rows = await db.select<PlanningItemDoc[]>('SELECT * FROM planning_items');
        this.planningItemsSubject.next(rows);
    }

    async upsertPlanningItem(item: PlanningItemDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM planning_items WHERE id = $1', [item.id]);

        if (exists.length > 0) {
            await db.execute(`UPDATE planning_items SET title = $1, tag = $2, stage = $3, active = $4 WHERE id = $5`,
                [item.title, item.tag, item.stage, item.active, item.id]);
        } else {
            await db.execute(`INSERT INTO planning_items (id, title, tag, stage, active) VALUES ($1, $2, $3, $4, $5)`,
                [item.id, item.title, item.tag, item.stage, item.active]);
        }
        await this.reloadPlanningItems();
    }

    planningItems$(): Observable<PlanningItemDoc[]> {
        return this.planningItemsSubject.asObservable();
    }

    async getAllPlanningItems(): Promise<PlanningItemDoc[]> {
        return this.planningItemsSubject.getValue();
    }

    async removePlanningItem(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM planning_items WHERE id = $1', [id]);
        await this.reloadPlanningItems();
    }

    // ─── Activities ────────────────────────────────────────────────────────────
    private async reloadActivities() {
        const db = await this.getDb();
        const rows = await db.select<ActivityDoc[]>('SELECT * FROM activities');
        this.activitiesSubject.next(rows);
    }

    async upsertActivity(act: ActivityDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM activities WHERE id = $1', [act.id]);

        if (exists.length > 0) {
            await db.execute(`UPDATE activities SET text = $1, time = $2, type = $3 WHERE id = $4`,
                [act.text, act.time, act.type, act.id]);
        } else {
            await db.execute(`INSERT INTO activities (id, text, time, type) VALUES ($1, $2, $3, $4)`,
                [act.id, act.text, act.time, act.type]);
        }
        await this.reloadActivities();
    }

    activities$(): Observable<ActivityDoc[]> {
        return this.activitiesSubject.asObservable();
    }

    async getAllActivities(): Promise<ActivityDoc[]> {
        return this.activitiesSubject.getValue();
    }

    async removeActivity(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM activities WHERE id = $1', [id]);
        await this.reloadActivities();
    }

    // ─── Books ─────────────────────────────────────────────────────────────────
    private async reloadBooks() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE books ADD COLUMN deleted_at TEXT').catch(() => {});
        const rows = await db.select<BookDoc[]>('SELECT * FROM books');
        const parsed = rows.map((r: any) => this.parseRow<BookDoc>(r, ['genre']));
        this.booksSubject.next(parsed);
    }

    async upsertBook(book: BookDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM books WHERE id = $1', [book.id]);
        const jsonBook = { ...book, genre: this.toJson(book.genre) };

        if (exists.length > 0) {
            await db.execute(`
        UPDATE books SET title=$1, icon=$2, status=$3, wordCount=$4, targetWordCount=$5, progress=$6,
        chapters=$7, notesCount=$8, createdDate=$9, lastUpdated=$10, genre=$11, isRecentlyUpdated=$12, coverImage=$13, deleted_at=$14
        WHERE id=$15`,
                [jsonBook.title, jsonBook.icon, jsonBook.status, jsonBook.wordCount, jsonBook.targetWordCount, jsonBook.progress,
                jsonBook.chapters, jsonBook.notesCount, jsonBook.createdDate, jsonBook.lastUpdated, jsonBook.genre, jsonBook.isRecentlyUpdated, jsonBook.coverImage, jsonBook.deleted_at ?? null, jsonBook.id]);
        } else {
            await db.execute(`
        INSERT INTO books (id, title, icon, status, wordCount, targetWordCount, progress, chapters, notesCount, createdDate, lastUpdated, genre, isRecentlyUpdated, coverImage, deleted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [jsonBook.id, jsonBook.title, jsonBook.icon, jsonBook.status, jsonBook.wordCount, jsonBook.targetWordCount, jsonBook.progress,
                jsonBook.chapters, jsonBook.notesCount, jsonBook.createdDate, jsonBook.lastUpdated, jsonBook.genre, jsonBook.isRecentlyUpdated, jsonBook.coverImage, jsonBook.deleted_at ?? null]);
        }
        await this.reloadBooks();
    }

    books$(): Observable<BookDoc[]> {
        return this.booksSubject.asObservable();
    }

    async getAllBooks(): Promise<BookDoc[]> {
        return this.booksSubject.getValue();
    }

    async removeBook(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM books WHERE id = $1', [id]);
        await this.reloadBooks();
    }

    // ─── Book Content ──────────────────────────────────────────────────────────
    async getBookContent(id: string): Promise<string | null> {
        const db = await this.getDb();
        const rows = await db.select<BookContentDoc[]>('SELECT * FROM book_content WHERE id = $1', [id]);
        return rows.length > 0 ? rows[0].data : null;
    }

    async setBookContent(id: string, data: string): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM book_content WHERE id = $1', [id]);
        if (exists.length > 0) {
            await db.execute('UPDATE book_content SET data = $1 WHERE id = $2', [data, id]);
        } else {
            await db.execute('INSERT INTO book_content (id, data) VALUES ($1, $2)', [id, data]);
        }
    }

    async removeBookContent(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM book_content WHERE id = $1', [id]);
    }

    // ─── Bin Items ─────────────────────────────────────────────────────────────
    private async reloadBinItems() {
        const db = await this.getDb();
        const rows = await db.select<BinItemDoc[]>('SELECT * FROM bin_items');
        const parsed = rows.map((r: any) => this.parseRow<BinItemDoc>(r, ['payload']));
        this.binItemsSubject.next(parsed);
    }

    async upsertBinItem(_item: BinItemDoc): Promise<void> {
        // No-op: bin items are now soft-deleted on their original collections.
        // This method is kept for backward compatibility only.
    }

    async removeBinItem(_id: string): Promise<void> {
        // No-op: bin_items table dropped; bin is handled via deleted_at on source collections.
    }

    async clearBin(): Promise<void> {
        // No-op: bin_items table dropped; bin is handled via deleted_at on source collections.
    }

    binItems$(): Observable<BinItemDoc[]> {
        return this.binItemsSubject.asObservable();
    }

    async getAllBinItems(): Promise<BinItemDoc[]> {
        return this.binItemsSubject.getValue();
    }
    // ─── Meetings ──────────────────────────────────────────────────────────────
    private async reloadMeetings() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE meetings ADD COLUMN deleted_at TEXT').catch(() => {});
        const rows = await db.select<MeetingDoc[]>('SELECT * FROM meetings');
        const parsed = rows.map((r: any) => this.parseRow<MeetingDoc>(r, ['attendees', 'organizer', 'agenda', 'notes', 'actionItems', 'labels', 'recurring', 'reminders', 'attachments']));
        this.meetingsSubject.next(parsed);
    }

    async upsertMeeting(doc: MeetingDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM meetings WHERE id = $1', [doc.id]);
        const jsonDoc = {
            ...doc,
            attendees: this.toJson(doc.attendees),
            organizer: this.toJson(doc.organizer),
            agenda: this.toJson(doc.agenda),
            notes: this.toJson(doc.notes),
            actionItems: this.toJson(doc.actionItems),
            labels: this.toJson(doc.labels),
            recurring: this.toJson(doc.recurring),
            reminders: this.toJson(doc.reminders),
            attachments: this.toJson(doc.attachments)
        };

        if (exists.length > 0) {
            await db.execute(`UPDATE meetings SET title=$1, description=$2, project=$3, date=$4, startTime=$5, endTime=$6, duration=$7, timezone=$8, location=$9, meetingLink=$10, meetingType=$11, platform=$12, attendees=$13, organizer=$14, agenda=$15, notes=$16, actionItems=$17, status=$18, priority=$19, color=$20, labels=$21, recurring=$22, reminders=$23, attachments=$24, createdAt=$25, updatedAt=$26, createdBy=$27, deleted_at=$28 WHERE id=$29`,
                [jsonDoc.title, jsonDoc.description, jsonDoc.project, jsonDoc.date, jsonDoc.startTime, jsonDoc.endTime, jsonDoc.duration, jsonDoc.timezone, jsonDoc.location, jsonDoc.meetingLink, jsonDoc.meetingType, jsonDoc.platform, jsonDoc.attendees, jsonDoc.organizer, jsonDoc.agenda, jsonDoc.notes, jsonDoc.actionItems, jsonDoc.status, jsonDoc.priority, jsonDoc.color, jsonDoc.labels, jsonDoc.recurring, jsonDoc.reminders, jsonDoc.attachments, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.createdBy, (jsonDoc as any).deleted_at ?? null, jsonDoc.id]);
        } else {
            await db.execute(`INSERT INTO meetings (id, title, description, project, date, startTime, endTime, duration, timezone, location, meetingLink, meetingType, platform, attendees, organizer, agenda, notes, actionItems, status, priority, color, labels, recurring, reminders, attachments, createdAt, updatedAt, createdBy, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
                [jsonDoc.id, jsonDoc.title, jsonDoc.description, jsonDoc.project, jsonDoc.date, jsonDoc.startTime, jsonDoc.endTime, jsonDoc.duration, jsonDoc.timezone, jsonDoc.location, jsonDoc.meetingLink, jsonDoc.meetingType, jsonDoc.platform, jsonDoc.attendees, jsonDoc.organizer, jsonDoc.agenda, jsonDoc.notes, jsonDoc.actionItems, jsonDoc.status, jsonDoc.priority, jsonDoc.color, jsonDoc.labels, jsonDoc.recurring, jsonDoc.reminders, jsonDoc.attachments, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.createdBy, (jsonDoc as any).deleted_at ?? null]);
        }
        await this.reloadMeetings();
    }

    async getAllMeetings(): Promise<MeetingDoc[]> {
        return this.meetingsSubject.getValue();
    }

    async removeMeeting(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM meetings WHERE id = $1', [id]);
        await this.reloadMeetings();
    }

    // ─── Articles ──────────────────────────────────────────────────────────────
    private async reloadArticles() {
        const db = await this.getDb();
        try {
            await db.execute('ALTER TABLE articles ADD COLUMN filePath TEXT').catch(() => { });
            await db.execute('ALTER TABLE articles ADD COLUMN lastSynced TEXT').catch(() => { });
        } catch (e) { }

        const rows = await db.select<ArticleDoc[]>('SELECT * FROM articles');
        const parsed = rows.map((r: any) => this.parseRow<ArticleDoc>(r, ['engagement', 'tags']));
        this.articlesSubject.next(parsed);
    }

    async getAllArticles(): Promise<ArticleDoc[]> {
        return this.articlesSubject.getValue();
    }

    async upsertArticle(article: ArticleDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM articles WHERE id = $1', [article.id]);

        const articleAny = article as any;
        const jsonArticle = {
            ...article,
            tags: this.toJson(article.tags),
            engagement: this.toJson(article.engagement),
            content: '', // Clear content for DB
            filePath: articleAny.filePath,
            lastSynced: articleAny.lastSynced
        };

        if (exists.length > 0) {
            await db.execute(`
            UPDATE articles SET 
                title=$1, platform=$2, pipeline=$3, wordCount=$4, content=$5, url=$6, 
                scheduledDate=$7, engagement=$8, tags=$9, lastUpdated=$10, createdDate=$11, icon=$12, excerpt=$13,
                filePath=$14, lastSynced=$15
            WHERE id=$16`,
                [jsonArticle.title, jsonArticle.platform, jsonArticle.pipeline, jsonArticle.wordCount, jsonArticle.content, jsonArticle.url,
                jsonArticle.scheduledDate, jsonArticle.engagement, jsonArticle.tags, jsonArticle.lastUpdated, jsonArticle.createdDate, jsonArticle.icon, jsonArticle.excerpt,
                jsonArticle.filePath, jsonArticle.lastSynced, jsonArticle.id]);
        } else {
            await db.execute(`
            INSERT INTO articles (
                id, title, platform, pipeline, wordCount, content, url, scheduledDate, engagement, tags, 
                lastUpdated, createdDate, icon, excerpt, filePath, lastSynced
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [jsonArticle.id, jsonArticle.title, jsonArticle.platform, jsonArticle.pipeline, jsonArticle.wordCount, jsonArticle.content, jsonArticle.url,
                jsonArticle.scheduledDate, jsonArticle.engagement, jsonArticle.tags, jsonArticle.lastUpdated, jsonArticle.createdDate, jsonArticle.icon, jsonArticle.excerpt,
                jsonArticle.filePath, jsonArticle.lastSynced]);
        }
        await this.reloadArticles();
    }

    async removeArticle(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM articles WHERE id = $1', [id]);
        await this.reloadArticles();
    }

    // ─── Research Collections ──────────────────────────────────────────────────
    private async reloadResearchCollections() {
        const db = await this.getDb();
        const rows = await db.select<ResearchCollectionDoc[]>('SELECT * FROM research_collections');
        this.researchCollectionsSubject.next(rows);
    }

    async upsertResearchCollection(doc: ResearchCollectionDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM research_collections WHERE id = $1', [doc.id]);

        if (exists.length > 0) {
            await db.execute('UPDATE research_collections SET name=$1, description=$2, color=$3, createdDate=$4, lastModified=$5 WHERE id=$6',
                [doc.name, doc.description, doc.color, doc.createdDate, doc.lastModified, doc.id]);
        } else {
            await db.execute('INSERT INTO research_collections (id, name, description, color, createdDate, lastModified) VALUES ($1, $2, $3, $4, $5, $6)',
                [doc.id, doc.name, doc.description, doc.color, doc.createdDate, doc.lastModified]);
        }
        await this.reloadResearchCollections();
    }

    async getAllResearchCollections(): Promise<ResearchCollectionDoc[]> {
        return this.researchCollectionsSubject.getValue();
    }

    async removeResearchCollection(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_collections WHERE id = $1', [id]);
        await this.reloadResearchCollections();
    }

    // ─── Research Sources ──────────────────────────────────────────────────────
    private async reloadResearchSources() {
        const db = await this.getDb();
        const rows = await db.select<ResearchSourceDoc[]>('SELECT * FROM research_sources');
        const parsed = rows.map((r: any) => this.parseRow<ResearchSourceDoc>(r, ['tags']));
        this.researchSourcesSubject.next(parsed);
    }

    async upsertResearchSource(doc: ResearchSourceDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM research_sources WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, tags: this.toJson(doc.tags) };

        if (exists.length > 0) {
            await db.execute(`UPDATE research_sources SET collectionId=$1, title=$2, sourceType=$3, url=$4, description=$5, author=$6, publishDate=$7, tags=$8, status=$9, notes=$10, createdDate=$11, lastAccessed=$12 WHERE id=$13`,
                [jsonDoc.collectionId, jsonDoc.title, jsonDoc.sourceType, jsonDoc.url, jsonDoc.description, jsonDoc.author, jsonDoc.publishDate, jsonDoc.tags, jsonDoc.status, jsonDoc.notes, jsonDoc.createdDate, jsonDoc.lastAccessed, jsonDoc.id]);
        } else {
            await db.execute(`INSERT INTO research_sources (id, collectionId, title, sourceType, url, description, author, publishDate, tags, status, notes, createdDate, lastAccessed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [jsonDoc.id, jsonDoc.collectionId, jsonDoc.title, jsonDoc.sourceType, jsonDoc.url, jsonDoc.description, jsonDoc.author, jsonDoc.publishDate, jsonDoc.tags, jsonDoc.status, jsonDoc.notes, jsonDoc.createdDate, jsonDoc.lastAccessed]);
        }
        await this.reloadResearchSources();
    }

    async getAllResearchSources(): Promise<ResearchSourceDoc[]> {
        return this.researchSourcesSubject.getValue();
    }

    async removeResearchSource(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_sources WHERE id = $1', [id]);
        await this.reloadResearchSources();
    }

    // ─── Research Summaries ────────────────────────────────────────────────────
    private async reloadResearchSummaries() {
        const db = await this.getDb();
        const rows = await db.select<ResearchSummaryDoc[]>('SELECT * FROM research_summaries');
        const parsed = rows.map((r: any) => this.parseRow<ResearchSummaryDoc>(r, ['sourceIds', 'tags']));
        this.researchSummariesSubject.next(parsed);
    }

    async upsertResearchSummary(doc: ResearchSummaryDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM research_summaries WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, sourceIds: this.toJson(doc.sourceIds), tags: this.toJson(doc.tags) };

        if (exists.length > 0) {
            await db.execute('UPDATE research_summaries SET collectionId=$1, title=$2, content=$3, sourceIds=$4, tags=$5, createdDate=$6, lastModified=$7 WHERE id=$8',
                [jsonDoc.collectionId, jsonDoc.title, jsonDoc.content, jsonDoc.sourceIds, jsonDoc.tags, jsonDoc.createdDate, jsonDoc.lastModified, jsonDoc.id]);
        } else {
            await db.execute('INSERT INTO research_summaries (id, collectionId, title, content, sourceIds, tags, createdDate, lastModified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [jsonDoc.id, jsonDoc.collectionId, jsonDoc.title, jsonDoc.content, jsonDoc.sourceIds, jsonDoc.tags, jsonDoc.createdDate, jsonDoc.lastModified]);
        }
        await this.reloadResearchSummaries();
    }

    async getAllResearchSummaries(): Promise<ResearchSummaryDoc[]> {
        return this.researchSummariesSubject.getValue();
    }

    async removeResearchSummary(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_summaries WHERE id = $1', [id]);
        await this.reloadResearchSummaries();
    }

    // ─── Projects ──────────────────────────────────────────────────────────────
    private async reloadProjects() {
        const db = await this.getDb();
        const rows = await db.select<ProjectDoc[]>('SELECT * FROM projects');
        const parsed = rows.map((r: any) => this.parseRow<ProjectDoc>(r, ['team', 'tags', 'linkedResources']));
        this.projectsSubject.next(parsed);
    }

    async getAllProjects(): Promise<ProjectDoc[]> {
        return this.projectsSubject.getValue();
    }

    async upsertProject(project: ProjectDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM projects WHERE id = $1', [project.id]);
        const jsonProject = {
            ...project,
            team: this.toJson(project.team),
            tags: this.toJson(project.tags),
            linkedResources: this.toJson(project.linkedResources),
        };

        if (exists.length > 0) {
            await db.execute(
                `UPDATE projects SET title=$1, description=$2, status=$3, words=$4, updated=$5, icon=$6, dueDate=$7, priority=$8, progress=$9, team=$10, tags=$11, type=$12, linkedResources=$13 WHERE id=$14`,
                [jsonProject.title, jsonProject.description, jsonProject.status, jsonProject.words, jsonProject.updated,
                jsonProject.icon, jsonProject.dueDate, jsonProject.priority, jsonProject.progress,
                jsonProject.team, jsonProject.tags, jsonProject.type, jsonProject.linkedResources, jsonProject.id]
            );
        } else {
            await db.execute(
                `INSERT INTO projects (id, title, description, status, words, updated, icon, dueDate, priority, progress, team, tags, type, linkedResources) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [jsonProject.id, jsonProject.title, jsonProject.description, jsonProject.status, jsonProject.words, jsonProject.updated,
                jsonProject.icon, jsonProject.dueDate, jsonProject.priority, jsonProject.progress,
                jsonProject.team, jsonProject.tags, jsonProject.type, jsonProject.linkedResources]
            );
        }
        await this.reloadProjects();
    }

    async removeProject(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM projects WHERE id = $1', [id]);
        await this.reloadProjects();
    }

    projects$(): Observable<ProjectDoc[]> {
        return this.projectsSubject.asObservable();
    }

    // ─── Vault & Transactions ───────────────────────────────────────────────────
    private async reloadCredentials() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE credentials ADD COLUMN deleted_at TEXT').catch(() => {});
        const rows = await db.select<CredentialDoc[]>('SELECT * FROM credentials');
        this.credentialsSubject.next(rows);
    }
    async getAllCredentials(): Promise<CredentialDoc[]> { return this.credentialsSubject.getValue(); }
    async upsertCredential(item: CredentialDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM credentials WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(
                `UPDATE credentials SET name=$1, type=$2, value=$3, username=$4, url=$5, notes=$6, projectId=$7, createdAt=$8, createdBy=$9, updatedAt=$10, lastAccessedAt=$11, deleted_at=$12 WHERE id=$13`,
                [item.name, item.type, item.value, item.username ?? null, item.url ?? null, item.notes ?? null,
                 item.projectId, item.createdAt, item.createdBy, item.updatedAt ?? null, item.lastAccessedAt ?? null, item.deleted_at ?? null, item.id]);
        } else {
            await db.execute(
                `INSERT INTO credentials (id, name, type, value, username, url, notes, projectId, createdAt, createdBy, updatedAt, lastAccessedAt, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [item.id, item.name, item.type, item.value, item.username ?? null, item.url ?? null, item.notes ?? null,
                 item.projectId, item.createdAt, item.createdBy, item.updatedAt ?? null, item.lastAccessedAt ?? null, item.deleted_at ?? null]);
        }
        await this.reloadCredentials();
    }
    async removeCredential(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM credentials WHERE id = $1', [id]);
        await this.reloadCredentials();
    }

    private async reloadTransactions() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE transactions ADD COLUMN deleted_at TEXT').catch(() => {});
        const rows = await db.select<TransactionDoc[]>('SELECT * FROM transactions');
        this.transactionsSubject.next(rows);
    }
    async getAllTransactions(): Promise<TransactionDoc[]> { return this.transactionsSubject.getValue(); }
    async upsertTransaction(item: TransactionDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM transactions WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(
                `UPDATE transactions SET name=$1, type=$2, category=$3, amount=$4, currency=$5, date=$6, billingCycle=$7, status=$8, ownerId=$9, projectId=$10, notes=$11, deleted_at=$12 WHERE id=$13`,
                [item.name, item.type ?? 'recurring', item.category ?? null, item.amount, item.currency ?? null,
                 item.date, item.billingCycle ?? null, item.status ?? null, item.ownerId ?? null, item.projectId ?? null, item.notes ?? null, item.deleted_at ?? null, item.id]);
        } else {
            await db.execute(
                `INSERT INTO transactions (id, name, type, category, amount, currency, date, billingCycle, status, ownerId, projectId, notes, deleted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [item.id, item.name, item.type ?? 'recurring', item.category ?? null, item.amount, item.currency ?? null,
                 item.date, item.billingCycle ?? null, item.status ?? null, item.ownerId ?? null, item.projectId ?? null, item.notes ?? null, item.deleted_at ?? null]);
        }
        await this.reloadTransactions();
    }
    async removeTransaction(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM transactions WHERE id = $1', [id]);
        await this.reloadTransactions();
    }

    private async reloadLinks() {
        const db = await this.getDb();
        const rows = await db.select<CredentialTransactionLinkDoc[]>('SELECT * FROM credential_transaction_links');
        this.linksSubject.next(rows);
    }
    async getAllLinks(): Promise<CredentialTransactionLinkDoc[]> { return this.linksSubject.getValue(); }
    async upsertLink(item: CredentialTransactionLinkDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM credential_transaction_links WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE credential_transaction_links SET credentialId=$1, transactionId=$2 WHERE id=$3`,
                [item.credentialId, item.transactionId, item.id]);
        } else {
            await db.execute(`INSERT INTO credential_transaction_links (id, credentialId, transactionId) VALUES ($1, $2, $3)`,
                [item.id, item.credentialId, item.transactionId]);
        }
        await this.reloadLinks();
    }
    async removeLink(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM credential_transaction_links WHERE id = $1', [id]);
        await this.reloadLinks();
    }

    // ─── Note Folders ──────────────────────────────────────────────────────────
    private async reloadNoteFolders() {
        const db = await this.getDb();
        const rows = await db.select<NoteFolderDoc[]>('SELECT * FROM note_folders');
        this.noteFoldersSubject.next(rows);
    }
    async getAllNoteFolders(): Promise<NoteFolderDoc[]> { return this.noteFoldersSubject.getValue(); }
    async upsertNoteFolder(item: NoteFolderDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM note_folders WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE note_folders SET name=$1, icon=$2 WHERE id=$3`, [item.name, item.icon, item.id]);
        } else {
            await db.execute(`INSERT INTO note_folders (id, name, icon) VALUES ($1, $2, $3)`, [item.id, item.name, item.icon]);
        }
        await this.reloadNoteFolders();
    }
    async removeNoteFolder(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM note_folders WHERE id = $1', [id]);
        await this.reloadNoteFolders();
    }

    // ─── Bookmarks ─────────────────────────────────────────────────────────────
    private async reloadBookmarks() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE bookmarks ADD COLUMN deleted_at TEXT').catch(() => {});
        const rows = await db.select<any[]>('SELECT * FROM bookmarks');
        const parsed = rows.map((r: any) => this.parseRow<BookmarkDoc>(r, ['tags'], ['isArchived', 'isPinned']));
        this.bookmarksSubject.next(parsed);
    }
    async getAllBookmarks(): Promise<BookmarkDoc[]> { return this.bookmarksSubject.getValue(); }
    async upsertBookmark(item: BookmarkDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM bookmarks WHERE id = $1', [item.id]);
        const j = {
            ...item,
            tags: this.toJson(item.tags),
            // Store booleans as explicit integers so SQLite always gets 0/1,
            // never a JS boolean or string that may round-trip incorrectly.
            isArchived: item.isArchived ? 1 : 0,
            isPinned: item.isPinned ? 1 : 0,
        };
        if (exists.length > 0) {
            await db.execute(
                `UPDATE bookmarks SET title=$1, url=$2, description=$3, faviconUrl=$4, tags=$5, folderId=$6, createdAt=$7, lastVisited=$8, visitCount=$9, notes=$10, color=$11, isArchived=$12, isPinned=$13, deleted_at=$14 WHERE id=$15`,
                [j.title, j.url, j.description, j.faviconUrl, j.tags, j.folderId, j.createdAt, j.lastVisited, j.visitCount, j.notes, j.color, j.isArchived, j.isPinned, j.deleted_at ?? null, j.id]);
        } else {
            await db.execute(
                `INSERT INTO bookmarks (id, title, url, description, faviconUrl, tags, folderId, createdAt, lastVisited, visitCount, notes, color, isArchived, isPinned, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [j.id, j.title, j.url, j.description, j.faviconUrl, j.tags, j.folderId, j.createdAt, j.lastVisited, j.visitCount, j.notes, j.color, j.isArchived, j.isPinned, j.deleted_at ?? null]);
        }
        await this.reloadBookmarks();
    }
    async removeBookmark(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM bookmarks WHERE id = $1', [id]);
        await this.reloadBookmarks();
    }

    // ─── Bookmark Folders ──────────────────────────────────────────────────────
    private async reloadBookmarkFolders() {
        const db = await this.getDb();
        const rows = await db.select<BookmarkFolderDoc[]>('SELECT * FROM bookmark_folders');
        this.bookmarkFoldersSubject.next(rows);
    }
    async getAllBookmarkFolders(): Promise<BookmarkFolderDoc[]> { return this.bookmarkFoldersSubject.getValue(); }
    async upsertBookmarkFolder(item: BookmarkFolderDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM bookmark_folders WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE bookmark_folders SET name=$1, parentId=$2, icon=$3, color=$4, createdAt=$5 WHERE id=$6`,
                [item.name, item.parentId, item.icon, item.color, item.createdAt, item.id]);
        } else {
            await db.execute(`INSERT INTO bookmark_folders (id, name, parentId, icon, color, createdAt) VALUES ($1, $2, $3, $4, $5, $6)`,
                [item.id, item.name, item.parentId, item.icon, item.color, item.createdAt]);
        }
        await this.reloadBookmarkFolders();
    }
    async removeBookmarkFolder(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM bookmark_folders WHERE id = $1', [id]);
        await this.reloadBookmarkFolders();
    }

    // ─── People ────────────────────────────────────────────────────────────────
    private async reloadPeople() {
        const db = await this.getDb();
        await db.execute('ALTER TABLE people ADD COLUMN phone TEXT').catch(() => {});
        const rows = await db.select<any[]>('SELECT * FROM people');
        this.peopleSubject.next(rows.map(r => this.parseRow<any>(r, ['tags'])));
    }
    async getAllPeople(): Promise<any[]> { return this.peopleSubject.getValue(); }
    async upsertPerson(item: any): Promise<void> {
        const db = await this.getDb();
        const j = { ...item, tags: this.toJson(item.tags) };
        const exists = await db.select<any[]>('SELECT id FROM people WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(
                `UPDATE people SET name=$1, email=$2, phone=$3, company=$4, role=$5, avatar=$6, tags=$7, notes=$8, lastInteraction=$9, deleted_at=$10 WHERE id=$11`,
                [j.name, j.email ?? null, j.phone ?? null, j.company ?? null, j.role ?? null, j.avatar ?? null, j.tags, j.notes ?? null, j.lastInteraction ?? null, j.deleted_at ?? null, j.id]
            );
        } else {
            await db.execute(
                `INSERT INTO people (id, name, email, phone, company, role, avatar, tags, notes, lastInteraction, createdAt, deleted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [j.id, j.name, j.email ?? null, j.phone ?? null, j.company ?? null, j.role ?? null, j.avatar ?? null, j.tags, j.notes ?? null, j.lastInteraction ?? null, j.createdAt, j.deleted_at ?? null]
            );
        }
        await this.reloadPeople();
    }
    async removePerson(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM people WHERE id = $1', [id]);
        await this.reloadPeople();
    }

    // ─── Export ────────────────────────────────────────────────────────────────
    async exportAllData(): Promise<any> {
        const data: any = {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {}
        };

        data.data.tasks = await this.getAllTasks();

        // Notes: Populate content from files
        const notes = await this.getAllNotes();
        for (const note of notes) {
            if (note.filePath) {
                try {
                    note.content = await readTextFile(note.filePath);
                } catch (e) {
                    console.warn(`[SqliteService] Failed to read note content for ${note.id}`, e);
                }
            }
        }
        data.data.notes = notes;

        data.data.planning_items = await this.getAllPlanningItems();
        data.data.activities = await this.getAllActivities();
        data.data.books = await this.getAllBooks();
        data.data.bin_items = await this.getAllBinItems();

        data.data.meetings = await this.getAllMeetings();
        data.data.articles = await this.getAllArticles();
        data.data.research_collections = await this.getAllResearchCollections();
        data.data.research_sources = await this.getAllResearchSources();
        data.data.research_summaries = await this.getAllResearchSummaries();
        data.data.projects = await this.getAllProjects();

        // Book Content
        const db = await this.getDb();
        const contentRows = await db.select<BookContentDoc[]>('SELECT * FROM book_content');
        data.data.book_content = contentRows;

        return data;
    }
}
