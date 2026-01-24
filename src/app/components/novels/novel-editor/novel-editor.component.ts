import { Component, OnDestroy, OnInit, signal, effect, inject, computed, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NovelContentService, Chapter, ChapterGroup } from '../../../services/novel-content.service';

import { AiService } from '../../../services/ai.service';

@Component({
  selector: 'app-novel-editor',
  standalone: true,
  imports: [CommonModule, TiptapEditorDirective, FormsModule],
  templateUrl: './novel-editor.component.html',
  styleUrl: './novel-editor.component.css'
})
export class NovelEditorComponent implements OnInit, OnDestroy, AfterViewChecked {
  editor!: Editor;
  novelService = inject(NovelContentService);
  aiService = inject(AiService); // Inject AI Service
  route = inject(ActivatedRoute);
  @ViewChild('addInput') addInputRef!: ElementRef<HTMLInputElement>;
  private shouldFocusInput = false;

  // State
  title = signal('');
  activeChapterId = signal<string | null>(null);
  wordCount = signal(0);
  rightSidebarTab = signal<'ai' | 'notes' | 'manuscript'>('ai');
  activeNav = signal<'manuscript' | 'characters' | 'locations'>('manuscript');

  // Time tracking
  sessionStartTime = Date.now();
  elapsedSeconds = signal(0);
  targetWordCount = signal(2500);

  // Computed signals from Service
  novel = this.novelService.activeNovel;

  activeCharacter = computed(() => {
    const n = this.novel();
    const id = this.selectedCharacterId();
    return n?.characters.find(c => c.id === id);
  });

  activeLocation = computed(() => {
    const n = this.novel();
    const id = this.selectedLocationId();
    return n?.locations.find(l => l.id === id);
  });

  constructor(private router: Router) {
    // Effect to update editor content when active chapter changes
    effect(() => {
      const chapterId = this.activeChapterId();
      if (chapterId && this.editor) {
        const chapter = this.novelService.getChapter(chapterId);
        if (chapter && this.editor.getHTML() !== chapter.content) {
          this.editor.commands.setContent(chapter.content);
          this.title.set(chapter.title);

          // Recalculate word count from actual content instead of using stored value
          const text = this.editor.getText();
          const count = text.split(/\s+/).filter(w => w.length > 0).length;
          this.wordCount.set(count);
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
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.elapsedSeconds.set(elapsed);
    }, 1000);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '1';
    this.novelService.loadNovel(id);

    this.editor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start writing your chapter...',
        }),
      ],
      content: '', // Initial content will be set by effect
      onUpdate: ({ editor }) => {
        const text = editor.getText();
        const count = text.split(/\s+/).filter(w => w.length > 0).length;
        this.wordCount.set(count);

        // Auto-save to service
        const activeId = this.activeChapterId();
        if (activeId) {
          this.novelService.updateChapterContent(activeId, editor.getHTML(), count);
        }
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldFocusInput && this.addInputRef?.nativeElement) {
      this.addInputRef.nativeElement.focus();
      this.addInputRef.nativeElement.select();
      this.shouldFocusInput = false;
    }
  }

  ngOnDestroy() {
    this.editor.destroy();
  }

  goBack() {
    this.router.navigate(['/novels']);
  }

  toggleChapter(group: ChapterGroup) {
    this.novelService.toggleGroupExpand(group.id);
  }

  selectChapter(chapter: Chapter) {
    this.activeChapterId.set(chapter.id);
  }

  setActiveTab(tab: 'ai' | 'notes' | 'manuscript') {
    this.rightSidebarTab.set(tab);
  }

  setActiveNav(nav: 'manuscript' | 'characters' | 'locations') {
    this.activeNav.set(nav);
  }

  // Title editing
  onTitleChange(newTitle: string) {
    this.title.set(newTitle);
    const activeId = this.activeChapterId();
    if (activeId) {
      this.novelService.updateChapterTitle(activeId, newTitle);
    }
  }

  // Delete Modal State
  deleteModal = signal<{
    isOpen: boolean;
    type: 'chapter' | 'group' | 'character' | 'location' | 'note' | null;
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

  requestDelete(type: 'chapter' | 'group' | 'character' | 'location' | 'note', id: string, name?: string) {
    let title = 'Delete Item';
    let message = 'Are you sure you want to delete this item? This action cannot be undone.';

    switch (type) {
      case 'chapter':
        title = 'Delete Chapter?';
        message = `Are you sure you want to delete "${name || 'this chapter'}"?`;
        break;
      case 'group':
        title = 'Delete Act/Part?';
        const novel = this.novel();
        const group = novel?.chapters.find(g => g.id === id);
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
        const deletedGroup = novel?.chapters.find(g => g.id === modal.id);
        if (deletedGroup) {
          const deletedChapterIds = deletedGroup.children.map(c => c.id);
          if (this.activeChapterId() && deletedChapterIds.includes(this.activeChapterId()!)) {
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
      message: ''
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.add-menu-wrapper')) {
      this.addMenuOpen.set(false);
    }
  }

  // Add menu state
  addMenuOpen = signal(false);

  // Add Modal State
  addModal = signal<{
    isOpen: boolean;
    type: 'act' | 'chapter' | null;
    title: string;
    inputValue: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    inputValue: ''
  });

  // Chapter management
  addNewChapter(groupId?: string) {
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
      inputValue: 'Untitled Chapter'
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
          const targetGroup = novel.chapters.find(g => g.id === targetGroupId);
          const chapterCountBefore = targetGroup?.children.length || 0;
          
          this.novelService.addChapter(targetGroupId, modal.inputValue.trim());
          
          // Select the newly created chapter
          setTimeout(() => {
            const updatedNovel = this.novel();
            if (updatedNovel) {
              const updatedGroup = updatedNovel.chapters.find(g => g.id === targetGroupId);
              if (updatedGroup && updatedGroup.children.length > chapterCountBefore) {
                const newChapter = updatedGroup.children[updatedGroup.children.length - 1];
                this.selectChapter(newChapter);
              }
            }
          }, 10);
        }
      }
    }

    this.cancelAdd();
  }

  cancelAdd() {
    this.addModal.set({
      isOpen: false,
      type: null,
      title: '',
      inputValue: ''
    });
  }

  updateAddModalInput(value: string) {
    this.addModal.update(modal => ({
      ...modal,
      inputValue: value
    }));
  }

  addNewActOrPart() {
    this.addMenuOpen.set(false);
    this.addModal.set({
      isOpen: true,
      type: 'act',
      title: 'Add New Act/Part',
      inputValue: 'New Part'
    });
    this.shouldFocusInput = true;
  }

  toggleAddMenu() {
    this.addMenuOpen.update(v => !v);
  }

  deleteChapter(chapterId: string, title?: string) {
    this.requestDelete('chapter', chapterId, title);
  }

  deleteGroup(groupId: string, title?: string) {
    this.requestDelete('group', groupId, title);
  }

  // Note management
  addNewNote() {
    const title = prompt('Note title:');
    if (title) {
      this.novelService.addNote(title, '', this.activeChapterId() || undefined);
    }
  }

  deleteNote(noteId: string) {
    this.requestDelete('note', noteId);
  }

  selectedCharacterId = signal<string | null>(null);
  selectedLocationId = signal<string | null>(null);

  // Character management
  addNewCharacter() {
    this.novelService.addCharacter('New Character');
    // Auto-select the newly created character (assuming it's the last one)
    const n = this.novel();
    if (n && n.characters.length > 0) {
      this.selectedCharacterId.set(n.characters[n.characters.length - 1].id);
    }
  }

  selectCharacter(charId: string) {
    this.selectedCharacterId.set(charId);
  }

  updateCharacterField(charId: string, field: string, value: string) {
    this.novelService.updateCharacter(charId, { [field]: value });
  }

  deleteCharacter(charId: string, name?: string) {
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

  selectLocation(locId: string) {
    this.selectedLocationId.set(locId);
  }

  updateLocationField(locId: string, field: string, value: string) {
    this.novelService.updateLocation(locId, { [field]: value });
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
}
