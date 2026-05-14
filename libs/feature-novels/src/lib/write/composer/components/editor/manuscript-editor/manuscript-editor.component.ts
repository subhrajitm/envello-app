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
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ManuscriptEditorComponent {
  chapterStatusLabel(): string {
    switch (this.chapterStatus()) {
      case 'EMPTY': return 'Empty';
      case 'EDITING': return 'Drafting';
      case 'DONE': return 'Done';
      default: return this.chapterStatus();
    }
  }

  formatSaved(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
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
