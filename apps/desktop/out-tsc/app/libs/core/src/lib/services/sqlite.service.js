import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { BehaviorSubject } from 'rxjs';
const DB_NAME = 'envello.db';
let SqliteService = class SqliteService {
    db = null;
    initPromise = null;
    // BehavioSubjects for Reactive Data
    tasksSubject = new BehaviorSubject([]);
    notesSubject = new BehaviorSubject([]);
    planningItemsSubject = new BehaviorSubject([]);
    activitiesSubject = new BehaviorSubject([]);
    novelsSubject = new BehaviorSubject([]);
    binItemsSubject = new BehaviorSubject([]);
    snippetsSubject = new BehaviorSubject([]);
    booksSubject = new BehaviorSubject([]);
    meetingsSubject = new BehaviorSubject([]);
    articlesSubject = new BehaviorSubject([]);
    journalProjectsSubject = new BehaviorSubject([]);
    journalEntriesSubject = new BehaviorSubject([]);
    journalColumnsSubject = new BehaviorSubject([]);
    researchLibrariesSubject = new BehaviorSubject([]);
    researchSourcesSubject = new BehaviorSubject([]);
    researchSummariesSubject = new BehaviorSubject([]);
    constructor() {
        // Don't initialize eagerly - only init when first database operation is called
        // This prevents errors in browser/non-Tauri environments
    }
    /**
     * Check if running in Tauri environment
     */
    isTauri() {
        return typeof window !== 'undefined' && '__TAURI__' in window;
    }
    async getDb() {
        if (this.db)
            return this.db;
        if (this.initPromise)
            return this.initPromise;
        try {
            this.initPromise = this.initDb();
            return await this.initPromise;
        }
        catch (error) {
            // If initialization fails (e.g., not in Tauri), return a rejected promise
            // This will be caught by individual methods
            throw error;
        }
    }
    async initDb() {
        try {
            // Check if running in Tauri environment
            if (!this.isTauri()) {
                // Silently fail in non-Tauri environments (browser)
                // This is expected behavior when developing with ng serve
                throw new Error('SQLite is only available in Tauri desktop app');
            }
            const db = await Database.load(`sqlite:${DB_NAME}`);
            this.db = db;
            await this.createTables(db);
            await this.loadAllData(); // Load initial data into subjects
            console.log('[SqliteService] Database initialized successfully');
            return db;
        }
        catch (error) {
            // Only log errors if we're in Tauri (unexpected errors)
            if (this.isTauri()) {
                console.error('Failed to initialize SQLite DB:', error);
            }
            throw error;
        }
    }
    async createTables(db) {
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
        // Snippets
        await db.execute(`
      CREATE TABLE IF NOT EXISTS snippets (
        id TEXT PRIMARY KEY,
        title TEXT,
        lang TEXT,
        tags TEXT,
        content TEXT,
        filename TEXT,
        path TEXT,
        creator TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
        // Books
        await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT,
        author TEXT,
        category TEXT,
        status TEXT,
        progress REAL,
        notesCount REAL,
        lastAccessed TEXT,
        coverImage TEXT,
        isbn TEXT,
        year REAL,
        notes TEXT,
        createdAt TEXT,
        updatedAt TEXT
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
        // Journal Projects
        await db.execute(`
      CREATE TABLE IF NOT EXISTS journal_projects (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        entriesCount REAL,
        active BOOLEAN,
        wordCount REAL,
        targetWordCount REAL,
        progress REAL,
        createdDate TEXT,
        lastUpdated TEXT,
        columns TEXT,
        tags TEXT,
        isLocked BOOLEAN
      )
    `);
        // Journal Entries
        await db.execute(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        projectId TEXT,
        title TEXT,
        content TEXT,
        preview TEXT,
        type TEXT,
        column TEXT,
        tags TEXT,
        wordCount REAL,
        characterCount REAL,
        createdDate TEXT,
        lastEdited TEXT,
        hasAi BOOLEAN,
        isAiEdited BOOLEAN,
        progress REAL,
        statusColor TEXT,
        meta TEXT,
        isLocked BOOLEAN,
        linkedEntries TEXT,
        isPinned BOOLEAN,
        isFavorite BOOLEAN
      )
    `);
        // Journal Columns
        await db.execute(`
      CREATE TABLE IF NOT EXISTS journal_columns (
        id TEXT PRIMARY KEY,
        name TEXT,
        color TEXT,
        "order" REAL
      )
    `);
        // Research Libraries
        await db.execute(`
      CREATE TABLE IF NOT EXISTS research_libraries (
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
    }
    // ─── Helpers ───────────────────────────────────────────────────────────────
    async loadAllData() {
        await Promise.all([
            this.reloadTasks(),
            this.reloadNotes(),
            this.reloadPlanningItems(),
            this.reloadActivities(),
            this.reloadNovels(),
            this.reloadBinItems(),
            this.reloadSnippets(),
            this.reloadBooks(),
            this.reloadMeetings(),
            this.reloadArticles(),
            this.reloadJournalProjects(),
            this.reloadJournalEntries(),
            this.reloadJournalColumns(),
            this.reloadResearchLibraries(),
            this.reloadResearchSources(),
            this.reloadResearchSummaries(),
        ]);
    }
    toJson(obj) {
        return JSON.stringify(obj);
    }
    fromJson(json) {
        try {
            return JSON.parse(json);
        }
        catch (e) {
            return json;
        }
    }
    /**
     * Generic helper to parse fields specifically.
     * Basic SQLite returns everything as strings or numbers.
     * We need to parse JSON fields back to objects/arrays.
     */
    parseRow(row, jsonFields = []) {
        const res = { ...row };
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
        return res;
    }
    // ─── Tasks ─────────────────────────────────────────────────────────────────
    async reloadTasks() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM tasks');
        const parsed = rows.map((r) => this.parseRow(r, ['labels', 'reminders', 'subtasks', 'dependencies', 'recurring', 'attachments']));
        this.tasksSubject.next(parsed);
    }
    async getAllTasks() {
        return this.tasksSubject.getValue();
    }
    async upsertTask(task) {
        const db = await this.getDb();
        // Check if exists
        const exists = await db.select('SELECT id FROM tasks WHERE id = $1', [task.id]);
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
            WHERE id = $19`, [jsonTask.title, jsonTask.priority, jsonTask.hours, jsonTask.status, jsonTask.project, jsonTask.due,
                jsonTask.labels, jsonTask.reminders, jsonTask.subtasks, jsonTask.parentId, jsonTask.dependencies,
                jsonTask.recurring, jsonTask.timeSpent, jsonTask.notes, jsonTask.attachments, jsonTask.description,
                jsonTask.startDate, jsonTask.estimatedDuration, jsonTask.id]);
        }
        else {
            await db.execute(`
            INSERT INTO tasks (
                id, title, priority, hours, status, project, due, labels, reminders, subtasks, 
                parentId, dependencies, recurring, timeSpent, notes, attachments, description, startDate, estimatedDuration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`, [jsonTask.id, jsonTask.title, jsonTask.priority, jsonTask.hours, jsonTask.status, jsonTask.project, jsonTask.due,
                jsonTask.labels, jsonTask.reminders, jsonTask.subtasks, jsonTask.parentId, jsonTask.dependencies,
                jsonTask.recurring, jsonTask.timeSpent, jsonTask.notes, jsonTask.attachments, jsonTask.description,
                jsonTask.startDate, jsonTask.estimatedDuration]);
        }
        await this.reloadTasks();
    }
    async removeTask(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM tasks WHERE id = $1', [id]);
        await this.reloadTasks();
    }
    tasks$() {
        return this.tasksSubject.asObservable();
    }
    // ─── Notes ─────────────────────────────────────────────────────────────────
    async reloadNotes() {
        const db = await this.getDb();
        try {
            // Try to add columns if they don't exist (Migration)
            await db.execute('ALTER TABLE notes ADD COLUMN filePath TEXT').catch(() => { });
            await db.execute('ALTER TABLE notes ADD COLUMN lastSynced TEXT').catch(() => { });
        }
        catch (e) {
            // Ignore column exists errors
        }
        const rows = await db.select('SELECT * FROM notes');
        const parsed = rows.map((r) => this.parseRow(r, ['tags']));
        this.notesSubject.next(parsed);
    }
    async getAllNotes() {
        return this.notesSubject.getValue();
    }
    async upsertNote(note) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM notes WHERE id = $1', [note.id]);
        // Ensure we don't store large content in DB, but keep tags jsonified
        const jsonNote = {
            ...note,
            tags: this.toJson(note.tags),
            content: '' // CLEAR CONTENT FROM DB -> Source of truth is .md file
        };
        if (exists.length > 0) {
            await db.execute(`UPDATE notes SET date = $1, title = $2, preview = $3, content = $4, tags = $5, lastEdited = $6, filePath = $7, lastSynced = $8 WHERE id = $9`, [jsonNote.date, jsonNote.title, jsonNote.preview, jsonNote.content, jsonNote.tags, jsonNote.lastEdited, jsonNote.filePath, jsonNote.lastSynced, jsonNote.id]);
        }
        else {
            await db.execute(`INSERT INTO notes (id, date, title, preview, content, tags, lastEdited, filePath, lastSynced) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [jsonNote.id, jsonNote.date, jsonNote.title, jsonNote.preview, jsonNote.content, jsonNote.tags, jsonNote.lastEdited, jsonNote.filePath, jsonNote.lastSynced]);
        }
        await this.reloadNotes();
    }
    async removeNote(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM notes WHERE id = $1', [id]);
        await this.reloadNotes();
    }
    notes$() {
        return this.notesSubject.asObservable();
    }
    // ─── Planning Items ────────────────────────────────────────────────────────
    async reloadPlanningItems() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM planning_items');
        this.planningItemsSubject.next(rows);
    }
    async upsertPlanningItem(item) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM planning_items WHERE id = $1', [item.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE planning_items SET title = $1, tag = $2, stage = $3, active = $4 WHERE id = $5`, [item.title, item.tag, item.stage, item.active, item.id]);
        }
        else {
            await db.execute(`INSERT INTO planning_items (id, title, tag, stage, active) VALUES ($1, $2, $3, $4, $5)`, [item.id, item.title, item.tag, item.stage, item.active]);
        }
        await this.reloadPlanningItems();
    }
    planningItems$() {
        return this.planningItemsSubject.asObservable();
    }
    async getAllPlanningItems() {
        return this.planningItemsSubject.getValue();
    }
    // ─── Activities ────────────────────────────────────────────────────────────
    async reloadActivities() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM activities');
        this.activitiesSubject.next(rows);
    }
    async upsertActivity(act) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM activities WHERE id = $1', [act.id]);
        if (exists.length > 0) {
            await db.execute(`UPDATE activities SET text = $1, time = $2, type = $3 WHERE id = $4`, [act.text, act.time, act.type, act.id]);
        }
        else {
            await db.execute(`INSERT INTO activities (id, text, time, type) VALUES ($1, $2, $3, $4)`, [act.id, act.text, act.time, act.type]);
        }
        await this.reloadActivities();
    }
    activities$() {
        return this.activitiesSubject.asObservable();
    }
    async getAllActivities() {
        return this.activitiesSubject.getValue();
    }
    async removeActivity(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM activities WHERE id = $1', [id]);
        await this.reloadActivities();
    }
    // ─── Novels ────────────────────────────────────────────────────────────────
    async reloadNovels() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM novels');
        const parsed = rows.map((r) => this.parseRow(r, ['genre']));
        this.novelsSubject.next(parsed);
    }
    async upsertNovel(novel) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM novels WHERE id = $1', [novel.id]);
        const jsonNovel = { ...novel, genre: this.toJson(novel.genre) };
        if (exists.length > 0) {
            await db.execute(`
        UPDATE novels SET title=$1, icon=$2, status=$3, wordCount=$4, targetWordCount=$5, progress=$6, 
        chapters=$7, notesCount=$8, createdDate=$9, lastUpdated=$10, genre=$11, isRecentlyUpdated=$12, coverImage=$13
        WHERE id=$14`, [jsonNovel.title, jsonNovel.icon, jsonNovel.status, jsonNovel.wordCount, jsonNovel.targetWordCount, jsonNovel.progress,
                jsonNovel.chapters, jsonNovel.notesCount, jsonNovel.createdDate, jsonNovel.lastUpdated, jsonNovel.genre, jsonNovel.isRecentlyUpdated, jsonNovel.coverImage, jsonNovel.id]);
        }
        else {
            await db.execute(`
        INSERT INTO novels (id, title, icon, status, wordCount, targetWordCount, progress, chapters, notesCount, createdDate, lastUpdated, genre, isRecentlyUpdated, coverImage)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [jsonNovel.id, jsonNovel.title, jsonNovel.icon, jsonNovel.status, jsonNovel.wordCount, jsonNovel.targetWordCount, jsonNovel.progress,
                jsonNovel.chapters, jsonNovel.notesCount, jsonNovel.createdDate, jsonNovel.lastUpdated, jsonNovel.genre, jsonNovel.isRecentlyUpdated, jsonNovel.coverImage]);
        }
        await this.reloadNovels();
    }
    novels$() {
        return this.novelsSubject.asObservable();
    }
    async getAllNovels() {
        return this.novelsSubject.getValue();
    }
    async removeNovel(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM novels WHERE id = $1', [id]);
        await this.reloadNovels();
    }
    // ─── Novel Content ─────────────────────────────────────────────────────────
    async getNovelContent(id) {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM novel_content WHERE id = $1', [id]);
        return rows.length > 0 ? rows[0].data : null;
    }
    async setNovelContent(id, data) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM novel_content WHERE id = $1', [id]);
        if (exists.length > 0) {
            await db.execute('UPDATE novel_content SET data = $1 WHERE id = $2', [data, id]);
        }
        else {
            await db.execute('INSERT INTO novel_content (id, data) VALUES ($1, $2)', [id, data]);
        }
    }
    async removeNovelContent(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM novel_content WHERE id = $1', [id]);
    }
    // ─── Bin Items ─────────────────────────────────────────────────────────────
    async reloadBinItems() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM bin_items');
        const parsed = rows.map((r) => this.parseRow(r, ['payload']));
        this.binItemsSubject.next(parsed);
    }
    async upsertBinItem(item) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM bin_items WHERE id = $1', [item.id]);
        const jsonItem = { ...item, payload: this.toJson(item.payload) };
        if (exists.length > 0) {
            await db.execute('UPDATE bin_items SET type=$1, originalId=$2, contextId=$3, title=$4, deletedAt=$5, payload=$6 WHERE id=$7', [jsonItem.type, jsonItem.originalId, jsonItem.contextId, jsonItem.title, jsonItem.deletedAt, jsonItem.payload, jsonItem.id]);
        }
        else {
            await db.execute('INSERT INTO bin_items (id, type, originalId, contextId, title, deletedAt, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)', [jsonItem.id, jsonItem.type, jsonItem.originalId, jsonItem.contextId, jsonItem.title, jsonItem.deletedAt, jsonItem.payload]);
        }
        await this.reloadBinItems();
    }
    async removeBinItem(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM bin_items WHERE id = $1', [id]);
        await this.reloadBinItems();
    }
    async clearBin() {
        const db = await this.getDb();
        await db.execute('DELETE FROM bin_items');
        await this.reloadBinItems();
    }
    binItems$() {
        return this.binItemsSubject.asObservable();
    }
    async getAllBinItems() {
        return this.binItemsSubject.getValue();
    }
    // ─── Snippets ──────────────────────────────────────────────────────────────
    async reloadSnippets() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM snippets');
        const parsed = rows.map((r) => this.parseRow(r, ['tags']));
        this.snippetsSubject.next(parsed);
    }
    async upsertSnippet(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM snippets WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, tags: this.toJson(doc.tags) };
        if (exists.length > 0) {
            await db.execute(`UPDATE snippets SET title=$1, lang=$2, tags=$3, content=$4, filename=$5, path=$6, creator=$7, createdAt=$8, updatedAt=$9 WHERE id=$10`, [jsonDoc.title, jsonDoc.lang, jsonDoc.tags, jsonDoc.content, jsonDoc.filename, jsonDoc.path, jsonDoc.creator, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.id]);
        }
        else {
            await db.execute(`INSERT INTO snippets (id, title, lang, tags, content, filename, path, creator, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [jsonDoc.id, jsonDoc.title, jsonDoc.lang, jsonDoc.tags, jsonDoc.content, jsonDoc.filename, jsonDoc.path, jsonDoc.creator, jsonDoc.createdAt, jsonDoc.updatedAt]);
        }
        await this.reloadSnippets();
    }
    async removeSnippet(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM snippets WHERE id = $1', [id]);
        await this.reloadSnippets();
    }
    async getAllSnippets() {
        return this.snippetsSubject.getValue();
    }
    // ─── Books ─────────────────────────────────────────────────────────────────
    async reloadBooks() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM books');
        const parsed = rows.map((r) => this.parseRow(r, ['notes']));
        this.booksSubject.next(parsed);
    }
    async upsertBook(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM books WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, notes: this.toJson(doc.notes) };
        if (exists.length > 0) {
            await db.execute(`UPDATE books SET title=$1, author=$2, category=$3, status=$4, progress=$5, notesCount=$6, lastAccessed=$7, coverImage=$8, isbn=$9, year=$10, notes=$11, createdAt=$12, updatedAt=$13 WHERE id=$14`, [jsonDoc.title, jsonDoc.author, jsonDoc.category, jsonDoc.status, jsonDoc.progress, jsonDoc.notesCount, jsonDoc.lastAccessed, jsonDoc.coverImage, jsonDoc.isbn, jsonDoc.year, jsonDoc.notes, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.id]);
        }
        else {
            await db.execute(`INSERT INTO books (id, title, author, category, status, progress, notesCount, lastAccessed, coverImage, isbn, year, notes, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [jsonDoc.id, jsonDoc.title, jsonDoc.author, jsonDoc.category, jsonDoc.status, jsonDoc.progress, jsonDoc.notesCount, jsonDoc.lastAccessed, jsonDoc.coverImage, jsonDoc.isbn, jsonDoc.year, jsonDoc.notes, jsonDoc.createdAt, jsonDoc.updatedAt]);
        }
        await this.reloadBooks();
    }
    async removeBook(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM books WHERE id = $1', [id]);
        await this.reloadBooks();
    }
    async getAllBooks() {
        return this.booksSubject.getValue();
    }
    // ─── Meetings ──────────────────────────────────────────────────────────────
    async reloadMeetings() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM meetings');
        const parsed = rows.map((r) => this.parseRow(r, ['attendees', 'organizer', 'agenda', 'notes', 'actionItems', 'labels', 'recurring', 'reminders', 'attachments']));
        this.meetingsSubject.next(parsed);
    }
    async upsertMeeting(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM meetings WHERE id = $1', [doc.id]);
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
            await db.execute(`UPDATE meetings SET title=$1, description=$2, project=$3, date=$4, startTime=$5, endTime=$6, duration=$7, timezone=$8, location=$9, meetingLink=$10, meetingType=$11, platform=$12, attendees=$13, organizer=$14, agenda=$15, notes=$16, actionItems=$17, status=$18, priority=$19, color=$20, labels=$21, recurring=$22, reminders=$23, attachments=$24, createdAt=$25, updatedAt=$26, createdBy=$27 WHERE id=$28`, [jsonDoc.title, jsonDoc.description, jsonDoc.project, jsonDoc.date, jsonDoc.startTime, jsonDoc.endTime, jsonDoc.duration, jsonDoc.timezone, jsonDoc.location, jsonDoc.meetingLink, jsonDoc.meetingType, jsonDoc.platform, jsonDoc.attendees, jsonDoc.organizer, jsonDoc.agenda, jsonDoc.notes, jsonDoc.actionItems, jsonDoc.status, jsonDoc.priority, jsonDoc.color, jsonDoc.labels, jsonDoc.recurring, jsonDoc.reminders, jsonDoc.attachments, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.createdBy, jsonDoc.id]);
        }
        else {
            await db.execute(`INSERT INTO meetings (id, title, description, project, date, startTime, endTime, duration, timezone, location, meetingLink, meetingType, platform, attendees, organizer, agenda, notes, actionItems, status, priority, color, labels, recurring, reminders, attachments, createdAt, updatedAt, createdBy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`, [jsonDoc.id, jsonDoc.title, jsonDoc.description, jsonDoc.project, jsonDoc.date, jsonDoc.startTime, jsonDoc.endTime, jsonDoc.duration, jsonDoc.timezone, jsonDoc.location, jsonDoc.meetingLink, jsonDoc.meetingType, jsonDoc.platform, jsonDoc.attendees, jsonDoc.organizer, jsonDoc.agenda, jsonDoc.notes, jsonDoc.actionItems, jsonDoc.status, jsonDoc.priority, jsonDoc.color, jsonDoc.labels, jsonDoc.recurring, jsonDoc.reminders, jsonDoc.attachments, jsonDoc.createdAt, jsonDoc.updatedAt, jsonDoc.createdBy]);
        }
        await this.reloadMeetings();
    }
    async getAllMeetings() {
        return this.meetingsSubject.getValue();
    }
    async removeMeeting(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM meetings WHERE id = $1', [id]);
        await this.reloadMeetings();
    }
    // ─── Articles ──────────────────────────────────────────────────────────────
    async reloadArticles() {
        const db = await this.getDb();
        try {
            await db.execute('ALTER TABLE articles ADD COLUMN filePath TEXT').catch(() => { });
            await db.execute('ALTER TABLE articles ADD COLUMN lastSynced TEXT').catch(() => { });
        }
        catch (e) { }
        const rows = await db.select('SELECT * FROM articles');
        const parsed = rows.map((r) => this.parseRow(r, ['engagement', 'tags']));
        this.articlesSubject.next(parsed);
    }
    async getAllArticles() {
        return this.articlesSubject.getValue();
    }
    async upsertArticle(article) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM articles WHERE id = $1', [article.id]);
        const articleAny = article;
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
            WHERE id=$16`, [jsonArticle.title, jsonArticle.platform, jsonArticle.pipeline, jsonArticle.wordCount, jsonArticle.content, jsonArticle.url,
                jsonArticle.scheduledDate, jsonArticle.engagement, jsonArticle.tags, jsonArticle.lastUpdated, jsonArticle.createdDate, jsonArticle.icon, jsonArticle.excerpt,
                jsonArticle.filePath, jsonArticle.lastSynced, jsonArticle.id]);
        }
        else {
            await db.execute(`
            INSERT INTO articles (
                id, title, platform, pipeline, wordCount, content, url, scheduledDate, engagement, tags, 
                lastUpdated, createdDate, icon, excerpt, filePath, lastSynced
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [jsonArticle.id, jsonArticle.title, jsonArticle.platform, jsonArticle.pipeline, jsonArticle.wordCount, jsonArticle.content, jsonArticle.url,
                jsonArticle.scheduledDate, jsonArticle.engagement, jsonArticle.tags, jsonArticle.lastUpdated, jsonArticle.createdDate, jsonArticle.icon, jsonArticle.excerpt,
                jsonArticle.filePath, jsonArticle.lastSynced]);
        }
        await this.reloadArticles();
    }
    async removeArticle(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM articles WHERE id = $1', [id]);
        await this.reloadArticles();
    }
    // ─── Journal Projects ──────────────────────────────────────────────────────
    async reloadJournalProjects() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM journal_projects');
        const parsed = rows.map((r) => this.parseRow(r, ['columns', 'tags']));
        this.journalProjectsSubject.next(parsed);
    }
    async upsertJournalProject(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM journal_projects WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, columns: this.toJson(doc.columns), tags: this.toJson(doc.tags) };
        if (exists.length > 0) {
            await db.execute(`UPDATE journal_projects SET title=$1, description=$2, entriesCount=$3, active=$4, wordCount=$5, targetWordCount=$6, progress=$7, createdDate=$8, lastUpdated=$9, columns=$10, tags=$11, isLocked=$12 WHERE id=$13`, [jsonDoc.title, jsonDoc.description, jsonDoc.entriesCount, jsonDoc.active, jsonDoc.wordCount, jsonDoc.targetWordCount, jsonDoc.progress, jsonDoc.createdDate, jsonDoc.lastUpdated, jsonDoc.columns, jsonDoc.tags, jsonDoc.isLocked, jsonDoc.id]);
        }
        else {
            await db.execute(`INSERT INTO journal_projects (id, title, description, entriesCount, active, wordCount, targetWordCount, progress, createdDate, lastUpdated, columns, tags, isLocked) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [jsonDoc.id, jsonDoc.title, jsonDoc.description, jsonDoc.entriesCount, jsonDoc.active, jsonDoc.wordCount, jsonDoc.targetWordCount, jsonDoc.progress, jsonDoc.createdDate, jsonDoc.lastUpdated, jsonDoc.columns, jsonDoc.tags, jsonDoc.isLocked]);
        }
        await this.reloadJournalProjects();
    }
    async removeJournalProject(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM journal_projects WHERE id = $1', [id]);
        await this.reloadJournalProjects();
    }
    async getAllJournalProjects() {
        return this.journalProjectsSubject.getValue();
    }
    // ─── Journal Entries ───────────────────────────────────────────────────────
    async reloadJournalEntries() {
        const db = await this.getDb();
        try {
            await db.execute('ALTER TABLE journal_entries ADD COLUMN filePath TEXT').catch(() => { });
            await db.execute('ALTER TABLE journal_entries ADD COLUMN lastSynced TEXT').catch(() => { });
        }
        catch (e) { }
        const rows = await db.select('SELECT * FROM journal_entries');
        const parsed = rows.map((r) => this.parseRow(r, ['tags', 'linkedEntries']));
        this.journalEntriesSubject.next(parsed);
    }
    async upsertJournalEntry(entry) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM journal_entries WHERE id = $1', [entry.id]);
        const entryAny = entry;
        const jsonEntry = {
            ...entry,
            tags: this.toJson(entry.tags),
            linkedEntries: this.toJson(entry.linkedEntries),
            content: '', // Clear content
            filePath: entryAny.filePath,
            lastSynced: entryAny.lastSynced
        };
        if (exists.length > 0) {
            await db.execute(`
            UPDATE journal_entries SET 
                projectId=$1, title=$2, content=$3, preview=$4, type=$5, column=$6, tags=$7, 
                wordCount=$8, characterCount=$9, createdDate=$10, lastEdited=$11, hasAi=$12, 
                isAiEdited=$13, progress=$14, statusColor=$15, meta=$16, isLocked=$17, 
                linkedEntries=$18, isPinned=$19, isFavorite=$20, filePath=$21, lastSynced=$22
            WHERE id=$23`, [jsonEntry.projectId, jsonEntry.title, jsonEntry.content, jsonEntry.preview, jsonEntry.type, jsonEntry.column, jsonEntry.tags,
                jsonEntry.wordCount, jsonEntry.characterCount, jsonEntry.createdDate, jsonEntry.lastEdited, jsonEntry.hasAi,
                jsonEntry.isAiEdited, jsonEntry.progress, jsonEntry.statusColor, jsonEntry.meta, jsonEntry.isLocked,
                jsonEntry.linkedEntries, jsonEntry.isPinned, jsonEntry.isFavorite, jsonEntry.filePath, jsonEntry.lastSynced, jsonEntry.id]);
        }
        else {
            await db.execute(`
            INSERT INTO journal_entries (
                id, projectId, title, content, preview, type, column, tags, wordCount, characterCount, 
                createdDate, lastEdited, hasAi, isAiEdited, progress, statusColor, meta, isLocked, 
                linkedEntries, isPinned, isFavorite, filePath, lastSynced
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`, [jsonEntry.id, jsonEntry.projectId, jsonEntry.title, jsonEntry.content, jsonEntry.preview, jsonEntry.type, jsonEntry.column, jsonEntry.tags,
                jsonEntry.wordCount, jsonEntry.characterCount, jsonEntry.createdDate, jsonEntry.lastEdited, jsonEntry.hasAi,
                jsonEntry.isAiEdited, jsonEntry.progress, jsonEntry.statusColor, jsonEntry.meta, jsonEntry.isLocked,
                jsonEntry.linkedEntries, jsonEntry.isPinned, jsonEntry.isFavorite, jsonEntry.filePath, jsonEntry.lastSynced]);
        }
        await this.reloadJournalEntries();
    }
    async removeJournalEntry(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM journal_entries WHERE id = $1', [id]);
        await this.reloadJournalEntries();
    }
    async getAllJournalEntries() {
        return this.journalEntriesSubject.getValue();
    }
    // ─── Journal Columns ───────────────────────────────────────────────────────
    async reloadJournalColumns() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM journal_columns');
        this.journalColumnsSubject.next(rows);
    }
    async upsertJournalColumn(doc) {
        // Not implemented in DB service either
        // But assuming similar pattern.
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM journal_columns WHERE id = $1', [doc.id]);
        if (exists.length > 0) {
            await db.execute('UPDATE journal_columns SET name=$1, color=$2, "order"=$3 WHERE id=$4', [doc.name, doc.color, doc.order, doc.id]);
        }
        else {
            await db.execute('INSERT INTO journal_columns (id, name, color, "order") VALUES ($1, $2, $3, $4)', [doc.id, doc.name, doc.color, doc.order]);
        }
        await this.reloadJournalColumns();
    }
    async removeJournalColumn(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM journal_columns WHERE id = $1', [id]);
        await this.reloadJournalColumns();
    }
    async getAllJournalColumns() {
        return this.journalColumnsSubject.getValue();
    }
    // ─── Research Libraries ────────────────────────────────────────────────────
    async reloadResearchLibraries() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM research_libraries');
        this.researchLibrariesSubject.next(rows);
    }
    async upsertResearchLibrary(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM research_libraries WHERE id = $1', [doc.id]);
        if (exists.length > 0) {
            await db.execute('UPDATE research_libraries SET name=$1, description=$2, color=$3, createdDate=$4, lastModified=$5 WHERE id=$6', [doc.name, doc.description, doc.color, doc.createdDate, doc.lastModified, doc.id]);
        }
        else {
            await db.execute('INSERT INTO research_libraries (id, name, description, color, createdDate, lastModified) VALUES ($1, $2, $3, $4, $5, $6)', [doc.id, doc.name, doc.description, doc.color, doc.createdDate, doc.lastModified]);
        }
        await this.reloadResearchLibraries();
    }
    async getAllResearchLibraries() {
        return this.researchLibrariesSubject.getValue();
    }
    async removeResearchLibrary(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_libraries WHERE id = $1', [id]);
        await this.reloadResearchLibraries();
    }
    // ─── Research Sources ──────────────────────────────────────────────────────
    async reloadResearchSources() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM research_sources');
        const parsed = rows.map((r) => this.parseRow(r, ['tags']));
        this.researchSourcesSubject.next(parsed);
    }
    async upsertResearchSource(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM research_sources WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, tags: this.toJson(doc.tags) };
        if (exists.length > 0) {
            await db.execute(`UPDATE research_sources SET libraryId=$1, title=$2, sourceType=$3, url=$4, description=$5, author=$6, publishDate=$7, tags=$8, status=$9, notes=$10, createdDate=$11, lastAccessed=$12 WHERE id=$13`, [jsonDoc.libraryId, jsonDoc.title, jsonDoc.sourceType, jsonDoc.url, jsonDoc.description, jsonDoc.author, jsonDoc.publishDate, jsonDoc.tags, jsonDoc.status, jsonDoc.notes, jsonDoc.createdDate, jsonDoc.lastAccessed, jsonDoc.id]);
        }
        else {
            await db.execute(`INSERT INTO research_sources (id, libraryId, title, sourceType, url, description, author, publishDate, tags, status, notes, createdDate, lastAccessed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [jsonDoc.id, jsonDoc.libraryId, jsonDoc.title, jsonDoc.sourceType, jsonDoc.url, jsonDoc.description, jsonDoc.author, jsonDoc.publishDate, jsonDoc.tags, jsonDoc.status, jsonDoc.notes, jsonDoc.createdDate, jsonDoc.lastAccessed]);
        }
        await this.reloadResearchSources();
    }
    async getAllResearchSources() {
        return this.researchSourcesSubject.getValue();
    }
    async removeResearchSource(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_sources WHERE id = $1', [id]);
        await this.reloadResearchSources();
    }
    // ─── Research Summaries ────────────────────────────────────────────────────
    async reloadResearchSummaries() {
        const db = await this.getDb();
        const rows = await db.select('SELECT * FROM research_summaries');
        const parsed = rows.map((r) => this.parseRow(r, ['sourceIds', 'tags']));
        this.researchSummariesSubject.next(parsed);
    }
    async upsertResearchSummary(doc) {
        const db = await this.getDb();
        const exists = await db.select('SELECT id FROM research_summaries WHERE id = $1', [doc.id]);
        const jsonDoc = { ...doc, sourceIds: this.toJson(doc.sourceIds), tags: this.toJson(doc.tags) };
        if (exists.length > 0) {
            await db.execute('UPDATE research_summaries SET libraryId=$1, title=$2, content=$3, sourceIds=$4, tags=$5, createdDate=$6, lastModified=$7 WHERE id=$8', [jsonDoc.libraryId, jsonDoc.title, jsonDoc.content, jsonDoc.sourceIds, jsonDoc.tags, jsonDoc.createdDate, jsonDoc.lastModified, jsonDoc.id]);
        }
        else {
            await db.execute('INSERT INTO research_summaries (id, libraryId, title, content, sourceIds, tags, createdDate, lastModified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [jsonDoc.id, jsonDoc.libraryId, jsonDoc.title, jsonDoc.content, jsonDoc.sourceIds, jsonDoc.tags, jsonDoc.createdDate, jsonDoc.lastModified]);
        }
        await this.reloadResearchSummaries();
    }
    async getAllResearchSummaries() {
        return this.researchSummariesSubject.getValue();
    }
    async removeResearchSummary(id) {
        const db = await this.getDb();
        await db.execute('DELETE FROM research_summaries WHERE id = $1', [id]);
        await this.reloadResearchSummaries();
    }
    // ─── Export ────────────────────────────────────────────────────────────────
    async exportAllData() {
        const data = {
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
                }
                catch (e) {
                    console.warn(`[SqliteService] Failed to read note content for ${note.id}`, e);
                }
            }
        }
        data.data.notes = notes;
        data.data.planning_items = await this.getAllPlanningItems();
        data.data.activities = await this.getAllActivities();
        data.data.novels = await this.getAllNovels();
        data.data.bin_items = await this.getAllBinItems();
        data.data.snippets = await this.getAllSnippets();
        data.data.books = await this.getAllBooks();
        data.data.meetings = await this.getAllMeetings();
        data.data.articles = await this.getAllArticles();
        data.data.journal_projects = await this.getAllJournalProjects();
        data.data.journal_entries = await this.getAllJournalEntries();
        data.data.journal_columns = await this.getAllJournalColumns();
        data.data.research_libraries = await this.getAllResearchLibraries();
        data.data.research_sources = await this.getAllResearchSources();
        data.data.research_summaries = await this.getAllResearchSummaries();
        // Novel Content
        const db = await this.getDb();
        const contentRows = await db.select('SELECT * FROM novel_content');
        data.data.novel_content = contentRows;
        return data;
    }
};
SqliteService = __decorate([
    Injectable({
        providedIn: 'root',
    })
], SqliteService);
export { SqliteService };
