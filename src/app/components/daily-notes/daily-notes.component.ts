import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Note } from '../../services/store.service';
import { FormsModule } from '@angular/forms';

interface NoteGroup {
  id: string;
  name: string;
  icon: string;
  count: number;
  expanded: boolean;
  noteIds: string[];
}

interface TagCategory {
  id: string;
  name: string;
  color: string;
  expanded: boolean;
  tags: string[];
}

@Component({
  selector: 'app-daily-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-notes.component.html',
  styleUrl: './daily-notes.component.css'
})
export class DailyNotesComponent {
  private store = inject(StoreService);

  // Connect to store signals
  notes = this.store.notes;

  selectedEntryId = signal<string>('');
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('all'); // all, pinned, tagged, archived
  activeView = signal<'folders' | 'tags'>('folders'); // Track active sidebar view

  // Track open notes as tabs
  openNotes = signal<string[]>([]);

  // Note groups for organization
  noteGroups = signal<NoteGroup[]>([
    { id: 'today', name: 'Today', icon: 'today', count: 0, expanded: true, noteIds: [] },
    { id: 'this-week', name: 'This Week', icon: 'calendar_month', count: 0, expanded: false, noteIds: [] },
    { id: 'older', name: 'Older Notes', icon: 'history', count: 0, expanded: false, noteIds: [] },
  ]);

  // Tag categories with colors
  tagCategories = signal<TagCategory[]>([
    { id: 'meta', name: '00 Meta', color: '#d89090', expanded: true, tags: ['Planning', 'Review', 'Goals'] },
    { id: 'life', name: '10 Life', color: '#e8a87c', expanded: false, tags: ['Health', 'Family', 'Personal'] },
    { id: 'it', name: '20 IT', color: '#f4e89c', expanded: false, tags: ['Programming', 'DevOps', 'Learning'] },
    { id: 'hobbies', name: '30 Hobbies', color: '#a8d5a8', expanded: false, tags: ['Reading', 'Music', 'Art'] },
    { id: 'devsystems', name: '50 DevO Systems', color: '#7eb3d4', expanded: false, tags: ['Architecture', 'Design', 'Tools'] },
    { id: 'unsorted', name: 'Unsorted', color: '#b8d8e8', expanded: false, tags: ['Hippotology', 'Random', 'Misc'] },
  ]);

  showDropdown = signal<boolean>(false);

  // Computed filtered notes
  filteredNotes = computed(() => {
    let list = this.notes();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();

    // Apply search filter
    if (query) {
      list = list.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.preview.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filter === 'pinned') {
      list = list.filter(note => note.tags?.includes('pinned'));
    } else if (filter === 'tagged') {
      list = list.filter(note => note.tags && note.tags.length > 0);
    }

    return list;
  });

  allGroupsCollapsed = computed(() => {
    return this.noteGroups().every(g => !g.expanded);
  });

  allExpanded = computed(() => {
    return this.noteGroups().every(g => g.expanded);
  });

  selectedNote = computed(() => {
    const list = this.filteredNotes();
    if (list.length === 0) {
      return null;
    }
    if (!this.selectedEntryId()) {
      return list[0];
    }
    const found = list.find(n => n.id === this.selectedEntryId());
    return found || list[0];
  });

  constructor() {
    // Initialize selection if notes exist
    if (this.notes().length > 0) {
      const firstNoteId = this.notes()[0].id;
      this.selectedEntryId.set(firstNoteId);
      this.openNotes.set([firstNoteId]);
    }
  }

  handleNewNote() {
    const newNote: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: 'New Daily Note',
      preview: 'Start writing...',
      content: '<p>Start writing your thoughts...</p>',
      tags: []
    };
    this.store.addNote(newNote);
    this.selectedEntryId.set(newNote.id);
  }

  selectNote(id: string) {
    this.selectedEntryId.set(id);
    // Add to open notes if not already open
    if (!this.openNotes().includes(id)) {
      this.openNotes.update(tabs => [...tabs, id]);
    }
  }

  toggleGroup(groupId: string) {
    this.noteGroups.update(groups =>
      groups.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
    );
  }

  setFilter(filter: string) {
    this.selectedFilter.set(filter);
  }

  isPinned(note: Note): boolean {
    return note.tags?.includes('pinned') || false;
  }

  togglePin(note: Note, event: Event) {
    event.stopPropagation();
    // This would update the note's tags in the store
    // For now, just a placeholder
  }

  getNoteTags(note: Note): string[] {
    return note.tags?.filter(tag => tag !== 'pinned') || [];
  }

  expandAll() {
    this.noteGroups.update(groups =>
      groups.map(g => ({ ...g, expanded: true }))
    );
  }

  collapseAll() {
    this.noteGroups.update(groups =>
      groups.map(g => ({ ...g, expanded: false }))
    );
  }

  toggleDropdown() {
    this.showDropdown.update(show => !show);
  }

  handleNewFolder() {
    console.log('Create new folder');
    // Implement folder creation logic
  }

  toggleExpandAll() {
    const shouldExpand = !this.allExpanded();
    this.noteGroups.update(groups =>
      groups.map(g => ({ ...g, expanded: shouldExpand }))
    );
  }

  closeNoteTab(noteId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.openNotes.update(tabs => tabs.filter(id => id !== noteId));

    // If closing the active note, switch to another open note
    if (this.selectedEntryId() === noteId) {
      const remainingTabs = this.openNotes();
      if (remainingTabs.length > 0) {
        this.selectedEntryId.set(remainingTabs[remainingTabs.length - 1]);
      } else {
        this.selectedEntryId.set('');
      }
    }
  }

  getNoteById(id: string): Note | undefined {
    return this.notes().find(n => n.id === id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdownWrapper = target.closest('.dropdown-wrapper');

    // Close dropdown if clicking outside
    if (!dropdownWrapper && this.showDropdown()) {
      this.showDropdown.set(false);
    }
  }

  switchView(view: 'folders' | 'tags') {
    this.activeView.set(view);
  }

  toggleTagCategory(categoryId: string) {
    this.tagCategories.update(categories =>
      categories.map(c => c.id === categoryId ? { ...c, expanded: !c.expanded } : c)
    );
  }

  allTagCategoriesExpanded = computed(() => {
    return this.tagCategories().every(c => c.expanded);
  });

  toggleExpandAllTags() {
    const shouldExpand = !this.allTagCategoriesExpanded();
    this.tagCategories.update(categories =>
      categories.map(c => ({ ...c, expanded: shouldExpand }))
    );
  }
}
