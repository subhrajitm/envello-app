import { Component, computed, inject, signal, untracked, HostListener, OnInit, OnDestroy, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Note, AiService } from '@envello/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent, IconButtonComponent, ModalComponent, EmptyStateComponent, AiAssistantPanelComponent, AiPanelMessage } from '@envello/ui';
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
}


@Component({
  selector: 'app-daily-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective, TiptapBubbleMenuDirective, TiptapFloatingMenuDirective, ButtonComponent, IconButtonComponent, ModalComponent, EmptyStateComponent, AiAssistantPanelComponent],
  templateUrl: './daily-notes.component.html',
  styleUrl: './daily-notes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyNotesComponent implements OnInit, OnDestroy {
  private store = inject(StoreService);
  private tauriService = inject(TauriService);
  private route = inject(ActivatedRoute);
  private aiService = inject(AiService);
  editor!: Editor;

  aiGenerating = signal(false);

  // Connect to store signals
  notes = this.store.notes;

  wordCount = signal(0);
  characterCount = signal(0);

  // Modal State
  activeModal = signal<'none' | 'new-folder' | 'rename-folder' | 'link' | 'image' | 'delete-confirm' | 'delete-folder-confirm' | 'export' | 'youtube'>('none');
  modalInputValue = signal<string>('');
  modalInputPlaceholder = signal<string>('');
  modalTitle = signal<string>('');
  tempNoteId = signal<string>('');
  tempFolderId = signal<string>('');

  selectedEntryId = signal<string>('');
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('all');
  selectedTag = signal<string>('');
  showColorPicker = signal<boolean>(false);
  isFullWidth = signal<boolean>(false);
  showTagInput = signal<boolean>(false);
  tagInputValue = signal<string>('');
  renamingFolderId = signal<string | null>(null);
  renameInputValue = signal<string>('');

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
  activeFolderMenuId = signal<string | null>(null);

  // Right sidebar panel
  rightPanelCollapsed = signal(true);
  rightPanelTab = signal<'ai' | 'format' | 'info'>('ai');

  pinnedCount = computed(() => this.notes().filter(n => this.isPinned(n)).length);
  taggedCount = computed(() => this.notes().filter(n => n.tags?.some(t => t !== 'pinned')).length);
  noteBgClass = computed(() => this.selectedNote()?.bgColor ?? '');

  dragOverFolderId = signal<string | null>(null);
  draggingNoteId = signal<string | null>(null);

  private readonly SELECTION_KEY = 'envello-daily-notes-selection';

  displayModalTitle = computed(() => {
    const t = this.modalTitle();
    if (t) return t;
    const m = this.activeModal();
    if (m === 'delete-confirm') return 'Delete Note';
    if (m === 'delete-folder-confirm') return 'Delete Folder';
    if (m === 'rename-folder') return 'Rename Folder';
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
        note.tags?.some(t => t.toLowerCase().includes(query)) ||
        (note.content ? note.content.replace(/<[^>]*>/g, '').toLowerCase().includes(query) : false)
      );
    }

    if (filter === 'pinned') {
      list = list.filter(note => note.tags?.includes('pinned'));
    } else if (filter === 'tagged') {
      list = list.filter(note => note.tags?.some(t => t !== 'pinned'));
    }

    if (tag) {
      list = list.filter(note => note.tags?.includes(tag));
    }

    return list;
  });

  // Memoized per-folder note map for O(n) access instead of O(n*folders) method calls
  notesPerFolder = computed(() => {
    const map = new Map<string, Note[]>();
    for (const note of this.filteredNotes()) {
      const fid = this.effectiveFolderId(note);
      const arr = map.get(fid);
      if (arr) arr.push(note);
      else map.set(fid, [note]);
    }
    return map;
  });

  private effectiveFolderId(note: Note): string {
    const firstFolderId = this.noteGroups()[0]?.id ?? 'personal';
    const fid = note.folderId ?? firstFolderId;
    return this.noteGroups().some((g) => g.id === fid) ? fid : firstFolderId;
  }

  getNotesForFolder(folderId: string): Note[] {
    return this.notesPerFolder().get(folderId) ?? [];
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
    if (lastEdited) return lastEdited;
    const timestamp = parseInt(id, 10);
    if (!isNaN(timestamp) && timestamp > 1000000000000) {
      return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return '—';
  }

  getPreviewText(preview: string): string {
    if (!preview || preview.trim() === '') return 'No additional text';
    if (preview === "Start writing...") return "No additional text";
    return preview;
  }

  allExpanded = computed(() => this.noteGroups().every(g => g.expanded));

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

    // If navigated here with a specific note ID (e.g. from workspace prompt), open it directly.
    const noteId = this.route.snapshot.queryParamMap.get('noteId');
    if (noteId) {
      this.selectNote(noteId);
    }
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
    const folderId = this.selectedNote()?.folderId ?? this.noteGroups()[0]?.id ?? 'personal';
    const newNote: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: '',
      preview: '',
      content: '',
      tags: [],
      folderId,
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

  toggleFolderMenu(folderId: string) {
    this.activeFolderMenuId.set(this.activeFolderMenuId() === folderId ? null : folderId);
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

  togglePin(note: Note) {
    const tags = note.tags || [];
    const pinned = tags.includes('pinned');
    this.store.updateNote(note.id, {
      tags: pinned ? tags.filter(t => t !== 'pinned') : [...tags, 'pinned']
    });
  }

  getNoteTags(note: Note): string[] {
    return note.tags?.filter(tag => tag !== 'pinned') || [];
  }

  setNoteBgColor(color: string) {
    const id = this.selectedEntryId();
    if (id) this.store.updateNote(id, { bgColor: color });
    this.showColorPicker.set(false);
  }

  submitTagInput() {
    const tag = this.tagInputValue().trim();
    if (tag) this.addTag(tag);
    this.tagInputValue.set('');
    this.showTagInput.set(false);
  }

  startRenameFolder(folderId: string, currentName: string, event: Event) {
    event.stopPropagation();
    this.activeFolderMenuId.set(null);
    this.tempFolderId.set(folderId);
    this.modalTitle.set('Rename Folder');
    this.modalInputPlaceholder.set('Folder name...');
    this.modalInputValue.set(currentName);
    this.activeModal.set('rename-folder');
  }

  confirmRenameFolder() {
    const name = this.modalInputValue().trim();
    const folderId = this.tempFolderId();
    if (name && folderId) {
      this.store.updateNoteFolder(folderId, { name });
    }
    this.closeModal();
  }

  toggleDropdown() {
    this.showDropdown.update(show => !show);
  }

  setRightTab(tab: 'ai' | 'format' | 'info') {
    if (this.rightPanelCollapsed() || this.rightPanelTab() !== tab) {
      this.rightPanelTab.set(tab);
      this.rightPanelCollapsed.set(false);
    } else {
      this.rightPanelCollapsed.set(true);
    }
  }

  setFormat(type: 'paragraph' | 'h1' | 'h2' | 'h3') {
    if (!this.editor) return;
    if (type === 'paragraph') {
      this.editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(type.slice(1), 10) as 1 | 2 | 3;
      this.editor.chain().focus().toggleHeading({ level }).run();
    }
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
    const folderName = this.modalInputValue().trim();
    if (folderName) {
      const base = folderName.toLowerCase().replace(/\s+/g, '-');
      const existingIds = new Set(this.noteGroups().map(g => g.id));
      let id = base;
      let counter = 1;
      while (existingIds.has(id)) { id = `${base}-${counter++}`; }
      this.store.addNoteFolder({ id, name: folderName, icon: 'folder' });
    }
    this.closeModal();
  }

  toggleExpandAll() {
    const shouldExpand = !this.allExpanded();
    this.noteGroups.update(groups => groups.map(g => ({ ...g, expanded: shouldExpand })));
  }

  closeNoteTab(noteId: string) {
    this.openNotes.update(tabs => tabs.filter(id => id !== noteId));
    if (this.selectedEntryId() === noteId) {
      const remainingTabs = this.openNotes();
      this.selectedEntryId.set(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : '');
    }
  }

  getNoteById(id: string): Note | undefined {
    return this.notes().find(n => n.id === id);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'n' && this.activeModal() === 'none') {
      event.preventDefault();
      this.handleNewNote();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper') && !target.closest('.color-picker-wrapper')) {
      if (this.showDropdown()) this.showDropdown.set(false);
      if (this.showColorPicker()) this.showColorPicker.set(false);
    }
    if (!target.closest('.folder-menu-wrapper')) {
      if (this.activeFolderMenuId()) this.activeFolderMenuId.set(null);
    }
    if (!target.closest('.tag-input-wrapper') && !target.closest('.add-tag-btn')) {
      if (this.showTagInput()) this.submitTagInput();
    }
  }

  updateNoteTitle(title: string) {
    const activeId = this.selectedEntryId();
    if (activeId) {
      this.store.updateNote(activeId, { title });
    }
  }

  private parseNoteCreationIntent(text: string): { topic: string; wordCount: number } | null {
    const t = text.trim();

    // Must start with an action verb
    if (!/^(?:create|write|generate|make)\b/i.test(t)) return null;

    // Extract topic: everything after the last "on"/"about"/"regarding" word boundary
    const topicMatch = t.match(/\b(?:on|about|regarding)\s+(.+)$/i);
    if (!topicMatch) return null;

    // Strip trailing word-count phrase from topic (e.g. "in 500 words", "within 300 words")
    let topic = topicMatch[1].trim();
    topic = topic.replace(/\s*\b(?:in|within|of|under|around|approximately)?\s*\d+\s*words?\b.*$/i, '').trim();
    if (!topic) return null;

    // Extract word count from anywhere in the original text
    const wcMatch = t.match(/\b(\d+)\s*words?\b/i);
    const wordCount = wcMatch ? Math.min(Math.max(parseInt(wcMatch[1], 10), 100), 2000) : 300;

    return { topic, wordCount };
  }

  private async generateNoteContent(topic: string, wordCount: number): Promise<string> {
    const prompt = `Write a well-structured note of approximately ${wordCount} words on the topic: "${topic}".
Use clear paragraphs with smooth transitions. Start directly with the content — do not include a title heading.
Return plain text with paragraph breaks (double newline between paragraphs). No markdown headings or bullet points.`;
    return this.aiService.sendMessage(prompt,
      'You are a knowledgeable and articulate note-taking assistant. Write informative, engaging content.');
  }

  private plainToHtml(text: string): string {
    return text
      .split(/\n{2,}/)
      .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
      .join('');
  }

  async checkAiTitleCommand(title: string) {
    if (this.aiGenerating()) return;

    const intent = this.parseNoteCreationIntent(title.trim());
    if (!intent) return;

    const activeId = this.selectedEntryId();
    if (!activeId) return;

    const cleanTitle = intent.topic.charAt(0).toUpperCase() + intent.topic.slice(1);
    this.store.updateNote(activeId, { title: cleanTitle });
    this.aiGenerating.set(true);

    try {
      const generated = await this.generateNoteContent(intent.topic, intent.wordCount);
      const html = this.plainToHtml(generated);
      if (this.editor) this.editor.commands.setContent(html);
      this.store.updateNote(activeId, { content: html, preview: generated.substring(0, 120) });
    } finally {
      this.aiGenerating.set(false);
    }
  }

  deleteCurrentNote() {
    const activeId = this.selectedEntryId();
    if (activeId) {
      this.tempNoteId.set(activeId);
      this.activeModal.set('delete-confirm');
    }
  }

  requestDeleteNote(noteId: string) {
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
    if (this.noteGroups().length <= 1) return; // cannot delete the only folder
    this.tempFolderId.set(folderId);
    this.activeModal.set('delete-folder-confirm');
  }

  confirmDeleteFolder() {
    const folderId = this.tempFolderId();
    if (folderId) {
      const targetFolderId = this.noteGroups().find((g) => g.id !== folderId)!.id;
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
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.7;color:#111;}h1,h2,h3{font-weight:700;}pre{background:#f4f4f4;padding:1rem;border-radius:6px;overflow-x:auto;}blockquote{border-left:3px solid #888;padding-left:1rem;color:#555;font-style:italic;}</style></head><body><h1>${this.selectedNote()?.title ?? ''}</h1>${content}</body></html>`);
        printWin.document.close();
        printWin.focus();
        printWin.print();
      }
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
  aiLoading  = signal(false);
  aiMessages = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'Create a 500 words note on AI: Danger to society',
    'Write a note about productivity habits',
    'How many notes do I have?',
    'What tags do I use most?',
    'Find my pinned notes',
  ];

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);

    // ── Note creation intent ──────────────────────────────────────────────────
    const intent = this.parseNoteCreationIntent(text);
    if (intent) {
      try {
        const generated = await this.generateNoteContent(intent.topic, intent.wordCount);
        const html = this.plainToHtml(generated);

        const cleanTitle = intent.topic.charAt(0).toUpperCase() + intent.topic.slice(1);
        const noteId = Date.now().toString();
        const folderId = this.selectedNote()?.folderId ?? this.noteGroups()[0]?.id ?? 'personal';
        const newNote: Note = {
          id: noteId,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title: cleanTitle,
          preview: generated.substring(0, 120),
          content: html,
          tags: [],
          folderId,
        };
        this.store.addNote(newNote);
        this.selectNote(noteId);

        this.aiMessages.update(m => [...m, {
          role: 'assistant',
          text: `Done! Created "${cleanTitle}" (~${intent.wordCount} words). It's open in the editor now.`
        }]);
      } catch {
        this.aiMessages.update(m => [...m, {
          role: 'assistant',
          text: 'Failed to generate note content. Check your AI provider settings and try again.'
        }]);
      }
      this.aiLoading.set(false);
      return;
    }

    // ── Stat queries ─────────────────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));

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
      response = `You have ${notes.length} notes across ${this.noteGroups().length} folders. Try asking me to create a note, or ask about tags, today's notes, folders, or pinned notes.`;
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
