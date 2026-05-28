import { Component, input, output, signal, HostListener, ChangeDetectionStrategy, ViewEncapsulation, OnInit, DestroyRef, ElementRef, inject } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { TiptapEditorDirective } from 'ngx-tiptap';

@Component({
  selector: 'app-manuscript-editor',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, TiptapEditorDirective],
  templateUrl: './manuscript-editor.component.html',
  styleUrls: [
    './manuscript-editor.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ManuscriptEditorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject(ElementRef<HTMLElement>).nativeElement;

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

  showColorPicker = signal(false);

  readonly bgColors = [
    '', 'ms-bg--rose', 'ms-bg--orange', 'ms-bg--yellow', 'ms-bg--green',
    'ms-bg--cyan', 'ms-bg--blue', 'ms-bg--purple', 'ms-bg--pink',
    'ms-bg--warm', 'ms-bg--cool',
  ];

  floatingMenuVisible = signal(false);
  floatingMenuPos = signal({ top: 0, left: 0 });

  ngOnInit() {
    const editor = this.editor();
    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            // contain: layout on app-manuscript-editor makes it the containing block
            // for position:fixed children, so coords must be host-relative
            const hostRect = this.hostEl.getBoundingClientRect();
            const menuHeight = 44;
            const gap = 8;
            const absTop = rect.top < menuHeight + gap
              ? rect.bottom + gap
              : rect.top - menuHeight - gap;
            this.floatingMenuPos.set({
              top: absTop - hostRect.top,
              left: rect.left - hostRect.left + rect.width / 2
            });
            this.floatingMenuVisible.set(true);
            return;
          }
        }
      }
      this.floatingMenuVisible.set(false);
    };
    editor.on('selectionUpdate', onSelectionUpdate);
    this.destroyRef.onDestroy(() => editor.off('selectionUpdate', onSelectionUpdate));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.status-menu-wrapper')) {
      this.statusMenuOpen.set(false);
    }
    if (!target.closest('.ms-color-picker-wrapper')) {
      this.showColorPicker.set(false);
    }
    if (!target.closest('.ms-floating-menu') && !target.closest('.ne-editor-text')) {
      this.floatingMenuVisible.set(false);
    }
  }

  toggleStatusMenu(event: Event) {
    event.stopPropagation();
    this.statusMenuOpen.update(v => !v);
  }

  toggleColorPicker(event: Event) {
    event.stopPropagation();
    this.showColorPicker.update(v => !v);
  }

  selectBgColor(color: string, event: Event) {
    event.stopPropagation();
    this.bgColorChange.emit(color);
    this.showColorPicker.set(false);
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
  wordCount = input<number>(0);
  sessionWords = input<number>(0);
  isFullWidth = input<boolean>(false);
  cardBgColor = input<string>('');

  titleChange = output<string>();
  statusChange = output<'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY'>();
  addNewChapter = output<void>();
  quickAction = output<string>();
  fullWidthChange = output<boolean>();
  bgColorChange = output<string>();
}
