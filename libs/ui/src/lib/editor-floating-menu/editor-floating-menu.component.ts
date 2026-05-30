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

          <!-- Row 1: Ask-input (expanded) OR Ask-btn + AI actions -->
          <div class="env-float-row env-float-row--ai">
            @if (askChangesMode()) {
              <input class="env-ask-input env-ask-input--full"
                     placeholder="Describe changes…"
                     [value]="askChangesText()"
                     (input)="askChangesText.set($any($event.target).value)"
                     (keydown.enter)="submitAskChanges()"
                     (keydown.escape)="exitAskChanges()" />
              <button class="env-float-btn env-ask-submit-btn" (click)="submitAskChanges()" title="Submit">
                <span class="material-symbols-outlined">arrow_upward</span>
              </button>
            } @else {
              <button class="env-ask-btn" (click)="enterAskChanges()" title="Ask AI to make changes">
                Ask for changes
              </button>
              <div class="env-float-divider"></div>
              <ng-content select=".env-float-ai-group" />
            }
          </div>

          <!-- Row 2: Formatting controls + tool extras (always visible) -->
          <div class="env-float-row env-float-row--fmt">
            <button class="env-float-btn" [class.active]="formattingState().link"
                    (click)="linkClick.emit()" title="Link">
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

            <!-- Editor-specific tool extras projected by the parent (task list, image, etc.) -->
            <ng-content />
          </div>
      </div>
    }
  `,
  styleUrl: './editor-floating-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorFloatingMenuComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private stateFramePending = false;

  editor    = input.required<Editor>();
  trigger   = input<'dblclick' | 'selection'>('dblclick');
  containEl = input<HTMLElement | null>(null);

  readonly visibleChange = output<boolean>();
  readonly askChanges    = output<string>();
  /** Emits when user clicks the link button — parent should open its own link modal. */
  readonly linkClick     = output<void>();

  protected menuVisible       = signal(false);
  protected menuPos           = signal({ top: 0, left: 0 });
  protected showTypeDropdown  = signal(false);
  protected askChangesMode    = signal(false);
  protected askChangesText    = signal('');
  protected currentBlockLabel = signal('Text');
  protected formattingState   = signal({ bold: false, italic: false, link: false });

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

    const scheduleStateUpdate = () => {
      if (this.stateFramePending) return;
      this.stateFramePending = true;
      requestAnimationFrame(() => {
        this.stateFramePending = false;
        this.updateEditorState();
      });
    };

    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from !== to && this.trigger() === 'selection') {
        this.showAtSelection();
      } else if (from === to) {
        this.hide();
      }
      scheduleStateUpdate();
    };

    const onTransaction = () => scheduleStateUpdate();

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

  private updateEditorState() {
    const e = this.editor();
    const bold   = e.isActive('bold');
    const italic = e.isActive('italic');
    const link   = e.isActive('link');
    const cur    = this.formattingState();
    if (cur.bold !== bold || cur.italic !== italic || cur.link !== link) {
      this.formattingState.set({ bold, italic, link });
    }

    const label =
      e.isActive('heading', { level: 1 }) ? 'Heading 1' :
      e.isActive('heading', { level: 2 }) ? 'Heading 2' :
      e.isActive('heading', { level: 3 }) ? 'Heading 3' :
      e.isActive('orderedList')            ? 'Numbered list' :
      e.isActive('bulletList')             ? 'Bulleted list' : 'Text';
    if (this.currentBlockLabel() !== label) this.currentBlockLabel.set(label);
  }

  private showAtSelection() {
    const sel = window.getSelection();
    const selRect = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
    const hasSelRect = selRect && (selRect.width > 0 || selRect.height > 0);

    let top: number, bottom: number, left: number, width: number;
    if (hasSelRect) {
      ({ top, bottom, left, width } = selRect!);
    } else {
      // Collapsed caret (blank area double-click) — resolve position via editor coords
      const pos    = this.editor().state.selection.anchor;
      const coords = this.editor().view.coordsAtPos(pos);
      top = coords.top; bottom = coords.bottom; left = coords.left; width = 0;
    }

    const containRect = this.containEl()?.getBoundingClientRect() ?? { top: 0, left: 0 };
    const menuHeight = 78, gap = 8;
    const absTop = top < menuHeight + gap ? bottom + gap : top - menuHeight - gap;

    this.menuPos.set({
      top:  absTop - containRect.top,
      left: left - containRect.left + width / 2,
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
