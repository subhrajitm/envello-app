import {
  Component, input, output, signal, effect,
  OnInit, OnDestroy,
  ChangeDetectionStrategy, ViewEncapsulation, HostListener
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { Location } from '@envello/core';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [FormsModule, TiptapEditorDirective],
  templateUrl: './location-details.component.html',
  styleUrls: [
    './location-details.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class LocationDetailsComponent implements OnInit, OnDestroy {
  location = input<Location | null>(null);
  updateField = output<{ id: string; field: string; value: string | string[] }>();
  addNewLocation = output<void>();

  showIconPicker = signal(false);
  tagInput = signal('');

  descriptionEditor!: Editor;

  private _lastLocId: string | null = null;
  private _isSettingContent = false;

  readonly locationIcons = [
    'location_on', 'map', 'castle', 'forest', 'home', 'apartment',
    'beach_access', 'anchor', 'flight', 'train', 'local_hospital',
    'school', 'restaurant', 'park', 'museum', 'terrain', 'water',
    'cottage', 'warehouse', 'store', 'landscape', 'stadium',
  ];

  constructor() {
    effect(() => {
      const loc = this.location();
      if (!loc || loc.id === this._lastLocId) return;
      this._lastLocId = loc.id;
      if (!this.descriptionEditor || this.descriptionEditor.isDestroyed) return;
      this._isSettingContent = true;
      this.descriptionEditor.commands.setContent(loc.description ?? '');
      this._isSettingContent = false;
    });
  }

  ngOnInit() {
    const loc = this.location();
    this._lastLocId = loc?.id ?? null;

    this.descriptionEditor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Describe the atmosphere, history, and key features…' }),
      ],
      content: loc?.description ?? '',
      onUpdate: ({ editor }) => {
        if (this._isSettingContent) return;
        const l = this.location();
        if (l) this.updateField.emit({ id: l.id, field: 'description', value: editor.getHTML() });
      },
    });
  }

  ngOnDestroy() {
    this.descriptionEditor?.destroy();
  }

  emit(id: string, field: string, value: string) {
    this.updateField.emit({ id, field, value });
  }

  selectIcon(icon: string) {
    const loc = this.location();
    if (loc) this.updateField.emit({ id: loc.id, field: 'icon', value: icon });
    this.showIconPicker.set(false);
  }

  toggleIconPicker(e: Event) {
    e.stopPropagation();
    this.showIconPicker.update(v => !v);
  }

  addTag(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const loc = this.location();
    if (!loc) return;
    const val = this.tagInput().trim().replace(/,$/, '');
    if (!val) return;
    const existing = loc.tags ?? [];
    if (!existing.includes(val)) {
      this.updateField.emit({ id: loc.id, field: 'tags', value: [...existing, val] });
    }
    this.tagInput.set('');
  }

  removeTag(tag: string) {
    const loc = this.location();
    if (!loc) return;
    this.updateField.emit({ id: loc.id, field: 'tags', value: (loc.tags ?? []).filter(t => t !== tag) });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.ne-loc-icon-wrap')) {
      this.showIconPicker.set(false);
    }
  }
}
