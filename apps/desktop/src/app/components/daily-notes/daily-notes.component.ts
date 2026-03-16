import {
  Component,
  computed,
  inject,
  signal,
  untracked,
  HostListener,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Note } from '@envello/core';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  ModalComponent,
  EmptyStateComponent,
} from '@envello/ui';
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
import {
  TiptapEditorDirective,
  TiptapBubbleMenuDirective,
  TiptapFloatingMenuDirective,
} from 'ngx-tiptap';

interface NoteGroup {
  id: string;
  name: string;
  icon: string;
  count: number;
  expanded: boolean;
  noteIds: string[];
}

interface TagCategory {
  id: string;
  name: string;
  color: string;
  expanded: boolean;
  tags: string[];
}

@Component({
  selector: 'app-daily-notes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TiptapEditorDirective,
    TiptapBubbleMenuDirective,
    TiptapFloatingMenuDirective,
    ButtonComponent,
    ModalComponent,
    EmptyStateComponent,
  ],
  templateUrl: './daily-notes.component.html',
  styleUrl: './daily-notes.component.css',
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
  activeModal = signal<
    | 'none'
    | 'new-folder'
    | 'add-tag'
    | 'link'
    | 'image'
    | 'delete-confirm'
    | 'delete-folder-confirm'
    | 'share'
    | 'export'
    | 'youtube'
  >('none');
  modalInputValue = signal<string>('');
  modalInputPlaceholder = signal<string>('');
  modalTitle = signal<string>('');
  tempNoteId = signal<string>(''); // For storing ID during confirmation flow
  tempFolderId = signal<string>(''); // For storing Folder ID during confirmation flow

  selectedEntryId = signal<string>('');
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('all'); // all, pinned, tagged, archived
  activeView = signal<'folders' | 'tags'>('folders'); // Track active sidebar view

  // Track open notes as tabs
  openNotes = signal<string[]>([]);

  // Note groups for organization (synced from store so they persist across reloads)
  noteGroups = signal<NoteGroup[]>([]);

  // Tag categories with colors
  tagCategories = signal<TagCategory[]>([
    {
      id: 'meta',
      name: '00 Meta',
      color: '#d89090',
      expanded: true,
      tags: ['Planning', 'Review', 'Goals'],
    },
    {
      id: 'life',
      name: '10 Life',
      color: '#e8a87c',
      expanded: false,
      tags: ['Health', 'Family', 'Personal'],
    },
    {
      id: 'it',
      name: '20 IT',
      color: '#f4e89c',
      expanded: false,
      tags: ['Programming', 'DevOps', 'Learning'],
    },
    {
      id: 'hobbies',
      name: '30 Hobbies',
      color: '#a8d5a8',
      expanded: false,
      tags: ['Reading', 'Music', 'Art'],
    },
    {
      id: 'devsystems',
      name: '50 DevO Systems',
      color: '#7eb3d4',
      expanded: false,
      tags: ['Architecture', 'Design', 'Tools'],
    },
    {
      id: 'unsorted',
      name: 'Unsorted',
      color: '#b8d8e8',
      expanded: false,
      tags: ['Hippotology', 'Random', 'Misc'],
    },
  ]);

  showDropdown = signal<boolean>(false);
  dragOverFolderId = signal<string | null>(null);
  draggingNoteId = signal<string | null>(null);

  private readonly SELECTION_KEY = 'envello-daily-notes-selection';

  displayModalTitle = computed(() => {
    const t = this.modalTitle();
    if (t) return t;
    const m = this.activeModal();
    if (m === 'delete-confirm') return 'Delete Note';
    if (m === 'delete-folder-confirm') return 'Delete Folder';
    if (m === 'share') return 'Share Note';
    if (m === 'export') return 'Export Note';
    return '';
  });

  // Computed filtered notes
  filteredNotes = computed(() => {
    let list = this.notes();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();

    // Apply search filter
    if (query) {
      list = list.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.preview.toLowerCase().includes(query) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply category filter
    if (filter === 'pinned') {
      list = list.filter((note) => note.tags?.includes('pinned'));
    } else if (filter === 'tagged') {
      list = list.filter((note) => note.tags && note.tags.length > 0);
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

  getBucketedNotesForFolder(
    folderId: string,
  ): { label: string; notes: Note[] }[] {
    const inFolder = this.filteredNotes().filter(
      (n) => this.effectiveFolderId(n) === folderId,
    );
    return this.getBucketedNotes(inFolder);
  }

  getNotesCountForFolder(folderId: string): number {
    return this.filteredNotes().filter(
      (n) => this.effectiveFolderId(n) === folderId,
    ).length;
  }

  getBucketedNotes(notes: Note[]): { label: string; notes: Note[] }[] {
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
      older: [] as Note[],
    };

    // Sort notes newest to oldest first
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
    if (buckets.today.length > 0)
      result.push({ label: 'Today', notes: buckets.today });
    if (buckets.yesterday.length > 0)
      result.push({ label: 'Yesterday', notes: buckets.yesterday });
    if (buckets.previous7Days.length > 0)
      result.push({ label: 'Previous 7 Days', notes: buckets.previous7Days });
    if (buckets.previous30Days.length > 0)
      result.push({ label: 'Previous 30 Days', notes: buckets.previous30Days });
    if (buckets.older.length > 0)
      result.push({ label: 'Older Notes', notes: buckets.older });

    return result;
  }

  formatTime(id: string, lastEdited?: string): string {
    const timestamp = parseInt(id, 10);
    if (!isNaN(timestamp) && timestamp > 1000000000000) {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return lastEdited || '12:00 PM';
  }

  getPreviewText(preview: string): string {
    if (!preview || preview.trim() === '') return 'No additional text';
    if (preview === 'Start writing...') return 'No additional text';
    return preview;
  }

  allGroupsCollapsed = computed(() => {
    return this.noteGroups().every((g) => !g.expanded);
  });

  allExpanded = computed(() => {
    return this.noteGroups().every((g) => g.expanded);
  });

  selectedNote = computed(() => {
    // If no tabs are open, return null to show empty state
    if (this.openNotes().length === 0) {
      return null;
    }

    const list = this.filteredNotes();
    if (list.length === 0) {
      return null;
    }

    // Only return a note if it's in the open tabs
    const selectedId = this.selectedEntryId();
    if (!selectedId) {
      // If no selection but tabs are open, select the first open tab
      const firstOpenId = this.openNotes()[0];
      return list.find((n) => n.id === firstOpenId) || null;
    }

    const found = list.find((n) => n.id === selectedId);
    // Only return if the note is in open tabs
    if (found && this.openNotes().includes(found.id)) {
      return found;
    }

    return null;
  });

  constructor() {
    // Sync folder list from store (persisted); preserves expanded state when store updates.
    // Use untracked for noteGroups so we only re-run when noteFolders changes (avoids infinite loop).
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

    // Restore or initialize selection when notes load
    effect(() => {
      const notes = this.notes();
      if (notes.length === 0) return;
      const selectedId = this.selectedEntryId();
      const openIds = this.openNotes();
      const noteIds = new Set(notes.map((n) => n.id));
      const hasValidSelection = selectedId && noteIds.has(selectedId);
      const hasValidTabs =
        openIds.length > 0 && openIds.some((id) => noteIds.has(id));
      if (hasValidSelection && hasValidTabs) return;

      const saved = this.loadSelectionFromStorage();
      const validOpen = (saved?.openNotes ?? openIds).filter((id) =>
        noteIds.has(id),
      );
      const validSelected =
        saved?.selectedId && noteIds.has(saved.selectedId)
          ? saved.selectedId
          : (validOpen[0] ?? notes[0].id);
      const finalOpen = validOpen.length > 0 ? validOpen : [validSelected];

      this.selectedEntryId.set(validSelected);
      this.openNotes.set(finalOpen);
      this.store.loadNoteContent(validSelected);
    });

    // Persist selection when it changes
    effect(() => {
      const selectedId = this.selectedEntryId();
      const openIds = this.openNotes();
      if (!selectedId && openIds.length === 0) return;
      this.saveSelectionToStorage(selectedId, openIds);
    });

    // Effect to update editor content when selected note changes
    effect(() => {
      const note = this.selectedNote();
      if (note && this.editor) {
        // Only update if content is different to avoid cursor jumps
        // use default '' if content undefined
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
          codeBlock: false, // We use CodeBlockLowlight
        }),
        Placeholder.configure({
          placeholder: "Press '/' for commands...",
        }),
        BubbleMenu.configure({
          pluginKey: 'bubbleMenu',
          shouldShow: ({ editor, view, state, from, to }) => {
            // Only show if selection is not empty and editor is editable
            // Also check if not in a table (optional for some menus)
            return !editor.view.state.selection.empty && editor.isEditable;
          },
        }),
        FloatingMenu.configure({
          pluginKey: 'floatingMenu',
          shouldShow: ({ editor, view, state }) => {
            // Show on empty lines
            return (
              editor.isActive('paragraph') &&
              editor.state.selection.$from.parent.content.size === 0
            );
          },
        }),
        Link.configure({
          openOnClick: false,
        }),
        Image,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        CharacterCount,
        Underline,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        Youtube.configure({
          controls: true,
        }),
        CodeBlockLowlight.configure({
          lowlight: createLowlight(common),
        }),
      ],
      editorProps: {
        attributes: {
          class: 'dn-editor-text focus:outline-none',
        },
      },
      onUpdate: ({ editor }) => {
        const content = editor.getHTML();
        const plainText = editor.getText();
        const preview =
          plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
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
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      title: 'New Daily Note',
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
    if ((event.relatedTarget as HTMLElement)?.closest?.('.dn-entries-list'))
      return;
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

  private loadSelectionFromStorage(): {
    selectedId: string;
    openNotes: string[];
  } | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.SELECTION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as {
        selectedId?: string;
        openNotes?: string[];
      };
      if (data?.openNotes && Array.isArray(data.openNotes)) {
        return {
          selectedId: data.selectedId ?? data.openNotes[0],
          openNotes: data.openNotes,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private saveSelectionToStorage(selectedId: string, openNotes: string[]) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.SELECTION_KEY,
        JSON.stringify({ selectedId, openNotes }),
      );
    } catch {
      /* ignore */
    }
  }

  selectNote(id: string) {
    this.selectedEntryId.set(id);
    // Trigger lazy load from file system
    this.store.loadNoteContent(id);

    // Add to open notes if not already open
    if (!this.openNotes().includes(id)) {
      this.openNotes.update((tabs) => [...tabs, id]);
    }
  }

  toggleGroup(groupId: string) {
    this.noteGroups.update((groups) =>
      groups.map((g) =>
        g.id === groupId ? { ...g, expanded: !g.expanded } : g,
      ),
    );
  }

  setFilter(filter: string) {
    this.selectedFilter.set(filter);
  }

  isPinned(note: Note): boolean {
    return note.tags?.includes('pinned') || false;
  }

  togglePin(note: Note, event: Event) {
    event.stopPropagation();
    // This would update the note's tags in the store
    // For now, just a placeholder
  }

  getNoteTags(note: Note): string[] {
    return note.tags?.filter((tag) => tag !== 'pinned') || [];
  }

  expandAll() {
    this.noteGroups.update((groups) =>
      groups.map((g) => ({ ...g, expanded: true })),
    );
  }

  collapseAll() {
    this.noteGroups.update((groups) =>
      groups.map((g) => ({ ...g, expanded: false })),
    );
  }

  toggleDropdown() {
    this.showDropdown.update((show) => !show);
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
      // noteGroups will update via effect when noteFolders() changes
    }
    this.closeModal();
  }

  toggleExpandAll() {
    const shouldExpand = !this.allExpanded();
    this.noteGroups.update((groups) =>
      groups.map((g) => ({ ...g, expanded: shouldExpand })),
    );
  }

  closeNoteTab(noteId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.openNotes.update((tabs) => tabs.filter((id) => id !== noteId));

    // If closing the active note, switch to another open note
    if (this.selectedEntryId() === noteId) {
      const remainingTabs = this.openNotes();
      if (remainingTabs.length > 0) {
        this.selectedEntryId.set(remainingTabs[remainingTabs.length - 1]);
      } else {
        this.selectedEntryId.set('');
      }
    }
  }

  getNoteById(id: string): Note | undefined {
    return this.notes().find((n) => n.id === id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdownWrapper = target.closest('.dropdown-wrapper');

    // Close dropdown if clicking outside
    if (!dropdownWrapper && this.showDropdown()) {
      this.showDropdown.set(false);
    }
  }

  switchView(view: 'folders' | 'tags') {
    this.activeView.set(view);
  }

  toggleTagCategory(categoryId: string) {
    this.tagCategories.update((categories) =>
      categories.map((c) =>
        c.id === categoryId ? { ...c, expanded: !c.expanded } : c,
      ),
    );
  }

  allTagCategoriesExpanded = computed(() => {
    return this.tagCategories().every((c) => c.expanded);
  });

  toggleExpandAllTags() {
    const shouldExpand = !this.allTagCategoriesExpanded();
    this.tagCategories.update((categories) =>
      categories.map((c) => ({ ...c, expanded: shouldExpand })),
    );
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
        .forEach((n) =>
          this.store.updateNote(n.id, { folderId: targetFolderId }),
        );
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
      this.store.updateNote(note.id, {
        tags: note.tags.filter((t) => t !== tag),
      });
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
    if (tag) {
      this.addTag(tag);
    }
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
      this.editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
    this.closeModal();
  }

  shareNote() {
    this.activeModal.set('share');
  }

  exportNote() {
    this.activeModal.set('export');
  }

  showMoreOptions() {
    // This would toggle a dropdown menu
    console.log('Show more options');
  }

  addImage() {
    if (!this.editor) return;
    this.modalTitle.set('Insert Image');
    this.modalInputPlaceholder.set('Image URL (https://...)');
    this.modalInputValue.set('');
    this.activeModal.set('image');
  }

  shareBtnText = signal('Copy');

  addYoutube() {
    if (!this.editor) return;
    this.modalTitle.set('Insert YouTube Video');
    this.modalInputPlaceholder.set('Paste YouTube URL...');
    this.modalInputValue.set('');
    this.activeModal.set('youtube');
  }

  confirmAddYoutube() {
    const url = this.modalInputValue();
    if (url) {
      if (this.editor) {
        this.editor.commands.setYoutubeVideo({ src: url });
      }
    }
    this.closeModal();
  }

  insertTable() {
    this.editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  confirmAddImage() {
    const url = this.modalInputValue();
    if (url) {
      if (this.editor) {
        this.editor.chain().focus().setImage({ src: url }).run();
      }
    }
    this.closeModal();
  }

  copyShareLink() {
    const url = `https://envello.app/notes/share/${this.selectedEntryId()}`;
    navigator.clipboard.writeText(url).then(() => {
      this.shareBtnText.set('Copied!');
      setTimeout(() => this.shareBtnText.set('Copy'), 2000);
    });
  }

  async downloadExport(format: 'pdf' | 'md' | 'html') {
    const content = this.editor?.getHTML() || '';
    const title = this.selectedNote()?.title || 'note';
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}`;

    if (this.tauriService.isTauri() && (format === 'html' || format === 'md')) {
      const ext = format === 'html' ? 'html' : 'md';
      const path = await this.tauriService.saveFile({
        defaultPath: `${filename}.${ext}`,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (path) {
        await this.tauriService.writeTextFile(path, content);
      }
      this.closeModal();
      return;
    }

    if (format === 'html') {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'md') {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.md`;
      a.click();
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
}
