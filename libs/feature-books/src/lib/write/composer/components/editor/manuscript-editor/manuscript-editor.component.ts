import { Component, input, output, signal, HostListener, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
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
  statusMenuOpen = signal(false);

  readonly statusOptions: { value: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY'; label: string; icon: string }[] = [
    { value: 'EMPTY',   label: 'Empty',    icon: 'radio_button_unchecked' },
    { value: 'DRAFT',   label: 'Draft',    icon: 'edit_note' },
    { value: 'EDITING', label: 'Drafting', icon: 'edit' },
    { value: 'DONE',    label: 'Done',     icon: 'check_circle' },
  ];

  chapterStatusLabel(): string {
    return this.statusOptions.find(o => o.value === this.chapterStatus())?.label ?? this.chapterStatus();
  }

  chapterStatusIcon(): string {
    return this.statusOptions.find(o => o.value === this.chapterStatus())?.icon ?? 'radio_button_unchecked';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.status-menu-wrapper')) {
      this.statusMenuOpen.set(false);
    }
  }

  toggleStatusMenu(event: Event) {
    event.stopPropagation();
    this.statusMenuOpen.update(v => !v);
  }

  selectStatus(value: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY', event: Event) {
    event.stopPropagation();
    this.statusChange.emit(value);
    this.statusMenuOpen.set(false);
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
  statusChange = output<'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY'>();
  addNewChapter = output<void>();
}
