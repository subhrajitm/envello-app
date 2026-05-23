import { Injectable, inject } from '@angular/core';
import { WorkspaceProfileService } from './workspace-profile.service';
import Database from '@tauri-apps/plugin-sql';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { BehaviorSubject, from, map, Observable } from 'rxjs';

// Import Types
import type {
    Task,
    Note,
    PlanningItem,
    Activity,
    Novel,
} from './store.service';
import type { BinItem } from './bin.service';

import type { Meeting } from './meetings.service';
import type { Article } from './article.service';
import type {
    ResearchCollection,
    ResearchSource,
    ResearchSummary,
} from './research.service';
import type { Project, Credential, Subscription, CredentialSubscriptionLink, Bookmark, BookmarkFolder } from '@envello/domain';

// const DB_NAME = 'envello.db'; // Removed, now determined dynamically by profile

export type TaskDoc = Task;
export type NoteDoc = Note;
export type PlanningItemDoc = PlanningItem;
export type ActivityDoc = Activity;
export type NovelDoc = Novel;
export type BinItemDoc = BinItem;

export type MeetingDoc = Meeting;
export type ArticleDoc = Article;
export type ResearchCollectionDoc = ResearchCollection;
/** @deprecated Use ResearchCollectionDoc */
export type ResearchLibraryDoc = ResearchCollectionDoc;
export type ResearchSourceDoc = ResearchSource;
export type ResearchSummaryDoc = ResearchSummary;
export type ProjectDoc = Project;
export type CredentialDoc = Credential;
export type SubscriptionDoc = Subscription;
export type CredentialSubscriptionLinkDoc = CredentialSubscriptionLink;
export type NoteFolderDoc = { id: string; name: string; icon: string };
export type BookmarkDoc = Bookmark;
export type BookmarkFolderDoc = BookmarkFolder;

export interface NovelContentDoc {
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
    private novelsSubject = new BehaviorSubject<NovelDoc[]>([]);
    private binItemsSubject = new BehaviorSubject<BinItemDoc[]>([]);

    private meetingsSubject = new BehaviorSubject<MeetingDoc[]>([]);
    private articlesSubject = new BehaviorSubject<ArticleDoc[]>([]);
    private researchCollectionsSubject = new BehaviorSubject<ResearchCollectionDoc[]>([]);
    private researchSourcesSubject = new BehaviorSubject<ResearchSourceDoc[]>([]);
    private researchSummariesSubject = new BehaviorSubject<ResearchSummaryDoc[]>([]);
    private projectsSubject = new BehaviorSubject<ProjectDoc[]>([]);
    private credentialsSubject = new BehaviorSubject<CredentialDoc[]>([]);
    private subscriptionsSubject = new BehaviorSubject<SubscriptionDoc[]>([]);
    private linksSubject = new BehaviorSubject<CredentialSubscriptionLinkDoc[]>([]);
    private noteFoldersSubject = new BehaviorSubject<NoteFolderDoc[]>([]);
    private bookmarksSubject = new BehaviorSubject<BookmarkDoc[]>([]);
    private bookmarkFoldersSubject = new BehaviorSubject<BookmarkFolderDoc[]>([]);

    private profileService = inject(WorkspaceProfileService);

    constructor() {
        // Don't initialize eagerly - only init when first database operation is called
        // This prevents errors in browser/non-Tauri environments
    }

    /**
     * Check if running in Tauri environment
     */
    private isTauri(): boolean {
        return typeof window !== 'undefined' && '__TAURI__' in window;
    }

    async getDb(): Promise<Database> {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        try {
            this.initPromise = this.initDb();
            return await this.initPromise;
        } catch (error) {
            // If initialization fails (e.g., not in Tauri), return a rejected promise
            // This will be caught by individual methods
            throw error;
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

            const db = await Database.load(`sqlite:${dbName}`);
            this.db = db;

            await this.createTables(db);
            await this.loadAllData(); // Load initial data into subjects

            console.log(`[SqliteService] Database initialized successfully for profile ${profileId}`);
            return db;
        } catch (error) {
            // Only log errors if we're in Tauri (unexpected errors)
            if (this.isTauri()) {
                console.error('Failed to initialize SQLite DB:', error);
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
        lastEdited TEXT
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

        // Novels
        await db.execute(`
      CREATE TABLE IF NOT EXISTS novels (
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

        // Novel Content
        await db.execute(`
      CREATE TABLE IF NOT EXISTS novel_content (
        id TEXT PRIMARY KEY,
        data TEXT
      )
    `);

        // Bin Items
        await db.execute(`
      CREATE TABLE IF NOT EXISTS bin_items (
        id TEXT PRIMARY KEY,
        type TEXT,
        originalId TEXT,
        contextId TEXT,
        title TEXT,
        deletedAt TEXT,
        payload TEXT
      )
    `);



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
        libraryId TEXT,
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

        // Research Summaries
        await db.execute(`
      CREATE TABLE IF NOT EXISTS research_summaries (
        id TEXT PRIMARY KEY,
        libraryId TEXT,
        title TEXT,
        content TEXT,
        sourceIds TEXT,
        tags TEXT,
        createdDate TEXT,
        lastModified TEXT
      )
    `);

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
        projectId TEXT,
        createdAt TEXT,
        createdBy TEXT
      )
    `);

        // Subscriptions
        await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        price REAL,
        billingCycle TEXT,
        renewalDate TEXT,
        ownerId TEXT,
        projectId TEXT,
        notes TEXT,
        status TEXT,
        currency TEXT
      )
    `);
        // Migration: add status/currency to existing databases that lack them
        try { await db.execute(`ALTER TABLE subscriptions ADD COLUMN status TEXT`); } catch { /* already exists */ }
        try { await db.execute(`ALTER TABLE subscriptions ADD COLUMN currency TEXT`); } catch { /* already exists */ }

        // Credential Subscription Links
        await db.execute(`
      CREATE TABLE IF NOT EXISTS credential_subscription_links (
        id TEXT PRIMARY KEY,
        credentialId TEXT,
        subscriptionId TEXT
      )
    `);

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

        // App metadata — stores per-app key/value pairs (e.g. vault encryption key)
        await db.execute(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
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
            this.reloadNovels(),
            this.reloadBinItems(),

            this.reloadMeetings(),
            this.reloadArticles(),
            this.reloadResearchCollections(),
            this.reloadResearchSources(),
            this.reloadResearchSummaries(),
            this.reloadProjects(),
            this.reloadCredentials(),
            this.reloadSubscriptions(),
            this.reloadLinks(),
            this.reloadNoteFolders(),
            this.reloadBookmarks(),
            this.reloadBookmarkFolders(),
        ]);
    }

    private toJson(obj: any): string {
        return JSON.stringify(obj);
    }

    private fromJson<T>(json: string): T {
        try {
            return JSON.parse(json);
        } catch (e) {
            return json as any;
        }
    }

    /**
     * Generic helper to parse fields specifically.
     * Basic SQLite returns everything as strings or numbers. 
     * We need to parse JSON fields back to objects/arrays.
     */
    private parseRow<T>(row: any, jsonFields: string[] = []): T {
        const res: any = { ...row };
        // Handle booleans (stored as 0/1 or 'true'/'false' depending on how it was inserted, but tauri plugin might return boolean or number)
        // Actually tauri-plugin-sql with sqlite parses booleans as 1/0 usually unless types are strict.
        // Let's assume we need to handle JSON fields manually.
        for (const field of jsonFields) {
            if (res[field]) {
                res[field] = this.fromJson(res[field]);
            }
        }
        // Also convert booleans if they came back as numbers? 
        // Typescript should handle it if we cast, but at runtime it might be 0/1.
        // For now we assume standard casting works for primitives or we fix as issues arise.
        return res as T;
    }

    // ─── Tasks ─────────────────────────────────────────────────────────────────
    private async reloadTasks() {
        const db = await this.getDb();
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
                startDate = $17, estimatedDuration = $18
            WHERE id = $19`,
                [jsonTask.title, jsonTask.priority, jsonTask.hours, jsonTask.status, jsonTask.project, jsonTask.due,
                jsonTask.labels, jsonTask.reminders, jsonTask.subtasks, jsonTask.parentId, jsonTask.dependencies,
                jsonTask.recurring, jsonTask.timeSpent, jsonTask.notes, jsonTask.attachments, jsonTask.description,
                jsonTask.startDate, jsonTask.estimatedDuration, jsonTask.id]);
        } else {
            await db.execute(`
            INSERT INTO tasks (
                id, title, priority, hours, status, project, due, labels, reminders, subtasks, 
                parentId, dependencies, recurring, timeSpent, notes, attachments, description, startDate, estimatedDuration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
                [jsonTask.id, jsonTask.title, jsonTask.priority, jsonTask.hours, jsonTask.status, jsonTask.project, jsonTask.due,
                jsonTask.labels, jsonTask.reminders, jsonTask.subtasks, jsonTask.parentId, jsonTask.dependencies,
                jsonTask.recurring, jsonTask.timeSpent, jsonTask.notes, jsonTask.attachments, jsonTask.description,
                jsonTask.startDate, jsonTask.estimatedDuration]
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
            // Try to add columns if they don't exist (Migration)
            await db.execute('ALTER TABLE notes ADD COLUMN filePath TEXT').catch(() => { });
            await db.execute('ALTER TABLE notes ADD COLUMN lastSynced TEXT').catch(() => { });
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
            await db.execute(`UPDATE notes SET date = $1, title = $2, preview = $3, content = $4, tags = $5, lastEdited = $6, filePath = $7, lastSynced = $8 WHERE id = $9`,
                [jsonNote.date, jsonNote.title, jsonNote.preview, jsonNote.content, jsonNote.tags, jsonNote.lastEdited, jsonNote.filePath, jsonNote.lastSynced, jsonNote.id]);
        } else {
            await db.execute(`INSERT INTO notes (id, date, title, preview, content, tags, lastEdited, filePath, lastSynced) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [jsonNote.id, jsonNote.date, jsonNote.title, jsonNote.preview, jsonNote.content, jsonNote.tags, jsonNote.lastEdited, jsonNote.filePath, jsonNote.lastSynced]);
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

    // ─── Novels ────────────────────────────────────────────────────────────────
    private async reloadNovels() {
        const db = await this.getDb();
        const rows = await db.select<NovelDoc[]>('SELECT * FROM novels');
        const parsed = rows.map((r: any) => this.parseRow<NovelDoc>(r, ['genre']));
        this.novelsSubject.next(parsed);
    }

    async upsertNovel(novel: NovelDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM novels WHERE id = $1', [novel.id]);
        const jsonNovel = { ...novel, genre: this.toJson(novel.genre) };

        if (exists.length > 0) {
            await db.execute(`
        UPDATE novels SET title=$1, icon=$2, status=$3, wordCount=$4, targetWordCount=$5, progress=$6, 
        chapters=$7, notesCount=$8, createdDate=$9, lastUpdated=$10, genre=$11, isRecentlyUpdated=$12, coverImage=$13
        WHERE id=$14`,
                [jsonNovel.title, jsonNovel.icon, jsonNovel.status, jsonNovel.wordCount, jsonNovel.targetWordCount, jsonNovel.progress,
                jsonNovel.chapters, jsonNovel.notesCount, jsonNovel.createdDate, jsonNovel.lastUpdated, jsonNovel.genre, jsonNovel.isRecentlyUpdated, jsonNovel.coverImage, jsonNovel.id]);
        } else {
            await db.execute(`
        INSERT INTO novels (id, title, icon, status, wordCount, targetWordCount, progress, chapters, notesCount, createdDate, lastUpdated, genre, isRecentlyUpdated, coverImage)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [jsonNovel.id, jsonNovel.title, jsonNovel.icon, jsonNovel.status, jsonNovel.wordCount, jsonNovel.targetWordCount, jsonNovel.progress,
                jsonNovel.chapters, jsonNovel.notesCount, jsonNovel.createdDate, jsonNovel.lastUpdated, jsonNovel.genre, jsonNovel.isRecentlyUpdated, jsonNovel.coverImage]);
        }
        await this.reloadNovels();
    }

    novels$(): Observable<NovelDoc[]> {
        return this.novelsSubject.asObservable();
    }

    async getAllNovels(): Promise<NovelDoc[]> {
        return this.novelsSubject.getValue();
    }

    async removeNovel(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM novels WHERE id = $1', [id]);
        await this.reloadNovels();
    }

    // ─── Novel Content ─────────────────────────────────────────────────────────
    async getNovelContent(id: string): Promise<string | null> {
        const db = await this.getDb();
        const rows = await db.select<NovelContentDoc[]>('SELECT * FROM novel_content WHERE id = $1', [id]);
        return rows.length > 0 ? rows[0].data : null;
    }

    async setNovelContent(id: string, data: string): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM novel_content WHERE id = $1', [id]);
        if (exists.length > 0) {
            await db.execute('UPDATE novel_content SET data = $1 WHERE id = $2', [data, id]);
        } else {
            await db.execute('INSERT INTO novel_content (id, data) VALUES ($1, $2)', [id, data]);
        }
    }

    async removeNovelContent(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM novel_content WHERE id = $1', [id]);
    }

    // ─── Bin Items ─────────────────────────────────────────────────────────────
    private async reloadBinItems() {
        const db = await this.getDb();
        const rows = await db.select<BinItemDoc[]>('SELECT * FROM bin_items');
        const parsed = rows.map((r: any) => this.parseRow<BinItemDoc>(r, ['payload']));
        this.binItemsSubject.next(parsed);
    }

    async upsertBinItem(item: BinItemDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM bin_items WHERE id = $1', [item.id]);
        const jsonItem = { ...item, payload: this.toJson(item.payload) };

        if (exists.length > 0) {
            await db.execute('UPDATE bin_items SET type=$1, originalId=$2, contextId=$3, title=$4, deletedAt=$5, payload=$6 WHERE id=$7',
                [jsonItem.type, jsonItem.originalId, jsonItem.contextId, jsonItem.title, jsonItem.deletedAt, jsonItem.payload, jsonItem.id]);
        } else {
            await db.execute('INSERT INTO bin_items (id, type, originalId, contextId, title, deletedAt, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [jsonItem.id, jsonItem.type, jsonItem.originalId, jsonItem.contextId, jsonItem.title, jsonItem.deletedAt, jsonItem.payload]);
        }
        await this.reloadBinItems();
    }

    async removeBinItem(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM bin_items WHERE id = $1', [id]);
        await this.reloadBinItems();
    }

    async clearBin(): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM bin_items');
        await this.reloadBinItems();
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
            await db.execute(`UPDATE meetings SET title=$1, description=$2, project=$3, date=$4, startTime=$5, endTime=$6, duration=$7, timezone=$8, location=$9, meetingLink=$10, meetingType=$11, platform=$12, attendees=$13, organizer=$14, agenda=$15, notes=$16, actionItems=$17, status=$18, priority=$19, color=$20, labels=$21, recurring=$22, reminders=$23, attachments=$24, createdAt=$25, updatedAt=$26, createdBy=$27 WHERE id=$28`,
                [jsonDoc.title, jsonDoc.description, jsonDoc.project, jsonDoc.date, jsonDoc.startTime, jsonDoc.endTime, jsonDoc.duration, jsonDoc.timezone, jsonDoc.location, jsonDoc.meetingLink, jsonDoc.meetingType, jsonDoc.platform, jsonDoc.attendees, jsonDoc.organizer, jsonDoc.agenda, jsonDoc.notes, jsonDoc.actionItems, jsonDoc.status, jsonDoc.priority, jsonDoc.color, jsonDoc.labels, jsonDoc.recurring, jsonDoc.reminders, jsonDoc.attachments, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.createdBy, jsonDoc.id]);
        } else {
            await db.execute(`INSERT INTO meetings (id, title, description, project, date, startTime, endTime, duration, timezone, location, meetingLink, meetingType, platform, attendees, organizer, agenda, notes, actionItems, status, priority, color, labels, recurring, reminders, attachments, createdAt, updatedAt, createdBy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`,
                [jsonDoc.id, jsonDoc.title, jsonDoc.description, jsonDoc.project, jsonDoc.date, jsonDoc.startTime, jsonDoc.endTime, jsonDoc.duration, jsonDoc.timezone, jsonDoc.location, jsonDoc.meetingLink, jsonDoc.meetingType, jsonDoc.platform, jsonDoc.attendees, jsonDoc.organizer, jsonDoc.agenda, jsonDoc.notes, jsonDoc.actionItems, jsonDoc.status, jsonDoc.priority, jsonDoc.color, jsonDoc.labels, jsonDoc.recurring, jsonDoc.reminders, jsonDoc.attachments, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.createdBy]);
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

    /** @deprecated Use upsertResearchCollection */
    async upsertResearchLibrary(doc: ResearchCollectionDoc): Promise<void> {
        return this.upsertResearchCollection(doc);
    }

    /** @deprecated Use getAllResearchCollections */
    async getAllResearchLibraries(): Promise<ResearchCollectionDoc[]> {
        return this.getAllResearchCollections();
    }

    async removeResearchCollection(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_collections WHERE id = $1', [id]);
        await this.reloadResearchCollections();
    }

    /** @deprecated Use removeResearchCollection */
    async removeResearchLibrary(id: string): Promise<void> {
        return this.removeResearchCollection(id);
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
            await db.execute(`UPDATE research_sources SET libraryId=$1, title=$2, sourceType=$3, url=$4, description=$5, author=$6, publishDate=$7, tags=$8, status=$9, notes=$10, createdDate=$11, lastAccessed=$12 WHERE id=$13`,
                [jsonDoc.libraryId, jsonDoc.title, jsonDoc.sourceType, jsonDoc.url, jsonDoc.description, jsonDoc.author, jsonDoc.publishDate, jsonDoc.tags, jsonDoc.status, jsonDoc.notes, jsonDoc.createdDate, jsonDoc.lastAccessed, jsonDoc.id]);
        } else {
            await db.execute(`INSERT INTO research_sources (id, libraryId, title, sourceType, url, description, author, publishDate, tags, status, notes, createdDate, lastAccessed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [jsonDoc.id, jsonDoc.libraryId, jsonDoc.title, jsonDoc.sourceType, jsonDoc.url, jsonDoc.description, jsonDoc.author, jsonDoc.publishDate, jsonDoc.tags, jsonDoc.status, jsonDoc.notes, jsonDoc.createdDate, jsonDoc.lastAccessed]);
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
            await db.execute('UPDATE research_summaries SET libraryId=$1, title=$2, content=$3, sourceIds=$4, tags=$5, createdDate=$6, lastModified=$7 WHERE id=$8',
                [jsonDoc.libraryId, jsonDoc.title, jsonDoc.content, jsonDoc.sourceIds, jsonDoc.tags, jsonDoc.createdDate, jsonDoc.lastModified, jsonDoc.id]);
        } else {
            await db.execute('INSERT INTO research_summaries (id, libraryId, title, content, sourceIds, tags, createdDate, lastModified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [jsonDoc.id, jsonDoc.libraryId, jsonDoc.title, jsonDoc.content, jsonDoc.sourceIds, jsonDoc.tags, jsonDoc.createdDate, jsonDoc.lastModified]);
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

    // ─── Vault & Subscriptions ──────────────────────────────────────────────────
    private async reloadCredentials() {
        const db = await this.getDb();
        const rows = await db.select<CredentialDoc[]>('SELECT * FROM credentials');
        this.credentialsSubject.next(rows);
    }
    async getAllCredentials(): Promise<CredentialDoc[]> { return this.credentialsSubject.getValue(); }
    async upsertCredential(item: CredentialDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM credentials WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE credentials SET name=$1, type=$2, value=$3, projectId=$4, createdAt=$5, createdBy=$6 WHERE id=$7`,
                [item.name, item.type, item.value, item.projectId, item.createdAt, item.createdBy, item.id]);
        } else {
            await db.execute(`INSERT INTO credentials (id, name, type, value, projectId, createdAt, createdBy) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [item.id, item.name, item.type, item.value, item.projectId, item.createdAt, item.createdBy]);
        }
        await this.reloadCredentials();
    }
    async removeCredential(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM credentials WHERE id = $1', [id]);
        await this.reloadCredentials();
    }

    private async reloadSubscriptions() {
        const db = await this.getDb();
        const rows = await db.select<SubscriptionDoc[]>('SELECT * FROM subscriptions');
        this.subscriptionsSubject.next(rows);
    }
    async getAllSubscriptions(): Promise<SubscriptionDoc[]> { return this.subscriptionsSubject.getValue(); }
    async upsertSubscription(item: SubscriptionDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM subscriptions WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(
                `UPDATE subscriptions SET name=$1, category=$2, price=$3, billingCycle=$4, renewalDate=$5, ownerId=$6, projectId=$7, notes=$8, status=$9, currency=$10 WHERE id=$11`,
                [item.name, item.category, item.price, item.billingCycle, item.renewalDate, item.ownerId, item.projectId, item.notes, item.status, item.currency, item.id]);
        } else {
            await db.execute(
                `INSERT INTO subscriptions (id, name, category, price, billingCycle, renewalDate, ownerId, projectId, notes, status, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [item.id, item.name, item.category, item.price, item.billingCycle, item.renewalDate, item.ownerId, item.projectId, item.notes, item.status, item.currency]);
        }
        await this.reloadSubscriptions();
    }
    async removeSubscription(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM subscriptions WHERE id = $1', [id]);
        await this.reloadSubscriptions();
    }

    private async reloadLinks() {
        const db = await this.getDb();
        const rows = await db.select<CredentialSubscriptionLinkDoc[]>('SELECT * FROM credential_subscription_links');
        this.linksSubject.next(rows);
    }
    async getAllLinks(): Promise<CredentialSubscriptionLinkDoc[]> { return this.linksSubject.getValue(); }
    async upsertLink(item: CredentialSubscriptionLinkDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM credential_subscription_links WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE credential_subscription_links SET credentialId=$1, subscriptionId=$2 WHERE id=$3`,
                [item.credentialId, item.subscriptionId, item.id]);
        } else {
            await db.execute(`INSERT INTO credential_subscription_links (id, credentialId, subscriptionId) VALUES ($1, $2, $3)`,
                [item.id, item.credentialId, item.subscriptionId]);
        }
        await this.reloadLinks();
    }
    async removeLink(id: string): Promise<void> {
        const db = await this.getDb();
        await db.execute('DELETE FROM credential_subscription_links WHERE id = $1', [id]);
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
        const rows = await db.select<any[]>('SELECT * FROM bookmarks');
        const parsed = rows.map((r: any) => this.parseRow<BookmarkDoc>(r, ['tags']));
        this.bookmarksSubject.next(parsed);
    }
    async getAllBookmarks(): Promise<BookmarkDoc[]> { return this.bookmarksSubject.getValue(); }
    async upsertBookmark(item: BookmarkDoc): Promise<void> {
        const db = await this.getDb();
        const exists = await db.select<any[]>('SELECT id FROM bookmarks WHERE id = $1', [item.id]);
        const j = { ...item, tags: this.toJson(item.tags) };
        if (exists.length > 0) {
            await db.execute(
                `UPDATE bookmarks SET title=$1, url=$2, description=$3, faviconUrl=$4, tags=$5, folderId=$6, createdAt=$7, lastVisited=$8, visitCount=$9, notes=$10, color=$11, isArchived=$12, isPinned=$13 WHERE id=$14`,
                [j.title, j.url, j.description, j.faviconUrl, j.tags, j.folderId, j.createdAt, j.lastVisited, j.visitCount, j.notes, j.color, j.isArchived, j.isPinned, j.id]);
        } else {
            await db.execute(
                `INSERT INTO bookmarks (id, title, url, description, faviconUrl, tags, folderId, createdAt, lastVisited, visitCount, notes, color, isArchived, isPinned) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [j.id, j.title, j.url, j.description, j.faviconUrl, j.tags, j.folderId, j.createdAt, j.lastVisited, j.visitCount, j.notes, j.color, j.isArchived, j.isPinned]);
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
        data.data.novels = await this.getAllNovels();
        data.data.bin_items = await this.getAllBinItems();

        data.data.meetings = await this.getAllMeetings();
        data.data.articles = await this.getAllArticles();
        data.data.research_collections = await this.getAllResearchCollections();
        data.data.research_sources = await this.getAllResearchSources();
        data.data.research_summaries = await this.getAllResearchSummaries();
        data.data.projects = await this.getAllProjects();

        // Novel Content
        const db = await this.getDb();
        const contentRows = await db.select<NovelContentDoc[]>('SELECT * FROM novel_content');
        data.data.novel_content = contentRows;

        return data;
    }
}
