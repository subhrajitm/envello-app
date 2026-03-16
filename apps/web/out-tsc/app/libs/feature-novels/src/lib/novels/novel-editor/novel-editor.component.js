import { __decorate } from 'tslib';
import {
  Component,
  signal,
  effect,
  inject,
  computed,
  HostListener,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NovelContentService } from '@envello/core';
import { VersionHistoryService } from '@envello/core';
import { AiService } from '@envello/core';
// Modals
import { DeleteModalComponent } from './components/modals/delete-modal/delete-modal.component';
import { AddModalComponent } from './components/modals/add-modal/add-modal.component';
import { LinkModalComponent } from './components/modals/link-modal/link-modal.component';
import { VersionHistoryModalComponent } from './components/modals/version-history-modal/version-history-modal.component';
// Sidebar
import { SyncStatusComponent } from './components/sidebar/sync-status/sync-status.component';
import { ChaptersListComponent } from './components/sidebar/chapters-list/chapters-list.component';
import { StructureViewComponent } from './components/sidebar/structure-view/structure-view.component';
import { CharactersListComponent } from './components/sidebar/characters-list/characters-list.component';
import { LocationsListComponent } from './components/sidebar/locations-list/locations-list.component';
// Editor
import { EditorHeaderComponent } from './components/editor/editor-header/editor-header.component';
import { EditorToolbarComponent } from './components/editor/editor-toolbar/editor-toolbar.component';
import { ManuscriptEditorComponent } from './components/editor/manuscript-editor/manuscript-editor.component';
import { StructureEditorComponent } from './components/editor/structure-editor/structure-editor.component';
import { CharacterDetailsComponent } from './components/editor/character-details/character-details.component';
import { LocationDetailsComponent } from './components/editor/location-details/location-details.component';
// Right Sidebar
import { AiPanelComponent } from './components/right-sidebar/ai-panel/ai-panel.component';
import { NotesPanelComponent } from './components/right-sidebar/notes-panel/notes-panel.component';
import { ManuscriptDataComponent } from './components/right-sidebar/manuscript-data/manuscript-data.component';
let NovelEditorComponent = class NovelEditorComponent {
  router;
  editor;
  novelService = inject(NovelContentService);
  versionHistoryService = inject(VersionHistoryService);
  aiService = inject(AiService); // Inject AI Service
  route = inject(ActivatedRoute);
  addInputRef;
  shouldFocusInput = false;
  timeInterval;
  // State
  title = signal('');
  activeChapterId = signal(null);
  wordCount = signal(0);
  rightSidebarTab = signal('ai');
  activeNav = signal('manuscript');
  // Structure view state
  activeFrontMatterId = signal(null);
  activePrologueId = signal(null);
  // UI State
  focusMode = signal(false);
  fullScreenMode = signal(false);
  leftSidebarCollapsed = signal(false);
  rightSidebarCollapsed = signal(false);
  searchOpen = signal(false);
  searchQuery = signal('');
  exportMenuOpen = signal(false);
  // Bulk selection
  selectedChapters = signal(new Set());
  bulkMode = signal(false);
  // Time tracking
  sessionStartTime = Date.now();
  elapsedSeconds = signal(0);
  targetWordCount = signal(2500);
  // Auto-save state
  isSaving = signal(false);
  lastSaved = signal(null);
  // Version history state
  versionHistoryOpen = signal(false);
  versionHistory = signal([]);
  canUndo = signal(false);
  canRedo = signal(false);
  // AI Companion state
  aiMessages = signal([]);
  aiLoading = signal(false);
  aiError = signal(null);
  aiPrompt = signal('');
  aiSuggestions = signal([]);
  showContextPreview = signal(false);
  toggleContextPreview() {
    this.showContextPreview.update((v) => !v);
  }
  // Computed signals from Service
  novel = this.novelService.activeNovel;
  isLoading = signal(true);
  activeCharacter = computed(() => {
    const n = this.novel();
    const id = this.selectedCharacterId();
    return n?.characters.find((c) => c.id === id) ?? null;
  });
  activeLocation = computed(() => {
    const n = this.novel();
    const id = this.selectedLocationId();
    return n?.locations.find((l) => l.id === id) ?? null;
  });
  activeChapter = computed(() => {
    const chapterId = this.activeChapterId();
    if (!chapterId) return null;
    const novel = this.novel();
    if (!novel) return null;
    for (const group of novel.chapters) {
      const chapter = group.children.find((c) => c.id === chapterId);
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
  calculateWordCount(text) {
    if (!text || text.trim() === '') return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }
  constructor(router) {
    this.router = router;
    // Effect to update editor content when active chapter changes
    effect(() => {
      const chapterId = this.activeChapterId();
      const frontMatterId = this.activeFrontMatterId();
      const prologueId = this.activePrologueId();
      if (this.editor) {
        if (chapterId) {
          const chapter = this.novelService.getChapter(chapterId);
          if (chapter && this.editor.getHTML() !== chapter.content) {
            this.editor.commands.setContent(chapter.content);
            this.title.set(chapter.title);
            const count = this.calculateWordCount(this.editor.getText());
            this.wordCount.set(count);
            // Create initial snapshot if none exists
            const versions = this.versionHistoryService.getVersions(
              chapterId,
              'chapter',
            );
            if (versions.length === 0) {
              this.versionHistoryService.addVersion(
                chapterId,
                'chapter',
                chapter.content,
                chapter.title,
                count,
                true,
              );
            }
            this.updateUndoRedoState(chapterId, 'chapter');
          }
        } else if (frontMatterId) {
          const novel = this.novel();
          const item = novel?.frontMatter.find((fm) => fm.id === frontMatterId);
          if (item && this.editor.getHTML() !== item.content) {
            this.editor.commands.setContent(item.content);
            this.title.set(item.title);
            const count = this.calculateWordCount(this.editor.getText());
            this.wordCount.set(count);
            const versions = this.versionHistoryService.getVersions(
              frontMatterId,
              'frontMatter',
            );
            if (versions.length === 0) {
              this.versionHistoryService.addVersion(
                frontMatterId,
                'frontMatter',
                item.content,
                item.title,
                count,
                true,
              );
            }
            this.updateUndoRedoState(frontMatterId, 'frontMatter');
          }
        } else if (prologueId) {
          const novel = this.novel();
          const prologue = novel?.prologue;
          if (prologue && this.editor.getHTML() !== prologue.content) {
            this.editor.commands.setContent(prologue.content);
            this.title.set(prologue.title);
            const count = this.calculateWordCount(this.editor.getText());
            this.wordCount.set(count);
            const versions = this.versionHistoryService.getVersions(
              'prologue',
              'prologue',
            );
            if (versions.length === 0) {
              this.versionHistoryService.addVersion(
                'prologue',
                'prologue',
                prologue.content,
                prologue.title,
                count,
                true,
              );
            }
            this.updateUndoRedoState('prologue', 'prologue');
          }
        } else if (!chapterId && !frontMatterId && !prologueId) {
          this.editor.commands.clearContent();
          this.title.set('');
          this.wordCount.set(0);
          this.canUndo.set(false);
          this.canRedo.set(false);
        }
      }
    });
    // Effect to set initial title from novel data
    effect(() => {
      const n = this.novel();
      if (n && !this.activeChapterId()) {
        // Default to first chapter
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
    // Time tracking interval
    this.timeInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.elapsedSeconds.set(elapsed);
    }, 1000);
  }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '1';
    // Initialize editor first (non-blocking)
    this.editor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start writing your chapter...',
        }),
      ],
      content: '', // Initial content will be set by effect
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
            this.novelService.updateChapterContent(activeId, content, count);
            // Add version snapshot
            this.versionHistoryService.addVersion(
              activeId,
              'chapter',
              content,
              title,
              count,
            );
            this.updateUndoRedoState(activeId, 'chapter');
          } else if (frontMatterId) {
            this.novelService.updateFrontMatterContent(
              frontMatterId,
              content,
              count,
            );
            this.versionHistoryService.addVersion(
              frontMatterId,
              'frontMatter',
              content,
              title,
              count,
            );
            this.updateUndoRedoState(frontMatterId, 'frontMatter');
          } else if (prologueId) {
            this.novelService.updatePrologueContent(content, count);
            this.versionHistoryService.addVersion(
              'prologue',
              'prologue',
              content,
              title,
              count,
            );
            this.updateUndoRedoState('prologue', 'prologue');
          }
          this.isSaving.set(false);
          this.lastSaved.set(new Date());
        }, 1000); // 1 second debounce
      },
    });
    // Load novel data from DB (async)
    this.novelService.loadNovel(id).then(() => this.isLoading.set(false));
  }
  ngAfterViewChecked() {
    if (this.shouldFocusInput && this.addInputRef?.nativeElement) {
      this.addInputRef.nativeElement.focus();
      this.addInputRef.nativeElement.select();
      this.shouldFocusInput = false;
    }
  }
  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.editor.destroy();
  }
  goBack() {
    this.router.navigate(['/novels']);
  }
  toggleChapter(group) {
    this.novelService.toggleGroupExpand(group.id);
  }
  selectChapter(chapter) {
    if ('id' in chapter) {
      const novel = this.novel();
      if (novel) {
        for (const group of novel.chapters) {
          const found = group.children.find((c) => c.id === chapter.id);
          if (found) {
            this.activeChapterId.set(found.id);
            return;
          }
        }
      }
    }
  }
  setActiveTab(tab) {
    this.rightSidebarTab.set(tab);
  }
  setActiveNav(nav) {
    this.activeNav.set(nav);
  }
  // Title editing
  onTitleChange(newTitle) {
    this.title.set(newTitle);
    const activeId = this.activeChapterId();
    if (activeId) {
      this.novelService.updateChapterTitle(activeId, newTitle);
    }
  }
  // Delete Modal State
  deleteModal = signal({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: '',
  });
  requestDelete(type, id, name) {
    let title = 'Delete Item';
    let message =
      'Are you sure you want to delete this item? This action cannot be undone.';
    switch (type) {
      case 'chapter':
        title = 'Delete Chapter?';
        message = `Are you sure you want to delete "${name || 'this chapter'}"?`;
        break;
      case 'group':
        title = 'Delete Act/Part?';
        const novel = this.novel();
        const group = novel?.chapters.find((g) => g.id === id);
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
      message,
    });
  }
  confirmDelete() {
    const modal = this.deleteModal();
    if (!modal.id || !modal.type) return;
    switch (modal.type) {
      case 'chapter':
        this.novelService.deleteChapter(modal.id);
        if (this.activeChapterId() === modal.id) {
          this.activeChapterId.set(null);
          this.title.set('');
          this.editor.commands.clearContent();
        }
        break;
      case 'group':
        this.novelService.deleteChapterGroup(modal.id);
        // Clear active chapter if it was in the deleted group
        const novel = this.novel();
        const deletedGroup = novel?.chapters.find((g) => g.id === modal.id);
        if (deletedGroup) {
          const deletedChapterIds = deletedGroup.children.map((c) => c.id);
          if (
            this.activeChapterId() &&
            deletedChapterIds.includes(this.activeChapterId())
          ) {
            this.activeChapterId.set(null);
            this.title.set('');
            this.editor.commands.clearContent();
          }
        }
        break;
      case 'character':
        this.novelService.deleteCharacter(modal.id);
        if (this.selectedCharacterId() === modal.id) {
          this.selectedCharacterId.set(null);
        }
        break;
      case 'location':
        this.novelService.deleteLocation(modal.id);
        if (this.selectedLocationId() === modal.id) {
          this.selectedLocationId.set(null);
        }
        break;
      case 'note':
        this.novelService.deleteNote(modal.id);
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
      message: '',
    });
  }
  onDocumentClick(event) {
    const target = event.target;
    if (!target.closest('.add-menu-wrapper')) {
      this.addMenuOpen.set(false);
    }
    if (!target.closest('.search-wrapper')) {
      this.searchOpen.set(false);
    }
  }
  onKeyDown(event) {
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
    // Cmd/Ctrl + Z for undo
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === 'z' &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.performUndo();
      return;
    }
    // Cmd/Ctrl + Shift + Z for redo
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === 'z' &&
      event.shiftKey
    ) {
      event.preventDefault();
      this.performRedo();
      return;
    }
    // Escape to close modals
    if (event.key === 'Escape') {
      if (this.addModal().isOpen) {
        this.cancelAdd();
      }
      if (this.deleteModal().isOpen) {
        this.cancelDelete();
      }
      if (this.searchOpen()) {
        this.searchOpen.set(false);
      }
    }
    // Cmd/Ctrl + B for focus mode
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
      event.preventDefault();
      this.focusMode.update((v) => !v);
      return;
    }
    // F11 for fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullScreen();
      return;
    }
  }
  // Add menu state
  addMenuOpen = signal(false);
  // Add Modal State
  addModal = signal({
    isOpen: false,
    type: null,
    title: '',
    inputValue: '',
    inputValue2: '',
  });
  // Chapter management
  addNewChapter(groupId) {
    this.addMenuOpen.set(false);
    const novel = this.novel();
    if (!novel) {
      return;
    }
    // If no groups exist, create one first
    if (novel.chapters.length === 0) {
      this.novelService.addChapterGroup('Part I');
    }
    this.addModal.set({
      isOpen: true,
      type: 'chapter',
      title: 'Add New Chapter',
      inputValue: 'Untitled Chapter',
    });
    this.shouldFocusInput = true;
  }
  confirmAdd() {
    const modal = this.addModal();
    if (!modal.type || !modal.inputValue.trim()) {
      return;
    }
    if (modal.type === 'act') {
      this.novelService.addChapterGroup(modal.inputValue.trim());
    } else if (modal.type === 'chapter') {
      const novel = this.novel();
      if (novel) {
        const targetGroupId = novel.chapters[0]?.id;
        if (targetGroupId) {
          // Store the current chapter count to identify the new one
          const targetGroup = novel.chapters.find(
            (g) => g.id === targetGroupId,
          );
          const chapterCountBefore = targetGroup?.children.length || 0;
          this.novelService.addChapter(targetGroupId, modal.inputValue.trim());
          // Select the newly created chapter
          setTimeout(() => {
            const updatedNovel = this.novel();
            if (updatedNovel) {
              const updatedGroup = updatedNovel.chapters.find(
                (g) => g.id === targetGroupId,
              );
              if (
                updatedGroup &&
                updatedGroup.children.length > chapterCountBefore
              ) {
                const newChapter =
                  updatedGroup.children[updatedGroup.children.length - 1];
                this.selectChapter(newChapter);
              }
            }
          }, 10);
        }
      }
    } else if (modal.type === 'note') {
      this.novelService.addNote(
        modal.inputValue.trim(),
        modal.inputValue2?.trim() || '',
        this.activeChapterId() || undefined,
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
      inputValue2: '',
    });
  }
  updateAddModalInput(value) {
    this.addModal.update((modal) => ({
      ...modal,
      inputValue: value,
    }));
  }
  updateAddModalInput2(value) {
    this.addModal.update((modal) => ({
      ...modal,
      inputValue2: value,
    }));
  }
  addNewActOrPart() {
    this.addMenuOpen.set(false);
    this.addModal.set({
      isOpen: true,
      type: 'act',
      title: 'Add New Act/Part',
      inputValue: 'New Part',
    });
    this.shouldFocusInput = true;
  }
  toggleAddMenu() {
    this.addMenuOpen.update((v) => !v);
  }
  deleteChapter(chapterId, title) {
    this.requestDelete('chapter', chapterId, title);
  }
  deleteGroup(groupId, title) {
    this.requestDelete('group', groupId, title);
  }
  // Note management
  addNewNote() {
    this.addModal.set({
      isOpen: true,
      type: 'note',
      title: 'Add New Note',
      inputValue: '',
      inputValue2: '',
    });
    this.shouldFocusInput = true;
  }
  deleteNote(noteId) {
    this.requestDelete('note', noteId);
  }
  selectedCharacterId = signal(null);
  selectedLocationId = signal(null);
  // Character management
  addNewCharacter() {
    this.novelService.addCharacter('New Character');
    // Auto-select the newly created character (assuming it's the last one)
    const n = this.novel();
    if (n && n.characters.length > 0) {
      this.selectedCharacterId.set(n.characters[n.characters.length - 1].id);
    }
  }
  selectCharacter(charId) {
    this.selectedCharacterId.set(charId);
  }
  updateCharacterField(charId, field, value) {
    this.novelService.updateCharacter(charId, { [field]: value });
  }
  // Handler for component output
  onCharacterFieldUpdate(data) {
    this.updateCharacterField(data.id, data.field, data.value);
  }
  deleteCharacter(charId, name) {
    this.requestDelete('character', charId, name);
  }
  // Location management
  addNewLocation() {
    this.novelService.addLocation('New Location');
    const n = this.novel();
    if (n && n.locations.length > 0) {
      this.selectedLocationId.set(n.locations[n.locations.length - 1].id);
    }
  }
  selectLocation(locId) {
    this.selectedLocationId.set(locId);
  }
  updateLocationField(locId, field, value) {
    this.novelService.updateLocation(locId, { [field]: value });
  }
  // Handler for component output
  onLocationFieldUpdate(data) {
    this.updateLocationField(data.id, data.field, data.value);
  }
  deleteLocation(locId, name) {
    this.requestDelete('location', locId, name);
  }
  // Time formatting
  getFormattedTime() {
    const seconds = this.elapsedSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  // Writing goals
  getGoalProgress() {
    const current = this.wordCount();
    const target = this.targetWordCount();
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }
  // Novel statistics
  totalNovelWords = computed(() => {
    const novel = this.novel();
    if (!novel) return 0;
    let total = 0;
    novel.chapters.forEach((group) => {
      group.children.forEach((chap) => {
        total += chap.wordCount;
      });
    });
    if (novel.prologue) total += novel.prologue.wordCount;
    novel.frontMatter.forEach((item) => {
      total += item.wordCount;
    });
    return total;
  });
  averageChapterLength = computed(() => {
    const novel = this.novel();
    if (!novel) return 0;
    let totalChapters = 0;
    let totalWords = 0;
    novel.chapters.forEach((group) => {
      group.children.forEach((chap) => {
        totalChapters++;
        totalWords += chap.wordCount;
      });
    });
    return totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;
  });
  chaptersCompleted = computed(() => {
    const novel = this.novel();
    if (!novel) return 0;
    let completed = 0;
    novel.chapters.forEach((group) => {
      group.children.forEach((chap) => {
        if (chap.status === 'DONE') completed++;
      });
    });
    return completed;
  });
  getTotalChapters() {
    const novel = this.novel();
    if (!novel) return 0;
    let total = 0;
    novel.chapters.forEach((group) => {
      total += group.children.length;
    });
    return total;
  }
  // Front Matter Management
  getFrontMatterTypeLabel(type) {
    const labels = {
      'title-page': 'Title Page',
      copyright: 'Copyright Page',
      toc: 'Table of Contents',
      dedication: 'Dedication',
      foreword: 'Foreword',
      preface: 'Preface',
    };
    return labels[type] || type;
  }
  getFrontMatterTypeIcon(type) {
    const icons = {
      'title-page': 'title',
      copyright: 'copyright',
      toc: 'list',
      dedication: 'favorite',
      foreword: 'menu_book',
      preface: 'description',
    };
    return icons[type] || 'description';
  }
  addFrontMatterItem(type) {
    const title = this.getFrontMatterTypeLabel(type);
    this.novelService.addFrontMatterItem(type, title);
  }
  selectFrontMatterItem(itemId) {
    this.activeFrontMatterId.set(itemId);
    this.activeChapterId.set(null);
    this.activePrologueId.set(null);
  }
  selectPrologue() {
    this.activePrologueId.set('prologue');
    this.activeChapterId.set(null);
    this.activeFrontMatterId.set(null);
  }
  addPrologue() {
    this.novelService.addPrologue();
    this.selectPrologue();
  }
  deletePrologue() {
    this.novelService.deletePrologue();
    this.activePrologueId.set(null);
  }
  deleteFrontMatterItem(itemId, title) {
    this.novelService.deleteFrontMatterItem(itemId);
    if (this.activeFrontMatterId() === itemId) {
      this.activeFrontMatterId.set(null);
      this.title.set('');
      this.editor.commands.clearContent();
    }
  }
  // Version History & Undo/Redo
  updateUndoRedoState(contentId, contentType) {
    this.canUndo.set(
      this.versionHistoryService.canUndo(contentId, contentType),
    );
    this.canRedo.set(
      this.versionHistoryService.canRedo(contentId, contentType),
    );
  }
  performUndo() {
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();
    let snapshot = null;
    if (activeId) {
      snapshot = this.versionHistoryService.undo(activeId, 'chapter');
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updateChapterContent(
          activeId,
          snapshot.content,
          snapshot.wordCount,
        );
      }
    } else if (frontMatterId) {
      snapshot = this.versionHistoryService.undo(frontMatterId, 'frontMatter');
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updateFrontMatterContent(
          frontMatterId,
          snapshot.content,
          snapshot.wordCount,
        );
      }
    } else if (prologueId) {
      snapshot = this.versionHistoryService.undo('prologue', 'prologue');
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updatePrologueContent(
          snapshot.content,
          snapshot.wordCount,
        );
      }
    }
    if (snapshot) {
      const contentId = activeId || frontMatterId || 'prologue';
      const contentType = activeId
        ? 'chapter'
        : frontMatterId
          ? 'frontMatter'
          : 'prologue';
      this.updateUndoRedoState(contentId, contentType);
    }
  }
  performRedo() {
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();
    let snapshot = null;
    if (activeId) {
      snapshot = this.versionHistoryService.redo(activeId, 'chapter');
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updateChapterContent(
          activeId,
          snapshot.content,
          snapshot.wordCount,
        );
      }
    } else if (frontMatterId) {
      snapshot = this.versionHistoryService.redo(frontMatterId, 'frontMatter');
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updateFrontMatterContent(
          frontMatterId,
          snapshot.content,
          snapshot.wordCount,
        );
      }
    } else if (prologueId) {
      snapshot = this.versionHistoryService.redo('prologue', 'prologue');
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updatePrologueContent(
          snapshot.content,
          snapshot.wordCount,
        );
      }
    }
    if (snapshot) {
      const contentId = activeId || frontMatterId || 'prologue';
      const contentType = activeId
        ? 'chapter'
        : frontMatterId
          ? 'frontMatter'
          : 'prologue';
      this.updateUndoRedoState(contentId, contentType);
    }
  }
  openVersionHistory() {
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();
    let versions = [];
    if (activeId) {
      versions = this.versionHistoryService.getVersions(activeId, 'chapter');
    } else if (frontMatterId) {
      versions = this.versionHistoryService.getVersions(
        frontMatterId,
        'frontMatter',
      );
    } else if (prologueId) {
      versions = this.versionHistoryService.getVersions('prologue', 'prologue');
    }
    this.versionHistory.set(versions);
    this.versionHistoryOpen.set(true);
  }
  closeVersionHistory() {
    this.versionHistoryOpen.set(false);
  }
  restoreVersion(versionId) {
    const activeId = this.activeChapterId();
    const frontMatterId = this.activeFrontMatterId();
    const prologueId = this.activePrologueId();
    let snapshot = null;
    if (activeId) {
      snapshot = this.versionHistoryService.restoreVersion(
        activeId,
        'chapter',
        versionId,
      );
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updateChapterContent(
          activeId,
          snapshot.content,
          snapshot.wordCount,
        );
        // Create immediate snapshot of restored version
        this.versionHistoryService.addVersion(
          activeId,
          'chapter',
          snapshot.content,
          snapshot.title,
          snapshot.wordCount,
          true,
        );
      }
    } else if (frontMatterId) {
      snapshot = this.versionHistoryService.restoreVersion(
        frontMatterId,
        'frontMatter',
        versionId,
      );
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updateFrontMatterContent(
          frontMatterId,
          snapshot.content,
          snapshot.wordCount,
        );
        this.versionHistoryService.addVersion(
          frontMatterId,
          'frontMatter',
          snapshot.content,
          snapshot.title,
          snapshot.wordCount,
          true,
        );
      }
    } else if (prologueId) {
      snapshot = this.versionHistoryService.restoreVersion(
        'prologue',
        'prologue',
        versionId,
      );
      if (snapshot && this.editor) {
        this.editor.commands.setContent(snapshot.content);
        this.title.set(snapshot.title || '');
        this.wordCount.set(snapshot.wordCount);
        this.novelService.updatePrologueContent(
          snapshot.content,
          snapshot.wordCount,
        );
        this.versionHistoryService.addVersion(
          'prologue',
          'prologue',
          snapshot.content,
          snapshot.title,
          snapshot.wordCount,
          true,
        );
      }
    }
    if (snapshot) {
      const contentId = activeId || frontMatterId || 'prologue';
      const contentType = activeId
        ? 'chapter'
        : frontMatterId
          ? 'frontMatter'
          : 'prologue';
      this.updateUndoRedoState(contentId, contentType);
      this.closeVersionHistory();
    }
  }
  // Character/Location Mentions - converted to computed signals for performance
  mentionedCharacters = computed(() => {
    const chapterId = this.activeChapterId();
    if (!chapterId || !this.editor) return [];
    const chapter = this.activeChapter();
    if (!chapter) return [];
    const content = chapter.content.toLowerCase();
    const novel = this.novel();
    if (!novel) return [];
    return novel.characters
      .filter((char) => content.includes(char.name.toLowerCase()))
      .map((char) => char.name);
  });
  mentionedLocations = computed(() => {
    const chapterId = this.activeChapterId();
    if (!chapterId || !this.editor) return [];
    const chapter = this.activeChapter();
    if (!chapter) return [];
    const content = chapter.content.toLowerCase();
    const novel = this.novel();
    if (!novel) return [];
    return novel.locations
      .filter((loc) => content.includes(loc.name.toLowerCase()))
      .map((loc) => loc.name);
  });
  // Drag & Drop for reordering
  dragStartIndex = signal(null);
  dragOverIndex = signal(null);
  onDragStart(event, index, type) {
    this.dragStartIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  onDragOver(event, index) {
    event.preventDefault();
    this.dragOverIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }
  onDragEnd() {
    this.dragStartIndex.set(null);
    this.dragOverIndex.set(null);
  }
  onDrop(event, dropIndex, type, groupId) {
    event.preventDefault();
    const startIndex = this.dragStartIndex();
    if (startIndex === null || startIndex === dropIndex) {
      this.onDragEnd();
      return;
    }
    if (type === 'group') {
      this.novelService.reorderChapterGroup(startIndex, dropIndex);
    } else if (type === 'chapter' && groupId) {
      this.novelService.reorderChapter(groupId, startIndex, dropIndex);
    }
    this.onDragEnd();
  }
  // Search functionality - optimized with early returns and cached lowercase
  filteredChapters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query || query.length < 2) return null; // Early return for short queries
    const novel = this.novel();
    if (!novel) return null;
    const results = [];
    // Search chapters - only check title for performance (content search is expensive)
    for (const group of novel.chapters) {
      for (const chap of group.children) {
        if (chap.title.toLowerCase().includes(query)) {
          results.push({
            type: 'chapter',
            id: chap.id,
            title: chap.title,
            subtitle: `Chapter in ${group.title}`,
          });
        }
      }
    }
    // Search characters
    for (const char of novel.characters) {
      const nameLower = char.name.toLowerCase();
      if (
        nameLower.includes(query) ||
        (char.description && char.description.toLowerCase().includes(query))
      ) {
        results.push({
          type: 'character',
          id: char.id,
          title: char.name,
          subtitle: char.role,
        });
      }
    }
    // Search locations
    for (const loc of novel.locations) {
      const nameLower = loc.name.toLowerCase();
      if (
        nameLower.includes(query) ||
        (loc.description && loc.description.toLowerCase().includes(query))
      ) {
        results.push({
          type: 'location',
          id: loc.id,
          title: loc.name,
          subtitle: loc.type,
        });
      }
    }
    // Search front matter
    for (const item of novel.frontMatter) {
      if (
        item.title.toLowerCase().includes(query) ||
        (item.content && item.content.toLowerCase().includes(query))
      ) {
        results.push({
          type: 'frontMatter',
          id: item.id,
          title: item.title,
          subtitle: this.getFrontMatterTypeLabel(item.type),
        });
      }
    }
    // Search prologue
    if (novel.prologue) {
      const prologue = novel.prologue;
      if (
        prologue.title.toLowerCase().includes(query) ||
        (prologue.content && prologue.content.toLowerCase().includes(query))
      ) {
        results.push({
          type: 'prologue',
          id: 'prologue',
          title: prologue.title,
          subtitle: 'Prologue',
        });
      }
    }
    return results;
  });
  selectSearchResult(result) {
    if (result.type === 'chapter') {
      const novel = this.novel();
      if (novel) {
        for (const group of novel.chapters) {
          const chapter = group.children.find((c) => c.id === result.id);
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
    this.focusMode.update((v) => !v);
    if (this.focusMode()) {
      // Entering focus mode: collapse sidebars
      this.leftSidebarCollapsed.set(true);
      this.rightSidebarCollapsed.set(true);
    } else {
      // Exiting focus mode: restore sidebars to default (visible)
      this.leftSidebarCollapsed.set(false);
      this.rightSidebarCollapsed.set(false);
    }
  }
  // AI Companion Methods
  getCurrentContext() {
    const chapter = this.activeChapter();
    const novel = this.novel();
    if (!chapter || !novel) return '';
    let context = `Chapter: ${chapter.title}\n\n${chapter.content}\n\n`;
    // Add novel metadata
    if (novel.characters.length > 0) {
      context += `Characters: ${novel.characters.map((c) => c.name).join(', ')}\n`;
    }
    if (novel.locations.length > 0) {
      context += `Locations: ${novel.locations.map((l) => l.name).join(', ')}\n`;
    }
    return context;
  }
  getSelectedText() {
    if (!this.editor) return '';
    const { from, to } = this.editor.state.selection;
    if (from === to) return '';
    return this.editor.state.doc.textBetween(from, to);
  }
  async sendAiMessage(prompt) {
    const message = prompt || this.aiPrompt();
    if (!message.trim()) return;
    const context = this.getCurrentContext();
    const selectedText = this.getSelectedText();
    const fullContext = selectedText
      ? `${context}\n\nSelected text: ${selectedText}`
      : context;
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      context: fullContext,
    };
    this.aiMessages.update((messages) => [...messages, userMessage]);
    this.aiPrompt.set('');
    // Show loading
    this.aiLoading.set(true);
    this.aiError.set(null);
    try {
      const response = await this.aiService.sendMessage(message, fullContext);
      // Add assistant response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      this.aiMessages.update((messages) => [...messages, assistantMessage]);
    } catch (error) {
      this.aiError.set('Failed to get AI response. Please try again.');
      console.error('AI error:', error);
    } finally {
      this.aiLoading.set(false);
    }
  }
  async analyzeToneAndPacing() {
    const chapter = this.activeChapter();
    if (!chapter) {
      this.aiError.set('Please select a chapter to analyze.');
      return;
    }
    this.aiLoading.set(true);
    this.aiError.set(null);
    try {
      const analysis = await this.aiService.analyzeToneAndPacing(
        chapter.content,
      );
      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Analyze the tone and pacing of this chapter',
        timestamp: new Date(),
        context: this.getCurrentContext(),
      };
      this.aiMessages.update((messages) => [...messages, userMessage]);
      // Add assistant response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: analysis,
        timestamp: new Date(),
      };
      this.aiMessages.update((messages) => [...messages, assistantMessage]);
    } catch (error) {
      this.aiError.set('Failed to analyze chapter. Please try again.');
      console.error('Analysis error:', error);
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
      const suggestions = await this.aiService.generateSuggestions(
        chapter.content,
      );
      this.aiSuggestions.set(suggestions);
      // Also add to chat
      const suggestionsText = suggestions
        .map((s) => `- ${s.content}`)
        .join('\n');
      const message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Writing Suggestions:**\n\n${suggestionsText}`,
        timestamp: new Date(),
      };
      this.aiMessages.update((messages) => [...messages, message]);
    } catch (error) {
      this.aiError.set('Failed to generate suggestions. Please try again.');
      console.error('Suggestions error:', error);
    } finally {
      this.aiLoading.set(false);
    }
  }
  async summarizeChapter() {
    const chapter = this.activeChapter();
    if (!chapter) {
      this.aiError.set('Please select a chapter to summarize.');
      return;
    }
    this.aiLoading.set(true);
    this.aiError.set(null);
    try {
      const summary = await this.aiService.summarizeContent(chapter.content);
      const message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Chapter Summary:**\n\n${summary}`,
        timestamp: new Date(),
      };
      this.aiMessages.update((messages) => [...messages, message]);
      // Scrolling handled by AI panel component
    } catch (error) {
      this.aiError.set('Failed to summarize chapter. Please try again.');
      console.error('Summary error:', error);
    } finally {
      this.aiLoading.set(false);
    }
  }
  async continueWriting() {
    if (!this.editor) return;
    const content = this.editor.getHTML();
    const cursorPosition = this.editor.state.selection.anchor;
    this.aiLoading.set(true);
    this.aiError.set(null);
    try {
      const continuation = await this.aiService.continueWriting(
        content,
        cursorPosition,
      );
      // Insert at cursor
      this.editor.chain().focus().insertContent(continuation).run();
      const message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Continued writing:**\n\n${continuation}`,
        timestamp: new Date(),
      };
      this.aiMessages.update((messages) => [...messages, message]);
      // Scrolling handled by AI panel component
    } catch (error) {
      this.aiError.set('Failed to continue writing. Please try again.');
      console.error('Continue error:', error);
    } finally {
      this.aiLoading.set(false);
    }
  }
  applySuggestion(suggestion) {
    if (!this.editor) return;
    if (suggestion.originalText && suggestion.position !== undefined) {
      // Replace original text
      const content = this.editor.getHTML();
      const newContent = content.replace(
        suggestion.originalText,
        suggestion.content,
      );
      this.editor.commands.setContent(newContent);
    } else {
      // Insert at cursor
      this.editor.chain().focus().insertContent(suggestion.content).run();
    }
    // Remove suggestion
    this.aiSuggestions.update((suggestions) =>
      suggestions.filter((s) => s.id !== suggestion.id),
    );
  }
  clearAiConversation() {
    this.aiMessages.set([]);
    this.aiSuggestions.set([]);
    this.aiError.set(null);
  }
  getTokenCount() {
    const context = this.getCurrentContext();
    return this.aiService.estimateTokens(context);
  }
  formatMessage(content) {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
  formatTime(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }
  // scrollToBottom and handleChatEnter moved to AI panel component
  // Full screen mode
  toggleFullScreen() {
    this.fullScreenMode.update((v) => !v);
    if (this.fullScreenMode()) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  // Bulk operations
  toggleBulkMode() {
    this.bulkMode.update((v) => !v);
    if (!this.bulkMode()) {
      this.selectedChapters.set(new Set());
    }
  }
  toggleChapterSelection(chapterId) {
    const selected = new Set(this.selectedChapters());
    if (selected.has(chapterId)) {
      selected.delete(chapterId);
    } else {
      selected.add(chapterId);
    }
    this.selectedChapters.set(selected);
  }
  bulkDeleteChapters() {
    const selected = Array.from(this.selectedChapters());
    if (selected.length === 0) return;
    const novel = this.novel();
    if (!novel) return;
    // Delete all selected chapters
    selected.forEach((chapterId) => {
      this.novelService.deleteChapter(chapterId);
      if (this.activeChapterId() === chapterId) {
        this.activeChapterId.set(null);
        this.title.set('');
        this.editor.commands.clearContent();
      }
    });
    this.selectedChapters.set(new Set());
    this.bulkMode.set(false);
  }
  bulkMoveChapters(targetGroupId) {
    const selected = Array.from(this.selectedChapters());
    if (selected.length === 0) return;
    // Move logic would go here
    this.selectedChapters.set(new Set());
    this.bulkMode.set(false);
  }
  // Sidebar toggles
  toggleLeftSidebar() {
    this.leftSidebarCollapsed.update((v) => !v);
  }
  toggleRightSidebar() {
    this.rightSidebarCollapsed.update((v) => !v);
  }
  // UI toggles
  toggleSearch() {
    this.searchOpen.update((v) => !v);
  }
  toggleExportMenu() {
    this.exportMenuOpen.update((v) => !v);
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
          this.editor.state.selection.to,
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
      this.editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${text}</a>`)
        .run();
    } else {
      this.editor.chain().focus().setLink({ href: url }).run();
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
  addImage() {
    if (!this.editor) return;
    const url = prompt('Enter image URL:');
    if (url) {
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }
  insertTable() {
    if (!this.editor) return;
    this.editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }
  addYoutube() {
    if (!this.editor) return;
    const url = prompt('Enter YouTube URL:');
    if (url) {
      this.editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }
  // Export functionality
  exportNovel(format) {
    const novel = this.novel();
    if (!novel) return;
    let content = '';
    let filename = novel.title.toLowerCase().replace(/\s+/g, '-');
    if (format === 'html' || format === 'md') {
      // Build HTML/Markdown content
      content = `<h1>${novel.title}</h1>\n\n`;
      // Front Matter
      if (novel.frontMatter.length > 0) {
        content += '<h2>Front Matter</h2>\n';
        novel.frontMatter.forEach((item) => {
          content += `<h3>${item.title}</h3>\n${item.content}\n\n`;
        });
      }
      // Prologue
      if (novel.prologue) {
        content += `<h2>${novel.prologue.title}</h2>\n${novel.prologue.content}\n\n`;
      }
      // Chapters
      novel.chapters.forEach((group) => {
        content += `<h2>${group.title}</h2>\n`;
        group.children.forEach((chap) => {
          content += `<h3>${chap.title}</h3>\n${chap.content}\n\n`;
        });
      });
      const blob = new Blob([content], {
        type: format === 'html' ? 'text/html' : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      window.print();
    } else if (format === 'docx') {
      // For DOCX, we'd need a library like docx.js
      // For now, export as HTML which can be opened in Word
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
};
__decorate(
  [ViewChild('addInput')],
  NovelEditorComponent.prototype,
  'addInputRef',
  void 0,
);
__decorate(
  [HostListener('document:click', ['$event'])],
  NovelEditorComponent.prototype,
  'onDocumentClick',
  null,
);
__decorate(
  [HostListener('document:keydown', ['$event'])],
  NovelEditorComponent.prototype,
  'onKeyDown',
  null,
);
NovelEditorComponent = __decorate(
  [
    Component({
      selector: 'app-novel-editor',
      standalone: true,
      imports: [
        CommonModule,
        FormsModule,
        // Modals
        DeleteModalComponent,
        AddModalComponent,
        LinkModalComponent,
        VersionHistoryModalComponent,
        // Sidebar
        SyncStatusComponent,
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
      templateUrl: './novel-editor.component.html',
      styleUrl: './novel-editor.component.css',
      changeDetection: ChangeDetectionStrategy.OnPush,
    }),
  ],
  NovelEditorComponent,
);
export { NovelEditorComponent };
