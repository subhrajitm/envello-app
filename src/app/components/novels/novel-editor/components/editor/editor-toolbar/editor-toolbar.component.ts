import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-toolbar.component.html',
  styleUrl: './editor-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorToolbarComponent {
  editor = input.required<Editor>();
  
  openLinkModal = output<void>();
  addImage = output<void>();
  insertTable = output<void>();
  addYoutube = output<void>();
}
