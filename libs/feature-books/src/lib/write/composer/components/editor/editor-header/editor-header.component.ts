import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchResult {
  type: 'chapter' | 'character' | 'location' | 'frontMatter' | 'prologue';
  id: string;
  title: string;
  subtitle?: string;
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
  showExtendedTabs = input<boolean>(true);
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
