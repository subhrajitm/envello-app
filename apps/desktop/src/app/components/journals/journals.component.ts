import { Component, signal, computed, inject, OnInit, OnDestroy, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { JournalService, JournalProject, JournalEntry, JournalColumn } from '../../services/journal.service';
import { AiService } from '../../services/ai.service';
import { ButtonComponent, ModalComponent, EmptyStateComponent, IconButtonComponent } from '../../shared/ui';

@Component({
  selector: 'app-journals',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, ButtonComponent, ModalComponent, EmptyStateComponent, IconButtonComponent],
  templateUrl: './journals.component.html',
  styleUrl: './journals.component.css'
})
export class JournalsComponent implements OnInit, OnDestroy {
  journalService = inject(JournalService);
  aiService = inject(AiService);

  projects = this.journalService.projects;
  entries = this.journalService.entries;
  columns = this.journalService.columns;

  searchQuery = signal<string>('');
  projectSearchQuery = signal<string>('');
  selectedFilter = signal<'all' | 'tagged' | 'ai-edited'>('all');
  viewMode = signal<'kanban' | 'timeline'>('kanban');
  showEntryModal = signal<boolean>(false);
  showProjectModal = signal<boolean>(false);
  showSearchModal = signal<boolean>(false);
  showProjectDropdown = signal<boolean>(false);
  showColumnModal = signal<boolean>(false);
  showExportModal = signal<boolean>(false);
  showGoalsModal = signal<boolean>(false);
  selectedSort = signal<'newest' | 'oldest' | 'alpha'>('newest');
  selectedEntry = signal<JournalEntry | null>(null);
  editingEntry = signal<JournalEntry | null>(null);
  showAiPanel = signal<boolean>(false);
  aiQuery = signal<string>('');
  aiResponse = signal<string>('');
  isAiLoading = signal<boolean>(false);
  newEntryTitle = signal<string>('');
  newEntryType = signal<JournalEntry['type']>('NOTE');
  newEntryColumn = signal<string>('IDEAS');
  newProjectTitle = signal<string>('');
  newColumnName = signal<string>('');
  newColumnColor = signal<string>('#3b82f6');
  exportFormat = signal<'pdf' | 'md' | 'html'>('html');
  exportEntryId = signal<string | null>(null);
  writingGoal = signal<number>(0);
  writingGoalPeriod = signal<'daily' | 'weekly' | 'monthly'>('daily');

  editor!: Editor;
  wordCount = signal(0);
  characterCount = signal(0);

  activeProject = computed<JournalProject | undefined>(() => {
    return this.projects().find(p => p.active) || this.projects()[0];
  });

  filteredEntries = computed(() => {
    const project = this.activeProject();
    if (!project) return {};

    const allEntries = this.journalService.getEntries(project.id);

    // Group by column
    const grouped: { [key: string]: JournalEntry[] } = {};
    allEntries.forEach(entry => {
      if (!grouped[entry.column]) {
        grouped[entry.column] = [];
      }
      grouped[entry.column].push(entry);
    });

    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      Object.keys(grouped).forEach(col => {
        grouped[col] = grouped[col].filter(entry =>
          entry.title.toLowerCase().includes(query) ||
          entry.preview.toLowerCase().includes(query) ||
          entry.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      });
    }

    // Apply other filters
    const filter = this.selectedFilter();
    if (filter === 'tagged') {
      Object.keys(grouped).forEach(col => {
        grouped[col] = grouped[col].filter(entry => entry.tags && entry.tags.length > 0);
      });
    } else if (filter === 'ai-edited') {
      Object.keys(grouped).forEach(col => {
        grouped[col] = grouped[col].filter(entry => entry.isAiEdited || entry.hasAi);
      });
    }

    return grouped;
  });

  private sortEntries(entries: JournalEntry[]): JournalEntry[] {
    const sort = this.selectedSort();
    const sorted = [...entries].sort((a, b) => {
      // Pinned items always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sort === 'newest') {
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      } else if (sort === 'oldest') {
        return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
      } else if (sort === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
    return sorted;
  }

  getEntriesForColumn(columnId: string): JournalEntry[] {
    const grouped = this.filteredEntries();
    return this.sortEntries(grouped[columnId] || []);
  }

  timelineEntries = computed(() => {
    const project = this.activeProject();
    if (!project) return [];

    const allEntries = this.journalService.getEntries(project.id);

    // Filter first
    let filtered = allEntries;
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.preview.toLowerCase().includes(query) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    const filter = this.selectedFilter();
    if (filter === 'tagged') {
      filtered = filtered.filter(entry => entry.tags && entry.tags.length > 0);
    } else if (filter === 'ai-edited') {
      filtered = filtered.filter(entry => entry.isAiEdited || entry.hasAi);
    }

    // Use common sort logic
    return this.sortEntries(filtered);
  });

  projectStats = computed(() => {
    const project = this.activeProject();
    if (!project) return null;
    return this.journalService.getProjectStats(project.id);
  });

  draggedEntry: { entry: JournalEntry, sourceCol: string } | null = null;

  constructor() {
    // Effect to update editor content when selected entry changes
    effect(() => {
      const entry = this.editingEntry();
      if (entry && this.editor) {
        if (this.editor.getHTML() !== entry.content) {
          this.editor.commands.setContent(entry.content);
        }
      }
    });
  }

  ngOnInit() {
    // Ensure at least one project is active
    if (!this.activeProject()) {
      const firstProject = this.projects()[0];
      if (firstProject) {
        this.journalService.setActiveProject(firstProject.id);
      }
    }

    // Initialize TipTap editor
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        Placeholder.configure({
          placeholder: 'Start writing your entry...',
        }),
        Link.configure({
          openOnClick: false,
        }),
        Image,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        CharacterCount,
        Underline,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      editorProps: {
        attributes: {
          class: 'journal-editor-text focus:outline-none',
        },
      },
      onUpdate: ({ editor }) => {
        const content = editor.getHTML();
        const plainText = editor.getText();
        const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
        this.updateEntryContent(content, preview);

        this.wordCount.set(editor.storage.characterCount.words());
        this.characterCount.set(editor.storage.characterCount.characters());
      },
    });
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  updateEntryContent(content: string, preview: string) {
    const editing = this.editingEntry();
    if (editing) {
      this.editingEntry.set({
        ...editing,
        content,
        preview
      });
    }
  }

  updateEditingEntryTitle(title: string) {
    const editing = this.editingEntry();
    if (editing) {
      this.editingEntry.set({
        ...editing,
        title
      });
    }
  }

  // Editor Toolbar Helpers
  setLink() {
    const previousUrl = this.editor.getAttributes('link')['href'];
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  addImage() {
    const url = window.prompt('Image URL');

    if (url) {
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }

  insertTable() {
    this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  selectProject(projectId: string) {
    this.journalService.setActiveProject(projectId);
  }

  togglePin(entryId: string, event: Event) {
    event.stopPropagation();
    const entry = this.journalService.getEntry(entryId);
    if (entry) {
      this.journalService.updateEntry(entryId, { isPinned: !entry.isPinned });
    }
  }

  toggleSort() {
    const current = this.selectedSort();
    if (current === 'newest') this.selectedSort.set('oldest');
    else if (current === 'oldest') this.selectedSort.set('alpha');
    else this.selectedSort.set('newest');
  }

  onDragStart(e: DragEvent, entry: JournalEntry, sourceCol: string) {
    this.draggedEntry = { entry, sourceCol };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }

  onDragEnd(e: DragEvent) {
    this.draggedEntry = null;
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(e: DragEvent, targetCol: string) {
    e.preventDefault();

    if (!this.draggedEntry) return;
    if (this.draggedEntry.sourceCol === targetCol) return;

    this.journalService.moveEntry(this.draggedEntry.entry.id, targetCol);
  }

  openNewEntryModal(column: string) {
    this.newEntryColumn.set(column);
    this.newEntryTitle.set('');
    this.newEntryType.set('NOTE');
    this.showEntryModal.set(true);
  }

  createEntry() {
    const project = this.activeProject();
    if (!project || !this.newEntryTitle().trim()) return;

    const newEntry = this.journalService.addEntry({
      projectId: project.id,
      title: this.newEntryTitle(),
      content: '<p>Start writing...</p>',
      preview: 'Start writing...',
      type: this.newEntryType(),
      column: this.newEntryColumn(),
      tags: []
    });

    this.showEntryModal.set(false);
    this.openEntryDetail(newEntry.id);
  }

  async openEntryDetail(entryId: string) {
    const entry = this.journalService.getEntry(entryId);
    if (entry) {
      this.selectedEntry.set(entry);

      // Load full content from file system if needed
      const fullContent = await this.journalService.loadEntryContent(entryId);

      this.editingEntry.set({ ...entry, content: fullContent });

      // Update editor content after a brief delay to ensure editor is ready
      setTimeout(() => {
        if (this.editor) {
          this.editor.commands.setContent(fullContent);
        }
      }, 100);
    }
  }

  closeEntryDetail() {
    this.selectedEntry.set(null);
    this.editingEntry.set(null);
  }

  saveEntry() {
    const editing = this.editingEntry();
    if (!editing) return;

    const content = this.editor?.getHTML() || editing.content;
    const plainText = this.editor?.getText() || '';
    const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');

    this.journalService.updateEntry(editing.id, {
      title: editing.title,
      content: content,
      preview: preview,
      tags: editing.tags,
      type: editing.type
    });

    this.closeEntryDetail();
  }

  deleteEntry(entryId: string) {
    if (confirm('Are you sure you want to delete this entry?')) {
      this.journalService.deleteEntry(entryId);
      if (this.selectedEntry()?.id === entryId) {
        this.closeEntryDetail();
      }
    }
  }

  createProject() {
    if (!this.newProjectTitle().trim()) return;

    const newProject = this.journalService.addProject({
      title: this.newProjectTitle(),
      active: false
    });

    this.showProjectModal.set(false);
    this.newProjectTitle.set('');
    this.journalService.setActiveProject(newProject.id);
  }



  getColumnColor(columnId: string): string {
    const column = this.columns().find(c => c.id === columnId);
    return column?.color || '#6b7280';
  }

  getProjectColumns(): JournalColumn[] {
    const project = this.activeProject();
    if (!project) return this.columns();

    // Return columns that are in the project's column list, or all columns if project has no specific columns
    const projectColumnIds = project.columns.length > 0 ? project.columns : this.columns().map(c => c.id);
    return this.columns().filter(c => projectColumnIds.includes(c.id)).sort((a, b) => {
      const aIndex = projectColumnIds.indexOf(a.id);
      const bIndex = projectColumnIds.indexOf(b.id);
      return aIndex - bIndex;
    });
  }

  formatWordCount(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }

  toggleSearch() {
    this.showSearchModal.update(v => !v);
    if (!this.showSearchModal()) {
      this.searchQuery.set('');
    }
  }

  getActiveProjectId(): string | undefined {
    return this.activeProject()?.id;
  }

  // Column Management
  openColumnModal() {
    this.newColumnName.set('');
    this.newColumnColor.set('#3b82f6');
    this.showColumnModal.set(true);
  }

  createColumn() {
    if (!this.newColumnName().trim()) return;
    const project = this.activeProject();
    if (!project) return;

    const newColumn = this.journalService.addColumn({
      name: this.newColumnName(),
      color: this.newColumnColor(),
      order: this.columns().length
    });

    // Add column to project
    this.journalService.updateProject(project.id, {
      columns: [...project.columns, newColumn.id]
    });

    this.showColumnModal.set(false);
  }

  deleteColumn(columnId: string) {
    if (confirm('Are you sure you want to delete this column? All entries will be moved to IDEAS.')) {
      this.journalService.deleteColumn(columnId);
      const project = this.activeProject();
      if (project) {
        this.journalService.updateProject(project.id, {
          columns: project.columns.filter(c => c !== columnId)
        });
      }
    }
  }

  // Export Functionality
  openExportModal(entryId?: string) {
    this.exportEntryId.set(entryId || null);
    this.exportFormat.set('html');
    this.showExportModal.set(true);
  }

  exportEntry() {
    const entryId = this.exportEntryId();
    const entry = entryId ? this.journalService.getEntry(entryId) : null;
    const format = this.exportFormat();

    if (!entry) {
      // Export all entries from active project
      const project = this.activeProject();
      if (!project) return;

      const entries = this.journalService.getEntries(project.id);
      this.exportEntries(entries, project.title, format);
    } else {
      this.exportEntries([entry], entry.title, format);
    }

    this.showExportModal.set(false);
  }

  private exportEntries(entries: JournalEntry[], filename: string, format: 'pdf' | 'md' | 'html') {
    if (format === 'html') {
      let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .entry { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
    .entry-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .entry-meta { color: #666; font-size: 12px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <h1>${filename}</h1>`;

      entries.forEach(entry => {
        htmlContent += `
  <div class="entry">
    <div class="entry-title">${entry.title}</div>
    <div class="entry-meta">${entry.type} • ${entry.createdDate} • ${entry.wordCount} words</div>
    <div class="entry-content">${entry.content}</div>
  </div>`;
      });

      htmlContent += `
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'md') {
      let mdContent = `# ${filename}\n\n`;
      entries.forEach(entry => {
        mdContent += `## ${entry.title}\n\n`;
        mdContent += `*${entry.type} • ${entry.createdDate} • ${entry.wordCount} words*\n\n`;
        // Basic HTML to Markdown conversion (simplified)
        const plainText = this.stripHtml(entry.content);
        mdContent += plainText.split('\n').map(line => line.trim()).join('\n') + '\n\n---\n\n';
      });

      const blob = new Blob([mdContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // For PDF, we'll use the browser's print functionality
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .entry { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ddd; page-break-inside: avoid; }
    .entry-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .entry-meta { color: #666; font-size: 12px; margin-bottom: 15px; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <h1>${filename}</h1>`;

        entries.forEach(entry => {
          htmlContent += `
  <div class="entry">
    <div class="entry-title">${entry.title}</div>
    <div class="entry-meta">${entry.type} • ${entry.createdDate} • ${entry.wordCount} words</div>
    <div class="entry-content">${entry.content}</div>
  </div>`;
        });

        htmlContent += `
</body>
</html>`;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  }

  private stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Writing Goals
  openGoalsModal() {
    const project = this.activeProject();
    if (project) {
      this.writingGoal.set(project.targetWordCount || 0);
      this.writingGoalPeriod.set('daily');
    }
    this.showGoalsModal.set(true);
  }

  saveWritingGoal() {
    const project = this.activeProject();
    if (!project) return;

    this.journalService.updateProject(project.id, {
      targetWordCount: this.writingGoal()
    });

    this.showGoalsModal.set(false);
  }

  getWritingProgress(project: JournalProject): { current: number; target: number; percentage: number } {
    const current = project.wordCount;
    const target = project.targetWordCount || 0;
    const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return { current, target, percentage };
  }

  getStreakDays(project: JournalProject): number {
    // Mock implementation - in real app, this would calculate based on entry dates
    const entries = this.journalService.getEntries(project.id);
    if (entries.length === 0) return 0;

    // Simple calculation: count unique days with entries
    const entryDates = new Set(entries.map(e => e.createdDate));
    return entryDates.size;
  }

  // View Navigation
  setViewMode(mode: 'kanban' | 'timeline') {
    this.viewMode.set(mode);
  }

  // AI Functionality
  toggleAiPanel() {
    this.showAiPanel.update(v => !v);
  }

  async askAi() {
    if (!this.aiQuery().trim()) return;

    this.isAiLoading.set(true);
    try {
      const response = await this.aiService.sendMessage(this.aiQuery(), this.editingEntry()?.content);
      this.aiResponse.set(response);
    } catch (err) {
      console.error('AI Error:', err);
      this.aiResponse.set('Sorry, I encountered an error. Please try again.');
    } finally {
      this.isAiLoading.set(false);
      this.aiQuery.set('');
    }
  }

  async generateAiSuggestion() {
    const content = this.editor?.getText();
    if (!content) return;

    this.isAiLoading.set(true);
    this.showAiPanel.set(true);
    try {
      const suggestions = await this.aiService.generateSuggestions(content);
      if (suggestions.length > 0) {
        this.aiResponse.set(suggestions[0].content); // Simple display for now
      } else {
        this.aiResponse.set('No suggestions at this time.');
      }
    } catch (err) {
      this.aiResponse.set('Error generating suggestions.');
    } finally {
      this.isAiLoading.set(false);
    }
  }

  insertAiContent() {
    if (!this.aiResponse() || !this.editor) return;
    this.editor.commands.insertContent(this.aiResponse());

    // Mark as AI edited
    const current = this.editingEntry();
    if (current) {
      this.editingEntry.set({
        ...current,
        isAiEdited: true
      });
    }
  }

  filteredProjects = computed(() => {
    const query = this.projectSearchQuery().toLowerCase();
    if (!query) return this.projects();
    return this.projects().filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  toggleProjectDropdown() {
    this.showProjectDropdown.update(v => !v);
  }

  requestDeleteProject(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      this.journalService.deleteProject(id);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdownWrapper = target.closest('.j-dropdown-wrapper');

    // Close dropdown if clicking outside
    if (!dropdownWrapper && this.showProjectDropdown()) {
      this.showProjectDropdown.set(false);
    }
  }

  // Computed properties for statistics
  totalProjects = computed(() => this.projects().length);

  totalEntries = computed(() => {
    return this.projects().reduce((sum, p) => sum + p.entriesCount, 0);
  });

  totalWords = computed(() => {
    return this.projects().reduce((sum, p) => sum + p.wordCount, 0);
  });
}
