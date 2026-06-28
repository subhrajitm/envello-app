import { Injectable, signal, computed, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from './tokens';
import { Task, Note, PlanningItem, Activity, Book, Project, Bookmark, BookmarkFolder, Person } from '@envello/domain';

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

    // Memory caps — prevents unbounded growth for heavy collections
    private static readonly LIMITS = {
        tasks:     2000,
        notes:     500,
        bookmarks: 1000,
        people:    500,
    };

    private db = inject(DataService);
    private fs = inject(FILE_SYSTEM);

    private markdownWorker: Worker | null = null;
    private workerCallbacks = new Map<string, (md: string) => void>();
    private saveTimeouts        = new Map<string, ReturnType<typeof setTimeout>>();
    private pendingSaveContent  = new Map<string, string>(); // content awaiting debounced file write

    /** In-memory content cache — survives loadFromDb() which strips content from the signal. */
    private contentCache = new Map<string, string>();

    private _syncDebounceTimer?: ReturnType<typeof setTimeout>;
    private _loadInProgress = false;

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
        if (this._loadInProgress) return;
        this._loadInProgress = true;
        try {
            const [tasks, notes, planningItems, activities, books, folders, bookmarks, bookmarkFolders, spaces, people] = await Promise.all([
                this.db.getAll<Task>('tasks'),
                this.db.getAll<Note>('notes'),
                this.db.getAll<PlanningItem>('planning_items'),
                this.db.getAll<Activity>('activities'),
                this.db.getAll<Book>('books'),
                this.db.getAll<{ id: string; name: string; icon: string }>('note_folders'),
                this.db.getAll<Bookmark>('bookmarks'),
                this.db.getAll<BookmarkFolder>('bookmark_folders'),
                this.db.getAll<Project>('projects'),
                this.db.getAll<Person>('people'),
            ]);

            // Tasks — cap, exclude soft-deleted
            const activeTasks = (tasks || [])
                .filter(t => !t.deleted_at)
                .slice(0, StoreService.LIMITS.tasks);
            this.tasks.set(activeTasks);

            // Notes — strip content from metadata load; content is lazy-loaded via loadNoteContent().
            // Preserves any in-memory notes not yet in DB (just-created, not yet persisted).
            const activeNotes = (notes || [])
                .filter(n => !n.deleted_at)
                .slice(0, StoreService.LIMITS.notes)
                .map(n => ({ ...n, content: undefined })) as Note[];
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
        } catch (e) {
            console.error('[StoreService] loadFromDb failed', e);
            if (retries > 0) {
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
        } finally {
            this._loadInProgress = false;
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

        // 3. Flush any debounced file-write before reading so the file exists.
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

        // 4. Read from file system (desktop: .md file; web: localStorage).
        try {
            const mdContent = await this.fs.readNote(id);
            if (mdContent) {
                const { marked } = await import('marked');
                const html = await marked.parse(mdContent) as string;
                this.contentCache.set(id, html);
                this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: html } : n));
                return html;
            }
        } catch (e) {
            console.error('[StoreService] loadNoteContent file read failed for', id, e);
        }

        // 5. Last resort: reconstruct from preview stored in SQLite.
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
        this.db.upsert('tasks', task).catch(e => console.error('[StoreService] persist task failed', e));
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
        this.db.upsert('tasks', { ...task, deleted_at: new Date().toISOString() })
            .catch(e => console.error('[StoreService] soft-delete task failed', e));
    }

    async addNote(note: Note) {
        if (note.content) this.contentCache.set(note.id, note.content);
        this.notes.update(notes => [note, ...notes]);
        this.addActivity("Entry added to '" + note.title + "'", 'entry');
        // Persist to DB immediately so a concurrent loadFromDb() won't lose this note.
        this.db.upsert('notes', note).catch(e => console.error('[StoreService] persist note failed', e));
        await this.saveNoteContentToFile(note.id, note.content || '');
    }

    updateNote(id: string, updates: Partial<Note>) {
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        this.notes.update(notes =>
            notes.map(note => note.id === id ? {
                ...note,
                ...updates,
                lastEdited: updates.lastEdited || timeString
            } : note)
        );

        const note = this.notes().find(n => n.id === id);
        if (!note) return;

        if (updates.content !== undefined) {
            this.contentCache.set(id, updates.content || '');
            const existing = this.saveTimeouts.get(id);
            if (existing) clearTimeout(existing);
            this.pendingSaveContent.set(id, updates.content || '');
            this.saveTimeouts.set(id, setTimeout(() => {
                this.saveTimeouts.delete(id);
                const content = this.pendingSaveContent.get(id) ?? '';
                this.pendingSaveContent.delete(id);
                this.saveNoteContentToFile(id, content);
            }, 1000));
        }

        this.db.upsert('notes', note).catch(e => console.error('[StoreService] persist note failed', e));
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
            const md = await this.htmlToMarkdown(html);
            const filePath = await this.fs.saveNote(id, md);

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
        this.contentCache.delete(id);
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
            id: Date.now().toString(),
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
}
