import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorNote } from '../../../../../services/novel-content.service';

@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes-panel.component.html',
  styleUrl: './notes-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesPanelComponent {
  notes = input.required<EditorNote[]>();
  
  addNewNote = output<void>();
  deleteNote = output<string>();
}
