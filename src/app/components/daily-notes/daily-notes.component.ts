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
import { TiptapEditorDirective } from 'ngx-tiptap';

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
  imports: [CommonModule, FormsModule, TiptapEditorDirective],
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

  ngOnInit() {
    this.editor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start writing your thoughts...',
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
    console.log('Create new folder');
    // Implement folder creation logic
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
    if (activeId && window.confirm('Are you sure you want to delete this note?')) {
      this.closeNoteTab(activeId);
      this.store.deleteNote(activeId);
    }
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
    const tag = window.prompt('Enter tag name:');
    if (tag) {
      this.addTag(tag);
    }
  }

  setLink() {
    if (!this.editor) return;
    const previousUrl = this.editor.getAttributes('link')['href'];
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  addImage() {
    if (!this.editor) return;
    const url = window.prompt('Image URL');

    if (url) {
      (this.editor.chain().focus() as any).setImage({ src: url }).run();
    }
  }
}
