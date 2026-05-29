import { Component, OnDestroy, OnInit, signal, effect, inject, computed, untracked, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import FloatingMenu from '@tiptap/extension-floating-menu';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookContentService, Chapter, ChapterGroup } from '@envello/core';
import { VersionHistoryService, VersionSnapshot } from '@envello/core';
import { AiService, AiMessage, AiSuggestion } from '@envello/core';
import { StoreService } from '@envello/core';

// Modals
import { DeleteModalComponent, DeleteModalData } from './components/modals/delete-modal/delete-modal.component';
import { AddModalComponent, AddModalData } from './components/modals/add-modal/add-modal.component';
import { LinkModalComponent } from './components/modals/link-modal/link-modal.component';
import { VersionHistoryModalComponent } from './components/modals/version-history-modal/version-history-modal.component';
import { ExportModalComponent, ExportRequest, ExportFormat } from './components/modals/export-modal/export-modal.component';

// Sidebar
import { ChaptersListComponent } from './components/sidebar/chapters-list/chapters-list.component';
import { StructureViewComponent } from './components/sidebar/structure-view/structure-view.component';
import { CharactersListComponent } from './components/sidebar/characters-list/characters-list.component';
import { LocationsListComponent } from './components/sidebar/locations-list/locations-list.component';

// Editor
import { EditorHeaderComponent, SearchResult } from './components/editor/editor-header/editor-header.component';
import { EditorToolbarComponent } from './components/editor/editor-toolbar/editor-toolbar.component';
import { ManuscriptEditorComponent } from './components/editor/manuscript-editor/manuscript-editor.component';
import { StructureEditorComponent } from './components/editor/structure-editor/structure-editor.component';
import { CharacterDetailsComponent } from './components/editor/character-details/character-details.component';
import { LocationDetailsComponent } from './components/editor/location-details/location-details.component';

// Right Sidebar
import { AiPanelComponent } from './components/right-sidebar/ai-panel/ai-panel.component';
import { NotesPanelComponent } from './components/right-sidebar/notes-panel/notes-panel.component';
import { ManuscriptDataComponent } from './components/right-sidebar/manuscript-data/manuscript-data.component';

@Component({
  selector: 'app-composer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // Modals
    DeleteModalComponent,
    AddModalComponent,
    LinkModalComponent,
    VersionHistoryModalComponent,
    ExportModalComponent,
    // Sidebar
    ChaptersListComponent,
    StructureViewComponent,
    CharactersListComponent,
    LocationsListComponent,
    // Editor
    EditorHeaderComponent,
    EditorToolbarComponent,
    ManuscriptEditorComponent,
    StructureEditorComponent,
    CharacterDetailsComponent,
    LocationDetailsComponent,
    // Right Sidebar
    AiPanelComponent,
    NotesPanelComponent,
    ManuscriptDataComponent,
  ],
  templateUrl: './composer.component.html',
  styleUrl: './composer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposerComponent implements OnInit, OnDestroy {
  editor!: Editor;
  bookService = inject(BookContentService);
  versionHistoryService = inject(VersionHistoryService);
  aiService = inject(AiService);
  private store = inject(StoreService);
  route = inject(ActivatedRoute);
  private timeInterval?: number;
  private saveTimeout?: ReturnType<typeof setTimeout>;
  private lastFocusedId: string | null = null;

  // State
  title = signal('');
  activeChapterId = signal<string | null>(null);
  activeGroupId = signal<string | null>(null);
  wordCount = signal(0);
  rightSidebarTab = signal<'ai' | 'notes' | 'manuscript'>('ai');
  activeNav = signal<'manuscript' | 'structure' | 'characters' | 'locations'>('manuscript');

  // Structure view state
  activeFrontMatterId = signal<string | null>(null);
  activePrologueId = signal<string | null>(null);

  // Editor card display state
  editorFullWidth = signal(false);
  editorBgColor = computed(() => this.activeChapter()?.bgColor ?? '');

  // UI State
  focusMode = signal(false);
  showFocusToast = signal(false);
  private focusToastTimer?: ReturnType<typeof setTimeout>;
  typewriterMode = signal(false);
  showTypewriterToast = signal(false);
  private typewriterToastTimer?: ReturnType<typeof setTimeout>;
  fullScreenMode = signal(false);
  leftSidebarCollapsed = signal(false);
  rightSidebarCollapsed = signal(true);
  searchOpen = signal(false);
  searchQuery = signal('');
  exportModalOpen = signal(false);

  // Computed helpers for the export modal
  exportChapters = computed(() => {
    const book = this.book();
    if (!book) return [];
    return book.chapters.map(g => ({
      groupId: g.id,
      groupTitle: g.title,
      wordCount: g.children.reduce((s, c) => s + c.wordCount, 0),
      items: g.children.map(c => ({ id: c.id, title: c.title, wordCount: c.wordCount, status: c.status }))
    }));
  });

  exportFrontMatter = computed(() => {
    const book = this.book();
    if (!book) return [];
    return book.frontMatter.map(fm => ({ id: fm.id, title: fm.title, type: fm.type, wordCount: fm.wordCount }));
  });

  exportPrologue = computed(() => {
    const book = this.book();
    return book?.prologue ? { title: book.prologue.title || 'Prologue', wordCount: book.prologue.wordCount } : null;
  });

  // Bulk selection
  selectedChapters = signal<Set<string>>(new Set());
  bulkMode = signal(false);

  // Time tracking
  sessionStartTime = Date.now();
  elapsedSeconds = signal(0);
  targetWordCount = signal(2500);

  // Recently edited chapters (up to 5 most recent)
  recentChapterIds = signal<string[]>([]);
  recentChapters = computed(() => {
    const book = this.book();
    if (!book) return [] as Chapter[];
    const flat = book.chapters.flatMap(g => g.children);
    return this.recentChapterIds()
      .map(id => flat.find(c => c.id === id))
      .filter(Boolean) as Chapter[];
  });

  // Session word count (words written since session start)
  private sessionStartTotal = 0;
  sessionWords = computed(() => Math.max(0, this.totalNovelWords() - this.sessionStartTotal));
  private bookId = signal('');

  // Auto-save state
  isSaving = signal(false);
  lastSaved = signal<Date | null>(null);

  // Version history state
  versionHistoryOpen = signal(false);
  versionHistory = signal<VersionSnapshot[]>([]);
  canUndo = signal(false);
  canRedo = signal(false);
  editorActive = computed(() => this.activeNav() === 'manuscript' || this.activeNav() === 'structure');

  // AI Companion state
  aiMessages = signal<AiMessage[]>([]);
  aiLoading = signal(false);
  aiError = signal<string | null>(null);
  aiPrompt = signal('');
  aiSuggestions = signal<AiSuggestion[]>([]);
  showContextPreview = signal(false);

  toggleContextPreview() {
    this.showContextPreview.update(v => !v);
  }

  // Computed signals from Service
  book = this.bookService.activeBook;
  isLoading = signal(true);

  writingType = computed(() => {
    const meta = this.store.books().find(n => n.id === this.bookId());
    return meta?.writingType ?? 'NOVEL';
  });

  sectionLabel = computed(() => {
    switch (this.writingType()) {
      case 'NOVEL':
      case 'SHORT_STORY': return 'Chapters';
      case 'SCRIPT':      return 'Scenes';
      case 'POETRY':      return 'Stanzas';
      case 'ESSAY':
      case 'RESEARCH':    return 'Parts';
      default:            return 'Sections';
    }
  });

  showExtendedTabs = computed(() => {
    const t = this.writingType();
    return t === 'NOVEL' || t === 'SHORT_STORY' || t === 'SCRIPT';
  });

  // ARTICLE and BLOG_POST have no concept of front matter or prologue
  showStructureAccordion = computed(() => {
    const t = this.writingType();
    return t !== 'ARTICLE' && t !== 'BLOG_POST';
  });

  // Accordion open/close state for left sidebar sections
  accChapters = signal(true);
  accStructure = signal(false);
  accCharacters = signal(false);
  accLocations = signal(false);

  toggleAccChapters() {
    const wasOpen = this.accChapters();
    this.accChapters.update(v => !v);
    if (!wasOpen) this.activeNav.set('manuscript');
  }
  toggleAccStructure() {
    const wasOpen = this.accStructure();
    this.accStructure.update(v => !v);
    if (!wasOpen) this.activeNav.set('structure');
  }
  toggleAccCharacters() {
    const wasOpen = this.accCharacters();
    this.accCharacters.update(v => !v);
    if (!wasOpen) this.activeNav.set('characters');
  }
  toggleAccLocations() {
    const wasOpen = this.accLocations();
    this.accLocations.update(v => !v);
    if (!wasOpen) this.activeNav.set('locations');
  }

  anyAccOpen = computed(() =>
    this.accChapters() || this.accStructure() || this.accCharacters() || this.accLocations()
  );

  // Index (0-3) of the last open accordion; -1 when none are open.
  // Characters (2) and Locations (3) only exist in the DOM when showExtendedTabs() is true.
  lastOpenIdx = computed(() => {
    if (this.showExtendedTabs() && this.accLocations())  return 3;
    if (this.showExtendedTabs() && this.accCharacters()) return 2;
    if (this.accStructure())  return 1;
    if (this.accChapters())   return 0;
    return -1;
  });

  activeCharacter = computed(() => {
    const n = this.book();
    const id = this.selectedCharacterId();
    return n?.characters.find(c => c.id === id) ?? null;
  });

  activeLocation = computed(() => {
    const n = this.book();
    const id = this.selectedLocationId();
    return n?.locations.find(l => l.id === id) ?? null;
  });

  hasCharactersContent = computed(() => (this.book()?.characters.length ?? 0) > 0);
  hasLocationsContent  = computed(() => (this.book()?.locations.length  ?? 0) > 0);

  openTabIds = signal<string[]>([]);

  openEditorTab(id: string) {
    if (!this.openTabIds().includes(id)) {
      this.openTabIds.update(ids => [...ids, id]);
    }
  }

  closeEditorTab(id: string) {
    const current  = this.openTabIds();
    const wasActive = this.editorActiveTabId() === id; // capture before mutation
    const idx      = current.indexOf(id);
    const next     = current.filter(i => i !== id);
    this.openTabIds.set(next);
    if (wasActive) {
      const fallback = next[Math.min(idx, next.length - 1)] ?? null;
      if (fallback) {
        this.handleEditorTabSelect(fallback);
      } else {
        this.clearActiveSelection();
      }
    }
  }

  private clearActiveSelection() {
    switch (this.activeNav()) {
      case 'manuscript':
        this.activeChapterId.set(null);
        this.title.set('');
        break;
      case 'structure':
        this.activeFrontMatterId.set(null);
        this.activePrologueId.set(null);
        break;
      case 'characters':
        this.selectedCharacterId.set(null);
        break;
      case 'locations':
        this.selectedLocationId.set(null);
        break;
    }
  }

  private fmTypeIcon(type: string): string {
    const map: Record<string, string> = {
      'title-page': 'title', 'copyright': 'copyright', 'toc': 'list',
      'dedication': 'favorite', 'foreword': 'menu_book', 'preface': 'description',
    };
    return map[type] ?? 'description';
  }

  editorTabItems = computed(() => {
    const nav     = this.activeNav();
    const book    = this.book();
    const openIds = this.openTabIds();
    if (!book) return [] as { id: string; label: string; icon: string }[];
    let all: { id: string; label: string; icon: string }[];
    switch (nav) {
      case 'manuscript':
        all = book.chapters.flatMap(g => g.children).map(c => ({ id: c.id, label: c.title, icon: 'description' }));
        break;
      case 'structure': {
        all = book.frontMatter.map(fm => ({ id: fm.id, label: fm.title, icon: this.fmTypeIcon(fm.type) }));
        if (book.prologue) all.push({ id: 'prologue', label: book.prologue.title || 'Prologue', icon: 'menu_book' });
        break;
      }
      case 'characters':
        all = book.characters.map(c => ({ id: c.id, label: c.name, icon: 'account_circle' }));
        break;
      case 'locations':
        all = book.locations.map(l => ({ id: l.id, label: l.name, icon: 'public' }));
        break;
      default:
        all = [];
    }
    return all.filter(item => openIds.includes(item.id));
  });

  editorActiveTabId = computed(() => {
    switch (this.activeNav()) {
      case 'manuscript':  return this.activeChapterId();
      case 'structure':   return this.activeFrontMatterId() ?? (this.activePrologueId() ? 'prologue' : null);
      case 'characters':  return this.selectedCharacterId();
      case 'locations':   return this.selectedLocationId();
    }
  });

  handleEditorTabSelect(id: string) {
    switch (this.activeNav()) {
      case 'manuscript': {
        const chapter = this.book()?.chapters.flatMap(g => g.children).find(c => c.id === id);
        if (chapter) this.selectChapter(chapter);
        break;
      }
      case 'structure':
        id === 'prologue' ? this.selectPrologue() : this.selectFrontMatterItem(id);
        break;
      case 'characters':
        this.selectCharacter(id);
        break;
      case 'locations':
        this.selectLocation(id);
        break;
    }
  }

  activeChapter = computed(() => {
    const chapterId = this.activeChapterId();
    if (!chapterId) return null;
    const book = this.book();
    if (!book) return null;
    for (const group of book.chapters) {
      const chapter = group.children.find(c => c.id === chapterId);
      if (chapter) return chapter;
    }
    return null;
  });

  chapterStatus = computed(() => {
    return this.activeChapter()?.status || 'EMPTY';
  });

  chapterLastEdited = computed(() => {
    return this.activeChapter()?.lastEdited || 'Never';
  });

  // Helper function to calculate word count efficiently
  private calculateWordCount(text: string): number {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  constructor(private router: Router) {
    // Effect to update editor content when active chapter changes
    effect(() => {
      const chapterId = this.activeChapterId();
      const frontMatterId = this.activeFrontMatterId();
      const prologueId = this.activePrologueId();

      if (this.editor) {
        if (chapterId) {
          const chapter = this.bookService.getChapter(chapterId);
          if (chapter) {
            if (this.editor.getHTML() !== chapter.content) {
              this.editor.commands.setContent(chapter.content);
            }
            this.title.set(chapter.title);
            const count = this.calculateWordCount(this.editor.getText());
            this.wordCount.set(count);
            // Always create initial snapshot when first opening a chapter
            const versions = this.versionHistoryService.getVersions(chapterId, 'chapter');
            if (versions.length === 0) {
              this.versionHistoryService.addVersion(chapterId, 'chapter', chapter.content, chapter.title, count, true);
            }
            // Only auto-focus when switching to a different chapter — not on title/content updates
            if (this.lastFocusedId !== chapterId) {
              this.lastFocusedId = chapterId;
              setTimeout(() => this.editor?.commands.focus('end'), 0);
            }
          }
        } else if (frontMatterId) {
          const book = this.book();
          const item = book?.frontMatter.find(fm => fm.id === frontMatterId);
          if (item) {
            if (this.editor.getHTML() !== item.content) {
              this.editor.commands.setContent(item.content);
            }
            this.title.set(item.title);
            const count = this.calculateWordCount(this.editor.getText());
            this.wordCount.set(count);
            const versions = this.versionHistoryService.getVersions(frontMatterId, 'frontMatter');
            if (versions.length === 0) {
              this.versionHistoryService.addVersion(frontMatterId, 'frontMatter', item.content, item.title, count, true);
            }
            if (this.lastFocusedId !== frontMatterId) {
              this.lastFocusedId = frontMatterId;
              setTimeout(() => this.editor?.commands.focus('end'), 0);
            }
          }
        } else if (prologueId) {
          const book = this.book();
          const prologue = book?.prologue;
          if (prologue) {
            if (this.editor.getHTML() !== prologue.content) {
              this.editor.commands.setContent(prologue.content);
            }
            this.title.set(prologue.title);
            const count = this.calculateWordCount(this.editor.getText());
            this.wordCount.set(count);
            const versions = this.versionHistoryService.getVersions('prologue', 'prologue');
            if (versions.length === 0) {
              this.versionHistoryService.addVersion('prologue', 'prologue', prologue.content, prologue.title, count, true);
            }
            if (this.lastFocusedId !== 'prologue') {
              this.lastFocusedId = 'prologue';
              setTimeout(() => this.editor?.commands.focus('end'), 0);
            }
          }
        } else if (!chapterId && !frontMatterId && !prologueId) {
          this.editor.commands.clearContent();
          this.title.set('');
          this.wordCount.set(0);
          this.lastFocusedId = null;
        }
      }
    });

    // Auto-select first chapter when book loads — but NOT when user closes the last tab.
    // untracked() on activeChapterId ensures this effect only re-runs on book changes,
    // not every time the user clears the active selection.
    effect(() => {
      const n = this.book();
      if (n && !untracked(() => this.activeChapterId()) && !untracked(() => this.openTabIds()).length) {
        if (n.chapters.length > 0 && n.chapters[0].children.length > 0) {
          this.selectChapter(n.chapters[0].children[0]);
        }
      }
    });

    // Effect to switch tab if AI is disabled
    effect(() => {
      if (!this.aiService.aiEnabled() && this.rightSidebarTab() === 'ai') {
        this.rightSidebarTab.set('notes');
      }
    });

    // Sync writing goal target from store book metadata
    effect(() => {
      const meta = this.store.books().find(n => n.id === this.bookId());
      if (meta?.targetWordCount) {
        this.targetWordCount.set(meta.targetWordCount);
      }
    });

    // Time tracking interval – guard against accidental double-init
    if (this.timeInterval) clearInterval(this.timeInterval);
    this.timeInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.elapsedSeconds.set(elapsed);
    }, 1000);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '1';
    this.bookId.set(id);

    // Initialize editor first (non-blocking)
    this.editor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start writing your chapter...',
        }),
        FloatingMenu.configure({
          pluginKey: 'composerFloatingMenu',
          shouldShow: ({ editor }) =>
            editor.isActive('paragraph') && editor.state.selection.$from.parent.content.size === 0,
        }),
      ],
      content: '', // Initial content will be set by effect
      onTransaction: ({ editor }) => {
        this.canUndo.set(editor.can().undo());
        this.canRedo.set(editor.can().redo());
      },
      onUpdate: ({ editor }) => {
        const count = this.calculateWordCount(editor.getText());
        this.wordCount.set(count);

        // Auto-save to service with debouncing
        this.isSaving.set(true);
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          const activeId = this.activeChapterId();
          const frontMatterId = this.activeFrontMatterId();
          const prologueId = this.activePrologueId();
          const content = editor.getHTML();
          const title = this.title();

          if (activeId) {
            this.bookService.updateChapterContent(activeId, content, count);
            this.versionHistoryService.addVersion(activeId, 'chapter', content, title, count);
          } else if (frontMatterId) {
            this.bookService.updateFrontMatterContent(frontMatterId, content, count);
            this.versionHistoryService.addVersion(frontMatterId, 'frontMatter', content, title, count);
          } else if (prologueId) {
            this.bookService.updatePrologueContent(content, count);
            this.versionHistoryService.addVersion('prologue', 'prologue', content, title, count);
          }

          this.isSaving.set(false);
          this.lastSaved.set(new Date());
        }, 1000); // 1 second debounce
      }
    });

    // Load book data from DB (async)
    this.bookService.loadBook(id).then(() => {
      this.isLoading.set(false);
      this.sessionStartTotal = this.totalNovelWords();
    });
  }

  ngOnDestroy() {
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    if (this.focusToastTimer) clearTimeout(this.focusToastTimer);
    if (this.typewriterToastTimer) clearTimeout(this.typewriterToastTimer);
    this.editor.destroy();
  }

  goBack() {
    this.router.navigate(['/write']);
  }

  toggleChapter(group: ChapterGroup) {
    this.bookService.toggleGroupExpand(group.id);
  }

  selectChapter(chapter: Chapter | { id: string }) {
    const book = this.book();
    if (!book) return;
    for (const group of book.chapters) {
      const found = group.children.find(c => c.id === chapter.id);
      if (found) {
        this.openEditorTab(found.id);
        this.activeChapterId.set(found.id);
        this.activeGroupId.set(group.id);
        this.recentChapterIds.update(ids => [found.id, ...ids.filter(id => id !== found.id)].slice(0, 5));
        return;
      }
    }
  }

  setActiveTab(tab: 'ai' | 'notes' | 'manuscript') {
    if (this.rightSidebarCollapsed() || this.rightSidebarTab() !== tab) {
      this.rightSidebarTab.set(tab);
      this.rightSidebarCollapsed.set(false);
    } else {
      this.rightSidebarCollapsed.set(true);
    }
  }

  setActiveNav(nav: 'manuscript' | 'structure' | 'characters' | 'locations') {
    const extended = this.showExtendedTabs();
    if (!extended && (nav === 'characters' || nav === 'locations')) {
      this.activeNav.set('manuscript');
      return;
    }

    const prev = this.activeNav();
    this.activeNav.set(nav);

    // Sync the corresponding sidebar accordion open when a tab is clicked
    if (nav === 'manuscript') {
      this.accChapters.set(true);
    } else if (nav === 'structure') {
      this.accStructure.set(true);
    } else if (nav === 'characters') {
      this.accCharacters.set(true);
    } else if (nav === 'locations') {
      this.accLocations.set(true);
    }

    // When navigating away from Structure, clear stale selection so editor doesn't show stale content
    if (prev === 'structure' && nav !== 'structure') {
      this.activeFrontMatterId.set(null);
      this.activePrologueId.set(null);
    }
  }

  // Title editing
  onTitleChange(newTitle: string) {
    this.title.set(newTitle);
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();
    if (activeId) {
      this.bookService.updateChapterTitle(activeId, newTitle);
    } else if (frontMatterId) {
      this.bookService.updateFrontMatterTitle(frontMatterId, newTitle);
    } else if (prologueId) {
      this.bookService.updatePrologueTitle(newTitle);
    }
  }

  onChapterStatusChange(status: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY') {
    const activeId = this.activeChapterId();
    if (activeId) this.bookService.updateChapterStatus(activeId, status);
  }

  // Delete Modal State
  showBulkMoveModal = signal(false);

  deleteModal = signal<{
    isOpen: boolean;
    type: 'chapter' | 'group' | 'character' | 'location' | 'note' | 'bulkChapters' | null;
    id: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: ''
  });

  requestDelete(type: 'chapter' | 'group' | 'character' | 'location' | 'note' | 'bulkChapters', id: string, name?: string) {
    let title = 'Delete Item';
    let message = 'Are you sure you want to delete this item? This action cannot be undone.';

    switch (type) {
      case 'chapter':
        title = 'Delete Chapter?';
        message = `Are you sure you want to delete "${name || 'this chapter'}"?`;
        break;
      case 'group':
        title = 'Delete Act/Part?';
        const book = this.book();
        const group = book?.chapters.find(g => g.id === id);
        const chapterCount = group?.children.length || 0;
        if (chapterCount > 0) {
          message = `Are you sure you want to delete "${name || 'this act/part'}"? This will also delete ${chapterCount} chapter${chapterCount > 1 ? 's' : ''} inside it. This action cannot be undone.`;
        } else {
          message = `Are you sure you want to delete "${name || 'this act/part'}"?`;
        }
        break;
      case 'character':
        title = 'Delete Character?';
        message = `Are you sure you want to delete "${name || 'this character'}"?`;
        break;
      case 'location':
        title = 'Delete Location?';
        message = `Are you sure you want to delete "${name || 'this location'}"?`;
        break;
      case 'note':
        title = 'Delete Note?';
        message = 'Are you sure you want to delete this note?';
        break;
    }

    this.deleteModal.set({
      isOpen: true,
      type,
      id,
      title,
      message
    });
  }

  confirmDelete() {
    const modal = this.deleteModal();
    if (!modal.id || !modal.type) return;

    switch (modal.type) {
      case 'chapter':
        this.bookService.deleteChapter(modal.id);
        this.closeEditorTab(modal.id);
        if (this.activeChapterId() === modal.id) {
          this.activeChapterId.set(null);
          this.title.set('');
          this.editor.commands.clearContent();
        }
        break;
      case 'group': {
        const book = this.book();
        const deletedGroup = book?.chapters.find(g => g.id === modal.id);
        if (deletedGroup) {
          const deletedChapterIds = deletedGroup.children.map(c => c.id);
          deletedChapterIds.forEach(id => this.closeEditorTab(id));
          if (this.activeChapterId() && deletedChapterIds.includes(this.activeChapterId()!)) {
            this.activeChapterId.set(null);
            this.title.set('');
            this.editor.commands.clearContent();
          }
        }
        this.bookService.deleteChapterGroup(modal.id);
        break;
      }
      case 'character':
        this.bookService.deleteCharacter(modal.id);
        this.closeEditorTab(modal.id);
        if (this.selectedCharacterId() === modal.id) {
          this.selectedCharacterId.set(null);
        }
        break;
      case 'location':
        this.bookService.deleteLocation(modal.id);
        this.closeEditorTab(modal.id);
        if (this.selectedLocationId() === modal.id) {
          this.selectedLocationId.set(null);
        }
        break;
      case 'note':
        this.bookService.deleteNote(modal.id);
        break;
      case 'bulkChapters':
        this.executeBulkDelete();
        break;
    }

    this.cancelDelete();
  }

  cancelDelete() {
    this.deleteModal.set({
      isOpen: false,
      type: null,
      id: null,
      title: '',
      message: ''
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Don't interfere with any open modal
    if (this.addModal().isOpen || this.deleteModal().isOpen ||
        this.imageModalOpen() || this.youtubeModalOpen() || this.showBulkMoveModal()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.add-menu-wrapper')) {
      this.addMenuOpen.set(false);
      this.structureFmAddMenuOpen.set(false);
    }
    if (!target.closest('.search-wrapper')) {
      this.searchOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Cmd/Ctrl + K for search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggleSearch();
      return;
    }

    // Cmd/Ctrl + S to save (prevent default browser save)
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      // Auto-save is already handled, but we can show a toast/indicator
      return;
    }

    // Escape to close modals (highest-priority first)
    if (event.key === 'Escape') {
      if (this.imageModalOpen()) { this.cancelImageModal(); return; }
      if (this.youtubeModalOpen()) { this.cancelYoutubeModal(); return; }
      if (this.linkModalOpen()) { this.cancelLinkModal(); return; }
      if (this.addModal().isOpen) { this.cancelAdd(); return; }
      if (this.deleteModal().isOpen) { this.cancelDelete(); return; }
      if (this.exportModalOpen()) { this.exportModalOpen.set(false); return; }
      if (this.versionHistoryOpen()) { this.closeVersionHistory(); return; }
      if (this.showBulkMoveModal()) { this.showBulkMoveModal.set(false); return; }
      if (this.searchOpen()) { this.searchOpen.set(false); }
    }

    // Cmd/Ctrl + \ for focus mode
    if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
      event.preventDefault();
      this.focusMode.update(v => !v);
      return;
    }

    // Cmd/Ctrl + T for typewriter mode
    if ((event.metaKey || event.ctrlKey) && event.key === 't') {
      event.preventDefault();
      this.toggleTypewriterMode();
      return;
    }

    // Alt+Down / Alt+Up for chapter navigation
    if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateChapter('next');
      return;
    }
    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateChapter('prev');
      return;
    }

    // F11 for fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullScreen();
      return;
    }
  }

  // Add menu state – chapters and structure have separate signals so opening one doesn't affect the other
  addMenuOpen = signal(false);
  structureFmAddMenuOpen = signal(false);

  // Add Modal State
  addModal = signal<{
    isOpen: boolean;
    type: 'act' | 'chapter' | 'note' | null;
    title: string;
    inputValue: string;
    inputValue2?: string; // For notes body
  }>({
    isOpen: false,
    type: null,
    title: '',
    inputValue: '',
    inputValue2: ''
  });

  // Chapter management
  addNewChapter(groupId?: string) {
    this.addMenuOpen.set(false);
    const book = this.book();
    if (!book) return;

    // Ensure manuscript section is active and visible
    this.activeNav.set('manuscript');
    this.accChapters.set(true);

    // If no groups exist, create one first
    if (book.chapters.length === 0) {
      this.bookService.addChapterGroup('Part I');
    }

    this.addModal.set({
      isOpen: true,
      type: 'chapter',
      title: 'Add New Chapter',
      inputValue: 'Untitled Chapter'
    });
  }

  confirmAdd() {
    const modal = this.addModal();
    if (!modal.type || !modal.inputValue.trim()) {
      return;
    }

    if (modal.type === 'act') {
      this.bookService.addChapterGroup(modal.inputValue.trim());
    } else if (modal.type === 'chapter') {
      const book = this.book();
      if (book) {
        const targetGroupId = this.activeGroupId() || book.chapters[0]?.id;
        if (targetGroupId) {
          // Store the current chapter count to identify the new one
          const targetGroup = book.chapters.find(g => g.id === targetGroupId);
          const chapterCountBefore = targetGroup?.children.length || 0;

          this.bookService.addChapter(targetGroupId, modal.inputValue.trim());

          // Signal store updates synchronously — select the new chapter immediately
          const updatedBook = this.book();
          if (updatedBook) {
            const updatedGroup = updatedBook.chapters.find(g => g.id === targetGroupId);
            if (updatedGroup && updatedGroup.children.length > chapterCountBefore) {
              const newChapter = updatedGroup.children[updatedGroup.children.length - 1];
              this.selectChapter(newChapter);
            }
          }
        }
      }
    } else if (modal.type === 'note') {
      this.bookService.addNote(
        modal.inputValue.trim(),
        modal.inputValue2?.trim() || '',
        this.activeChapterId() || undefined
      );
    }

    this.cancelAdd();
  }

  cancelAdd() {
    this.addModal.set({
      isOpen: false,
      type: null,
      title: '',
      inputValue: '',
      inputValue2: ''
    });
  }

  updateAddModalInput(value: string) {
    this.addModal.update(modal => ({
      ...modal,
      inputValue: value
    }));
  }

  updateAddModalInput2(value: string) {
    this.addModal.update(modal => ({
      ...modal,
      inputValue2: value
    }));
  }

  addNewActOrPart() {
    this.addMenuOpen.set(false);
    this.activeNav.set('manuscript');
    this.accChapters.set(true);
    this.addModal.set({
      isOpen: true,
      type: 'act',
      title: 'Add New Act/Part',
      inputValue: 'New Part'
    });
  }

  toggleAddMenu() { this.addMenuOpen.update(v => !v); }
  toggleStructureFmAddMenu() { this.structureFmAddMenuOpen.update(v => !v); }

  deleteChapter(chapterId: string, title?: string) {
    this.requestDelete('chapter', chapterId, title);
  }

  deleteGroup(groupId: string, title?: string) {
    this.requestDelete('group', groupId, title);
  }

  // Note management
  addNewNote() {
    this.addModal.set({
      isOpen: true,
      type: 'note',
      title: 'Add New Note',
      inputValue: '',
      inputValue2: ''
    });
  }

  deleteNote(noteId: string) {
    this.requestDelete('note', noteId);
  }

  selectedCharacterId = signal<string | null>(null);
  selectedLocationId = signal<string | null>(null);

  // Character management
  addNewCharacter() {
    const before = new Set((this.book()?.characters ?? []).map(c => c.id));
    this.bookService.addCharacter('New Character');
    const newChar = this.book()?.characters.find(c => !before.has(c.id));
    if (newChar) this.selectCharacter(newChar.id);
  }

  selectCharacter(charId: string) {
    this.openEditorTab(charId);
    this.selectedCharacterId.set(charId);
  }

  updateCharacterField(charId: string, field: string, value: string) {
    this.bookService.updateCharacter(charId, { [field]: value });
  }

  // Handler for component output
  onCharacterFieldUpdate(data: { id: string; field: string; value: string }) {
    this.updateCharacterField(data.id, data.field, data.value);
  }

  deleteCharacter(charId: string, name?: string) {
    this.requestDelete('character', charId, name);
  }

  // Location management
  addNewLocation() {
    const before = new Set((this.book()?.locations ?? []).map(l => l.id));
    this.bookService.addLocation('New Location');
    const newLoc = this.book()?.locations.find(l => !before.has(l.id));
    if (newLoc) this.selectLocation(newLoc.id);
  }

  selectLocation(locId: string) {
    this.openEditorTab(locId);
    this.selectedLocationId.set(locId);
  }

  updateLocationField(locId: string, field: string, value: string) {
    this.bookService.updateLocation(locId, { [field]: value });
  }

  // Handler for component output
  onLocationFieldUpdate(data: { id: string; field: string; value: string }) {
    this.updateLocationField(data.id, data.field, data.value);
  }

  deleteLocation(locId: string, name?: string) {
    this.requestDelete('location', locId, name);
  }

  // Time formatting
  getFormattedTime(): string {
    const seconds = this.elapsedSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  goalProgress = computed(() => {
    const target = this.targetWordCount();
    if (target === 0) return 0;
    return Math.min(Math.round((this.totalNovelWords() / target) * 100), 100);
  });

  // Novel statistics
  totalNovelWords = computed(() => {
    const book = this.book();
    if (!book) return 0;
    let total = 0;
    book.chapters.forEach(group => {
      group.children.forEach(chap => {
        total += chap.wordCount;
      });
    });
    if (book.prologue) total += book.prologue.wordCount;
    book.frontMatter.forEach(item => {
      total += item.wordCount;
    });
    return total;
  });

  averageChapterLength = computed(() => {
    const book = this.book();
    if (!book) return 0;
    let totalChapters = 0;
    let totalWords = 0;
    book.chapters.forEach(group => {
      group.children.forEach(chap => {
        totalChapters++;
        totalWords += chap.wordCount;
      });
    });
    return totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;
  });

  chaptersCompleted = computed(() => {
    const book = this.book();
    if (!book) return 0;
    let completed = 0;
    book.chapters.forEach(group => {
      group.children.forEach(chap => {
        if (chap.status === 'DONE') completed++;
      });
    });
    return completed;
  });

  totalChapters = computed(() => {
    const book = this.book();
    if (!book) return 0;
    return book.chapters.reduce((sum, g) => sum + g.children.length, 0);
  });

  // Front Matter Management
  getFrontMatterTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'title-page': 'Title Page',
      'copyright': 'Copyright Page',
      'toc': 'Table of Contents',
      'dedication': 'Dedication',
      'foreword': 'Foreword',
      'preface': 'Preface'
    };
    return labels[type] || type;
  }

  getFrontMatterTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'title-page': 'title',
      'copyright': 'copyright',
      'toc': 'list',
      'dedication': 'favorite',
      'foreword': 'menu_book',
      'preface': 'description'
    };
    return icons[type] || 'description';
  }

  addFrontMatterItem(type: 'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface') {
    const title = this.getFrontMatterTypeLabel(type);
    this.bookService.addFrontMatterItem(type, title);
  }

  selectFrontMatterItem(itemId: string) {
    this.openEditorTab(itemId);
    this.activeFrontMatterId.set(itemId);
    this.activeChapterId.set(null);
    this.activePrologueId.set(null);
  }

  selectPrologue() {
    this.openEditorTab('prologue');
    this.activePrologueId.set('prologue');
    this.activeChapterId.set(null);
    this.activeFrontMatterId.set(null);
  }

  addPrologue() {
    this.bookService.addPrologue();
    this.selectPrologue();
  }

  deletePrologue() {
    this.bookService.deletePrologue();
    this.closeEditorTab('prologue');
    this.activePrologueId.set(null);
  }

  deleteFrontMatterItem(itemId: string, title: string) {
    this.bookService.deleteFrontMatterItem(itemId);
    this.closeEditorTab(itemId);
    if (this.activeFrontMatterId() === itemId) {
      this.activeFrontMatterId.set(null);
      this.title.set('');
      this.editor.commands.clearContent();
    }
  }


  performUndo() {
    this.editor?.chain().focus().undo().run();
  }

  performRedo() {
    this.editor?.chain().focus().redo().run();
  }

  openVersionHistory() {
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();

    let versions: VersionSnapshot[] = [];

    if (activeId) {
      versions = this.versionHistoryService.getVersions(activeId, 'chapter');
    } else if (frontMatterId) {
      versions = this.versionHistoryService.getVersions(frontMatterId, 'frontMatter');
    } else if (prologueId) {
      versions = this.versionHistoryService.getVersions('prologue', 'prologue');
    }

    this.versionHistory.set(versions);
    this.versionHistoryOpen.set(true);
  }

  closeVersionHistory() {
    this.versionHistoryOpen.set(false);
  }

  restoreVersion(versionId: string) {
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();

    let snapshot: VersionSnapshot | null = null;

    if (activeId) {
      snapshot = this.versionHistoryService.restoreVersion(activeId, 'chapter', versionId);
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.bookService.updateChapterContent(activeId, snapshot.content, snapshot.wordCount);
        // Create immediate snapshot of restored version
        this.versionHistoryService.addVersion(activeId, 'chapter', snapshot.content, snapshot.title, snapshot.wordCount, true);
      }
    } else if (frontMatterId) {
      snapshot = this.versionHistoryService.restoreVersion(frontMatterId, 'frontMatter', versionId);
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.bookService.updateFrontMatterContent(frontMatterId, snapshot.content, snapshot.wordCount);
        this.versionHistoryService.addVersion(frontMatterId, 'frontMatter', snapshot.content, snapshot.title, snapshot.wordCount, true);
      }
    } else if (prologueId) {
      snapshot = this.versionHistoryService.restoreVersion('prologue', 'prologue', versionId);
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.bookService.updatePrologueContent(snapshot.content, snapshot.wordCount);
        this.versionHistoryService.addVersion('prologue', 'prologue', snapshot.content, snapshot.title, snapshot.wordCount, true);
      }
    }

    if (snapshot) {
      this.closeVersionHistory();
    }
  }

  // Character/Location Mentions - converted to computed signals for performance
  mentionedCharacters = computed(() => {
    const chapterId = this.activeChapterId();
    if (!chapterId) return [];

    const chapter = this.activeChapter();
    if (!chapter) return [];

    const content = chapter.content.replace(/<[^>]+>/g, ' ').toLowerCase();
    const book = this.book();
    if (!book) return [];

    return book.characters
      .filter(char => content.includes(char.name.toLowerCase()))
      .map(char => char.name);
  });

  mentionedLocations = computed(() => {
    const chapterId = this.activeChapterId();
    if (!chapterId) return [];

    const chapter = this.activeChapter();
    if (!chapter) return [];

    const content = chapter.content.replace(/<[^>]+>/g, ' ').toLowerCase();
    const book = this.book();
    if (!book) return [];

    return book.locations
      .filter(loc => content.includes(loc.name.toLowerCase()))
      .map(loc => loc.name);
  });

  // Search functionality - optimized with early returns and cached lowercase
  filteredChapters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return null;

    const book = this.book();
    if (!book) return null;

    const results: Array<{ type: 'chapter' | 'character' | 'location' | 'frontMatter' | 'prologue', id: string, title: string, subtitle?: string }> = [];

    // Search chapters - only check title for performance (content search is expensive)
    for (const group of book.chapters) {
      for (const chap of group.children) {
        if (chap.title.toLowerCase().includes(query)) {
          results.push({
            type: 'chapter',
            id: chap.id,
            title: chap.title,
            subtitle: `Chapter in ${group.title}`
          });
        }
      }
    }

    // Search characters
    for (const char of book.characters) {
      const nameLower = char.name.toLowerCase();
      if (nameLower.includes(query) || (char.description && char.description.toLowerCase().includes(query))) {
        results.push({
          type: 'character',
          id: char.id,
          title: char.name,
          subtitle: char.role
        });
      }
    }

    // Search locations
    for (const loc of book.locations) {
      const nameLower = loc.name.toLowerCase();
      if (nameLower.includes(query) || (loc.description && loc.description.toLowerCase().includes(query))) {
        results.push({
          type: 'location',
          id: loc.id,
          title: loc.name,
          subtitle: loc.type
        });
      }
    }

    // Search front matter
    for (const item of book.frontMatter) {
      if (item.title.toLowerCase().includes(query) || (item.content && item.content.toLowerCase().includes(query))) {
        results.push({
          type: 'frontMatter',
          id: item.id,
          title: item.title,
          subtitle: this.getFrontMatterTypeLabel(item.type)
        });
      }
    }

    // Search prologue
    if (book.prologue) {
      const prologue = book.prologue;
      if (prologue.title.toLowerCase().includes(query) || (prologue.content && prologue.content.toLowerCase().includes(query))) {
        results.push({
          type: 'prologue',
          id: 'prologue',
          title: prologue.title,
          subtitle: 'Prologue'
        });
      }
    }

    return results;
  });

  selectSearchResult(result: { type: string, id: string }) {
    if (result.type === 'chapter') {
      const book = this.book();
      if (book) {
        for (const group of book.chapters) {
          const chapter = group.children.find(c => c.id === result.id);
          if (chapter) {
            this.selectChapter(chapter);
            this.setActiveNav('manuscript');
            break;
          }
        }
      }
    } else if (result.type === 'character') {
      this.selectCharacter(result.id);
      this.setActiveNav('characters');
    } else if (result.type === 'location') {
      this.selectLocation(result.id);
      this.setActiveNav('locations');
    } else if (result.type === 'frontMatter') {
      this.selectFrontMatterItem(result.id);
      this.setActiveNav('structure');
    } else if (result.type === 'prologue') {
      this.selectPrologue();
      this.setActiveNav('structure');
    }
    this.searchOpen.set(false);
    this.searchQuery.set('');
  }

  // Focus mode
  toggleFocusMode() {
    this.focusMode.update(v => !v);
    if (this.focusMode()) {
      // Entering focus mode: collapse sidebars
      this.leftSidebarCollapsed.set(true);
      this.rightSidebarCollapsed.set(true);
      // Show first-time toast
      const seenKey = 'envello-focus-toast-seen';
      if (!localStorage.getItem(seenKey)) {
        this.showFocusToast.set(true);
        if (this.focusToastTimer) clearTimeout(this.focusToastTimer);
        this.focusToastTimer = setTimeout(() => {
          this.showFocusToast.set(false);
          localStorage.setItem(seenKey, 'true');
        }, 4000);
      }
    } else {
      // Exiting focus mode: restore sidebars to default (visible)
      this.leftSidebarCollapsed.set(false);
      this.rightSidebarCollapsed.set(false);
      this.showFocusToast.set(false);
    }
  }

  dismissFocusToast() {
    this.showFocusToast.set(false);
    if (this.focusToastTimer) clearTimeout(this.focusToastTimer);
    localStorage.setItem('envello-focus-toast-seen', 'true');
  }

  toggleTypewriterMode() {
    this.typewriterMode.update(v => !v);
    if (this.typewriterMode()) {
      this.showTypewriterToast.set(true);
      if (this.typewriterToastTimer) clearTimeout(this.typewriterToastTimer);
      this.typewriterToastTimer = setTimeout(() => this.showTypewriterToast.set(false), 3000);
    } else {
      this.showTypewriterToast.set(false);
      if (this.typewriterToastTimer) clearTimeout(this.typewriterToastTimer);
    }
  }

  navigateChapter(direction: 'prev' | 'next') {
    const book = this.book();
    if (!book) return;
    const all = book.chapters.flatMap(g => g.children);
    if (all.length === 0) return;
    const idx = all.findIndex(c => c.id === this.activeChapterId());
    if (idx === -1) { this.selectChapter(all[0]); return; }
    const target = direction === 'next' ? idx + 1 : idx - 1;
    if (target >= 0 && target < all.length) this.selectChapter(all[target]);
  }

  navigateToCharacter(name: string) {
    const char = this.book()?.characters.find(c => c.name === name);
    if (char) { this.selectCharacter(char.id); this.setActiveNav('characters'); }
  }

  setEditorBgColor(color: string) {
    const id = this.activeChapterId();
    if (id) this.bookService.updateChapterBgColor(id, color);
  }

  quickExportChapter(chapterId: string) {
    const book = this.book();
    if (!book) return;
    const chapter = book.chapters.flatMap(g => g.children).find(c => c.id === chapterId);
    if (!chapter) return;
    const md = `# ${chapter.title}\n\n${this.htmlToMarkdown(chapter.content)}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chapter.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async streamIntoNewMessage(stream: AsyncIterable<string>): Promise<void> {
    const assistantId = Date.now().toString();
    this.aiMessages.update(msgs => [...msgs, {
      id: assistantId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date()
    }]);
    for await (const chunk of stream) {
      this.aiMessages.update(msgs =>
        msgs.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
      );
    }
  }

  // AI Companion Methods
  getCurrentContext(): string {
    const chapter = this.activeChapter();
    const book = this.book();
    if (!chapter || !book) return '';

    let context = `Chapter: ${chapter.title}\n\n${chapter.content}\n\n`;

    // Add book metadata
    if (book.characters.length > 0) {
      context += `Characters: ${book.characters.map(c => c.name).join(', ')}\n`;
    }
    if (book.locations.length > 0) {
      context += `Locations: ${book.locations.map(l => l.name).join(', ')}\n`;
    }

    return context;
  }

  getSelectedText(): string {
    if (!this.editor) return '';
    const { from, to } = this.editor.state.selection;
    if (from === to) return '';
    return this.editor.state.doc.textBetween(from, to);
  }

  async sendAiMessage(prompt?: string) {
    const message = prompt || this.aiPrompt();
    if (!message.trim()) return;

    const context = this.getCurrentContext();
    const selectedText = this.getSelectedText();
    const fullContext = selectedText ? `${context}\n\nSelected text: ${selectedText}` : context;

    this.aiMessages.update(msgs => [...msgs, {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      context: fullContext
    }]);
    this.aiPrompt.set('');
    this.aiLoading.set(true);
    this.aiError.set(null);

    try {
      await this.streamIntoNewMessage(this.aiService.streamMessage(message, fullContext));
    } catch {
      this.aiError.set('Failed to get AI response. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  async analyzeToneAndPacing() {
    const chapter = this.activeChapter();
    if (!chapter) { this.aiError.set('Please select a chapter to analyze.'); return; }

    this.aiMessages.update(msgs => [...msgs, {
      id: Date.now().toString(),
      role: 'user' as const,
      content: 'Analyze the tone and pacing of this chapter',
      timestamp: new Date(),
      context: this.getCurrentContext()
    }]);
    this.aiLoading.set(true);
    this.aiError.set(null);

    try {
      await this.streamIntoNewMessage(
        this.aiService.streamMessage(
          `Analyze the tone and pacing of the following text:\n\n${chapter.content}`,
          'You are an expert literary editor.'
        )
      );
    } catch {
      this.aiError.set('Failed to analyze chapter. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  async generateSuggestions() {
    const chapter = this.activeChapter();
    if (!chapter) {
      this.aiError.set('Please select a chapter to get suggestions.');
      return;
    }

    this.aiLoading.set(true);
    this.aiError.set(null);

    try {
      const suggestions = await this.aiService.generateSuggestions(chapter.content);
      this.aiSuggestions.set(suggestions);

      // Also add to chat
      const suggestionsText = suggestions.map(s => `- ${s.content}`).join('\n');
      const message: AiMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Writing Suggestions:**\n\n${suggestionsText}`,
        timestamp: new Date()
      };
      this.aiMessages.update(messages => [...messages, message]);
    } catch (error) {
      this.aiError.set('Failed to generate suggestions. Please try again.');
      console.error('Suggestions error:', error);
    } finally {
      this.aiLoading.set(false);
    }
  }

  async summarizeChapter() {
    const chapter = this.activeChapter();
    if (!chapter) { this.aiError.set('Please select a chapter to summarize.'); return; }

    this.aiMessages.update(msgs => [...msgs, {
      id: Date.now().toString(),
      role: 'user' as const,
      content: 'Summarize this chapter',
      timestamp: new Date()
    }]);
    this.aiLoading.set(true);
    this.aiError.set(null);

    try {
      await this.streamIntoNewMessage(
        this.aiService.streamMessage(
          `Summarize the following content in 50 words or less:\n\n${chapter.content}`,
          'You are a concise summarizer.'
        )
      );
    } catch {
      this.aiError.set('Failed to summarize chapter. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  async continueWriting() {
    if (!this.editor) return;

    const anchor = this.editor.state.selection.anchor;
    const docSize = this.editor.state.doc.content.size;
    const from = Math.max(0, anchor - 1000);
    const preceding = this.editor.state.doc.textBetween(from, Math.min(anchor, docSize), '\n');

    this.aiMessages.update(msgs => [...msgs, {
      id: Date.now().toString(),
      role: 'user' as const,
      content: 'Continue writing from cursor position',
      timestamp: new Date()
    }]);
    this.aiLoading.set(true);
    this.aiError.set(null);

    const assistantId = (Date.now() + 1).toString();
    this.aiMessages.update(msgs => [...msgs, {
      id: assistantId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date()
    }]);

    try {
      for await (const chunk of this.aiService.streamMessage(
        `Continue the story from this point (write 2-3 sentences):\n\n${preceding}`,
        'You are a creative fiction writer.'
      )) {
        this.editor.chain().focus().insertContent(chunk).run();
        this.aiMessages.update(msgs =>
          msgs.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      }
    } catch {
      this.aiError.set('Failed to continue writing. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  applySuggestion(suggestion: AiSuggestion) {
    if (!this.editor) return;

    if (suggestion.originalText) {
      // Search text nodes in the ProseMirror doc for the original text and replace in-place
      const { doc } = this.editor.state;
      const search = suggestion.originalText;
      let from = -1;
      let to = -1;
      doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (from >= 0) return false;
        if (node.isText && node.text) {
          const idx = node.text.indexOf(search);
          if (idx >= 0) { from = pos + idx; to = from + search.length; }
        }
        return true;
      });
      if (from >= 0) {
        this.editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, suggestion.content).run();
      } else {
        this.editor.chain().focus().insertContent(suggestion.content).run();
      }
    } else {
      // Insert at cursor
      this.editor.chain().focus().insertContent(suggestion.content).run();
    }

    // Remove suggestion
    this.aiSuggestions.update(suggestions =>
      suggestions.filter(s => s.id !== suggestion.id)
    );
  }

  clearAiConversation() {
    this.aiMessages.set([]);
    this.aiSuggestions.set([]);
    this.aiError.set(null);
  }

  cancelAiStream() {
    // Stops the loading spinner; the in-flight stream will drain silently in the background.
    // Full abort requires AbortController support in AiService — tracked separately.
    this.aiLoading.set(false);
    this.aiError.set(null);
  }

  getTokenCount(): number {
    const context = this.getCurrentContext();
    return this.aiService.estimateTokens(context);
  }

  // scrollToBottom and handleChatEnter moved to AI panel component

  // Full screen mode
  toggleFullScreen() {
    this.fullScreenMode.update(v => !v);
    if (this.fullScreenMode()) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // Bulk operations
  toggleBulkMode() {
    this.bulkMode.update(v => !v);
    if (!this.bulkMode()) {
      this.selectedChapters.set(new Set());
    }
  }

  toggleChapterSelection(chapterId: string) {
    const selected = new Set(this.selectedChapters());
    if (selected.has(chapterId)) {
      selected.delete(chapterId);
    } else {
      selected.add(chapterId);
    }
    this.selectedChapters.set(selected);
  }

  bulkDeleteChapters() {
    const count = this.selectedChapters().size;
    if (count === 0) return;
    this.deleteModal.set({
      isOpen: true,
      type: 'bulkChapters',
      id: 'bulk',
      title: `Delete ${count} Chapter${count > 1 ? 's' : ''}?`,
      message: `This will permanently delete ${count} selected chapter${count > 1 ? 's' : ''}. This action cannot be undone.`
    });
  }

  private executeBulkDelete() {
    // Capture snapshot before any mutations
    const selected = Array.from(this.selectedChapters());
    const activeId = this.activeChapterId();
    selected.forEach(chapterId => {
      this.bookService.deleteChapter(chapterId);
      this.closeEditorTab(chapterId);
    });
    if (activeId && selected.includes(activeId)) {
      this.activeChapterId.set(null);
      this.title.set('');
      this.editor.commands.clearContent();
    }
    this.selectedChapters.set(new Set());
    this.bulkMode.set(false);
  }

  bulkMoveChapters(targetGroupId: string) {
    const selected = Array.from(this.selectedChapters());
    if (selected.length === 0) return;
    selected.forEach(chapterId => {
      this.bookService.moveChapterToGroup(chapterId, targetGroupId);
    });
    this.selectedChapters.set(new Set());
    this.bulkMode.set(false);
    this.showBulkMoveModal.set(false);
  }

  // Sidebar toggles
  toggleLeftSidebar() {
    this.leftSidebarCollapsed.update(v => !v);
  }

  toggleRightSidebar() {
    this.rightSidebarCollapsed.update(v => !v);
  }

  // UI toggles
  toggleSearch() {
    this.searchOpen.update(v => !v);
  }

  handleExport(request: ExportRequest) {
    this.exportModalOpen.set(false);
    const { scopeKeys, format } = request;

    if (scopeKeys.includes('book')) {
      this.exportNovel(format);
      return;
    }

    const book = this.book();
    if (!book) return;

    // Collect items in natural order: front matter → prologue → chapters
    const isScript = this.writingType() === 'SCRIPT';
    const items: { title: string; content: string; isScene?: boolean }[] = [];
    for (const fm of book.frontMatter) {
      if (scopeKeys.includes(`item:${fm.id}`)) items.push({ title: fm.title, content: fm.content });
    }
    if (scopeKeys.includes('prologue') && book.prologue) {
      items.push({ title: book.prologue.title || 'Prologue', content: book.prologue.content });
    }
    for (const group of book.chapters) {
      for (const chapter of group.children) {
        if (scopeKeys.includes(`item:${chapter.id}`)) items.push({ title: chapter.title, content: chapter.content, isScene: isScript });
      }
    }

    if (items.length === 0) return;

    if (format === 'pdf') {
      const title = items.length === 1 ? items[0].title : 'Selected Content';
      this.printContent(items, title);
      return;
    }

    if (items.length === 1) { this.exportSingleItem(items[0].title, items[0].content, format); return; }
    this.exportMultipleItems(items, format);
  }

  private exportSingleItem(title: string, content: string, format: Exclude<ExportFormat, 'pdf'>) {
    const filename = title.toLowerCase().replace(/\s+/g, '-');
    this.triggerDownload(filename, this.buildContent([{ title, content }], format), format);
  }

  private exportMultipleItems(items: { title: string; content: string }[], format: Exclude<ExportFormat, 'pdf'>) {
    this.triggerDownload(`export-selection`, this.buildContent(items, format), format);
  }

  private buildContent(items: { title: string; content: string; isScene?: boolean }[], format: Exclude<ExportFormat, 'pdf'>): { body: string; mime: string; ext: string } {
    if (format === 'md') {
      return {
        body: items.map(i => `# ${i.title}\n\n${this.htmlToMarkdown(i.content)}`).join('\n\n---\n\n'),
        mime: 'text/markdown', ext: 'md'
      };
    }
    if (format === 'html') {
      return {
        body: items.map(i => `<h1>${this.escapeHtml(i.title)}</h1>\n${i.content}`).join('\n<hr>\n'),
        mime: 'text/html', ext: 'html'
      };
    }
    if (format === 'docx') {
      const body = items.map(i => `<h1>${this.escapeHtml(i.title)}</h1>${i.content}`).join('<hr>');
      return {
        body: `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${body}</body></html>`,
        mime: 'application/msword', ext: 'doc'
      };
    }
    // fountain — only script scenes get scene headings; everything else is treated as prose
    return {
      body: items.map(i => {
        const text = i.content.replace(/<[^>]+>/g, '').trim();
        return i.isScene
          ? `INT. ${i.title.toUpperCase()} - DAY\n\n${text}`
          : `${i.title.toUpperCase()}\n\n${text}`;
      }).join('\n\n'),
      mime: 'text/plain', ext: 'fountain'
    };
  }

  private triggerDownload(filename: string, content: { body: string; mime: string; ext: string }, _format: string) {
    const blob = new Blob([content.body], { type: content.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.${content.ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private printContent(items: { title: string; content: string }[], docTitle: string) {
    const sections = items.map((item, i) =>
      `<section${i > 0 ? ' class="pb"' : ''}>
        <h1>${this.escapeHtml(item.title)}</h1>
        <div class="body">${item.content}</div>
      </section>`
    ).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${this.escapeHtml(docTitle)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 2.5cm; }
  html, body { background: #fff; color: #000; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.75;
  }
  section { margin-bottom: 0; }
  section.pb { page-break-before: always; }
  h1 {
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    margin: 1em 0 2em;
    page-break-after: avoid;
  }
  h2 { font-size: 14pt; margin: 1.5em 0 0.5em; page-break-after: avoid; }
  h3 { font-size: 13pt; margin: 1.2em 0 0.4em; page-break-after: avoid; }
  .body > p { margin-bottom: 0; text-indent: 1.5em; orphans: 3; widows: 3; }
  .body > p:first-child,
  .body > p + h2 + p,
  .body > p + h3 + p { text-indent: 0; }
  blockquote { margin: 0.8em 2em; font-style: italic; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  ul, ol { margin: 0.6em 0 0.6em 2em; }
  li { margin-bottom: 0.2em; }
  hr { border: none; border-top: 1px solid #999; margin: 2em auto; width: 40%; }
</style>
</head>
<body>${sections}</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    iframe.addEventListener('load', () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, { once: true });
  }


  // Link insertion
  linkModalOpen = signal(false);
  linkUrl = signal('');
  linkText = signal('');

  openLinkModal() {
    if (!this.editor) return;
    const selectedText = this.editor.state.selection.empty
      ? ''
      : this.editor.state.doc.textBetween(
        this.editor.state.selection.from,
        this.editor.state.selection.to
      );
    this.linkText.set(selectedText);
    this.linkUrl.set('');
    this.linkModalOpen.set(true);
  }

  insertLink() {
    if (!this.editor || !this.linkUrl().trim()) return;
    const url = this.linkUrl().trim();
    const text = this.linkText().trim() || url;

    if (this.editor.state.selection.empty) {
      this.editor.chain().focus().insertContent({
        type: 'text',
        marks: [{ type: 'link', attrs: { href: url, target: '_blank' } }],
        text,
      }).run();
    } else {
      this.editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }

    this.linkModalOpen.set(false);
    this.linkUrl.set('');
    this.linkText.set('');
  }

  cancelLinkModal() {
    this.linkModalOpen.set(false);
    this.linkUrl.set('');
    this.linkText.set('');
  }

  // Image modal
  imageModalOpen = signal(false);
  imageUrl = signal('');

  addImage() {
    if (!this.editor) return;
    this.imageUrl.set('');
    this.imageModalOpen.set(true);
  }

  insertImage() {
    if (!this.editor || !this.imageUrl().trim()) return;
    this.editor.chain().focus().setImage({ src: this.imageUrl().trim() }).run();
    this.imageModalOpen.set(false);
    this.imageUrl.set('');
  }

  cancelImageModal() {
    this.imageModalOpen.set(false);
    this.imageUrl.set('');
  }

  insertTable() {
    if (!this.editor) return;
    this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  // YouTube modal
  youtubeModalOpen = signal(false);
  youtubeUrl = signal('');

  addYoutube() {
    if (!this.editor) return;
    this.youtubeUrl.set('');
    this.youtubeModalOpen.set(true);
  }

  insertYoutube() {
    if (!this.editor || !this.youtubeUrl().trim()) return;
    this.editor.chain().focus().setYoutubeVideo({ src: this.youtubeUrl().trim() }).run();
    this.youtubeModalOpen.set(false);
    this.youtubeUrl.set('');
  }

  cancelYoutubeModal() {
    this.youtubeModalOpen.set(false);
    this.youtubeUrl.set('');
  }

  private htmlToMarkdown(html: string): string {
    return html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
      .replace(/<(del|s|strike)[^>]*>(.*?)<\/\1>/gi, '~~$2~~')
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
        inner.trim().split('\n').map((l: string) => `> ${l}`).join('\n') + '\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<\/(ul|ol)>/gi, '\n')
      .replace(/<(ul|ol)[^>]*>/gi, '')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<hr[^>]*>/gi, '---\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Export functionality
  exportNovel(format: 'pdf' | 'docx' | 'md' | 'html' | 'fountain') {
    const book = this.book();
    if (!book) return;

    let content = '';
    let filename = book.title.toLowerCase().replace(/\s+/g, '-');

    if (format === 'pdf') {
      const items: { title: string; content: string }[] = [];
      book.frontMatter.forEach(fm => items.push({ title: fm.title, content: fm.content }));
      if (book.prologue) items.push({ title: book.prologue.title || 'Prologue', content: book.prologue.content });
      book.chapters.forEach(g => g.children.forEach(c => items.push({ title: c.title, content: c.content })));
      this.printContent(items, book.title);
      return;
    }

    if (format === 'fountain') {
      let fountain = `Title: ${book.title}\n\n`;
      book.chapters.forEach(group => {
        fountain += `\n\n`;
        group.children.forEach(chap => {
          fountain += `INT. ${chap.title.toUpperCase()} - DAY\n\n`;
          const text = chap.content.replace(/<[^>]+>/g, '').trim();
          fountain += `${text}\n\n`;
        });
      });
      const blob = new Blob([fountain], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.fountain`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // ARTICLE and BLOG_POST have no front matter concept.
    // ESSAY and POETRY may have a title page but never prologue-style opening material.
    const skipFrontMatter = ['ARTICLE', 'BLOG_POST', 'ESSAY', 'POETRY'].includes(this.writingType());

    if (format === 'md') {
      // Build true markdown — do not use the shared HTML content variable
      let md = `# ${book.title}\n\n`;
      if (!skipFrontMatter && book.frontMatter.length > 0) {
        md += '## Front Matter\n\n';
        book.frontMatter.forEach(item => {
          md += `### ${item.title}\n\n${this.htmlToMarkdown(item.content)}\n\n`;
        });
      }
      if (!skipFrontMatter && book.prologue) {
        md += `## ${book.prologue.title}\n\n${this.htmlToMarkdown(book.prologue.content)}\n\n`;
      }
      book.chapters.forEach(group => {
        md += `## ${group.title}\n\n`;
        group.children.forEach(chap => {
          md += `### ${chap.title}\n\n${this.htmlToMarkdown(chap.content)}\n\n`;
        });
      });
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.md`; a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Build HTML content for html / docx
    content = `<h1>${book.title}</h1>\n\n`;

    // Front Matter
    if (!skipFrontMatter && book.frontMatter.length > 0) {
      content += '<h2>Front Matter</h2>\n';
      book.frontMatter.forEach(item => {
        content += `<h3>${item.title}</h3>\n${item.content}\n\n`;
      });
    }

    // Prologue
    if (!skipFrontMatter && book.prologue) {
      content += `<h2>${book.prologue.title}</h2>\n${book.prologue.content}\n\n`;
    }

    // Chapters
    let totalWords = 0;
    book.chapters.forEach(group => {
      content += `<h2>${group.title}</h2>\n`;
      group.children.forEach(chap => {
        content += `<h3>${chap.title}</h3>\n${chap.content}\n\n`;
        totalWords += chap.wordCount;
      });
    });

    // Prepend reading time for BLOG_POST html export
    if (format === 'html' && this.writingType() === 'BLOG_POST') {
      const mins = Math.max(1, Math.ceil(totalWords / 200));
      content = `<p class="reading-time">Reading time: ${mins} min</p>\n` + content;
    }

    if (format === 'html') {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.html`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'docx') {
      // Word-compatible HTML until a native docx library is integrated
      const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${book.title}</title></head>
        <body>${content}</body></html>`;
      const blob = new Blob([wordHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.doc`; a.click();
      URL.revokeObjectURL(url);
    }
  }

  async handleQuickAction(key: string) {
    const chapter = this.activeChapter();
    const content = chapter?.content ?? '';

    const prompts: Record<string, { user: string; system: string }> = {
      'tone-pacing':         { user: 'Analyze the tone and pacing of this chapter', system: 'You are an expert literary editor.' },
      'suggest':             { user: 'Suggest improvements for this writing', system: 'You are a creative writing coach.' },
      'refine-dialogue':     { user: 'Refine the dialogue in this scene for naturalness and character voice', system: 'You are a professional screenwriter and dialogue coach.' },
      'scene-analysis':      { user: 'Analyze this scene: what is the dramatic objective, conflict, and how does it advance the story?', system: 'You are an expert screenplay analyst.' },
      'analyze-meter':       { user: 'Analyze the meter, rhythm, and syllable patterns in this poem. Identify the form if recognizable.', system: 'You are an expert poetry critic and prosodist.' },
      'check-rhyme':         { user: 'Identify the rhyme scheme of this poem. Note perfect, slant, and eye rhymes.', system: 'You are an expert poetry critic.' },
      'improve-clarity':     { user: 'Review this content for clarity and readability. Flag jargon, passive voice, or unclear passages.', system: 'You are a professional editor specializing in clear, accessible writing.' },
      'check-flow':          { user: 'Analyze the flow and structure: is there a clear hook, body, and conclusion? How can transitions improve?', system: 'You are an expert content editor.' },
      'strengthen-args':     { user: 'Analyze the arguments in this text. Are they well-supported? Identify weak points or logical gaps.', system: 'You are an expert academic writing coach.' },
      'check-structure':     { user: 'Review the structure: is the thesis clear? Does each paragraph support the central argument?', system: 'You are an expert essay editor.' },
      'summarize-findings':  { user: 'Summarize the key findings and claims in this section concisely.', system: 'You are an expert research editor.' },
      'check-consistency':   { user: 'Review this section for consistent terminology, claims, and internal logic.', system: 'You are a meticulous research editor.' },
    };

    if (key.startsWith('ask-changes:')) {
      const instruction = key.replace('ask-changes:', '').trim();
      if (!instruction) return;
      this.setActiveTab('ai');
      const selectedText = this.getSelectedText();
      const context = selectedText || content;
      if (!context) { this.aiError.set('Please select text to apply changes to.'); return; }
      const userMsg = selectedText
        ? `${instruction} (applied to selected text)`
        : instruction;
      this.aiMessages.update(msgs => [...msgs, {
        id: Date.now().toString(),
        role: 'user' as const,
        content: userMsg,
        timestamp: new Date()
      }]);
      this.aiLoading.set(true);
      this.aiError.set(null);
      try {
        await this.streamIntoNewMessage(
          this.aiService.streamMessage(
            selectedText
              ? `Apply this instruction to the following text and return only the revised version:\n\nInstruction: ${instruction}\n\nText:\n${selectedText}`
              : `Apply this instruction to the chapter content:\n\nInstruction: ${instruction}\n\nContent:\n${context}`,
            'You are a professional editor. Return only the revised text without explanation.'
          )
        );
      } catch {
        this.aiError.set('AI request failed. Please try again.');
      } finally {
        this.aiLoading.set(false);
      }
      return;
    }

    if (key === 'suggest') {
      this.setActiveTab('ai');
      const selectedText = this.getSelectedText();
      const context = selectedText || content;
      if (!context) { this.aiError.set('Please select a section first.'); return; }
      const userMsg = selectedText ? 'Suggest improvements for this selected text' : 'Suggest improvements for this writing';
      this.aiMessages.update(msgs => [...msgs, {
        id: Date.now().toString(),
        role: 'user' as const,
        content: userMsg,
        timestamp: new Date()
      }]);
      this.aiLoading.set(true);
      this.aiError.set(null);
      try {
        await this.streamIntoNewMessage(
          this.aiService.streamMessage(`${userMsg}:\n\n${context}`, 'You are a creative writing coach.')
        );
      } catch {
        this.aiError.set('Failed to get suggestions. Please try again.');
      } finally {
        this.aiLoading.set(false);
      }
      return;
    }

    const p = prompts[key];
    if (!p || !content) { this.aiError.set('Please select a section first.'); return; }

    this.aiMessages.update(msgs => [...msgs, {
      id: Date.now().toString(),
      role: 'user' as const,
      content: p.user,
      timestamp: new Date()
    }]);
    this.aiLoading.set(true);
    this.aiError.set(null);
    try {
      await this.streamIntoNewMessage(
        this.aiService.streamMessage(`${p.user}:\n\n${content}`, p.system)
      );
    } catch {
      this.aiError.set('AI request failed. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }
}
