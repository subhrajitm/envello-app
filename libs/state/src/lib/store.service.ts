import { Injectable, signal, computed, inject } from '@angular/core';
import { BinService } from './bin.service';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from './tokens';
import { Task, Note, PlanningItem, Activity, Book, Project, Bookmark, BookmarkFolder } from '@envello/domain';

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

    private bin = inject(BinService);
    private db = inject(DataService);
    private fs = inject(FILE_SYSTEM);

    private markdownWorker: Worker | null = null;
    private workerCallbacks = new Map<string, (md: string) => void>();
    private saveTimeouts: { [id: string]: any } = {};

    private _syncDebounceTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        this.loadFromDb();
        this.initMarkdownWorker();
        // Re-load after Supabase sync (web) or after SQLite DB becomes ready (desktop).
        // Debounce so rapid-fire realtime events (e.g. N bookmark upserts from a folder
        // deletion) collapse into a single loadFromDb() call instead of N full reloads.
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
        try {
            const [tasks, notes, planningItems, activities, books, folders, bookmarks, bookmarkFolders, spaces] = await Promise.all([
                this.db.getAll<Task>('tasks'),
                this.db.getAll<Note>('notes'),
                this.db.getAll<PlanningItem>('planning_items'),
                this.db.getAll<Activity>('activities'),
                this.db.getAll<Book>('books'),
                this.db.getAll<{ id: string; name: string; icon: string }>('note_folders'),
                this.db.getAll<Bookmark>('bookmarks'),
                this.db.getAll<BookmarkFolder>('bookmark_folders'),
                this.db.getAll<Project>('projects'),
            ]);
            this.tasks.set(tasks || []);
            // Merge: preserve any in-memory notes whose IDs aren't in the DB yet
            // (newly created notes that haven't been persisted before this reload fires).
            const dbNoteIds = new Set((notes || []).map(n => n.id));
            const pendingNotes = this.notes().filter(n => !dbNoteIds.has(n.id));
            this.notes.set([...pendingNotes, ...(notes || [])]);
            this.planningItems.set(planningItems || []);
            this.activities.set((activities || []).slice(0, 50));
            this.books.set(books || []);
            this.bookmarks.set(bookmarks || []);
            this.bookmarkFolders.set(bookmarkFolders || []);
            this.spaces.set(spaces || []);

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
                // Single retry after 500ms — handles transient Tauri startup race
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
        }
    }

    async loadNoteContent(id: string): Promise<string> {
        const note = this.notes().find(n => n.id === id);
        if (!note) return '';
        if (note.content && note.content.length > 5) return note.content;

        let mdContent = await this.fs.readNote(id);

        if (mdContent === null && note.content && note.content.length > 0) {
            await this.saveNoteContentToFile(id, note.content);
            return note.content;
        }

        if (mdContent) {
            const { marked } = await import('marked');
            const html = await marked.parse(mdContent);
            this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: html as string } : n));
            return html as string;
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
        const existingTasks = this.tasks();
        const taskToDelete = existingTasks.find(t => t.id === id);

        if (taskToDelete) {
            this.bin.addToBin({
                type: 'task',
                originalId: taskToDelete.id,
                title: taskToDelete.title,
                payload: taskToDelete
            });
        }

        this.tasks.set(existingTasks.filter(t => t.id !== id));
        this.addActivity('Task deleted', 'system');
        this.db.remove('tasks', id).catch(e => console.error('[StoreService] remove task failed', e));
    }

    async addNote(note: Note) {
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
            if (this.saveTimeouts[id]) clearTimeout(this.saveTimeouts[id]);
            this.saveTimeouts[id] = setTimeout(() => {
                this.saveNoteContentToFile(id, updates.content || '');
            }, 1000);
        }

        this.db.upsert('notes', note).catch(e => console.error('[StoreService] persist note failed', e));
    }

    private async saveNoteContentToFile(id: string, html: string) {
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
    }

    deleteNote(id: string) {
        const existingNotes = this.notes();
        const noteToDelete = existingNotes.find(n => n.id === id);

        if (noteToDelete) {
            this.bin.addToBin({
                type: 'daily-note',
                originalId: noteToDelete.id,
                title: noteToDelete.title,
                payload: noteToDelete
            });
        }

        this.notes.set(existingNotes.filter(n => n.id !== id));
        this.addActivity('Note deleted', 'system');
        this.db.remove('notes', id).catch(e => console.error('[StoreService] remove note failed', e));
        this.fs.deleteNote(id).catch((e: unknown) => console.error('Failed to delete note file', e));
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
        const existing = this.books();
        const book = existing.find(n => n.id === id);
        if (book) {
            this.bin.addToBin({
                type: 'book',
                originalId: book.id,
                title: book.title,
                payload: book,
            });
        }
        this.books.set(existing.filter(n => n.id !== id));
        this.addActivity('Book deleted', 'system');
        this.db.remove('books', id).catch(e => console.error('[StoreService] remove book failed', e));
        this.db.remove('book_content', id).catch(e => console.error('[StoreService] remove book content failed', e));
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
        if (bookmark) {
            this.bin.addToBin({ type: 'bookmark', originalId: id, title: bookmark.title || bookmark.url, payload: bookmark });
        }
        this.bookmarks.update(list => list.filter(b => b.id !== id));
        this.addActivity('Bookmark removed', 'system');
        this.db.remove('bookmarks', id).catch(e => console.error('[StoreService] remove bookmark failed', e));
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
}
