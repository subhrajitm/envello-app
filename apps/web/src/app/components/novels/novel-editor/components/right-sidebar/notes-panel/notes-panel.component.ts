import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorNote } from '../../../../../../services/novel-content.service';

@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes-panel.component.html',
  styleUrls: [
    './notes-panel.component.css',
    '../../../novel-editor.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class NotesPanelComponent {
  notes = input.required<EditorNote[]>();
  
  addNewNote = output<void>();
  deleteNote = output<string>();
}
