import {
  Component, input, output, signal, HostListener,
  ChangeDetectionStrategy, OnInit, DestroyRef, inject, ViewEncapsulation
} from '@angular/core';
import { Editor } from '@tiptap/core';

@Component({
  selector: 'env-editor-floating-menu',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (menuVisible()) {
      <div class="env-floating-menu"
           [style.top.px]="menuPos().top"
           [style.left.px]="menuPos().left"
           (mousedown)="$event.preventDefault()">

        <!-- Standard formatting buttons — identical across all editors -->
        <button class="env-float-btn"
                (click)="editor().chain().focus().toggleHeading({ level: 1 }).run()"
                title="Heading 1">
          <span class="material-symbols-outlined">format_h1</span>
        </button>
        <button class="env-float-btn"
                (click)="editor().chain().focus().toggleHeading({ level: 2 }).run()"
                title="Heading 2">
          <span class="material-symbols-outlined">format_h2</span>
        </button>
        <button class="env-float-btn"
                (click)="editor().chain().focus().toggleBulletList().run()"
                title="Bullet list">
          <span class="material-symbols-outlined">format_list_bulleted</span>
        </button>
        <button class="env-float-btn"
                (click)="editor().chain().focus().toggleOrderedList().run()"
                title="Ordered list">
          <span class="material-symbols-outlined">format_list_numbered</span>
        </button>
        <button class="env-float-btn"
                (click)="editor().chain().focus().toggleBlockquote().run()"
                title="Quote">
          <span class="material-symbols-outlined">format_quote</span>
        </button>

        <!-- Editor-specific extras projected by the parent (e.g. AI actions, task list) -->
        <ng-content />
      </div>
    }
  `,
  styleUrl: './editor-floating-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorFloatingMenuComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  editor    = input.required<Editor>();
  /** 'dblclick': show only on double-click (use alongside a bubble menu for inline formatting).
   *  'selection': show on any non-empty selection AND double-click (no bubble menu present). */
  trigger   = input<'dblclick' | 'selection'>('dblclick');
  /** Pass the host HTMLElement when inside a `contain: layout` ancestor so position: fixed
   *  coords are correctly offset. Leave null for normal viewport-relative positioning. */
  containEl = input<HTMLElement | null>(null);

  /** Emits true/false on visibility change — bind to a signal used by bubbleMenuShouldShow. */
  readonly visibleChange = output<boolean>();

  protected menuVisible = signal(false);
  protected menuPos     = signal({ top: 0, left: 0 });

  ngOnInit() {
    const editor = this.editor();
    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from !== to && this.trigger() === 'selection') {
        this.showAtSelection();
      } else if (from === to) {
        this.hide();
      }
    };
    editor.on('selectionUpdate', onSelectionUpdate);
    this.destroyRef.onDestroy(() => editor.off('selectionUpdate', onSelectionUpdate));
  }

  @HostListener('document:dblclick', ['$event'])
  onDocumentDblClick(event: MouseEvent) {
    if (this.editor().view.dom.contains(event.target as Node)) {
      this.showAtSelection();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target   = event.target as HTMLElement;
    const editorEl = this.editor().view.dom;
    const inEditor = editorEl.contains(target);
    const inMenu   = !!target.closest('.env-floating-menu');

    if (inMenu) return;
    if (inEditor && event.detail < 2) { this.hide(); return; }
    if (!inEditor) this.hide();
  }

  private showAtSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const containRect = this.containEl()?.getBoundingClientRect() ?? { top: 0, left: 0 };
    const menuHeight = 44, gap = 8;
    const absTop = rect.top < menuHeight + gap ? rect.bottom + gap : rect.top - menuHeight - gap;

    this.menuPos.set({
      top:  absTop - containRect.top,
      left: rect.left - containRect.left + rect.width / 2,
    });
    if (!this.menuVisible()) {
      this.menuVisible.set(true);
      this.visibleChange.emit(true);
    }
  }

  private hide() {
    if (this.menuVisible()) {
      this.menuVisible.set(false);
      this.visibleChange.emit(false);
    }
  }
}
