import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
let NotesPanelComponent = class NotesPanelComponent {
  notes = input.required();
  addNewNote = output();
  deleteNote = output();
};
NotesPanelComponent = __decorate(
  [
    Component({
      selector: 'app-notes-panel',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './notes-panel.component.html',
      styleUrls: [
        './notes-panel.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  NotesPanelComponent,
);
export { NotesPanelComponent };
