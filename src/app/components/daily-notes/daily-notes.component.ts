import { Component, computed, inject, signal, HostListener, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Note } from '../../services/store.service';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, TiptapEditorDirective, TiptapBubbleMenuDirective, TiptapFloatingMenuDirective],
  templateUrl: './daily-notes.component.html',
  styleUrl: './daily-notes.component.css'
})
export class DailyNotesComponent implements OnInit, OnDestroy {
  private store = inject(StoreService);
  editor!: Editor;

  // Connect to store signals
  notes = this.store.notes;

  wordCount = signal(0);
  characterCount = signal(0);

  // Modal State
  activeModal = signal<'none' | 'new-folder' | 'add-tag' | 'link' | 'image' | 'delete-confirm' | 'share' | 'export' | 'youtube'>('none');
  modalInputValue = signal<string>('');
  modalInputPlaceholder = signal<string>('');
  modalTitle = signal<string>('');
  tempNoteId = signal<string>(''); // For storing ID during confirmation flow


  selectedEntryId = signal<string>('');
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('all'); // all, pinned, tagged, archived
  activeView = signal<'folders' | 'tags'>('folders'); // Track active sidebar view

  // Track open notes as tabs
  openNotes = signal<string[]>([]);

  // Note groups for organization
  noteGroups = signal<NoteGroup[]>([
    { id: 'today', name: 'Today', icon: 'today', count: 0, expanded: true, noteIds: [] },
    { id: 'this-week', name: 'This Week', icon: 'calendar_month', count: 0, expanded: false, noteIds: [] },
    { id: 'older', name: 'Older Notes', icon: 'history', count: 0, expanded: false, noteIds: [] },
  ]);

  // Tag categories with colors
  tagCategories = signal<TagCategory[]>([
    { id: 'meta', name: '00 Meta', color: '#d89090', expanded: true, tags: ['Planning', 'Review', 'Goals'] },
    { id: 'life', name: '10 Life', color: '#e8a87c', expanded: false, tags: ['Health', 'Family', 'Personal'] },
    { id: 'it', name: '20 IT', color: '#f4e89c', expanded: false, tags: ['Programming', 'DevOps', 'Learning'] },
    { id: 'hobbies', name: '30 Hobbies', color: '#a8d5a8', expanded: false, tags: ['Reading', 'Music', 'Art'] },
    { id: 'devsystems', name: '50 DevO Systems', color: '#7eb3d4', expanded: false, tags: ['Architecture', 'Design', 'Tools'] },
    { id: 'unsorted', name: 'Unsorted', color: '#b8d8e8', expanded: false, tags: ['Hippotology', 'Random', 'Misc'] },
  ]);

  showDropdown = signal<boolean>(false);

  // Computed filtered notes
  filteredNotes = computed(() => {
    let list = this.notes();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();

    // Apply search filter
    if (query) {
      list = list.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.preview.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filter === 'pinned') {
      list = list.filter(note => note.tags?.includes('pinned'));
    } else if (filter === 'tagged') {
      list = list.filter(note => note.tags && note.tags.length > 0);
    }

    return list;
  });

  allGroupsCollapsed = computed(() => {
    return this.noteGroups().every(g => !g.expanded);
  });

  allExpanded = computed(() => {
    return this.noteGroups().every(g => g.expanded);
  });

  selectedNote = computed(() => {
    const list = this.filteredNotes();
    if (list.length === 0) {
      return null;
    }
    if (!this.selectedEntryId()) {
      return list[0];
    }
    const found = list.find(n => n.id === this.selectedEntryId());
    return found || list[0];
  });

  constructor() {
    // Initialize selection if notes exist
    if (this.notes().length > 0) {
      const firstNoteId = this.notes()[0].id;
      this.selectedEntryId.set(firstNoteId);
      this.openNotes.set([firstNoteId]);
    }

    // Effect to update editor content when selected note changes
    effect(() => {
      const note = this.selectedNote();
      if (note && this.editor) {
        // Only update if content is different to avoid cursor jumps
        if (this.editor.getHTML() !== note.content) {
          this.editor.commands.setContent(note.content);
        }
      }
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
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
          placeholder: 'Press \'/\' for commands...',
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
            return editor.isActive('paragraph') && editor.state.selection.$from.parent.content.size === 0;
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
    const newNote: Note = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: 'New Daily Note',
      preview: 'Start writing...',
      content: '<p>Start writing your thoughts...</p>',
      tags: []
    };
    this.store.addNote(newNote);
    this.selectedEntryId.set(newNote.id);
  }

  selectNote(id: string) {
    this.selectedEntryId.set(id);
    // Add to open notes if not already open
    if (!this.openNotes().includes(id)) {
      this.openNotes.update(tabs => [...tabs, id]);
    }
  }

  toggleGroup(groupId: string) {
    this.noteGroups.update(groups =>
      groups.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
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
    return note.tags?.filter(tag => tag !== 'pinned') || [];
  }

  expandAll() {
    this.noteGroups.update(groups =>
      groups.map(g => ({ ...g, expanded: true }))
    );
  }

  collapseAll() {
    this.noteGroups.update(groups =>
      groups.map(g => ({ ...g, expanded: false }))
    );
  }

  toggleDropdown() {
    this.showDropdown.update(show => !show);
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
      const newGroup: NoteGroup = {
        id: folderName.toLowerCase().replace(/\s+/g, '-'),
        name: folderName,
        icon: 'folder',
        count: 0,
        expanded: true,
        noteIds: []
      };
      this.noteGroups.update(groups => [...groups, newGroup]);
    }
    this.closeModal();
  }

  toggleExpandAll() {
    const shouldExpand = !this.allExpanded();
    this.noteGroups.update(groups =>
      groups.map(g => ({ ...g, expanded: shouldExpand }))
    );
  }

  closeNoteTab(noteId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.openNotes.update(tabs => tabs.filter(id => id !== noteId));

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
    return this.notes().find(n => n.id === id);
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
    this.tagCategories.update(categories =>
      categories.map(c => c.id === categoryId ? { ...c, expanded: !c.expanded } : c)
    );
  }

  allTagCategoriesExpanded = computed(() => {
    return this.tagCategories().every(c => c.expanded);
  });

  toggleExpandAllTags() {
    const shouldExpand = !this.allTagCategoriesExpanded();
    this.tagCategories.update(categories =>
      categories.map(c => ({ ...c, expanded: shouldExpand }))
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
      this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
    this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
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

  downloadExport(format: 'pdf' | 'md' | 'html') {
    const content = this.editor?.getHTML() || '';
    const title = this.selectedNote()?.title || 'note';
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}`;

    if (format === 'html') {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'md') {
      // Basic HTML to Markdown (simplified)
      // Ideally use a library, but for now we'll save the HTML content which is valid MD
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
  }
}
