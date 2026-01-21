import { Component, computed, inject, signal } from '@angular/core';
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

  // Note groups for organization
  noteGroups = signal<NoteGroup[]>([
    { id: 'today', name: 'Today', icon: 'today', count: 0, expanded: true, noteIds: [] },
    { id: 'this-week', name: 'This Week', icon: 'calendar_month', count: 0, expanded: true, noteIds: [] },
    { id: 'older', name: 'Older Notes', icon: 'history', count: 0, expanded: true, noteIds: [] },
  ]);

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
      this.selectedEntryId.set(this.notes()[0].id);
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
}
