import { Component, input, output, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SearchResult {
  type: 'chapter' | 'character' | 'location' | 'frontMatter' | 'prologue';
  id: string;
  title: string;
  subtitle?: string;
}

export interface EditorTab {
  id: 'manuscript' | 'structure' | 'characters' | 'locations';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-editor-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-header.component.html',
  styleUrls: [
    './editor-header.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EditorHeaderComponent {
  activeNav = input.required<'manuscript' | 'structure' | 'characters' | 'locations'>();
  canUndo = input.required<boolean>();
  canRedo = input.required<boolean>();
  writingType = input<string>('NOVEL');
  hasCharacters = input<boolean>(false);
  hasLocations  = input<boolean>(false);

  readonly tabs = computed<EditorTab[]>(() => {
    const t = this.writingType();
    const manuscriptLabel: Record<string, string> = {
      SCRIPT:     'Script',
      POETRY:     'Poem',
      ESSAY:      'Essay',
      ARTICLE:    'Article',
      BLOG_POST:  'Post',
      RESEARCH:   'Document',
    };
    const manuscript: EditorTab = {
      id: 'manuscript',
      label: manuscriptLabel[t] ?? 'Manuscript',
      icon: 'description',
    };
    const structure: EditorTab  = { id: 'structure',  label: 'Structure',  icon: 'menu_book' };
    const characters: EditorTab = { id: 'characters', label: 'Characters', icon: 'group'    };
    const locations: EditorTab  = { id: 'locations',  label: 'Locations',  icon: 'public'   };

    const extended = t === 'NOVEL' || t === 'SHORT_STORY' || t === 'SCRIPT';
    if (!extended) return [manuscript];

    const tabs: EditorTab[] = [manuscript, structure];
    if (this.hasCharacters()) tabs.push(characters);
    if (this.hasLocations())  tabs.push(locations);
    return tabs;
  });

  setActiveNav  = output<'manuscript' | 'structure' | 'characters' | 'locations'>();
  performUndo   = output<void>();
  performRedo   = output<void>();
}
