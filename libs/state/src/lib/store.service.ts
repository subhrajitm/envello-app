import { Injectable, signal, computed, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from './tokens';
import { Task, Note, PlanningItem, Activity, Book, Project, Bookmark, BookmarkFolder, Person, MediaItem, Goal, Milestone, UserList, ListItem, Recipe, Habit, JournalEntry, Reminder } from '@envello/domain';

@Injectable({
    providedIn: 'root'
})
export class StoreService {
    tasks = signal<Task[]>([]);
    notes = signal<Note[]>([]);
    planningItems = signal<PlanningItem[]>([]);
    activities = signal<Activity[]>([]);
    books = signal<Book[]>([]);
    /** Persisted folder definitions for daily notes; loaded from DB on init. */
    noteFolders = signal<{ id: string; name: string; icon: string }[]>([
        { id: 'personal', name: 'Personal', icon: 'folder' },
    ]);
    bookmarks = signal<Bookmark[]>([]);
    bookmarkFolders = signal<BookmarkFolder[]>([]);
    spaces = signal<Project[]>([]);
    people = signal<Person[]>([]);
    habits  = signal<Habit[]>([]);
    recipes = signal<Recipe[]>([]);
    lists = signal<UserList[]>([]);
    goals = signal<Goal[]>([]);
    media = signal<MediaItem[]>([]);
    journalEntries = signal<JournalEntry[]>([]);
    reminders = signal<Reminder[]>([]);

    // Memory caps — prevents unbounded growth for heavy collections
    private static readonly LIMITS = {
        tasks:     2000,
        notes:     500,
        bookmarks: 1000,
        people:    500,
    };

    private db = inject(DataService);
    private fs = inject(FILE_SYSTEM);

    private readonly isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    private markdownWorker: Worker | null = null;
    private workerCallbacks = new Map<string, (md: string) => void>();
    private saveTimeouts        = new Map<string, ReturnType<typeof setTimeout>>();
    private pendingSaveContent  = new Map<string, string>(); // content awaiting debounced file write

    /** In-memory content cache — survives loadFromDb() which strips content from the signal. */
    private contentCache = new Map<string, string>();

    private _syncDebounceTimer?: ReturnType<typeof setTimeout>;
    private _loadInProgress = false;
    /** Incremented on every profile switch; lets an in-flight load detect it has gone stale. */
    private _loadGeneration = 0;
    /** True when a load was requested while one was already in-flight. */
    private _pendingLoad = false;
    /** Notes with in-flight DB upserts — loadFromDb() keeps in-memory version for these. */
    private _pendingNoteUpserts = new Map<string, Note>();
    /** Task IDs whose soft-delete upsert hasn't landed yet — loadFromDb() excludes these. */
    private _pendingTaskDeletes = new Set<string>();
    /** Tasks added but whose upsert hasn't landed yet — loadFromDb() keeps them in-memory. */
    private _pendingTaskAdds = new Map<string, Task>();

    constructor() {
        this.loadFromDb();
        this.initMarkdownWorker();
        // Re-load after Supabase sync (web) or after SQLite DB becomes ready (desktop).
        // Debounce so rapid-fire realtime events collapse into a single reload.
        window.addEventListener('envello:sync-complete', () => {
            clearTimeout(this._syncDebounceTimer);
            this._syncDebounceTimer = setTimeout(() => this.loadFromDb(), 300);
        });
        window.addEventListener('envello:db-ready', () => this.loadFromDb());
        window.addEventListener('envello:profile-switched', () => {
            // Flush in-progress note writes for the old profile before switching.
            this.flushPendingNoteSaves().catch(() => {});
            // Invalidate any in-flight load — its results belong to the old profile.
            this._loadGeneration++;
            this.contentCache.clear();
            this._pendingNoteUpserts.clear();
            // Show empty state immediately so the user sees the switch happened at once.
            this.tasks.set([]);
            this.notes.set([]);
            this.planningItems.set([]);
            this.activities.set([]);
            this.books.set([]);
            this.bookmarks.set([]);
            this.bookmarkFolders.set([]);
            this.spaces.set([]);
            this.people.set([]);
            this.habits.set([]);
            this.recipes.set([]);
            this.lists.set([]);
            this.goals.set([]);
            this.media.set([]);
            this.journalEntries.set([]);
            this.reminders.set([]);
        });
    }

    private initMarkdownWorker() {
        if (typeof Worker === 'undefined') return;
        try {
            // Worker is pre-created in apps/web/src/main.ts (inline new Worker(new URL(...)) so
            // esbuild/Vite detect and compile it in both dev and production).
            const worker = (globalThis as any).__MARKDOWN_WORKER__ as Worker | undefined;
            if (!worker) return;
            this.markdownWorker = worker;
            this.markdownWorker.onmessage = ({ data }: MessageEvent<{ id: string; markdown?: string; error?: string }>) => {
                const cb = this.workerCallbacks.get(data.id);
                if (cb) {
                    this.workerCallbacks.delete(data.id);
                    cb(data.markdown ?? '');
                }
            };
        } catch (e) {
            console.warn('[StoreService] Markdown worker unavailable, will use inline fallback', e);
        }
    }

    private async htmlToMarkdown(html: string): Promise<string> {
        if (this.markdownWorker) {
            return new Promise<string>((resolve) => {
                const id = crypto.randomUUID();
                this.workerCallbacks.set(id, resolve);
                this.markdownWorker!.postMessage({ id, html });
            });
        }
        // Inline fallback (non-Tauri desktop or worker unavailable)
        try {
            const TurndownService = (await import('turndown')).default;
            const svc = new TurndownService();
            svc.addRule('strikethrough', {
                filter: ['del', 's', 'strike'] as any,
                replacement: (content: string) => '~' + content + '~'
            });
            return svc.turndown(html);
        } catch {
            return html;
        }
    }

    private async loadFromDb(retries = 1): Promise<void> {
        if (this._loadInProgress) {
            // Another load is running. Queue a re-run so the latest profile wins.
            this._pendingLoad = true;
            return;
        }
        this._loadInProgress = true;
        this._pendingLoad = false;
        const generation = this._loadGeneration;
        try {
            const L = StoreService.LIMITS;
            const [tasks, notes, planningItems, activities, books, folders, bookmarks, bookmarkFolders, spaces, people, habits, recipes, lists, goals, media, journalEntries, reminders] = await Promise.all([
                this.db.getAll<Task>('tasks',                                     { limit: L.tasks }),
                this.db.getAll<Note>('notes',                                     { limit: L.notes }),
                this.db.getAll<PlanningItem>('planning_items'),
                this.db.getAll<Activity>('activities',                            { limit: 50 }),
                this.db.getAll<Book>('books'),
                this.db.getAll<{ id: string; name: string; icon: string }>('note_folders'),
                this.db.getAll<Bookmark>('bookmarks',                             { limit: L.bookmarks }),
                this.db.getAll<BookmarkFolder>('bookmark_folders'),
                this.db.getAll<Project>('projects'),
                this.db.getAll<Person>('people',                                  { limit: L.people }),
                this.db.getAll<Habit>('habits'),
                this.db.getAll<Recipe>('recipes'),
                this.db.getAll<UserList>('lists'),
                this.db.getAll<Goal>('goals'),
                this.db.getAll<MediaItem>('media'),
                this.db.getAll<JournalEntry>('journal_entries'),
                this.db.getAll<Reminder>('reminders'),
            ]);

            // A profile switch happened while we were reading — discard stale results.
            // The finally block will schedule a fresh load for the new profile.
            if (generation !== this._loadGeneration) return;

            // Tasks — cap, exclude soft-deleted and in-flight deletes
            const activeTasks = (tasks || [])
                .filter(t => !t.deleted_at && !this._pendingTaskDeletes.has(t.id))
                .slice(0, StoreService.LIMITS.tasks);
            // Preserve tasks added but not yet in DB (same pattern as pendingNotes)
            const dbTaskIds = new Set(activeTasks.map(t => t.id));
            const pendingAdds = [...this._pendingTaskAdds.values()].filter(t => !dbTaskIds.has(t.id));
            this.tasks.set([...activeTasks, ...pendingAdds]);

            // Notes — strip content from metadata load; content is lazy-loaded via loadNoteContent().
            // Preserves any in-memory notes not yet in DB (just-created, not yet persisted).
            // Also preserves in-flight upserts so sync events don't snap back optimistic updates.
            const activeNotes = (notes || [])
                .filter(n => !n.deleted_at)
                .slice(0, StoreService.LIMITS.notes)
                .map(n => {
                    const pending = this._pendingNoteUpserts.get(n.id);
                    // Pending write hasn't landed in DB yet — use the in-memory version.
                    if (pending) return { ...n, ...pending, content: undefined } as Note;
                    // Note is actively being edited (unsaved content in debounce queue) —
                    // keep the current in-memory metadata so sync doesn't clobber live edits.
                    if (this.saveTimeouts.has(n.id) || this.pendingSaveContent.has(n.id)) {
                        const live = this.notes().find(existing => existing.id === n.id);
                        if (live) return { ...live, content: undefined } as Note;
                    }
                    return { ...n, content: undefined } as Note;
                });
            const dbNoteIds = new Set(activeNotes.map(n => n.id));
            const pendingNotes = this.notes().filter(n => !dbNoteIds.has(n.id));
            this.notes.set([...pendingNotes, ...activeNotes]);

            this.planningItems.set(planningItems || []);
            this.activities.set((activities || []).slice(0, 50));
            this.books.set((books || []).filter(b => !b.deleted_at));

            // Bookmarks — cap, exclude soft-deleted
            this.bookmarks.set(
                (bookmarks || []).filter(b => !b.deleted_at).slice(0, StoreService.LIMITS.bookmarks)
            );
            this.bookmarkFolders.set(bookmarkFolders || []);
            this.spaces.set(spaces || []);

            // People — cap, exclude soft-deleted
            this.people.set(
                (people || []).filter(p => !p.deleted_at).slice(0, StoreService.LIMITS.people)
            );

            // Habits — exclude soft-deleted
            this.habits.set((habits || []).filter(h => !h.deleted_at));

            // Recipes — exclude soft-deleted
            this.recipes.set((recipes || []).filter(r => !r.deleted_at));

            // Lists — exclude soft-deleted
            this.lists.set((lists || []).filter(l => !l.deleted_at));

            // Goals — exclude soft-deleted
            this.goals.set((goals || []).filter(g => !g.deleted_at));

            // Media — exclude soft-deleted
            this.media.set((media || []).filter(m => !m.deleted_at));

            // Journal entries — exclude soft-deleted
            this.journalEntries.set((journalEntries || []).filter(e => !e.deleted_at));

            // Reminders — exclude soft-deleted
            this.reminders.set((reminders || []).filter(r => !r.deleted_at));

            if (folders?.length) {
                this.noteFolders.set(folders);
            } else {
                const defaultFolders: { id: string; name: string; icon: string }[] = [
                    { id: 'personal', name: 'Personal', icon: 'folder' },
                ];
                this.noteFolders.set(defaultFolders);
                for (const f of defaultFolders) {
                    this.db.upsert('note_folders', f).catch((e) =>
                        console.error('[StoreService] persist note_folders failed', e)
                    );
                }
            }

            // Notify listeners that the store is fully populated for the active profile.
            window.dispatchEvent(new CustomEvent('envello:store-loaded'));
        } catch (e) {
            console.error('[StoreService] loadFromDb failed', e);
            if (retries > 0) {
                // Clear _pendingLoad so the finally block doesn't schedule a second
                // concurrent reload on top of the retry we're about to schedule.
                this._pendingLoad = false;
                setTimeout(() => this.loadFromDb(0), 500);
                return;
            }
            this.tasks.set([]);
            this.notes.set([]);
            this.planningItems.set([]);
            this.activities.set([]);
            this.books.set([]);
            this.noteFolders.set([{ id: 'personal', name: 'Personal', icon: 'folder' }]);
            this.bookmarks.set([]);
            this.bookmarkFolders.set([]);
            this.spaces.set([]);
            this.people.set([]);
            this.habits.set([]);
            this.recipes.set([]);
            this.lists.set([]);
            this.goals.set([]);
            this.media.set([]);
            this.journalEntries.set([]);
            this.reminders.set([]);
        } finally {
            this._loadInProgress = false;
            // If a profile switched while we were loading, run again immediately for the new profile.
            if (this._pendingLoad || generation !== this._loadGeneration) {
                this._pendingLoad = false;
                setTimeout(() => this.loadFromDb(), 0);
            }
        }
    }

    async loadNoteContent(id: string): Promise<string> {
        const note = this.notes().find(n => n.id === id);
        if (!note) return '';

        // 1. In-memory cache hit — zero I/O, survives loadFromDb() stripping.
        const cached = this.contentCache.get(id);
        if (cached && cached.length > 0) {
            this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: cached } : n));
            return cached;
        }

        // 2. Signal already has content (e.g. freshly created note not yet stripped).
        if (note.content && note.content.length > 5) {
            this.contentCache.set(id, note.content);
            return note.content;
        }

        // 3. Immediate HTML backup written synchronously in updateNote — survives reloads
        //    that happen before the async markdown conversion + file write completes.
        try {
            const immediateHtml = localStorage.getItem(`env:note:html:${id}`);
            if (immediateHtml) {
                this.contentCache.set(id, immediateHtml);
                this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: immediateHtml } : n));
                return immediateHtml;
            }
        } catch { /* ignore — storage may be unavailable */ }

        // 4. Read directly from the DB — content IS stored in the notes table by
        //    updateNote → db.upsert, but loadFromDb strips it for performance.
        //    This is the most reliable path on web (avoids async markdown roundtrip)
        //    and also covers desktop when the .md file hasn't been written yet.
        try {
            const allNotes = await this.db.getAll<Note>('notes');
            const dbNote = allNotes.find(n => n.id === id);
            if (dbNote?.content && dbNote.content.length > 5) {
                this.contentCache.set(id, dbNote.content);
                this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: dbNote.content! } : n));
                return dbNote.content;
            }
        } catch (e) {
            console.error('[StoreService] loadNoteContent DB direct read failed for', id, e);
        }

        // 5. Flush any debounced file-write before reading so the file exists.
        if (this.saveTimeouts.has(id)) {
            const pending = this.pendingSaveContent.get(id) ?? '';
            clearTimeout(this.saveTimeouts.get(id));
            this.saveTimeouts.delete(id);
            this.pendingSaveContent.delete(id);
            if (pending) {
                this.contentCache.set(id, pending);
                this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: pending } : n));
                await this.saveNoteContentToFile(id, pending);
                return pending;
            }
        }

        // 6. Read from file system (desktop: .md file → parse; web: raw HTML stored directly).
        try {
            const stored = await this.fs.readNote(id);
            if (stored) {
                let html: string;
                const isHtml = stored.trimStart().startsWith('<') || !this.isTauri;
                if (isHtml) {
                    // Web stores raw HTML; also gracefully handles desktop files migrated from HTML.
                    html = stored;
                } else {
                    // Desktop markdown file.
                    const { marked } = await import('marked');
                    html = await marked.parse(stored) as string;
                }
                this.contentCache.set(id, html);
                this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: html } : n));
                return html;
            }
        } catch (e) {
            console.error('[StoreService] loadNoteContent file read failed for', id, e);
        }

        // 7. Last resort: reconstruct from preview stored in SQLite.
        //    preview is plain text — wrap in a paragraph so the editor renders it.
        //    Also re-saves to file so future loads hit step 4.
        if (note.preview && note.preview.length > 0) {
            const html = `<p>${note.preview}</p>`;
            this.contentCache.set(id, html);
            this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: html } : n));
            this.saveNoteContentToFile(id, html).catch(() => {});
            return html;
        }

        return '';
    }

    addTask(task: Task) {
        this.tasks.update(tasks => [...tasks, task]);
        this.addActivity('Task created: ' + task.title, 'system');
        this._pendingTaskAdds.set(task.id, task);
        this.db.upsert('tasks', task)
            .catch(e => console.error('[StoreService] persist task failed', e))
            .finally(() => this._pendingTaskAdds.delete(task.id));
    }

    updateTask(id: string, updates: Partial<Task>) {
        const updated = this.tasks().map(t => t.id === id ? { ...t, ...updates } : t);
        const task = updated.find(t => t.id === id);
        this.tasks.set(updated);
        this.addActivity('Task updated', 'system');
        if (task) this.db.upsert('tasks', task).catch(e => console.error('[StoreService] persist task failed', e));
    }

    deleteTask(id: string) {
        const task = this.tasks().find(t => t.id === id);
        if (!task) return;
        this.tasks.update(list => list.filter(t => t.id !== id));
        this.addActivity('Task deleted', 'system');
        this._pendingTaskDeletes.add(id);
        this.db.upsert('tasks', { ...task, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete task failed', e))
            .finally(() => this._pendingTaskDeletes.delete(id));
    }

    async addNote(note: Note) {
        if (note.content) this.contentCache.set(note.id, note.content);
        this.notes.update(notes => [note, ...notes]);
        this.addActivity("Entry added to '" + note.title + "'", 'entry');
        // Persist to DB immediately so a concurrent loadFromDb() won't lose this note.
        this.db.upsert('notes', note).catch(e => console.error('[StoreService] persist note failed', e));
        await this.saveNoteContentToFile(note.id, note.content || '');
    }

    updateNote(id: string, updates: Partial<Note>): Promise<void> {
        // ISO 8601 — sortable, parseable, timezone-safe.
        // Locale strings like "2:30 PM" cause new Date(...).getTime() = NaN
        // which makes Array.sort() unstable in "modified" sort mode.
        const isoNow = new Date().toISOString();

        this.notes.update(notes =>
            notes.map(note => note.id === id ? {
                ...note,
                ...updates,
                lastEdited: updates.lastEdited || isoNow
            } : note)
        );

        const note = this.notes().find(n => n.id === id);
        if (!note) return Promise.resolve();

        if (updates.content !== undefined) {
            const html = updates.content || '';
            this.contentCache.set(id, html);

            // Immediate synchronous backup so content survives a reload that happens
            // before the async markdown conversion + debounced file write completes.
            // This key is cleaned up once the proper write finishes (see saveNoteContentToFile).
            try { localStorage.setItem(`env:note:html:${id}`, html); } catch { /* quota */ }

            const existing = this.saveTimeouts.get(id);
            if (existing) clearTimeout(existing);
            this.pendingSaveContent.set(id, html);
            this.saveTimeouts.set(id, setTimeout(() => {
                this.saveTimeouts.delete(id);
                const content = this.pendingSaveContent.get(id) ?? '';
                this.pendingSaveContent.delete(id);
                this.saveNoteContentToFile(id, content);
            }, 1000));
        }

        // Return the DB upsert Promise so callers can await actual persistence
        // and show accurate save indicators.
        this._pendingNoteUpserts.set(id, note);
        return this.db.upsert('notes', note)
            .then(() => { this._pendingNoteUpserts.delete(id); })
            .catch(e => {
                this._pendingNoteUpserts.delete(id);
                console.error('[StoreService] persist note failed', e);
            });
    }

    /** Flush all debounced note file-writes immediately. Call before app close. */
    async flushPendingNoteSaves(): Promise<void> {
        const pending = [...this.saveTimeouts.keys()];
        for (const id of pending) {
            clearTimeout(this.saveTimeouts.get(id));
            this.saveTimeouts.delete(id);
            const content = this.pendingSaveContent.get(id) ?? '';
            this.pendingSaveContent.delete(id);
            if (content) await this.saveNoteContentToFile(id, content);
        }
    }

    private async saveNoteContentToFile(id: string, html: string) {
        try {
            // Web: store raw HTML — eliminates the lossy HTML→MD→HTML roundtrip that
            // strips tiptap-specific elements (highlights, youtube embeds, text-align styles).
            // Desktop: convert to human-readable markdown for the .md file.
            const fileContent = this.isTauri ? await this.htmlToMarkdown(html) : html;
            const filePath = await this.fs.saveNote(id, fileContent);

            // Content written — the immediate HTML backup is no longer needed.
            try { localStorage.removeItem(`env:note:html:${id}`); } catch { /* ignore */ }

            const note = this.notes().find(n => n.id === id);
            if (note && note.filePath !== filePath) {
                // Update DB only — do NOT mutate the notes() signal here.
                // A signal write would trigger the content-loading effect in the editor
                // component, which compares editor HTML to note.content. At this point
                // note.content may be stale (captured at the last debounce cycle) while
                // the editor has newer in-flight content, causing typing to get reverted.
                this.db.upsert('notes', { ...note, filePath }).catch(e =>
                    console.error('[StoreService] persist note filePath failed', e)
                );
            }
        } catch (e) {
            console.error('[StoreService] saveNoteContentToFile failed for', id, e);
        }
    }

    deleteNote(id: string) {
        const note = this.notes().find(n => n.id === id);
        if (!note) return;
        // Cancel any in-flight debounced file write — the note no longer exists.
        const pending = this.saveTimeouts.get(id);
        if (pending) {
            clearTimeout(pending);
            this.saveTimeouts.delete(id);
            this.pendingSaveContent.delete(id);
        }
        this.contentCache.delete(id);
        try { localStorage.removeItem(`env:note:html:${id}`); } catch { /* ignore */ }
        this.notes.update(list => list.filter(n => n.id !== id));
        this.addActivity('Note deleted', 'system');
        this.db.upsert('notes', { ...note, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete note failed', e));
    }

    addPlanningItem(item: PlanningItem) {
        this.planningItems.update(items => [...items, item]);
        this.db.upsert('planning_items', item).catch(e => console.error('[StoreService] persist planning item failed', e));
    }

    addBook(book: Book) {
        this.books.update(books => [...books, book]);
        this.addActivity('Project started: ' + book.title, 'system');
        this.db.upsert('books', book).catch(e => console.error('[StoreService] persist book failed', e));
    }

    addSpace(space: Project) {
        this.spaces.update(list => [...list, space]);
        this.addActivity('Space created: ' + space.title, 'system');
        this.db.upsert('projects', space).catch(e => console.error('[StoreService] persist space failed', e));
    }

    deleteSpace(id: string) {
        this.spaces.update(list => list.filter(p => p.id !== id));
        this.addActivity('Space deleted', 'system');
        this.db.remove('projects', id).catch(e => console.error('[StoreService] remove space failed', e));
    }

    updateSpace(id: string, updates: Partial<Project>) {
        this.spaces.update(list =>
            list.map(p => p.id === id ? { ...p, ...updates } : p)
        );
        const space = this.spaces().find(p => p.id === id);
        if (space) this.db.upsert('projects', space).catch(e => console.error('[StoreService] persist space failed', e));
    }

    deleteBook(id: string) {
        const book = this.books().find(b => b.id === id);
        if (!book) return;
        this.books.update(list => list.filter(b => b.id !== id));
        this.addActivity('Book deleted', 'system');
        this.db.upsert('books', { ...book, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete book failed', e));
    }

    addBookmark(bookmark: Bookmark) {
        this.bookmarks.update(list => [bookmark, ...list]);
        this.addActivity('Bookmark saved: ' + bookmark.title, 'system');
        this.db.upsert('bookmarks', bookmark).catch(e => console.error('[StoreService] persist bookmark failed', e));
    }

    updateBookmark(id: string, updates: Partial<Bookmark>) {
        this.bookmarks.update(list => list.map(b => b.id === id ? { ...b, ...updates } : b));
        const bookmark = this.bookmarks().find(b => b.id === id);
        if (bookmark) this.db.upsert('bookmarks', bookmark).catch(e => console.error('[StoreService] persist bookmark failed', e));
    }

    deleteBookmark(id: string) {
        const bookmark = this.bookmarks().find(b => b.id === id);
        if (!bookmark) return;
        this.bookmarks.update(list => list.filter(b => b.id !== id));
        this.addActivity('Bookmark removed', 'system');
        this.db.upsert('bookmarks', { ...bookmark, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete bookmark failed', e));
    }

    addBookmarkFolder(folder: BookmarkFolder) {
        this.bookmarkFolders.update(list => [...list, folder]);
        this.db.upsert('bookmark_folders', folder).catch(e => console.error('[StoreService] persist bookmark_folder failed', e));
    }

    updateBookmarkFolder(id: string, updates: Partial<BookmarkFolder>) {
        this.bookmarkFolders.update(list => list.map(f => f.id === id ? { ...f, ...updates } : f));
        const folder = this.bookmarkFolders().find(f => f.id === id);
        if (folder) this.db.upsert('bookmark_folders', folder).catch(e => console.error('[StoreService] persist bookmark_folder update failed', e));
    }

    batchUpdateBookmarks(updates: Array<{ id: string; data: Partial<Bookmark> }>) {
        if (!updates.length) return;
        const patchMap = new Map(updates.map(u => [u.id, u.data]));
        this.bookmarks.update(list =>
            list.map(b => { const p = patchMap.get(b.id); return p ? { ...b, ...p } : b; })
        );
        const updated = this.bookmarks().filter(b => patchMap.has(b.id));
        Promise.all(updated.map(b => this.db.upsert('bookmarks', b)))
            .catch(e => console.error('[StoreService] batchUpdateBookmarks failed', e));
    }

    deleteBookmarkFolder(id: string) {
        const affectedIds = this.bookmarks().filter(b => b.folderId === id).map(b => b.id);
        this.bookmarkFolders.update(list => list.filter(f => f.id !== id));
        this.bookmarks.update(list => list.map(b => b.folderId === id ? { ...b, folderId: undefined } : b));
        this.db.remove('bookmark_folders', id).catch(e => console.error('[StoreService] remove bookmark_folder failed', e));
        // Persist the cleared folderId so bookmarks don't reload with a stale reference
        if (affectedIds.length > 0) {
            const updated = this.bookmarks().filter(b => affectedIds.includes(b.id));
            Promise.all(updated.map(b => this.db.upsert('bookmarks', b)))
                .catch(e => console.error('[StoreService] persist folder unlink failed', e));
        }
    }

    addActivity(text: string, type: Activity['type'] = 'entry') {
        const newActivity: Activity = {
            id: crypto.randomUUID(),
            text,
            time: 'Just now',
            type
        };
        this.activities.update(activities => [newActivity, ...activities.slice(0, 49)]);
        this.db.upsert('activities', newActivity).catch(e => console.error('[StoreService] persist activity failed', e));
    }

    addNoteFolder(folder: { id: string; name: string; icon: string }) {
        this.noteFolders.update(list => [...list, folder]);
        this.db.upsert('note_folders', folder).catch(e =>
            console.error('[StoreService] persist note_folders failed', e)
        );
    }

    removeNoteFolder(id: string) {
        this.noteFolders.update(list => list.filter(f => f.id !== id));
        this.db.remove('note_folders', id).catch(e =>
            console.error('[StoreService] remove note_folder failed', e)
        );
    }

    updateNoteFolder(id: string, updates: Partial<{ name: string; icon: string }>) {
        this.noteFolders.update(list =>
            list.map(f => f.id === id ? { ...f, ...updates } : f)
        );
        const folder = this.noteFolders().find(f => f.id === id);
        if (folder) {
            this.db.upsert('note_folders', folder).catch(e =>
                console.error('[StoreService] persist note_folders failed', e)
            );
        }
    }

    // ─── People CRUD ─────────────────────────────────────────────────────────

    addPerson(person: Person) {
        this.people.update(list => [...list, person]);
        this.addActivity('Person added: ' + person.name, 'system');
        this.db.upsert('people', person).catch(e => console.error('[StoreService] persist person failed', e));
    }

    updatePerson(id: string, updates: Partial<Person>) {
        this.people.update(list => list.map(p => p.id === id ? { ...p, ...updates } : p));
        const person = this.people().find(p => p.id === id);
        if (person) this.db.upsert('people', person).catch(e => console.error('[StoreService] persist person failed', e));
    }

    deletePerson(id: string) {
        const person = this.people().find(p => p.id === id);
        if (!person) return;
        this.people.update(list => list.filter(p => p.id !== id));
        this.addActivity('Person removed', 'system');
        this.db.upsert('people', { ...person, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete person failed', e));
    }

    // ─── Media CRUD ──────────────────────────────────────────────────────────

    addMedia(item: MediaItem) {
        this.media.update(list => [item, ...list]);
        this.db.upsert('media', item).catch(e => console.error('[StoreService] persist media failed', e));
    }

    updateMedia(id: string, updates: Partial<MediaItem>) {
        this.media.update(list => list.map(m => m.id === id ? { ...m, ...updates } : m));
        const item = this.media().find(m => m.id === id);
        if (item) this.db.upsert('media', item).catch(e => console.error('[StoreService] update media failed', e));
    }

    deleteMedia(id: string) {
        const item = this.media().find(m => m.id === id);
        if (!item) return;
        this.media.update(list => list.filter(m => m.id !== id));
        this.db.upsert('media', { ...item, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete media failed', e));
    }

    // ─── Goals CRUD ──────────────────────────────────────────────────────────

    addGoal(goal: Goal) {
        this.goals.update(list => [goal, ...list]);
        this.db.upsert('goals', goal).catch(e => console.error('[StoreService] persist goal failed', e));
    }

    updateGoal(id: string, updates: Partial<Goal>) {
        const updated = { updatedAt: new Date().toISOString(), ...updates };
        this.goals.update(list => list.map(g => g.id === id ? { ...g, ...updated } : g));
        const goal = this.goals().find(g => g.id === id);
        if (goal) this.db.upsert('goals', goal).catch(e => console.error('[StoreService] update goal failed', e));
    }

    updateMilestone(goalId: string, milestoneId: string, updates: Partial<Milestone>) {
        this.goals.update(list => list.map(g => {
            if (g.id !== goalId) return g;
            const milestones = (g.milestones ?? []).map(m => m.id === milestoneId ? { ...m, ...updates } : m);
            const progress = g.progressMode === 'milestones' && milestones.length
                ? Math.round(milestones.filter(m => m.completedAt).length / milestones.length * 100)
                : g.progress;
            return { ...g, milestones, progress, updatedAt: new Date().toISOString() };
        }));
        const goal = this.goals().find(g => g.id === goalId);
        if (goal) this.db.upsert('goals', goal).catch(e => console.error('[StoreService] update milestone failed', e));
    }

    deleteGoal(id: string) {
        const goal = this.goals().find(g => g.id === id);
        if (!goal) return;
        this.goals.update(list => list.filter(g => g.id !== id));
        this.db.upsert('goals', { ...goal, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete goal failed', e));
    }

    // ─── Habits CRUD ─────────────────────────────────────────────────────────

    private persistHabit(id: string) {
        const h = this.habits().find(h => h.id === id);
        if (h) this.db.upsert('habits', h).catch(e => console.error('[StoreService] persist habit failed', e));
    }

    addHabit(habit: Habit) {
        this.habits.update(list => [habit, ...list]);
        this.db.upsert('habits', habit).catch(e => console.error('[StoreService] add habit failed', e));
    }

    updateHabit(id: string, updates: Partial<Habit>) {
        this.habits.update(list => list.map(h => h.id === id ? { ...h, ...updates } : h));
        this.persistHabit(id);
    }

    deleteHabit(id: string) {
        const habit = this.habits().find(h => h.id === id);
        if (!habit) return;
        this.habits.update(list => list.filter(h => h.id !== id));
        this.db.upsert('habits', { ...habit, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete habit failed', e));
    }

    checkInHabit(id: string) {
        const today = new Date().toISOString().split('T')[0];
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const cutoff = oneYearAgo.toISOString().split('T')[0];

        this.habits.update(list => list.map(h => {
            if (h.id !== id) return h;
            const isDone = h.logs.some(l => l.date === today);
            const logs = isDone
                ? h.logs.filter(l => l.date !== today)
                : [...h.logs, { date: today }].filter(l => l.date >= cutoff);
            return { ...h, logs };
        }));
        this.persistHabit(id);
    }

    // ─── Recipes CRUD ────────────────────────────────────────────────────────

    addRecipe(recipe: Recipe) {
        this.recipes.update(list => [recipe, ...list]);
        this.db.upsert('recipes', recipe).catch(e => console.error('[StoreService] persist recipe failed', e));
    }

    updateRecipe(id: string, updates: Partial<Recipe>) {
        this.recipes.update(list => list.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
        const recipe = this.recipes().find(r => r.id === id);
        if (recipe) this.db.upsert('recipes', recipe).catch(e => console.error('[StoreService] update recipe failed', e));
    }

    deleteRecipe(id: string) {
        const recipe = this.recipes().find(r => r.id === id);
        if (!recipe) return;
        this.recipes.update(list => list.filter(r => r.id !== id));
        this.db.upsert('recipes', { ...recipe, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete recipe failed', e));
    }

    // ─── Lists CRUD ──────────────────────────────────────────────────────────

    private persistList(id: string) {
        const l = this.lists().find(l => l.id === id);
        if (l) this.db.upsert('lists', l).catch(e => console.error('[StoreService] persist list failed', e));
    }

    addList(list: UserList) {
        this.lists.update(ls => [list, ...ls]);
        this.db.upsert('lists', list).catch(e => console.error('[StoreService] persist list failed', e));
    }

    updateList(id: string, updates: Partial<UserList>) {
        this.lists.update(ls => ls.map(l => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l));
        this.persistList(id);
    }

    deleteList(id: string) {
        const list = this.lists().find(l => l.id === id);
        if (!list) return;
        this.lists.update(ls => ls.filter(l => l.id !== id));
        this.db.upsert('lists', { ...list, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete list failed', e));
    }

    addListItem(listId: string, item: ListItem) {
        this.lists.update(ls => ls.map(l => l.id === listId
            ? { ...l, items: [...l.items, item], updatedAt: new Date().toISOString() }
            : l));
        this.persistList(listId);
    }

    toggleListItem(listId: string, itemId: string) {
        this.lists.update(ls => ls.map(l => l.id !== listId ? l : {
            ...l,
            items: l.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i),
            updatedAt: new Date().toISOString(),
        }));
        this.persistList(listId);
    }

    removeListItem(listId: string, itemId: string) {
        this.lists.update(ls => ls.map(l => l.id !== listId ? l : {
            ...l,
            items: l.items.filter(i => i.id !== itemId),
            updatedAt: new Date().toISOString(),
        }));
        this.persistList(listId);
    }

    clearCheckedItems(listId: string) {
        this.lists.update(ls => ls.map(l => l.id !== listId ? l : {
            ...l,
            items: l.items.filter(i => !i.checked),
            updatedAt: new Date().toISOString(),
        }));
        this.persistList(listId);
    }

    resetListItems(listId: string) {
        this.lists.update(ls => ls.map(l => l.id !== listId ? l : {
            ...l,
            items: l.items.map(i => ({ ...i, checked: false })),
            lastResetAt: new Date().toISOString(),
            updatedAt:   new Date().toISOString(),
        }));
        this.persistList(listId);
    }

    // ─── Journal CRUD ────────────────────────────────────────────────────────

    upsertJournalEntry(entry: JournalEntry) {
        const exists = this.journalEntries().some(e => e.id === entry.id);
        if (exists) {
            this.journalEntries.update(list => list.map(e => e.id === entry.id ? entry : e));
        } else {
            this.journalEntries.update(list => [entry, ...list]);
        }
        this.db.upsert('journal_entries', entry).catch(e => console.error('[StoreService] persist journal_entry failed', e));
    }

    updateJournalEntry(id: string, updates: Partial<JournalEntry>) {
        const updated = { ...updates, updatedAt: new Date().toISOString() };
        this.journalEntries.update(list => list.map(e => e.id === id ? { ...e, ...updated } : e));
        const entry = this.journalEntries().find(e => e.id === id);
        if (entry) this.db.upsert('journal_entries', entry).catch(e => console.error('[StoreService] update journal_entry failed', e));
    }

    deleteJournalEntry(id: string) {
        const entry = this.journalEntries().find(e => e.id === id);
        if (!entry) return;
        this.journalEntries.update(list => list.filter(e => e.id !== id));
        this.db.upsert('journal_entries', { ...entry, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete journal_entry failed', e));
    }

    // ─── Reminder CRUD ───────────────────────────────────────────────────────

    addReminder(reminder: Reminder) {
        this.reminders.update(list => [reminder, ...list]);
        this.db.upsert('reminders', reminder).catch(e => console.error('[StoreService] persist reminder failed', e));
    }

    updateReminder(id: string, updates: Partial<Reminder>) {
        const updated = { ...updates, updatedAt: new Date().toISOString() };
        this.reminders.update(list => list.map(r => r.id === id ? { ...r, ...updated } : r));
        const reminder = this.reminders().find(r => r.id === id);
        if (reminder) this.db.upsert('reminders', reminder).catch(e => console.error('[StoreService] update reminder failed', e));
    }

    deleteReminder(id: string) {
        const reminder = this.reminders().find(r => r.id === id);
        if (!reminder) return;
        this.reminders.update(list => list.filter(r => r.id !== id));
        this.db.upsert('reminders', { ...reminder, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete reminder failed', e));
    }
}
