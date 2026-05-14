import { Component, computed, inject, signal, untracked, HostListener, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Note } from '@envello/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, ModalComponent, EmptyStateComponent, AiAssistantPanelComponent, AiPanelMessage } from '@envello/ui';
import { TauriService } from '@envello/core';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import FloatingMenu from '@tiptap/extension-floating-menu';
import { TiptapEditorDirective, TiptapBubbleMenuDirective, TiptapFloatingMenuDirective } from 'ngx-tiptap';

interface NoteGroup {
  id: string;
  name: string;
  icon: string;
  count: number;
  expanded: boolean;
  noteIds: string[];
}


@Component({
  selector: 'app-daily-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, TiptapBubbleMenuDirective, TiptapFloatingMenuDirective, ButtonComponent, ModalComponent, EmptyStateComponent, AiAssistantPanelComponent],
  templateUrl: './daily-notes.component.html',
  styleUrl: './daily-notes.component.css'
})
export class DailyNotesComponent implements OnInit, OnDestroy {
  private store = inject(StoreService);
  private tauriService = inject(TauriService);
  editor!: Editor;

  // Connect to store signals
  notes = this.store.notes;

  wordCount = signal(0);
  characterCount = signal(0);

  // Modal State
  activeModal = signal<'none' | 'new-folder' | 'add-tag' | 'link' | 'image' | 'delete-confirm' | 'delete-folder-confirm' | 'export' | 'youtube'>('none');
  modalInputValue = signal<string>('');
  modalInputPlaceholder = signal<string>('');
  modalTitle = signal<string>('');
  tempNoteId = signal<string>('');
  tempFolderId = signal<string>('');

  selectedEntryId = signal<string>('');
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('all');
  selectedTag = signal<string>('');
  activeView = signal<'folders' | 'tags'>('folders');
  noteBgClass = signal<string>('');
  showColorPicker = signal<boolean>(false);
  isFullWidth = signal<boolean>(false);

  readonly bgColors = [
    '',
    'note-bg--rose',
    'note-bg--orange',
    'note-bg--yellow',
    'note-bg--green',
    'note-bg--cyan',
    'note-bg--blue',
    'note-bg--purple',
    'note-bg--pink',
    'note-bg--warm',
    'note-bg--cool',
  ];

  // Track open notes as tabs
  openNotes = signal<string[]>([]);

  // Note groups for organization (synced from store so they persist across reloads)
  noteGroups = signal<NoteGroup[]>([]);

  // All unique tags derived dynamically from notes — sorted by usage count desc, then alpha
  allTags = computed(() => {
    const tagMap = new Map<string, number>();
    for (const note of this.notes()) {
      for (const tag of note.tags ?? []) {
        if (tag === 'pinned') continue;
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      }
    }
    return [...tagMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  showDropdown = signal<boolean>(false);
  showMoreOptionsMenu = signal<boolean>(false);
  showFormatMenu = signal<boolean>(false);
  showInfoMenu = signal<boolean>(false);
  showMediaMenu = signal<boolean>(false);
  activeFolderMenuId = signal<string | null>(null);

  pinnedCount = computed(() => this.notes().filter(n => this.isPinned(n)).length);
  taggedCount = computed(() => this.notes().filter(n => n.tags?.some(t => t !== 'pinned')).length);
  pinnedNotes = computed(() => this.notes().filter(n => this.isPinned(n)));

  dragOverFolderId = signal<string | null>(null);
  draggingNoteId = signal<string | null>(null);

  private readonly SELECTION_KEY = 'envello-daily-notes-selection';

  displayModalTitle = computed(() => {
    const t = this.modalTitle();
    if (t) return t;
    const m = this.activeModal();
    if (m === 'delete-confirm') return 'Delete Note';
    if (m === 'delete-folder-confirm') return 'Delete Folder';
    if (m === 'export') return 'Export Note';
    return '';
  });

  // Computed filtered notes — search + filter + tag
  filteredNotes = computed(() => {
    let list = this.notes();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();
    const tag = this.selectedTag();

    if (query) {
      list = list.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.preview.toLowerCase().includes(query) ||
        note.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    if (filter === 'pinned') {
      list = list.filter(note => note.tags?.includes('pinned'));
    } else if (filter === 'tagged') {
      list = list.filter(note => note.tags && note.tags.length > 0);
    }

    if (tag) {
      list = list.filter(note => note.tags?.includes(tag));
    }

    return list;
  });

  bucketedFilteredNotes = computed(() => {
    return this.getBucketedNotes(this.filteredNotes());
  });

  private effectiveFolderId(note: Note): string {
    const firstFolderId = this.noteGroups()[0]?.id ?? 'personal';
    const fid = note.folderId ?? firstFolderId;
    return this.noteGroups().some((g) => g.id === fid) ? fid : firstFolderId;
  }

  getBucketedNotesForFolder(folderId: string): { label: string; notes: Note[] }[] {
    const inFolder = this.filteredNotes().filter((n) => this.effectiveFolderId(n) === folderId);
    return this.getBucketedNotes(inFolder);
  }

  getNotesForFolder(folderId: string): Note[] {
    return this.filteredNotes().filter((n) => this.effectiveFolderId(n) === folderId);
  }

  getNotesCountForFolder(folderId: string): number {
    return this.filteredNotes().filter((n) => this.effectiveFolderId(n) === folderId).length;
  }

  getBucketedNotes(notes: Note[]): { label: string, notes: Note[] }[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const buckets = {
      today: [] as Note[],
      yesterday: [] as Note[],
      previous7Days: [] as Note[],
      previous30Days: [] as Note[],
      older: [] as Note[]
    };

    const sortedNotes = [...notes].sort((a, b) => {
      let aTime = parseInt(a.id, 10);
      let bTime = parseInt(b.id, 10);
      if (isNaN(aTime)) aTime = new Date(a.date).getTime();
      if (isNaN(bTime)) bTime = new Date(b.date).getTime();
      return bTime - aTime;
    });

    for (const note of sortedNotes) {
      let noteDate: Date;
      const timestamp = parseInt(note.id, 10);
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        noteDate = new Date(timestamp);
      } else {
        noteDate = new Date(note.date);
        if (isNaN(noteDate.getTime())) {
          noteDate = new Date();
        }
      }

      const timeOnly = new Date(noteDate);
      timeOnly.setHours(0, 0, 0, 0);

      if (timeOnly.getTime() === today.getTime()) {
        buckets.today.push(note);
      } else if (timeOnly.getTime() === yesterday.getTime()) {
        buckets.yesterday.push(note);
      } else if (timeOnly.getTime() > sevenDaysAgo.getTime()) {
        buckets.previous7Days.push(note);
      } else if (timeOnly.getTime() > thirtyDaysAgo.getTime()) {
        buckets.previous30Days.push(note);
      } else {
        buckets.older.push(note);
      }
    }

    const result = [];
    if (buckets.today.length > 0) result.push({ label: 'Today', notes: buckets.today });
    if (buckets.yesterday.length > 0) result.push({ label: 'Yesterday', notes: buckets.yesterday });
    if (buckets.previous7Days.length > 0) result.push({ label: 'Previous 7 Days', notes: buckets.previous7Days });
    if (buckets.previous30Days.length > 0) result.push({ label: 'Previous 30 Days', notes: buckets.previous30Days });
    if (buckets.older.length > 0) result.push({ label: 'Older Notes', notes: buckets.older });

    return result;
  }

  formatTime(id: string, lastEdited?: string): string {
    const timestamp = parseInt(id, 10);
    if (!isNaN(timestamp) && timestamp > 1000000000000) {
      return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return lastEdited || '—';
  }

  getPreviewText(preview: string): string {
    if (!preview || preview.trim() === '') return 'No additional text';
    if (preview === "Start writing...") return "No additional text";
    return preview;
  }

  allGroupsCollapsed = computed(() => {
    return this.noteGroups().every(g => !g.expanded);
  });

  allExpanded = computed(() => {
    return this.noteGroups().every(g => g.expanded);
  });

  selectedNote = computed(() => {
    if (this.openNotes().length === 0) return null;

    // Use all notes (not filteredNotes) so the editor keeps showing
    // even when a sidebar filter is active that would exclude this note.
    const allNotes = this.notes();
    if (allNotes.length === 0) return null;

    const selectedId = this.selectedEntryId();
    if (!selectedId) {
      const firstOpenId = this.openNotes()[0];
      return allNotes.find(n => n.id === firstOpenId) || null;
    }

    const found = allNotes.find(n => n.id === selectedId);
    if (found && this.openNotes().includes(found.id)) return found;
    return null;
  });

  constructor() {
    effect(() => {
      const folders = this.store.noteFolders();
      if (folders.length === 0) return;
      const current = untracked(() => this.noteGroups());
      const next: NoteGroup[] = folders.map((f) => {
        const cur = current.find((c) => c.id === f.id);
        return {
          ...f,
          expanded: cur?.expanded ?? true,
          noteIds: cur?.noteIds ?? [],
          count: cur?.count ?? 0,
        };
      });
      this.noteGroups.set(next);
    });

    effect(() => {
      const notes = this.notes();
      if (notes.length === 0) return;
      // Use untracked so opening/closing tabs does NOT re-trigger this effect.
      // Without untracked, closing the last tab causes hasValidTabs=false,
      // which bypasses the guard and re-opens the note from stale localStorage.
      const selectedId = untracked(() => this.selectedEntryId());
      const openIds = untracked(() => this.openNotes());
      const noteIds = new Set(notes.map((n) => n.id));
      const hasValidSelection = selectedId && noteIds.has(selectedId);
      const hasValidTabs = openIds.length > 0 && openIds.some((id) => noteIds.has(id));
      if (hasValidSelection && hasValidTabs) return;

      const saved = this.loadSelectionFromStorage();
      const validOpen = (saved?.openNotes ?? openIds).filter((id) => noteIds.has(id));
      const validSelected = saved?.selectedId && noteIds.has(saved.selectedId) ? saved.selectedId : validOpen[0] ?? notes[0].id;
      const finalOpen = validOpen.length > 0 ? validOpen : [validSelected];

      this.selectedEntryId.set(validSelected);
      this.openNotes.set(finalOpen);
      this.store.loadNoteContent(validSelected);
    });

    effect(() => {
      const selectedId = this.selectedEntryId();
      const openIds = this.openNotes();
      if (!selectedId && openIds.length === 0) return;
      this.saveSelectionToStorage(selectedId, openIds);
    });

    effect(() => {
      const note = this.selectedNote();
      if (note && this.editor) {
        const content = note.content || '';
        if (this.editor.getHTML() !== content) {
          this.editor.commands.setContent(content);
        }
      }
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event) {
    if (this.activeModal() !== 'none') {
      event.preventDefault();
      this.closeModal();
    }
  }

  ngOnInit() {
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        Placeholder.configure({
          placeholder: 'Press \'/\' for commands...',
        }),
        BubbleMenu.configure({
          pluginKey: 'bubbleMenu',
          shouldShow: ({ editor }) => {
            return !editor.view.state.selection.empty && editor.isEditable;
          },
        }),
        FloatingMenu.configure({
          pluginKey: 'floatingMenu',
          shouldShow: ({ editor }) => {
            return editor.isActive('paragraph') && editor.state.selection.$from.parent.content.size === 0;
          },
        }),
        Link.configure({ openOnClick: false }),
        Image,
        TaskList,
        TaskItem.configure({ nested: true }),
        CharacterCount,
        Underline,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Youtube.configure({ controls: true }),
        CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
      ],
      editorProps: {
        attributes: {
          class: 'dn-editor-text focus:outline-none',
        },
      },
      onUpdate: ({ editor }) => {
        const content = editor.getHTML();
        const plainText = editor.getText();
        const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
        this.updateNoteContent(content, preview);
        this.wordCount.set(editor.storage.characterCount.words());
        this.characterCount.set(editor.storage.characterCount.characters());
      },
    });
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  updateNoteContent(content: string, preview: string) {
    const activeId = this.selectedEntryId();
    if (activeId) {
      this.store.updateNote(activeId, { content, preview });
    }
  }

  handleNewNote() {
    const firstFolderId = this.noteGroups()[0]?.id ?? 'personal';
    const newNote: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: 'Title',
      preview: 'Start writing...',
      content: '<p>Start writing your thoughts...</p>',
      tags: [],
      folderId: firstFolderId,
    };
    this.store.addNote(newNote);
    this.selectNote(newNote.id);
  }

  moveNoteToFolder(noteId: string, targetFolderId: string) {
    this.store.updateNote(noteId, { folderId: targetFolderId });
  }

  onNoteDragStart(noteId: string, event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', noteId);
      event.dataTransfer.effectAllowed = 'move';
    }
    this.draggingNoteId.set(noteId);
  }

  onNoteDragEnd() {
    this.draggingNoteId.set(null);
    this.dragOverFolderId.set(null);
  }

  onFolderDragOver(folderId: string, event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverFolderId.set(folderId);
  }

  onFolderDragLeave(event?: DragEvent) {
    const related = event?.relatedTarget as HTMLElement;
    if (related?.closest?.('.folder-group, .dn-entries-list')) return;
    this.dragOverFolderId.set(null);
  }

  onFolderDrop(folderId: string, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverFolderId.set(null);
    const noteId = event.dataTransfer?.getData('text/plain');
    if (noteId) this.moveNoteToFolder(noteId, folderId);
  }

  onListDragOver(event: DragEvent) {
    if ((event.target as HTMLElement)?.closest?.('.folder-group')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const firstId = this.noteGroups()[0]?.id ?? 'personal';
    this.dragOverFolderId.set(firstId);
  }

  onListDragLeave(event: DragEvent) {
    if ((event.relatedTarget as HTMLElement)?.closest?.('.dn-entries-list')) return;
    this.dragOverFolderId.set(null);
  }

  onListDrop(event: DragEvent) {
    if ((event.target as HTMLElement)?.closest?.('.folder-group')) return;
    event.preventDefault();
    this.dragOverFolderId.set(null);
    const noteId = event.dataTransfer?.getData('text/plain');
    const firstId = this.noteGroups()[0]?.id ?? 'personal';
    if (noteId) this.moveNoteToFolder(noteId, firstId);
  }

  private loadSelectionFromStorage(): { selectedId: string; openNotes: string[] } | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.SELECTION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as { selectedId?: string; openNotes?: string[] };
      if (data?.openNotes && Array.isArray(data.openNotes)) {
        return { selectedId: data.selectedId ?? data.openNotes[0], openNotes: data.openNotes };
      }
      return null;
    } catch {
      return null;
    }
  }

  private saveSelectionToStorage(selectedId: string, openNotes: string[]) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.SELECTION_KEY, JSON.stringify({ selectedId, openNotes }));
    } catch {
      /* ignore */
    }
  }

  selectNote(id: string) {
    this.selectedEntryId.set(id);
    this.store.loadNoteContent(id);
    if (!this.openNotes().includes(id)) {
      this.openNotes.update(tabs => [...tabs, id]);
    }
  }

  toggleGroup(groupId: string) {
    this.noteGroups.update(groups =>
      groups.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
    );
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  toggleFolderMenu(folderId: string, event: Event) {
    event.stopPropagation();
    this.activeFolderMenuId.set(this.activeFolderMenuId() === folderId ? null : folderId);
  }

  getCategoryTextColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.9)';
  }

  setFilter(filter: string) {
    this.selectedFilter.set(filter);
    this.selectedTag.set('');
  }

  selectTag(tag: string) {
    this.selectedTag.set(this.selectedTag() === tag ? '' : tag);
    this.selectedFilter.set('all');
  }

  isPinned(note: Note): boolean {
    return note.tags?.includes('pinned') || false;
  }

  togglePin(note: Note, event: Event) {
    event.stopPropagation();
    const tags = note.tags || [];
    const pinned = tags.includes('pinned');
    this.store.updateNote(note.id, {
      tags: pinned ? tags.filter(t => t !== 'pinned') : [...tags, 'pinned']
    });
  }

  getNoteTags(note: Note): string[] {
    return note.tags?.filter(tag => tag !== 'pinned') || [];
  }

  expandAll() {
    this.noteGroups.update(groups => groups.map(g => ({ ...g, expanded: true })));
  }

  collapseAll() {
    this.noteGroups.update(groups => groups.map(g => ({ ...g, expanded: false })));
  }

  toggleDropdown() {
    this.showDropdown.update(show => !show);
  }

  toggleMoreOptions() {
    this.showMoreOptionsMenu.update(v => !v);
    if (this.showFormatMenu()) this.showFormatMenu.set(false);
    if (this.showInfoMenu()) this.showInfoMenu.set(false);
    if (this.showMediaMenu()) this.showMediaMenu.set(false);
  }

  toggleInfoMenu() {
    this.showInfoMenu.update(v => !v);
    if (this.showMoreOptionsMenu()) this.showMoreOptionsMenu.set(false);
    if (this.showFormatMenu()) this.showFormatMenu.set(false);
    if (this.showMediaMenu()) this.showMediaMenu.set(false);
  }

  toggleFormatMenu() {
    this.showFormatMenu.update(v => !v);
    if (this.showMoreOptionsMenu()) this.showMoreOptionsMenu.set(false);
    if (this.showMediaMenu()) this.showMediaMenu.set(false);
  }

  toggleMediaMenu() {
    this.showMediaMenu.update(v => !v);
    if (this.showMoreOptionsMenu()) this.showMoreOptionsMenu.set(false);
    if (this.showFormatMenu()) this.showFormatMenu.set(false);
    if (this.showInfoMenu()) this.showInfoMenu.set(false);
  }


  setFormat(type: 'paragraph' | 'h1' | 'h2' | 'h3') {
    if (!this.editor) return;
    if (type === 'paragraph') {
      this.editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(type.slice(1), 10) as 1 | 2 | 3;
      this.editor.chain().focus().toggleHeading({ level }).run();
    }
    this.showFormatMenu.set(false);
  }

  duplicateNote(note: Note) {
    const duplicate: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: `${note.title} (copy)`,
      preview: note.preview,
      content: note.content,
      tags: [...(note.tags || [])],
      folderId: note.folderId,
    };
    this.store.addNote(duplicate);
    this.selectNote(duplicate.id);
  }

  handleNewFolder() {
    this.modalTitle.set('New Folder');
    this.modalInputPlaceholder.set('Enter folder name...');
    this.modalInputValue.set('');
    this.activeModal.set('new-folder');
  }

  confirmNewFolder() {
    const folderName = this.modalInputValue();
    if (folderName) {
      const id = folderName.toLowerCase().replace(/\s+/g, '-');
      const folder = { id, name: folderName, icon: 'folder' };
      this.store.addNoteFolder(folder);
    }
    this.closeModal();
  }

  toggleExpandAll() {
    const shouldExpand = !this.allExpanded();
    this.noteGroups.update(groups => groups.map(g => ({ ...g, expanded: shouldExpand })));
  }

  closeNoteTab(noteId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.openNotes.update(tabs => tabs.filter(id => id !== noteId));
    if (this.selectedEntryId() === noteId) {
      const remainingTabs = this.openNotes();
      this.selectedEntryId.set(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : '');
    }
  }

  getNoteById(id: string): Note | undefined {
    return this.notes().find(n => n.id === id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper') && !target.closest('.color-picker-wrapper')) {
      if (this.showDropdown()) this.showDropdown.set(false);
      if (this.showMoreOptionsMenu()) this.showMoreOptionsMenu.set(false);
      if (this.showFormatMenu()) this.showFormatMenu.set(false);
      if (this.showInfoMenu()) this.showInfoMenu.set(false);
      if (this.showMediaMenu()) this.showMediaMenu.set(false);
      if (this.showColorPicker()) this.showColorPicker.set(false);
    }
    if (!target.closest('.folder-menu-wrapper')) {
      if (this.activeFolderMenuId()) this.activeFolderMenuId.set(null);
    }
  }

  switchView(view: 'folders' | 'tags') {
    this.activeView.set(view);
  }

  updateNoteTitle(title: string) {
    const activeId = this.selectedEntryId();
    if (activeId) {
      this.store.updateNote(activeId, { title });
    }
  }

  deleteCurrentNote() {
    const activeId = this.selectedEntryId();
    if (activeId) {
      this.tempNoteId.set(activeId);
      this.activeModal.set('delete-confirm');
    }
  }

  requestDeleteNote(noteId: string, event: Event) {
    event.stopPropagation();
    this.tempNoteId.set(noteId);
    this.activeModal.set('delete-confirm');
  }

  confirmDeleteNote() {
    const activeId = this.tempNoteId();
    if (activeId) {
      this.closeNoteTab(activeId);
      this.store.deleteNote(activeId);
    }
    this.closeModal();
  }

  requestDeleteFolder(folderId: string, event: Event) {
    event.stopPropagation();
    this.tempFolderId.set(folderId);
    this.activeModal.set('delete-folder-confirm');
  }

  confirmDeleteFolder() {
    const folderId = this.tempFolderId();
    if (folderId) {
      const targetFolderId =
        this.noteGroups().find((g) => g.id !== folderId)?.id ??
        this.noteGroups()[0]?.id ??
        'personal';
      this.notes()
        .filter((n) => this.effectiveFolderId(n) === folderId)
        .forEach((n) => this.store.updateNote(n.id, { folderId: targetFolderId }));
      this.store.removeNoteFolder(folderId);
    }
    this.closeModal();
  }

  addTag(tag: string) {
    const note = this.selectedNote();
    if (note) {
      const currentTags = note.tags || [];
      if (!currentTags.includes(tag)) {
        this.store.updateNote(note.id, { tags: [...currentTags, tag] });
      }
    }
  }

  removeTag(tag: string) {
    const note = this.selectedNote();
    if (note && note.tags) {
      this.store.updateNote(note.id, { tags: note.tags.filter(t => t !== tag) });
    }
  }

  promptAddTag() {
    this.modalTitle.set('Add Tag');
    this.modalInputPlaceholder.set('Enter tag name...');
    this.modalInputValue.set('');
    this.activeModal.set('add-tag');
  }

  confirmAddTag() {
    const tag = this.modalInputValue();
    if (tag) this.addTag(tag);
    this.closeModal();
  }

  setLink() {
    if (!this.editor) return;
    const previousUrl = this.editor.getAttributes('link')['href'];
    this.modalTitle.set('Insert Link');
    this.modalInputPlaceholder.set('https://example.com');
    this.modalInputValue.set(previousUrl || '');
    this.activeModal.set('link');
  }

  confirmSetLink() {
    const url = this.modalInputValue();
    if (url === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (url) {
      this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    this.closeModal();
  }

  exportNote() {
    this.activeModal.set('export');
  }

  addImage() {
    if (!this.editor) return;
    this.modalTitle.set('Insert Image');
    this.modalInputPlaceholder.set('Image URL (https://...)');
    this.modalInputValue.set('');
    this.activeModal.set('image');
  }

  addYoutube() {
    if (!this.editor) return;
    this.modalTitle.set('Insert YouTube Video');
    this.modalInputPlaceholder.set('Paste YouTube URL...');
    this.modalInputValue.set('');
    this.activeModal.set('youtube');
  }

  confirmAddYoutube() {
    const url = this.modalInputValue();
    if (url && this.editor) {
      this.editor.commands.setYoutubeVideo({ src: url });
    }
    this.closeModal();
  }

  insertTable() {
    this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  confirmAddImage() {
    const url = this.modalInputValue();
    if (url && this.editor) {
      this.editor.chain().focus().setImage({ src: url }).run();
    }
    this.closeModal();
  }

  async downloadExport(format: 'pdf' | 'md' | 'html') {
    const content = this.editor?.getHTML() || '';
    const title = this.selectedNote()?.title || 'note';
    const filename = title.toLowerCase().replace(/\s+/g, '-');

    if (this.tauriService.isTauri() && (format === 'html' || format === 'md')) {
      const ext = format === 'html' ? 'html' : 'md';
      const exportContent = format === 'md' ? this.htmlToMarkdown(content) : content;
      const path = await this.tauriService.saveFile({
        defaultPath: `${filename}.${ext}`,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (path) {
        await this.tauriService.writeTextFile(path, exportContent);
      }
      this.closeModal();
      return;
    }

    if (format === 'html') {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.html`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'md') {
      const md = this.htmlToMarkdown(content);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.md`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      window.print();
    }
    this.closeModal();
  }

  closeModal() {
    this.activeModal.set('none');
    this.modalInputValue.set('');
    this.tempNoteId.set('');
    this.tempFolderId.set('');
  }

  // ── AI Assistant ─────────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'How many notes do I have?',
    'What tags do I use most?',
    'Show notes from today',
    'Which folders have the most notes?',
    'Find my pinned notes',
  ];

  toggleAssistant() { this.showAssistant.update(v => !v); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);

    await new Promise(r => setTimeout(r, 700 + Math.random() * 400));

    const notes = this.notes();
    const q = text.toLowerCase();
    let response = '';

    if (q.includes('how many') || q.includes('count')) {
      response = `You have ${notes.length} note${notes.length !== 1 ? 's' : ''} across ${this.noteGroups().length} folder${this.noteGroups().length !== 1 ? 's' : ''}.`;
    } else if (q.includes('tag')) {
      const tags = this.allTags();
      response = tags.length
        ? `Your top tags: ${tags.slice(0, 5).map(t => `#${t.name} (${t.count})`).join(', ')}.`
        : 'No tags used yet. Add tags to notes to organize them.';
    } else if (q.includes('today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayNotes = notes.filter(n => {
        const ts = parseInt(n.id, 10);
        const d = !isNaN(ts) && ts > 1e12 ? new Date(ts) : new Date(n.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
      response = todayNotes.length
        ? `${todayNotes.length} note${todayNotes.length > 1 ? 's' : ''} created today: ${todayNotes.map(n => n.title).join(', ')}.`
        : 'No notes created today yet.';
    } else if (q.includes('folder') || q.includes('most')) {
      const counts: Record<string, number> = {};
      notes.forEach(n => {
        const fid = n.folderId ?? this.noteGroups()[0]?.id ?? 'personal';
        counts[fid] = (counts[fid] ?? 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const labels = top.map(([id, count]) => {
        const name = this.noteGroups().find(g => g.id === id)?.name ?? id;
        return `${name} (${count})`;
      });
      response = labels.length ? `Top folders by note count: ${labels.join(', ')}.` : 'No folders found.';
    } else if (q.includes('pin')) {
      const pinned = notes.filter(n => this.isPinned(n));
      response = pinned.length
        ? `${pinned.length} pinned note${pinned.length > 1 ? 's' : ''}: ${pinned.map(n => n.title).join(', ')}.`
        : 'No pinned notes. Pin notes from the note list to keep them at the top.';
    } else {
      response = `You have ${notes.length} notes across ${this.noteGroups().length} folders and ${this.allTags().length} tag${this.allTags().length !== 1 ? 's' : ''}. Try asking about tags, today's notes, folders, or pinned notes.`;
    }

    this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    this.aiLoading.set(false);

    setTimeout(() => {
      const el = document.querySelector('.ai-panel-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  clearAiChat() { this.aiMessages.set([]); }

  // ─── HTML → Markdown conversion ─────────────────────────────────────────────

  private htmlToMarkdown(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return this.convertNode(div).replace(/\n{3,}/g, '\n\n').trim();
  }

  private convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const inner = () => Array.from(el.childNodes).map(n => this.convertNode(n)).join('');

    switch (el.tagName) {
      case 'H1': return `\n# ${inner().trim()}\n`;
      case 'H2': return `\n## ${inner().trim()}\n`;
      case 'H3': return `\n### ${inner().trim()}\n`;
      case 'H4': return `\n#### ${inner().trim()}\n`;
      case 'P':  return `\n${inner()}\n`;
      case 'STRONG': case 'B': return `**${inner()}**`;
      case 'EM': case 'I':     return `*${inner()}*`;
      case 'S':                return `~~${inner()}~~`;
      case 'U':                return `<u>${inner()}</u>`;
      case 'MARK':             return `==${inner()}==`;
      case 'CODE':
        return el.closest('pre') ? inner() : `\`${inner()}\``;
      case 'PRE':
        return `\n\`\`\`\n${inner()}\n\`\`\`\n`;
      case 'BLOCKQUOTE':
        return inner().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n';
      case 'UL': case 'OL':
        return inner() + '\n';
      case 'LI': {
        const isTask = el.getAttribute('data-type') === 'taskItem';
        if (isTask) {
          const checked = el.getAttribute('data-checked') === 'true';
          const contentDiv = el.querySelector('div');
          const text = (contentDiv ? this.convertNode(contentDiv) : inner()).replace(/^\n|\n$/g, '');
          return `- [${checked ? 'x' : ' '}] ${text}\n`;
        }
        const content = inner().replace(/^\n|\n$/g, '');
        if (el.parentElement?.tagName === 'OL') {
          const idx = Array.from(el.parentElement.children).indexOf(el) + 1;
          return `${idx}. ${content}\n`;
        }
        return `- ${content}\n`;
      }
      case 'LABEL':
        // Skip checkbox labels inside task items
        return el.querySelector('input[type="checkbox"]') ? '' : inner();
      case 'A':
        return `[${inner()}](${el.getAttribute('href') ?? ''})`;
      case 'IMG':
        return `![${el.getAttribute('alt') ?? ''}](${el.getAttribute('src') ?? ''})`;
      case 'BR': return '\n';
      case 'HR': return '\n---\n';
      default:   return inner();
    }
  }
}
