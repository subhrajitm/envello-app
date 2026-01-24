import { Injectable, signal, inject } from '@angular/core';
import { BinService } from './bin.service';
import { StoreService } from './store.service';

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

const initialProjects: JournalProject[] = [
  {
    id: '1',
    title: '2024 Morning Pages',
    entriesCount: 142,
    active: true,
    wordCount: 125000,
    targetWordCount: 150000,
    progress: 83,
    createdDate: 'Jan 1, 2024',
    lastUpdated: '2 hours ago',
    columns: ['IDEAS', 'DRAFTING', 'REVIEW']
  },
  {
    id: '2',
    title: 'Plot Ideas Log',
    entriesCount: 86,
    active: false,
    wordCount: 45000,
    createdDate: 'Mar 15, 2024',
    lastUpdated: '1 week ago',
    columns: ['IDEAS', 'DRAFTING', 'REVIEW']
  },
  {
    id: '3',
    title: 'Character Dev - SciFi',
    entriesCount: 54,
    active: false,
    wordCount: 32000,
    createdDate: 'Jun 1, 2024',
    lastUpdated: '3 days ago',
    columns: ['IDEAS', 'DRAFTING', 'REVIEW']
  },
  {
    id: '4',
    title: 'Dream Journal 2023',
    entriesCount: 312,
    active: false,
    wordCount: 89000,
    createdDate: 'Jan 1, 2023',
    lastUpdated: '2 weeks ago',
    columns: ['IDEAS', 'DRAFTING', 'REVIEW']
  },
  {
    id: '5',
    title: 'World Building Notes',
    entriesCount: 24,
    active: false,
    wordCount: 18000,
    createdDate: 'Aug 10, 2024',
    lastUpdated: '5 days ago',
    columns: ['IDEAS', 'DRAFTING', 'REVIEW']
  },
  {
    id: '6',
    title: 'Travel Reflections',
    entriesCount: 18,
    active: false,
    wordCount: 12000,
    createdDate: 'Sep 5, 2024',
    lastUpdated: '1 month ago',
    columns: ['IDEAS', 'DRAFTING', 'REVIEW']
  },
];

const initialEntries: JournalEntry[] = [
  {
    id: 'e1',
    projectId: '1',
    title: 'Neon Noir Protagonist',
    content: '<p>Initial sketches for the cybernetic detective character in Chapter 3.</p><p>The character should embody the duality of human emotion and machine logic.</p>',
    preview: 'Initial sketches for the cybernetic detective character in Chapter 3.',
    type: 'CONCEPT',
    column: 'IDEAS',
    wordCount: 45,
    characterCount: 280,
    createdDate: 'Jan 24, 2026',
    lastEdited: '1h ago',
    hasAi: true,
    tags: ['character', 'protagonist']
  },
  {
    id: 'e2',
    projectId: '1',
    title: 'Underground Bazaar',
    content: '<p>The sensory details of the black market in Neo-Tokyo district.</p><p>Smells of ozone and street food. Neon signs flickering. Crowded alleys.</p>',
    preview: 'The sensory details of the black market in Neo-Tokyo district.',
    type: 'SETTING',
    column: 'IDEAS',
    wordCount: 38,
    characterCount: 240,
    createdDate: 'Jan 24, 2026',
    lastEdited: '3h ago',
    statusColor: '#4ade80',
    tags: ['setting', 'location']
  },
  {
    id: 'e3',
    projectId: '1',
    title: 'The Rain Never Stops',
    content: '<p>Chapter opening scene. The rain creates a sense of melancholy and isolation.</p><p>Detective walks through the wet streets, reflecting on the case.</p>',
    preview: 'Chapter opening scene. The rain creates a sense of melancholy.',
    type: 'CHAPTER',
    column: 'DRAFTING',
    wordCount: 2450,
    characterCount: 15200,
    createdDate: 'Jan 23, 2026',
    lastEdited: 'Active',
    progress: 70,
    meta: '2,450 words',
    tags: ['chapter', 'draft']
  },
  {
    id: 'e4',
    projectId: '1',
    title: 'Prologue Redux',
    content: '<p>Tone consistency check required after AI expansion of opening scene.</p><p>Need to review the pacing and ensure the voice matches the rest of the novel.</p>',
    preview: 'Tone consistency check required after AI expansion of opening scene.',
    type: 'CRITICAL',
    column: 'REVIEW',
    wordCount: 120,
    characterCount: 750,
    createdDate: 'Jan 22, 2026',
    lastEdited: 'Feedback Ready',
    isAiEdited: true,
    tags: ['review', 'feedback-ready']
  },
];

const defaultColumns: JournalColumn[] = [
  { id: 'IDEAS', name: 'IDEAS', color: '#3b82f6', order: 0 },
  { id: 'DRAFTING', name: 'DRAFTING', color: '#f97316', order: 1 },
  { id: 'REVIEW', name: 'REVIEW', color: '#a855f7', order: 2 },
];

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  projects = signal<JournalProject[]>(initialProjects);
  entries = signal<JournalEntry[]>(initialEntries);
  columns = signal<JournalColumn[]>(defaultColumns);

  private bin = inject(BinService);
  private store = inject(StoreService);

  constructor() { }

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
  }

  deleteProject(id: string) {
    const project = this.getProject(id);
    if (project) {
      // Move entries to bin
      const projectEntries = this.entries().filter(e => e.projectId === id);
      projectEntries.forEach(entry => {
        this.bin.addToBin({
          type: 'journal-entry',
          originalId: entry.id,
          title: entry.title,
          payload: entry
        });
      });

      // Delete entries
      this.entries.update(entries => entries.filter(e => e.projectId !== id));
      
      // Delete project
      this.projects.update(projects => projects.filter(p => p.id !== id));
      this.store.addActivity(`Journal project deleted: ${project.title}`, 'system');
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
    
    // Update project stats
    this.updateProjectStats(entry.projectId);
    
    this.store.addActivity(`Entry added: ${newEntry.title}`, 'entry');
    return newEntry;
  }

  updateEntry(id: string, updates: Partial<JournalEntry>) {
    const entry = this.getEntry(id);
    if (!entry) return;

    let finalUpdates = { ...updates };
    
    // Recalculate word/character count if content changed
    if (updates.content) {
      const plainText = this.stripHtml(updates.content);
      finalUpdates.wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
      finalUpdates.characterCount = plainText.length;
      finalUpdates.preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
    }

    this.entries.update(entries =>
      entries.map(e => e.id === id ? {
        ...e,
        ...finalUpdates,
        lastEdited: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      } : e)
    );

    // Update project stats if word count changed
    if (updates.content) {
      this.updateProjectStats(entry.projectId);
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
    return newColumn;
  }

  updateColumn(id: string, updates: Partial<JournalColumn>) {
    this.columns.update(cols =>
      cols.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  }

  deleteColumn(id: string) {
    // Move all entries from this column to IDEAS
    this.entries.update(entries =>
      entries.map(e => e.column === id ? { ...e, column: 'IDEAS' } : e)
    );
    
    this.columns.update(cols => cols.filter(c => c.id !== id));
  }

  // Search
  searchEntries(query: string, projectId?: string): JournalEntry[] {
    const entries = projectId ? this.getEntries(projectId) : this.entries();
    const lowerQuery = query.toLowerCase();
    
    return entries.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.preview.toLowerCase().includes(lowerQuery) ||
      entry.content.toLowerCase().includes(lowerQuery) ||
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
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}
