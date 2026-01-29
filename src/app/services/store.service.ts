import { Injectable, signal, inject } from '@angular/core';
import { BinService } from './bin.service';
import { RxDBService } from '../core/services/rxdb.service';

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
  content: string; // HTML content for simplicity
  tags?: string[];
  lastEdited?: string;
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
  private rxdb = inject(RxDBService);

  constructor() {
    this.loadFromRxDB();
  }

  private async loadFromRxDB(): Promise<void> {
    try {
      const [tasks, notes, planningItems, activities, novels] = await Promise.all([
        this.rxdb.getAllTasks(),
        this.rxdb.getAllNotes(),
        this.rxdb.getAllPlanningItems(),
        this.rxdb.getAllActivities(),
        this.rxdb.getAllNovels(),
      ]);
      this.tasks.set(tasks);
      this.notes.set(notes);
      this.planningItems.set(planningItems);
      this.activities.set(activities.slice(0, 50));
      this.novels.set(novels);
    } catch (e) {
      console.error('[StoreService] loadFromRxDB failed', e);
      this.tasks.set([]);
      this.notes.set([]);
      this.planningItems.set([]);
      this.activities.set([]);
      this.novels.set([]);
    }
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

  addNote(note: Note) {
    this.notes.update(notes => [note, ...notes]);
    this.addActivity("Entry added to '" + note.title + "'", 'entry');
    this.rxdb.upsertNote(note).catch(e => console.error('[StoreService] persist note failed', e));
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
    if (note) this.rxdb.upsertNote(note).catch(e => console.error('[StoreService] persist note failed', e));
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
