import { Injectable, signal, computed, inject } from '@angular/core';
import { BinService } from './bin.service';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from './tokens';
import { Task, Note, PlanningItem, Activity, Novel, Project, Bookmark, BookmarkFolder } from '@envello/domain';

@Injectable({
    providedIn: 'root'
})
export class StoreService {
    tasks = signal<Task[]>([]);
    notes = signal<Note[]>([]);
    planningItems = signal<PlanningItem[]>([]);
    activities = signal<Activity[]>([]);
    novels = signal<Novel[]>([]);
    /** Persisted folder definitions for daily notes; loaded from DB on init. */
    noteFolders = signal<{ id: string; name: string; icon: string }[]>([]);
    bookmarks = signal<Bookmark[]>([]);
    bookmarkFolders = signal<BookmarkFolder[]>([]);
    projects = signal<Project[]>([]);

    private bin = inject(BinService);
    private db = inject(DataService);
    private fs = inject(FILE_SYSTEM);

    private turndownService: any;
    private saveTimeouts: { [id: string]: any } = {};

    constructor() {
        this.loadFromDb();
        this.initMarkdown();
    }

    private async initMarkdown() {
        if (typeof window !== 'undefined') {
            try {
                const TurndownService = (await import('turndown')).default;
                if (TurndownService) {
                    this.turndownService = new TurndownService();
                    this.turndownService.addRule('strikethrough', {
                        filter: ['del', 's', 'strike'],
                        replacement: (content: string) => '~' + content + '~'
                    });
                }
            } catch (e) {
                console.warn('Turndown service undefined', e);
            }
        }
    }

    private async loadFromDb(): Promise<void> {
        try {
            const [tasks, notes, planningItems, activities, novels, folders, bookmarks, bookmarkFolders, projects] = await Promise.all([
                this.db.getAll<Task>('tasks'),
                this.db.getAll<Note>('notes'),
                this.db.getAll<PlanningItem>('planning_items'),
                this.db.getAll<Activity>('activities'),
                this.db.getAll<Novel>('novels'),
                this.db.getAll<{ id: string; name: string; icon: string }>('note_folders'),
                this.db.getAll<Bookmark>('bookmarks'),
                this.db.getAll<BookmarkFolder>('bookmark_folders'),
                this.db.getAll<Project>('projects'),
            ]);
            this.tasks.set(tasks || []);
            this.notes.set(notes || []);
            this.planningItems.set(planningItems || []);
            this.activities.set((activities || []).slice(0, 50));
            this.novels.set(novels || []);
            this.bookmarks.set(bookmarks || []);
            this.bookmarkFolders.set(bookmarkFolders || []);
            this.projects.set(projects || []);

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
            this.tasks.set([]);
            this.notes.set([]);
            this.planningItems.set([]);
            this.activities.set([]);
            this.novels.set([]);
            this.noteFolders.set([{ id: 'personal', name: 'Personal', icon: 'folder' }]);
            this.bookmarks.set([]);
            this.bookmarkFolders.set([]);
            this.projects.set([]);
        }
    }

    async loadNoteContent(id: string): Promise<string> {
        const note = this.notes().find(n => n.id === id);
        if (!note) return '';
        if (note.content && note.content.length > 5) return note.content;

        let mdContent = await this.fs.readNote(id);

        if (mdContent === null && note.content && note.content.length > 0) {
            console.log('[StoreService] Migrating note to file:', id);
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
        await this.saveNoteContentToFile(note.id, note.content || '');
        this.db.upsert('notes', note).catch(e => console.error('[StoreService] persist note failed', e));
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
        if (!this.turndownService) await this.initMarkdown();
        if (!this.turndownService) return;

        const md = this.turndownService.turndown(html);
        const filePath = await this.fs.saveNote(id, md);

        const note = this.notes().find(n => n.id === id);
        if (note && note.filePath !== filePath) {
            this.notes.update(ns => ns.map(n => n.id === id ? { ...n, filePath } : n));
            this.db.upsert('notes', { ...note, filePath });
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

    addNovel(novel: Novel) {
        this.novels.update(novels => [...novels, novel]);
        this.addActivity('Project started: ' + novel.title, 'system');
        this.db.upsert('novels', novel).catch(e => console.error('[StoreService] persist novel failed', e));
    }

    addProject(project: Project) {
        this.projects.update(projects => [...projects, project]);
        this.addActivity('Project created: ' + project.title, 'system');
        this.db.upsert('projects', project).catch(e => console.error('[StoreService] persist project failed', e));
    }

    deleteProject(id: string) {
        this.projects.update(projects => projects.filter(p => p.id !== id));
        this.addActivity('Project deleted', 'system');
        this.db.remove('projects', id).catch(e => console.error('[StoreService] remove project failed', e));
    }

    updateProject(id: string, updates: Partial<Project>) {
        this.projects.update(projects =>
            projects.map(p => p.id === id ? { ...p, ...updates } : p)
        );
        const project = this.projects().find(p => p.id === id);
        if (project) this.db.upsert('projects', project).catch(e => console.error('[StoreService] persist project failed', e));
    }

    deleteNovel(id: string) {
        const existing = this.novels();
        const novel = existing.find(n => n.id === id);
        if (novel) {
            this.bin.addToBin({
                type: 'novel',
                originalId: novel.id,
                title: novel.title,
                payload: novel,
            });
        }
        this.novels.set(existing.filter(n => n.id !== id));
        this.addActivity('Novel deleted', 'system');
        this.db.remove('novels', id).catch(e => console.error('[StoreService] remove novel failed', e));
        this.db.remove('novel_content', id).catch(e => console.error('[StoreService] remove novel content failed', e));
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
        this.bookmarks.update(list => list.filter(b => b.id !== id));
        this.addActivity('Bookmark removed', 'system');
        this.db.remove('bookmarks', id).catch(e => console.error('[StoreService] remove bookmark failed', e));
    }

    addBookmarkFolder(folder: BookmarkFolder) {
        this.bookmarkFolders.update(list => [...list, folder]);
        this.db.upsert('bookmark_folders', folder).catch(e => console.error('[StoreService] persist bookmark_folder failed', e));
    }

    deleteBookmarkFolder(id: string) {
        this.bookmarkFolders.update(list => list.filter(f => f.id !== id));
        this.bookmarks.update(list => list.map(b => b.folderId === id ? { ...b, folderId: undefined } : b));
        this.db.remove('bookmark_folders', id).catch(e => console.error('[StoreService] remove bookmark_folder failed', e));
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
