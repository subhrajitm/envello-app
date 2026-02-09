import { Injectable, signal, inject, effect } from '@angular/core';
import { BinService } from './bin.service';
import { RxdbService } from '../core/services/rxdb.service';
import { FileSystemService } from '../core/services/file-system.service';
import { TaskStore, NoteStore } from '@envello/shared-state';
import { TaskCommands, NoteCommands } from '@envello/shared-domain';

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

  // Event Bus architecture
  private taskStore = inject(TaskStore);
  private taskCommands = inject(TaskCommands);
  private noteStore = inject(NoteStore);
  private noteCommands = inject(NoteCommands);

  private turndownService: any;
  private saveTimeouts: { [id: string]: any } = {};

  constructor() {
    this.loadFromRxDB();
    this.initMarkdown();

    // Sync tasks signal with TaskStore for backward compatibility
    effect(() => {
      this.tasks.set(this.taskStore.tasks());
    });

    // Sync notes signal with NoteStore for backward compatibility
    effect(() => {
      this.notes.set(this.noteStore.notes());
    });
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
    // NoteStore manages notes now. 
    // We can rely on NotePersistenceEffect to load notes.
    // this.notes.set(notes); // Managed by NoteStore

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
    this.noteCommands.loadNoteContent(id);

    // Poll for content (backward compatibility)
    const start = Date.now();
    while (Date.now() - start < 2000) {
      const note = this.noteStore.noteById(id)();
      if (note?.content) return note.content;
      await new Promise(r => setTimeout(r, 50));
    }

    return '';
  }

  addTask(task: Task) {
    // Delegate to Event Bus architecture
    this.taskCommands.createTask(task);
    this.addActivity('Task created: ' + task.title, 'system');
  }

  updateTask(id: string, updates: Partial<Task>) {
    // Delegate to Event Bus architecture
    this.taskCommands.updateTask(id, updates);
    this.addActivity('Task updated', 'system');
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

    // Delegate to Event Bus architecture
    this.taskCommands.deleteTask(id);
    this.addActivity('Task deleted', 'system');
  }

  async addNote(note: Note) {
    this.noteCommands.createNote(note);
    this.addActivity("Entry added to '" + note.title + "'", 'entry');
  }

  updateNote(id: string, updates: Partial<Note>) {
    this.noteCommands.updateNote(id, updates);
  }

  private async saveNoteContentToFile(id: string, html: string) {
    // Managed by NotePersistenceEffect
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

    this.noteCommands.deleteNote(id);
    this.addActivity('Note deleted', 'system');
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
