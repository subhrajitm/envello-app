import { __decorate } from 'tslib';
import { Injectable, signal, inject } from '@angular/core';
import { BinService } from './bin.service';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from './tokens';
let StoreService = class StoreService {
  tasks = signal([]);
  notes = signal([]);
  planningItems = signal([]);
  activities = signal([]);
  novels = signal([]);
  /** Persisted folder definitions for daily notes; loaded from DB on init. */
  noteFolders = signal([]);
  projects = signal([
    {
      id: '1',
      title: 'Project Alpha: Final Manuscript',
      description:
        'The final push for the Alpha manuscript, focusing on copyediting and layout.',
      status: 'DRAFTING',
      words: '48.2k',
      updated: '2m ago',
      icon: 'menu_book',
      dueDate: '2023-12-01',
      priority: 'HIGH',
      progress: 65,
      team: ['Alex', 'Sam'],
      tags: ['Publication', 'Q4'],
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      description:
        'World building and initial character sketches for the Neon Orchard series.',
      status: 'PLANNING',
      words: '12.5k',
      updated: '1h ago',
      icon: 'description',
      dueDate: '2024-01-15',
      priority: 'MEDIUM',
      progress: 20,
      team: ['Jordan'],
      tags: ['Sci-Fi', 'Concept'],
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
      tags: ['Fantasy'],
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
      tags: ['Thriller'],
    },
  ]);
  bin = inject(BinService);
  db = inject(DataService);
  fs = inject(FILE_SYSTEM);
  turndownService;
  saveTimeouts = {};
  constructor() {
    this.loadFromDb();
    this.initMarkdown();
  }
  async initMarkdown() {
    if (typeof window !== 'undefined') {
      try {
        const TurndownService = (await import('turndown')).default;
        if (TurndownService) {
          this.turndownService = new TurndownService();
          this.turndownService.addRule('strikethrough', {
            filter: ['del', 's', 'strike'],
            replacement: (content) => '~' + content + '~',
          });
        }
      } catch (e) {
        console.warn('Turndown service undefined', e);
      }
    }
  }
  async loadFromDb() {
    try {
      const [tasks, notes, planningItems, activities, novels, folders] =
        await Promise.all([
          this.db.getAll('tasks'),
          this.db.getAll('notes'),
          this.db.getAll('planning_items'),
          this.db.getAll('activities'),
          this.db.getAll('novels'),
          this.db.getAll('note_folders'),
        ]);
      this.tasks.set(tasks || []);
      this.notes.set(notes || []);
      this.planningItems.set(planningItems || []);
      this.activities.set((activities || []).slice(0, 50));
      this.novels.set(novels || []);
      if (folders?.length) {
        this.noteFolders.set(folders);
      } else {
        const defaultFolders = [
          { id: 'personal', name: 'Personal', icon: 'folder' },
        ];
        this.noteFolders.set(defaultFolders);
        for (const f of defaultFolders) {
          this.db
            .upsert('note_folders', f)
            .catch((e) =>
              console.error('[StoreService] persist note_folders failed', e),
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
      this.noteFolders.set([
        { id: 'personal', name: 'Personal', icon: 'folder' },
      ]);
    }
  }
  async loadNoteContent(id) {
    const note = this.notes().find((n) => n.id === id);
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
      this.notes.update((ns) =>
        ns.map((n) => (n.id === id ? { ...n, content: html } : n)),
      );
      return html;
    }
    return '';
  }
  addTask(task) {
    this.tasks.update((tasks) => [...tasks, task]);
    this.addActivity('Task created: ' + task.title, 'system');
    this.db
      .upsert('tasks', task)
      .catch((e) => console.error('[StoreService] persist task failed', e));
  }
  updateTask(id, updates) {
    const updated = this.tasks().map((t) =>
      t.id === id ? { ...t, ...updates } : t,
    );
    const task = updated.find((t) => t.id === id);
    this.tasks.set(updated);
    this.addActivity('Task updated', 'system');
    if (task)
      this.db
        .upsert('tasks', task)
        .catch((e) => console.error('[StoreService] persist task failed', e));
  }
  deleteTask(id) {
    const existingTasks = this.tasks();
    const taskToDelete = existingTasks.find((t) => t.id === id);
    if (taskToDelete) {
      this.bin.addToBin({
        type: 'task',
        originalId: taskToDelete.id,
        title: taskToDelete.title,
        payload: taskToDelete,
      });
    }
    this.tasks.set(existingTasks.filter((t) => t.id !== id));
    this.addActivity('Task deleted', 'system');
    this.db
      .remove('tasks', id)
      .catch((e) => console.error('[StoreService] remove task failed', e));
  }
  async addNote(note) {
    this.notes.update((notes) => [note, ...notes]);
    this.addActivity("Entry added to '" + note.title + "'", 'entry');
    await this.saveNoteContentToFile(note.id, note.content || '');
    this.db
      .upsert('notes', note)
      .catch((e) => console.error('[StoreService] persist note failed', e));
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
        journals: [note.id],
      },
    });
  }
  updateNote(id, updates) {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    this.notes.update((notes) =>
      notes.map((note) =>
        note.id === id
          ? {
              ...note,
              ...updates,
              lastEdited: updates.lastEdited || timeString,
            }
          : note,
      ),
    );
    const note = this.notes().find((n) => n.id === id);
    if (!note) return;
    if (updates.content !== undefined) {
      if (this.saveTimeouts[id]) clearTimeout(this.saveTimeouts[id]);
      this.saveTimeouts[id] = setTimeout(() => {
        this.saveNoteContentToFile(id, updates.content || '');
      }, 1000);
    }
    this.db
      .upsert('notes', note)
      .catch((e) => console.error('[StoreService] persist note failed', e));
  }
  async saveNoteContentToFile(id, html) {
    if (!this.turndownService) await this.initMarkdown();
    if (!this.turndownService) return;
    const md = this.turndownService.turndown(html);
    const filePath = await this.fs.saveNote(id, md);
    const note = this.notes().find((n) => n.id === id);
    if (note && note.filePath !== filePath) {
      this.notes.update((ns) =>
        ns.map((n) => (n.id === id ? { ...n, filePath } : n)),
      );
      this.db.upsert('notes', { ...note, filePath });
    }
  }
  deleteNote(id) {
    const existingNotes = this.notes();
    const noteToDelete = existingNotes.find((n) => n.id === id);
    if (noteToDelete) {
      this.bin.addToBin({
        type: 'daily-note',
        originalId: noteToDelete.id,
        title: noteToDelete.title,
        payload: noteToDelete,
      });
    }
    this.notes.set(existingNotes.filter((n) => n.id !== id));
    this.addActivity('Note deleted', 'system');
    this.db
      .remove('notes', id)
      .catch((e) => console.error('[StoreService] remove note failed', e));
    this.fs
      .deleteNote(id)
      .catch((e) => console.error('Failed to delete note file', e));
  }
  addPlanningItem(item) {
    this.planningItems.update((items) => [...items, item]);
    this.db
      .upsert('planning_items', item)
      .catch((e) =>
        console.error('[StoreService] persist planning item failed', e),
      );
  }
  addNovel(novel) {
    this.novels.update((novels) => [...novels, novel]);
    this.addActivity('Project started: ' + novel.title, 'system');
    this.db
      .upsert('novels', novel)
      .catch((e) => console.error('[StoreService] persist novel failed', e));
    const projectId = crypto.randomUUID();
    this.addProject({
      id: projectId,
      title: novel.title,
      description: 'Auto-generated project from Novel',
      status:
        novel.status === 'REVISING'
          ? 'REVIEW'
          : novel.status === 'PUBLISHED'
            ? 'COMPLETE'
            : novel.status === 'DRAFTING' || novel.status === 'PLANNING'
              ? novel.status
              : 'PLANNING',
      words: String(novel.wordCount || 0),
      updated: new Date().toISOString(),
      icon: 'menu_book',
      linkedResources: {
        novels: [novel.id],
      },
    });
  }
  addProject(project) {
    this.projects.update((projects) => [...projects, project]);
    this.addActivity('Project created: ' + project.title, 'system');
    // Upsert project? Not yet persisted in original code, leaving as TODO or implementing
    this.db
      .upsert('projects', project)
      .catch((e) => console.error('[StoreService] persist project failed', e));
  }
  updateProject(id, updates) {
    this.projects.update((projects) =>
      projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
    const project = this.projects().find((p) => p.id === id);
    if (project)
      this.db
        .upsert('projects', project)
        .catch((e) =>
          console.error('[StoreService] persist project failed', e),
        );
  }
  deleteNovel(id) {
    const existing = this.novels();
    const novel = existing.find((n) => n.id === id);
    if (novel) {
      this.bin.addToBin({
        type: 'novel',
        originalId: novel.id,
        title: novel.title,
        payload: novel,
      });
    }
    this.novels.set(existing.filter((n) => n.id !== id));
    this.addActivity('Novel deleted', 'system');
    this.db
      .remove('novels', id)
      .catch((e) => console.error('[StoreService] remove novel failed', e));
    this.db
      .remove('novel_content', id)
      .catch((e) =>
        console.error('[StoreService] remove novel content failed', e),
      );
  }
  addActivity(text, type = 'entry') {
    const newActivity = {
      id: Date.now().toString(),
      text,
      time: 'Just now',
      type,
    };
    this.activities.update((activities) => [
      newActivity,
      ...activities.slice(0, 49),
    ]);
    this.db
      .upsert('activities', newActivity)
      .catch((e) => console.error('[StoreService] persist activity failed', e));
  }
  addNoteFolder(folder) {
    this.noteFolders.update((list) => [...list, folder]);
    this.db
      .upsert('note_folders', folder)
      .catch((e) =>
        console.error('[StoreService] persist note_folders failed', e),
      );
  }
  removeNoteFolder(id) {
    this.noteFolders.update((list) => list.filter((f) => f.id !== id));
    this.db
      .remove('note_folders', id)
      .catch((e) =>
        console.error('[StoreService] remove note_folder failed', e),
      );
  }
};
StoreService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  StoreService,
);
export { StoreService };
