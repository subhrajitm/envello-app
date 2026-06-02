import { Component, input, output, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface EditorTabItem {
  id: string;
  label: string;
  icon: string;
}

// Keep for external references
export interface SearchResult {
  type: 'chapter' | 'character' | 'location' | 'frontMatter' | 'prologue';
  id: string;
  title: string;
  subtitle?: string;
}

@Component({
  selector: 'app-editor-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor-header.component.html',
  styleUrls: [
    './editor-header.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EditorHeaderComponent {
  items        = input.required<EditorTabItem[]>();
  activeItemId = input<string | null>(null);
  canUndo      = input.required<boolean>();
  canRedo      = input.required<boolean>();
  focusMode    = input<boolean>(false);

  // Entity mode (characters / locations browse view)
  entityTitle = input<string>('');
  entityIcon  = input<string>('');
  entityCount = input<number>(0);

  // Optional view-mode toggle shown in entity mode
  viewModes       = input<Array<{ key: string; icon: string; label: string }>>([]);
  activeViewMode  = input<string>('');

  // Search (entity mode only)
  searchQuery       = input<string>('');
  searchQueryChange = output<string>();

  selectItem      = output<string>();
  closeTab        = output<string>();
  performUndo     = output<void>();
  performRedo     = output<void>();
  exitFocus       = output<void>();
  addEntityClick  = output<void>();
  viewModeChange  = output<string>();

  singularEntityTitle = computed(() => {
    const t = this.entityTitle();
    return t.endsWith('s') ? t.slice(0, -1) : t;
  });
}
