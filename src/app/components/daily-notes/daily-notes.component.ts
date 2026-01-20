import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Note } from '../../services/store.service';
import { FormsModule } from '@angular/forms';

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

  selectedNote = computed(() => {
    const list = this.notes();
    // Default to first note if nothing selected or id not found
    if (!this.selectedEntryId() && list.length > 0) {
      // Side effect in computed is generally bad, but we want to initialize selection
      // Better to check in template or init
      return list[0];
    }
    return list.find(n => n.id === this.selectedEntryId()) || list[0];
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
}
