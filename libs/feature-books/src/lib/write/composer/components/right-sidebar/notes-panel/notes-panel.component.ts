import { Component, input, output, signal, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorNote } from '@envello/core';

@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes-panel.component.html',
  styleUrls: [
    './notes-panel.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class NotesPanelComponent {
  notes = input.required<EditorNote[]>();

  addNewNote = output<void>();
  deleteNote = output<string>();
  updateNote = output<{ id: string; title: string; body: string }>();

  editingNoteId = signal<string | null>(null);
  editTitle = signal('');
  editBody = signal('');

  startEdit(note: EditorNote, event: Event) {
    event.stopPropagation();
    this.editingNoteId.set(note.id);
    this.editTitle.set(note.title);
    this.editBody.set(note.body);
  }

  commitEdit(id: string) {
    const title = this.editTitle().trim();
    if (title) {
      this.updateNote.emit({ id, title, body: this.editBody() });
    }
    this.editingNoteId.set(null);
  }

  cancelEdit() {
    this.editingNoteId.set(null);
  }
}
