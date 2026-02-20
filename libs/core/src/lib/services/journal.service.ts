import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, signal, inject } from '@angular/core';
import { BinService } from './bin.service';
import { StoreService } from './store.service';
import { DataService } from '@envello/data';
import { FileSystemService } from './file-system.service';

export interface JournalEntry {
  id: string;
  projectId: string;
  title: string;
  content: string; // HTML content
  preview: string;
  type: 'CONCEPT' | 'CHAPTER' | 'SETTING' | 'CRITICAL' | 'NOTE' | 'IDEA';
  column: string; // Column ID (IDEAS, DRAFTING, REVIEW, etc.)
  tags?: string[];
  wordCount: number;
  characterCount: number;
  createdDate: string;
  lastEdited: string;
  hasAi?: boolean;
  isAiEdited?: boolean;
  progress?: number;
  statusColor?: string;
  meta?: string;
  isLocked?: boolean;
  linkedEntries?: string[]; // IDs of linked entries
  isPinned?: boolean;
  isFavorite?: boolean;
  filePath?: string;
  lastSynced?: string;
}

export interface JournalProject {
  id: string;
  title: string;
  description?: string;
  entriesCount: number;
  active: boolean;
  wordCount: number;
  targetWordCount?: number;
  progress?: number;
  createdDate: string;
  lastUpdated: string;
  columns: string[]; // Custom column IDs
  tags?: string[];
  isLocked?: boolean;
}

export interface JournalColumn {
  id: string;
  name: string;
  color: string;
  order: number;
}

const defaultColumns: JournalColumn[] = [
  { id: 'IDEAS', name: 'IDEAS', color: '#3b82f6', order: 0 },
  { id: 'DRAFTING', name: 'DRAFTING', color: '#f97316', order: 1 },
  { id: 'REVIEW', name: 'REVIEW', color: '#a855f7', order: 2 },
];

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  projects = signal<JournalProject[]>([]);
  entries = signal<JournalEntry[]>([]);
  columns = signal<JournalColumn[]>(defaultColumns);

  private bin = inject(BinService);
  private store = inject(StoreService);
  private db = inject(DataService);
  private fs = inject(FileSystemService);

  private turndownService: any;
  private saveTimeouts: { [id: string]: any } = {};

  constructor() {
    this.loadFromDb();
    this.initMarkdown();
  }

  private async initMarkdown() {
    if (typeof window !== 'undefined') {
      const TurndownService = (await import('turndown')).default;
      this.turndownService = new TurndownService();
    }
  }

  private async loadFromDb(): Promise<void> {
    try {
      const [projects, entries, cols] = await Promise.all([
        this.db.getAll<JournalProject>('journal_projects'),
        this.db.getAll<JournalEntry>('journal_entries'),
        this.db.getAll<JournalColumn>('journal_columns'),
      ]);
      this.projects.set(projects);
      this.entries.set(entries);
      if (cols.length === 0) {
        await Promise.all(defaultColumns.map(c => this.db.upsert('journal_columns', c)));
        this.columns.set(defaultColumns);
      } else {
        this.columns.set(cols.sort((a, b) => a.order - b.order));
      }
    } catch (e) {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        logIfTauri('[JournalService] loadFromDb failed', e);
      }
    }
  }

  async loadEntryContent(id: string): Promise<string> {
    const entry = this.entries().find(e => e.id === id);
    if (!entry) return '';
    if (entry.content && entry.content.length > 20) return entry.content; // Return cached

    let mdContent = await this.fs.readFile('journal', id);

    // Migration
    if (mdContent === null && entry.content && entry.content.length > 0) {
      console.log('[JournalService] Migrating entry to file:', id);
      await this.saveEntryContentToFile(id, entry.content);
      return entry.content;
    }

    if (mdContent) {
      const { marked } = await import('marked');
      const html = await marked.parse(mdContent);
      this.entries.update(es => es.map(e => e.id === id ? { ...e, content: html as string } : e));
      return html as string;
    }

    return '';
  }

  private persistProject(p: JournalProject): void {
    this.db.upsert('journal_projects', p).catch(e => logIfTauri('[JournalService] persist project failed', e));
  }

  private persistEntry(e: JournalEntry): void {
    this.db.upsert('journal_entries', e).catch(err => logIfTauri('[JournalService] persist entry failed', err));
  }

  private persistColumn(c: JournalColumn): void {
    this.db.upsert('journal_columns', c).catch(e => logIfTauri('[JournalService] persist column failed', e));
  }

  // Project Management
  getProjects(): JournalProject[] {
    return this.projects();
  }

  getProject(id: string): JournalProject | undefined {
    return this.projects().find(p => p.id === id);
  }

  getActiveProject(): JournalProject | undefined {
    return this.projects().find(p => p.active);
  }

  setActiveProject(id: string) {
    this.projects.update(projects =>
      projects.map(p => ({ ...p, active: p.id === id }))
    );
    this.store.addActivity(`Switched to project: ${this.getProject(id)?.title}`, 'system');
    this.projects().forEach(p => this.persistProject(p));
  }

  addProject(project: Omit<JournalProject, 'id' | 'entriesCount' | 'wordCount' | 'createdDate' | 'lastUpdated' | 'columns'>) {
    const newProject: JournalProject = {
      ...project,
      id: Date.now().toString(),
      entriesCount: 0,
      wordCount: 0,
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastUpdated: 'Just now',
      columns: ['IDEAS', 'DRAFTING', 'REVIEW'],
      active: false
    };
    this.projects.update(projects => [...projects, newProject]);
    this.store.addActivity(`Journal project created: ${newProject.title}`, 'system');
    this.persistProject(newProject);

    // Auto-create Project
    const projectId = crypto.randomUUID();
    this.store.addProject({
      id: projectId,
      title: newProject.title,
      description: newProject.description || 'Journal Project',
      status: 'PLANNING',
      words: '0',
      updated: new Date().toISOString(),
      icon: 'book',
      linkedResources: {
        journals: [newProject.id]
      }
    });

    return newProject;
  }

  updateProject(id: string, updates: Partial<JournalProject>) {
    this.projects.update(projects =>
      projects.map(p => p.id === id ? {
        ...p,
        ...updates,
        lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      } : p)
    );
    const p = this.getProject(id);
    if (p) this.persistProject(p);
  }

  deleteProject(id: string) {
    const project = this.getProject(id);
    if (project) {
      const projectEntries = this.entries().filter(e => e.projectId === id);
      projectEntries.forEach(entry => {
        this.bin.addToBin({
          type: 'journal-entry',
          originalId: entry.id,
          title: entry.title,
          payload: entry
        });
        this.db.remove('journal_entries', entry.id).catch(() => { });
      });

      this.entries.update(entries => entries.filter(e => e.projectId !== id));
      this.projects.update(projects => projects.filter(p => p.id !== id));
      this.store.addActivity(`Journal project deleted: ${project.title}`, 'system');
      this.db.remove('journal_projects', id).catch(e => logIfTauri('[JournalService] remove project failed', e));
    }
  }

  // Entry Management
  getEntries(projectId?: string): JournalEntry[] {
    const allEntries = this.entries();
    if (projectId) {
      return allEntries.filter(e => e.projectId === projectId);
    }
    return allEntries;
  }

  getEntriesByColumn(projectId: string, columnId: string): JournalEntry[] {
    return this.entries().filter(e => e.projectId === projectId && e.column === columnId);
  }

  getEntry(id: string): JournalEntry | undefined {
    return this.entries().find(e => e.id === id);
  }

  addEntry(entry: Omit<JournalEntry, 'id' | 'createdDate' | 'lastEdited' | 'wordCount' | 'characterCount'>) {
    const plainText = this.stripHtml(entry.content);
    const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
    const characterCount = plainText.length;

    const newEntry: JournalEntry = {
      ...entry,
      id: `e${Date.now()}`,
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastEdited: 'Just now',
      wordCount,
      characterCount,
      preview: plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '')
    };

    this.entries.update(entries => [...entries, newEntry]);
    this.updateProjectStats(entry.projectId);
    this.store.addActivity(`Entry added: ${newEntry.title}`, 'entry');

    // Write initial file
    this.saveEntryContentToFile(newEntry.id, newEntry.content);
    this.persistEntry(newEntry);
    return newEntry;
  }

  updateEntry(id: string, updates: Partial<JournalEntry>) {
    const entry = this.getEntry(id);
    if (!entry) return;

    let finalUpdates = { ...updates };
    if (updates.content) {
      const plainText = this.stripHtml(updates.content);
      finalUpdates.wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
      finalUpdates.characterCount = plainText.length;
      finalUpdates.preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');

      // Debounce File Write
      if (this.saveTimeouts[id]) clearTimeout(this.saveTimeouts[id]);
      this.saveTimeouts[id] = setTimeout(() => {
        this.saveEntryContentToFile(id, updates.content || '');
      }, 1000);
    }

    this.entries.update(entries =>
      entries.map(e => e.id === id ? {
        ...e,
        ...finalUpdates,
        lastEdited: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      } : e)
    );
    if (updates.content) this.updateProjectStats(entry.projectId);
    const updated = this.getEntry(id);
    if (updated) this.persistEntry(updated);
  }

  private async saveEntryContentToFile(id: string, html: string) {
    if (!this.turndownService) await this.initMarkdown();
    // guard for tests or ssr if initMarkdown fails or isn't called yet
    if (!this.turndownService) return;

    const md = this.turndownService.turndown(html);
    const filePath = await this.fs.saveFile('journal', id, md);

    // Update filePath in DB if changed (or first time)
    const entry = this.entries().find(e => e.id === id);
    if (entry && entry.filePath !== filePath) {
      this.entries.update(es => es.map(e => e.id === id ? { ...e, filePath } : e));
      this.db.upsert('journal_entries', { ...entry, filePath });
    }
  }

  deleteEntry(id: string) {
    const entry = this.getEntry(id);
    if (entry) {
      this.bin.addToBin({
        type: 'journal-entry',
        originalId: entry.id,
        title: entry.title,
        payload: entry
      });
      this.entries.update(entries => entries.filter(e => e.id !== id));
      this.updateProjectStats(entry.projectId);
      this.store.addActivity(`Entry deleted: ${entry.title}`, 'system');
      this.db.remove('journal_entries', id).catch(e => logIfTauri('[JournalService] remove entry failed', e));
      this.fs.deleteFile('journal', id).catch(e => console.error('Failed to delete journal file', e));
    }
  }

  moveEntry(entryId: string, newColumn: string) {
    this.updateEntry(entryId, { column: newColumn });
  }

  // Column Management
  getColumns(projectId?: string): JournalColumn[] {
    return this.columns();
  }

  addColumn(column: Omit<JournalColumn, 'id'>) {
    const newColumn: JournalColumn = {
      ...column,
      id: column.name.toUpperCase().replace(/\s+/g, '_')
    };
    this.columns.update(cols => [...cols, newColumn].sort((a, b) => a.order - b.order));
    this.persistColumn(newColumn);
    return newColumn;
  }

  updateColumn(id: string, updates: Partial<JournalColumn>) {
    this.columns.update(cols =>
      cols.map(c => c.id === id ? { ...c, ...updates } : c)
    );
    const c = this.columns().find(x => x.id === id);
    if (c) this.persistColumn(c);
  }

  deleteColumn(id: string) {
    const toMove = this.entries().filter(e => e.column === id);
    this.entries.update(entries =>
      entries.map(e => e.column === id ? { ...e, column: 'IDEAS' } : e)
    );
    this.columns.update(cols => cols.filter(c => c.id !== id));
    toMove.forEach(entry => {
      const updated = this.getEntry(entry.id);
      if (updated) this.persistEntry(updated);
    });
    this.db.remove('journal_columns', id).catch(e => logIfTauri('[JournalService] remove column failed', e));
  }

  // Search
  searchEntries(query: string, projectId?: string): JournalEntry[] {
    const entries = projectId ? this.getEntries(projectId) : this.entries();
    const lowerQuery = query.toLowerCase();

    return entries.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.preview.toLowerCase().includes(lowerQuery) ||
      (entry.content || '').toLowerCase().includes(lowerQuery) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Tags
  getAllTags(projectId?: string): string[] {
    const entries = projectId ? this.getEntries(projectId) : this.entries();
    const tagSet = new Set<string>();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  getEntriesByTag(tag: string, projectId?: string): JournalEntry[] {
    const entries = projectId ? this.getEntries(projectId) : this.entries();
    return entries.filter(entry => entry.tags?.includes(tag));
  }

  // Statistics
  getProjectStats(projectId: string) {
    const entries = this.getEntries(projectId);
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
    const totalEntries = entries.length;
    const entriesByColumn = entries.reduce((acc, e) => {
      acc[e.column] = (acc[e.column] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalWords,
      totalEntries,
      entriesByColumn,
      averageWordsPerEntry: totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0
    };
  }

  // Helper methods
  private updateProjectStats(projectId: string) {
    const entries = this.getEntries(projectId);
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
    const project = this.getProject(projectId);

    if (project) {
      const progress = project.targetWordCount
        ? Math.min(100, Math.round((totalWords / project.targetWordCount) * 100))
        : undefined;

      this.updateProject(projectId, {
        entriesCount: entries.length,
        wordCount: totalWords,
        progress
      });
    }
  }

  private stripHtml(html: string): string {
    if (typeof document === 'undefined') return html; // SSR guard
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}
