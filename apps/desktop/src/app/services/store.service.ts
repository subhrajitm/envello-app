import { Injectable, signal, inject, effect } from '@angular/core';
import { BinService } from './bin.service';
import { SqliteService } from '../core/services/sqlite.service';
import { logIfTauri } from '../core/utils/tauri-helpers';
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
  updated_at?: string;
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
  updated_at?: string;
}

export interface PlanningItem {
  id: string;
  title: string;
  tag: string;
  stage: string;
  active: boolean;
  updated_at?: string;
}

export interface Activity {
  id: string;
  text: string;
  time: string;
  type: 'entry' | 'sync' | 'ai' | 'system';
  updated_at?: string;
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
  updated_at?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
  words: string;
  updated: string;
  icon: string;
  dueDate?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  progress?: number;
  team?: string[];
  tags?: string[];

  // New fields for complex projects
  type?: 'SINGLE' | 'MULTI'; // Single task oriented or multi-faceted
  linkedResources?: {
    novels?: string[]; // IDs of linked novels
    journals?: string[]; // IDs of linked journals/notes
    snippets?: string[]; // IDs of linked code snippets
    meetings?: string[]; // IDs of linked meetings
    research?: string[]; // IDs of linked research sources/libraries
    books?: string[]; // IDs of linked books
    articles?: string[]; // IDs of linked articles
  };
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
  projects = signal<Project[]>([
    {
      id: '1',
      title: 'Project Alpha: Final Manuscript',
      description: 'The final push for the Alpha manuscript, focusing on copyediting and layout.',
      status: 'DRAFTING',
      words: '48.2k',
      updated: '2m ago',
      icon: 'menu_book',
      dueDate: '2023-12-01',
      priority: 'HIGH',
      progress: 65,
      team: ['Alex', 'Sam'],
      tags: ['Publication', 'Q4']
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      description: 'World building and initial character sketches for the Neon Orchard series.',
      status: 'PLANNING',
      words: '12.5k',
      updated: '1h ago',
      icon: 'description',
      dueDate: '2024-01-15',
      priority: 'MEDIUM',
      progress: 20,
      team: ['Jordan'],
      tags: ['Sci-Fi', 'Concept']
    },
    {
      id: '3',
      title: 'The Scent of Green',
      description: 'Completed draft ready for initial beta reader review.',
      status: 'COMPLETE',
      words: '82.1k',
      updated: 'Oct 24',
      icon: 'check_circle',
      dueDate: '2023-10-30',
      priority: 'LOW',
      progress: 100,
      team: ['Alex'],
      tags: ['Fantasy']
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      description: 'Mid-stage review of the plot points and pacing.',
      status: 'REVIEW',
      words: '35.0k',
      updated: '2d ago',
      icon: 'extension',
      dueDate: '2023-11-20',
      priority: 'HIGH',
      progress: 45,
      team: ['Sam', 'Jordan'],
      tags: ['Thriller']
    },
  ]);

  private bin = inject(BinService);
  private db = inject(SqliteService);
  private fs = inject(FileSystemService);

  // Event Bus architecture
  private taskStore = inject(TaskStore);
  private taskCommands = inject(TaskCommands);
  private noteStore = inject(NoteStore);
  private noteCommands = inject(NoteCommands);

  private turndownService: any;
  private saveTimeouts: { [id: string]: any } = {};

  constructor() {
    this.loadFromDb();
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

  private async loadFromDb(): Promise<void> {
    try {
      const [tasks, notes, planningItems, activities, novels] = await Promise.all([
        this.db.getAllTasks(),
        this.db.getAllNotes(),
        this.db.getAllPlanningItems(),
        this.db.getAllActivities(),
        this.db.getAllNovels(),
      ]);
      // NoteStore is initialized by NotePersistenceEffect, but we iterate here to sync initial state if needed?
      // Actually NotePersistenceEffect loads data into NoteStore.
      // So here we should NOT set this.notes() from DB directly if we want to rely on NoteStore.
      // BUT `loadFromDb` runs in constructor. `NotePersistenceEffect` also runs on app init.
      // They might race.
      // Since we sync `this.notes` with `this.noteStore.notes()` in the effect above, 
      // updating `this.notes` here might be overwritten or cause flicker.
      // Best to let NoteStore drive it.

      this.tasks.set(tasks);
      // this.notes.set(notes); // Managed by NoteStore now
      this.planningItems.set(planningItems);
      this.activities.set(activities.slice(0, 50));
      this.novels.set(novels);
    } catch (e) {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        logIfTauri('[StoreService] loadFromDb failed', e);
      }
      this.tasks.set([]);
      // this.notes.set([]); // Managed by NoteStore
      this.planningItems.set([]);
      this.activities.set([]);
      this.novels.set([]);
    }
  }

  async loadNoteContent(id: string): Promise<string> {
    this.noteCommands.loadNoteContent(id);

    // Poll for content (backward compatibility for Promise-based callers)
    // 2 second timeout
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
    // Delegate to Event Bus
    this.noteCommands.createNote(note);
    this.addActivity("Entry added to '" + note.title + "'", 'entry');

    // Auto-create Project for this Note/Journal
    const projectId = crypto.randomUUID();
    this.addProject({
      id: projectId,
      title: note.title || 'Untitled Note',
      description: 'Auto-generated project from Note',
      status: 'PLANNING',
      words: '0',
      updated: new Date().toISOString(),
      icon: 'edit_note',
      linkedResources: {
        journals: [note.id]
      }
    });
  }

  updateNote(id: string, updates: Partial<Note>) {
    this.noteCommands.updateNote(id, updates);
  }

  private async saveNoteContentToFile(id: string, html: string) {
    // Managed by NotePersistenceEffect now
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
    this.db.upsertPlanningItem(item).catch(e => logIfTauri('[StoreService] persist planning item failed', e));
  }

  addNovel(novel: Novel) {
    this.novels.update(novels => [...novels, novel]);
    this.addActivity('Project started: ' + novel.title, 'system');
    this.db.upsertNovel(novel).catch(e => logIfTauri('[StoreService] persist novel failed', e));

    // Auto-create Project for this Novel
    const projectId = crypto.randomUUID();
    this.addProject({
      id: projectId,
      title: novel.title,
      description: 'Auto-generated project from Novel',
      status: (novel.status === 'REVISING' ? 'REVIEW' :
        (novel.status === 'PUBLISHED' ? 'COMPLETE' :
          (novel.status === 'DRAFTING' || novel.status === 'PLANNING' ? novel.status : 'PLANNING'))),
      words: String(novel.wordCount || 0),
      updated: new Date().toISOString(),
      icon: 'menu_book',
      linkedResources: {
        novels: [novel.id]
      }
    });
  }

  addProject(project: Project) {
    this.projects.update(projects => [...projects, project]);
    this.addActivity('Project created: ' + project.title, 'system');
    // TODO: Persist project to DB (mock for now or add to SqliteService)
  }

  updateProject(id: string, updates: Partial<Project>) {
    this.projects.update(projects =>
      projects.map(p => p.id === id ? { ...p, ...updates } : p)
    );
    // TODO: Persist
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
    this.db.removeNovel(id).catch(e => logIfTauri('[StoreService] remove novel failed', e));
    this.db.removeNovelContent(id).catch(e => logIfTauri('[StoreService] remove novel content failed', e));
  }

  addActivity(text: string, type: Activity['type'] = 'entry') {
    const newActivity: Activity = {
      id: Date.now().toString(),
      text,
      time: 'Just now',
      type
    };
    this.activities.update(activities => [newActivity, ...activities.slice(0, 49)]); // Keep last 50
    this.db.upsertActivity(newActivity).catch(e => logIfTauri('[StoreService] persist activity failed', e));
  }
}
