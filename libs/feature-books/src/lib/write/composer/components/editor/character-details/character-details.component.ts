import {
  Component, input, output, signal, effect,
  OnInit, OnDestroy,
  ChangeDetectionStrategy, ViewEncapsulation
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { Character } from '@envello/core';
import { avatarColor } from '../../../utils/avatar-color.util';

@Component({
  selector: 'app-character-details',
  standalone: true,
  imports: [FormsModule, TiptapEditorDirective],
  templateUrl: './character-details.component.html',
  styleUrls: [
    './character-details.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CharacterDetailsComponent implements OnInit, OnDestroy {
  character = input<Character | null>(null);
  updateField = output<{ id: string; field: string; value: string | string[] }>();
  addNewCharacter = output<void>();

  readonly avatarColor = avatarColor;

  profileCollapsed = signal(false);
  appearanceCollapsed = signal(false);
  biographyCollapsed = signal(false);
  tagsCollapsed = signal(false);

  editingPortrait = signal(false);
  portraitUrlDraft = signal('');
  tagInput = signal('');

  appearanceEditor!: Editor;
  biographyEditor!: Editor;

  private _lastCharId: string | null = null;
  private _isSettingContent = false;

  constructor() {
    effect(() => {
      const c = this.character();
      if (!c || c.id === this._lastCharId) return;
      this._lastCharId = c.id;
      if (!this.appearanceEditor || this.appearanceEditor.isDestroyed) return;
      this._isSettingContent = true;
      this.appearanceEditor.commands.setContent(c.appearance ?? '');
      this.biographyEditor.commands.setContent(c.description ?? '');
      this._isSettingContent = false;
    });
  }

  ngOnInit() {
    const c = this.character();
    this._lastCharId = c?.id ?? null;

    this.appearanceEditor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Describe their physical appearance, mannerisms, and style…' }),
      ],
      content: c?.appearance ?? '',
      onUpdate: ({ editor }) => {
        if (this._isSettingContent) return;
        const char = this.character();
        if (char) this.updateField.emit({ id: char.id, field: 'appearance', value: editor.getHTML() });
      },
    });

    this.biographyEditor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Describe their personality, history, and backstory…' }),
      ],
      content: c?.description ?? '',
      onUpdate: ({ editor }) => {
        if (this._isSettingContent) return;
        const char = this.character();
        if (char) this.updateField.emit({ id: char.id, field: 'description', value: editor.getHTML() });
      },
    });
  }

  ngOnDestroy() {
    this.appearanceEditor?.destroy();
    this.biographyEditor?.destroy();
  }

  emit(id: string, field: string, value: string) {
    this.updateField.emit({ id, field, value });
  }

  addTag(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const c = this.character();
    if (!c) return;
    const val = this.tagInput().trim().replace(/,$/, '');
    if (!val) return;
    const existing = c.tags ?? [];
    if (!existing.includes(val)) {
      this.updateField.emit({ id: c.id, field: 'tags', value: [...existing, val] });
    }
    this.tagInput.set('');
  }

  removeTag(tag: string) {
    const c = this.character();
    if (!c) return;
    this.updateField.emit({ id: c.id, field: 'tags', value: (c.tags ?? []).filter(t => t !== tag) });
  }

  startEditPortrait() {
    this.portraitUrlDraft.set(this.character()?.portraitUrl ?? '');
    this.editingPortrait.set(true);
  }

  commitPortrait() {
    const c = this.character();
    if (c) this.updateField.emit({ id: c.id, field: 'portraitUrl', value: this.portraitUrlDraft() });
    this.editingPortrait.set(false);
  }

  toggleProfile() { this.profileCollapsed.update(v => !v); }
  toggleAppearance() { this.appearanceCollapsed.update(v => !v); }
  toggleBiography() { this.biographyCollapsed.update(v => !v); }
  toggleTags() { this.tagsCollapsed.update(v => !v); }
}
