import { Component, input, output, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule],
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
  searchOpen = input.required<boolean>();
  searchQuery = input.required<string>();
  filteredResults = input<SearchResult[] | null>(null);
  focusMode = input.required<boolean>();
  fullScreenMode = input.required<boolean>();
  exportMenuOpen = input.required<boolean>();
  writingType = input<string>('NOVEL');
  rightSidebarOpen = input<boolean>(true);
  aiEnabled = input<boolean>(false);
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

    // Structure is always available for novel/script types (front matter & prologue can always be added).
    // Characters and Locations only appear once content exists.
    const tabs: EditorTab[] = [manuscript, structure];
    if (this.hasCharacters()) tabs.push(characters);
    if (this.hasLocations())  tabs.push(locations);
    return tabs;
  });

  setActiveNav = output<'manuscript' | 'structure' | 'characters' | 'locations'>();
  performUndo = output<void>();
  performRedo = output<void>();
  toggleSearch = output<void>();
  searchQueryChange = output<string>();
  selectSearchResult = output<SearchResult>();
  toggleFocusMode = output<void>();
  toggleFullScreen = output<void>();
  openVersionHistory = output<void>();
  toggleExportMenu = output<void>();
  exportNovel = output<'pdf' | 'html' | 'md' | 'docx' | 'fountain'>();
  toggleRightSidebar = output<void>();
}
