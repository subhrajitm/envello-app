import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorNote } from '@envello/core';

@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule],
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
}
