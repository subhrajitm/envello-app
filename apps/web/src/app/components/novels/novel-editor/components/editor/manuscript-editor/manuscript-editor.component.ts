import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { TiptapEditorDirective } from 'ngx-tiptap';

@Component({
  selector: 'app-manuscript-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective],
  templateUrl: './manuscript-editor.component.html',
  styleUrls: [
    './manuscript-editor.component.css',
    '../../../novel-editor.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ManuscriptEditorComponent {
  editor = input.required<Editor>();
  activeChapterId = input.required<string | null>();
  title = input.required<string>();
  chapterStatus = input.required<string>();
  chapterLastEdited = input.required<string>();
  isSaving = input.required<boolean>();
  lastSaved = input<Date | null>(null);
  
  titleChange = output<string>();
  addNewChapter = output<void>();
}
