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
      <div class="env-floating-menu" [class.env-floating-menu--ask]="askChangesMode()"
           [style.top.px]="menuPos().top"
           [style.left.px]="menuPos().left"
           (mousedown)="$event.preventDefault()">

        @if (askChangesMode()) {
          <!-- Ask-changes input mode -->
          <input class="env-ask-input"
                 placeholder="Describe changes"
                 [value]="askChangesText()"
                 (input)="askChangesText.set($any($event.target).value)"
                 (keydown.enter)="submitAskChanges()"
                 (keydown.escape)="exitAskChanges()" />
          <button class="env-float-btn env-ask-submit-btn" (click)="submitAskChanges()" title="Submit">
            <span class="material-symbols-outlined">arrow_upward</span>
          </button>
        } @else {
          <!-- Ask-changes trigger -->
          <button class="env-ask-btn" (click)="enterAskChanges()" title="Ask AI to make changes (⌘K)">
            Ask for changes
            <kbd class="env-ask-kbd">⌘K</kbd>
          </button>

          <div class="env-float-divider"></div>

          <!-- Link / Bold / Italic -->
          <button class="env-float-btn" [class.active]="formattingState().link"
                  (click)="toggleLink()" title="Link">
            <span class="material-symbols-outlined">link</span>
          </button>
          <button class="env-float-btn env-fmt-btn" [class.active]="formattingState().bold"
                  (click)="editor().chain().focus().toggleBold().run()" title="Bold (⌘B)">
            <strong>B</strong>
          </button>
          <button class="env-float-btn env-fmt-btn" [class.active]="formattingState().italic"
                  (click)="editor().chain().focus().toggleItalic().run()" title="Italic (⌘I)">
            <em>I</em>
          </button>

          <div class="env-float-divider"></div>

          <!-- Block-type dropdown -->
          <div class="env-type-picker-wrapper">
            <button class="env-type-btn" [class.open]="showTypeDropdown()"
                    (click)="toggleTypeDropdown($event)" title="Block type">
              {{ currentBlockLabel() }}
              <span class="material-symbols-outlined" style="font-size:14px;line-height:1">expand_more</span>
            </button>
            @if (showTypeDropdown()) {
              <div class="env-type-dropdown" (click)="$event.stopPropagation()">
                @for (bt of blockTypes; track bt.label) {
                  <button class="env-type-option" [class.active]="currentBlockLabel() === bt.label"
                          (click)="applyBlockType(bt.label, $event)">
                    <span class="env-type-option-label"
                          [class.env-type-heading]="bt.label.startsWith('Heading')">{{ bt.label }}</span>
                    <span class="env-type-shortcut">{{ bt.shortcut }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Editor-specific extras projected by the parent (AI actions, task list, etc.) -->
          <ng-content />
        }
      </div>
    }
  `,
  styleUrl: './editor-floating-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorFloatingMenuComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  editor    = input.required<Editor>();
  /** 'dblclick': show only on double-click.
   *  'selection': show on any non-empty selection AND double-click. */
  trigger   = input<'dblclick' | 'selection'>('dblclick');
  /** Pass the host HTMLElement when inside a `contain: layout` ancestor. */
  containEl = input<HTMLElement | null>(null);

  readonly visibleChange = output<boolean>();
  /** Emits when user submits an "Ask for changes" instruction. */
  readonly askChanges = output<string>();

  protected menuVisible      = signal(false);
  protected menuPos          = signal({ top: 0, left: 0 });
  protected showTypeDropdown = signal(false);
  protected askChangesMode   = signal(false);
  protected askChangesText   = signal('');
  protected currentBlockLabel = signal('Text');
  protected formattingState  = signal({ bold: false, italic: false, link: false });

  protected readonly blockTypes = [
    { label: 'Text',          shortcut: '⌥⌘0' },
    { label: 'Heading 1',     shortcut: '⌥⌘1' },
    { label: 'Heading 2',     shortcut: '⌥⌘2' },
    { label: 'Heading 3',     shortcut: '⌥⌘3' },
    { label: 'Numbered list', shortcut: '⌥⌘4' },
    { label: 'Bulleted list', shortcut: '⌥⌘5' },
  ];

  ngOnInit() {
    const editor = this.editor();

    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from !== to && this.trigger() === 'selection') {
        this.showAtSelection();
      } else if (from === to) {
        this.hide();
      }
      this.updateEditorState();
    };

    const onTransaction = () => this.updateEditorState();

    editor.on('selectionUpdate', onSelectionUpdate);
    editor.on('transaction', onTransaction);
    this.destroyRef.onDestroy(() => {
      editor.off('selectionUpdate', onSelectionUpdate);
      editor.off('transaction', onTransaction);
    });
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

    if (!target.closest('.env-type-dropdown') && !target.closest('.env-type-picker-wrapper')) {
      this.showTypeDropdown.set(false);
    }

    if (inMenu) return;
    if (inEditor && event.detail < 2) { this.hide(); return; }
    if (!inEditor) this.hide();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      if (this.menuVisible() && !this.askChangesMode()) {
        event.preventDefault();
        this.enterAskChanges();
      }
    }
  }

  protected enterAskChanges() {
    this.askChangesText.set('');
    this.askChangesMode.set(true);
    setTimeout(() => {
      (document.querySelector('.env-ask-input') as HTMLInputElement | null)?.focus();
    }, 30);
  }

  protected exitAskChanges() {
    this.askChangesMode.set(false);
    this.askChangesText.set('');
  }

  protected submitAskChanges() {
    const text = this.askChangesText().trim();
    if (!text) { this.exitAskChanges(); return; }
    this.askChanges.emit(text);
    this.exitAskChanges();
    this.hide();
  }

  protected toggleTypeDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showTypeDropdown.update(v => !v);
  }

  protected applyBlockType(label: string, event: MouseEvent) {
    event.stopPropagation();
    const e = this.editor();
    switch (label) {
      case 'Text':          e.chain().focus().setParagraph().run(); break;
      case 'Heading 1':     e.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'Heading 2':     e.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'Heading 3':     e.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'Numbered list': e.chain().focus().toggleOrderedList().run(); break;
      case 'Bulleted list': e.chain().focus().toggleBulletList().run(); break;
    }
    this.showTypeDropdown.set(false);
  }

  protected toggleLink() {
    const e = this.editor();
    if (e.isActive('link')) {
      e.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('Enter URL:');
      if (url) e.chain().focus().setLink({ href: url }).run();
    }
  }

  private updateEditorState() {
    const e = this.editor();
    this.formattingState.set({
      bold:   e.isActive('bold'),
      italic: e.isActive('italic'),
      link:   e.isActive('link'),
    });
    if (e.isActive('heading', { level: 1 }))   this.currentBlockLabel.set('Heading 1');
    else if (e.isActive('heading', { level: 2 })) this.currentBlockLabel.set('Heading 2');
    else if (e.isActive('heading', { level: 3 })) this.currentBlockLabel.set('Heading 3');
    else if (e.isActive('orderedList'))           this.currentBlockLabel.set('Numbered list');
    else if (e.isActive('bulletList'))            this.currentBlockLabel.set('Bulleted list');
    else                                          this.currentBlockLabel.set('Text');
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
      this.showTypeDropdown.set(false);
      this.exitAskChanges();
    }
  }
}
