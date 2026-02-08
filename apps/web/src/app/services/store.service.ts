import { Injectable, signal, inject } from '@angular/core';
import { BinService } from './bin.service';
import { RxdbService } from '../core/services/rxdb.service';
import { FileSystemService } from '../core/services/file-system.service';

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

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  tasks = signal<Task[]>([]);
  notes = signal<Note[]>([]);
  planningItems = signal<PlanningItem[]>([]);
  activities = signal<Activity[]>([]);
  novels = signal<Novel[]>([]);

  private bin = inject(BinService);
  private rxdb = inject(RxdbService);
  private fs = inject(FileSystemService);

  private turndownService: any;
  private saveTimeouts: { [id: string]: any } = {};

  constructor() {
    this.loadFromRxDB();
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

  private async loadFromRxDB(): Promise<void> {
    console.log('[StoreService] Loading data from RxDB...');

    // Load Tasks
    try {
      const tasks = await this.rxdb.getAllTasks();
      this.tasks.set(tasks);
    } catch (e) {
      console.error('[StoreService] Failed to load tasks:', e);
      this.tasks.set([]);
    }

    // Load Notes
    try {
      const notes = await this.rxdb.getAllNotes();
      this.notes.set(notes);
    } catch (e) {
      console.error('[StoreService] Failed to load notes:', e);
      this.notes.set([]);
    }

    // Load Planning Items
    try {
      const planningItems = await this.rxdb.getAllPlanningItems();
      this.planningItems.set(planningItems);
    } catch (e) {
      console.error('[StoreService] Failed to load planning items:', e);
      this.planningItems.set([]);
    }

    // Load Activities
    try {
      const activities = await this.rxdb.getAllActivities();
      this.activities.set(activities.slice(0, 50));
    } catch (e) {
      console.error('[StoreService] Failed to load activities:', e);
      this.activities.set([]);
    }

    // Load Novels
    try {
      const novels = await this.rxdb.getAllNovels();
      this.novels.set(novels);
    } catch (e) {
      console.error('[StoreService] Failed to load novels:', e);
      this.novels.set([]);
    }

    console.log('[StoreService] Data loading complete');
  }

  async loadNoteContent(id: string): Promise<string> {
    const note = this.notes().find(n => n.id === id);
    if (!note) return '';
    // Return cached if valid (length check to avoid empty strings from DB migration)
    if (note.content && note.content.length > 5) return note.content;

    let mdContent = await this.fs.readNote(id);

    // Lazy Migration: If file missing but DB has content, write to file
    if (mdContent === null && note.content && note.content.length > 0) {
      console.log('[StoreService] Migrating note to file:', id);
      await this.saveNoteContentToFile(id, note.content);
      return note.content;
    }

    if (mdContent) {
      // Convert Markdown -> HTML
      const { marked } = await import('marked');
      const html = await marked.parse(mdContent);
      // Update Cache
      this.notes.update(ns => ns.map(n => n.id === id ? { ...n, content: html as string } : n));
      return html as string;
    }

    return '';
  }

  addTask(task: Task) {
    this.tasks.update(tasks => [...tasks, task]);
    this.addActivity('Task created: ' + task.title, 'system');
    this.rxdb.upsertTask(task).catch(e => console.error('[StoreService] persist task failed', e));
  }

  updateTask(id: string, updates: Partial<Task>) {
    const updated = this.tasks().map(t => t.id === id ? { ...t, ...updates } : t);
    const task = updated.find(t => t.id === id);
    this.tasks.set(updated);
    this.addActivity('Task updated', 'system');
    if (task) this.rxdb.upsertTask(task).catch(e => console.error('[StoreService] persist task failed', e));
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
    this.rxdb.removeTask(id).catch(e => console.error('[StoreService] remove task failed', e));
  }

  async addNote(note: Note) {
    this.notes.update(notes => [note, ...notes]);
    this.addActivity("Entry added to '" + note.title + "'", 'entry');

    // Write initial file
    await this.saveNoteContentToFile(note.id, note.content || '');

    this.rxdb.upsertNote(note).catch(e => console.error('[StoreService] persist note failed', e));
  }

  updateNote(id: string, updates: Partial<Note>) {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Update In-Memory State Immediately
    this.notes.update(notes =>
      notes.map(note => note.id === id ? {
        ...note,
        ...updates,
        lastEdited: updates.lastEdited || timeString
      } : note)
    );

    const note = this.notes().find(n => n.id === id);
    if (!note) return;

    // Persist Logic: If content changed, debounce write to file
    if (updates.content !== undefined) {
      if (this.saveTimeouts[id]) clearTimeout(this.saveTimeouts[id]);
      this.saveTimeouts[id] = setTimeout(() => {
        this.saveNoteContentToFile(id, updates.content || '');
      }, 1000);
    }

    // Persist Metadata to DB (content is explicitly excluded/cleared in SqliteService upsert)
    this.rxdb.upsertNote(note).catch(e => console.error('[StoreService] persist note failed', e));
  }

  private async saveNoteContentToFile(id: string, html: string) {
    if (!this.turndownService) await this.initMarkdown();
    if (!this.turndownService) return; // Guard

    const md = this.turndownService.turndown(html);
    const filePath = await this.fs.saveNote(id, md);

    // Update filePath in DB if changed (or first time)
    const note = this.notes().find(n => n.id === id);
    if (note && note.filePath !== filePath) {
      this.notes.update(ns => ns.map(n => n.id === id ? { ...n, filePath } : n));
      this.rxdb.upsertNote({ ...note, filePath });
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
    this.rxdb.removeNote(id).catch(e => console.error('[StoreService] remove note failed', e));
    this.fs.deleteNote(id).catch(e => console.error('Failed to delete note file', e));
  }

  addPlanningItem(item: PlanningItem) {
    this.planningItems.update(items => [...items, item]);
    this.rxdb.upsertPlanningItem(item).catch(e => console.error('[StoreService] persist planning item failed', e));
  }

  addNovel(novel: Novel) {
    this.novels.update(novels => [...novels, novel]);
    this.addActivity('Project started: ' + novel.title, 'system');
    this.rxdb.upsertNovel(novel).catch(e => console.error('[StoreService] persist novel failed', e));
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
    this.rxdb.removeNovel(id).catch(e => console.error('[StoreService] remove novel failed', e));
    this.rxdb.removeNovelContent(id).catch(e => console.error('[StoreService] remove novel content failed', e));
  }

  addActivity(text: string, type: Activity['type'] = 'entry') {
    const newActivity: Activity = {
      id: Date.now().toString(),
      text,
      time: 'Just now',
      type
    };
    this.activities.update(activities => [newActivity, ...activities.slice(0, 49)]); // Keep last 50
    this.rxdb.upsertActivity(newActivity).catch(e => console.error('[StoreService] persist activity failed', e));
  }
}
