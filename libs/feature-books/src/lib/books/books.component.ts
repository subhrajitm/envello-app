import {
  Component,
  computed,
  inject,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BooksService,
  Book,
  BookCategory,
  BookStatus,
  BookNote,
} from '@envello/core';
import {
  ButtonComponent,
  IconButtonComponent,
  EmptyStateComponent,
  ModalComponent,
} from '@envello/ui';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    IconButtonComponent,
    EmptyStateComponent,
    ModalComponent,
  ],
  templateUrl: './books.component.html',
  styleUrl: './books.component.css',
})
export class BooksComponent implements OnInit, OnDestroy {
  readonly booksService = inject(BooksService);

  showAddModal = signal(false);
  newBook = signal<Partial<Book>>({
    title: '',
    author: '',
    category: 'PRODUCTIVITY',
    status: 'queued',
    progress: 0,
    notesCount: 0,
    notes: [],
  });

  showDetailModal = signal(false);
  editingBook = signal(false);
  editedBook = signal<Partial<Book>>({});

  newNoteInput = signal('');
  newNotePage = signal<number | undefined>(undefined);

  showQuickActions = signal<string | null>(null);
  showShortcutsHelp = signal(false);

  filteredBooks = computed(() => this.booksService.filteredBooks());
  stats = computed(() => this.booksService.stats());
  booksByCategory = computed(() => this.booksService.booksByCategory());
  availableCategories = computed(() => this.booksService.availableCategories());
  selectedBook = computed(() => this.booksService.selectedBook());

  readonly categories: BookCategory[] = ['DESIGN', 'CREATIVE', 'PRODUCTIVITY', 'OTHER'];

  ngOnInit() {}
  ngOnDestroy() {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showQuickActions()) {
      const el = event.target as HTMLElement;
      if (!el.closest('.row-actions')) this.showQuickActions.set(null);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const inInput = (e.target as HTMLElement)?.tagName === 'INPUT' ||
      (e.target as HTMLElement)?.tagName === 'TEXTAREA';
    if (e.key === 'Escape') {
      if (this.showAddModal()) this.closeAddModal();
      else if (this.showDetailModal()) this.closeDetailModal();
      else if (this.showShortcutsHelp()) this.showShortcutsHelp.set(false);
      else if (this.showQuickActions()) this.showQuickActions.set(null);
      return;
    }
    if (inInput) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      this.openAddModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      (document.querySelector('.books-search-input') as HTMLInputElement)?.focus();
    }
  }

  openAddModal() {
    this.newBook.set({
      title: '',
      author: '',
      category: 'PRODUCTIVITY',
      status: 'queued',
      progress: 0,
      notesCount: 0,
      notes: [],
    });
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  addBook() {
    const n = this.newBook();
    if (!n.title?.trim()) return;
    const now = new Date().toISOString();
    this.booksService.addBook({
      title: n.title.trim(),
      author: (n.author ?? '').trim(),
      category: (n.category as BookCategory) ?? 'OTHER',
      status: (n.status as BookStatus) ?? 'queued',
      progress: n.progress ?? 0,
      notesCount: 0,
      lastAccessed: now,
      notes: [],
    });
    this.closeAddModal();
  }

  openDetailModal(book: Book) {
    this.booksService.selectedBookId.set(book.id);
    this.booksService.touchLastAccessed(book.id);
    this.editedBook.set({ ...book });
    this.editingBook.set(false);
    this.newNoteInput.set('');
    this.newNotePage.set(undefined);
    this.showDetailModal.set(true);
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
    this.booksService.selectedBookId.set(null);
    this.editingBook.set(false);
  }

  startEditing() {
    const b = this.selectedBook();
    if (b) {
      this.editedBook.set({ ...b });
      this.editingBook.set(true);
    }
  }

  cancelEditing() {
    const b = this.selectedBook();
    if (b) this.editedBook.set({ ...b });
    this.editingBook.set(false);
  }

  saveEditing() {
    const b = this.selectedBook();
    const patch = this.editedBook();
    if (b && patch) {
      this.booksService.updateBook(b.id, patch);
      const updated = this.booksService.books().find(x => x.id === b.id);
      if (updated) this.booksService.selectedBookId.set(updated.id);
    }
    this.editingBook.set(false);
  }

  deleteBook(book: Book) {
    if (confirm(`Delete "${book.title}"?`)) {
      this.booksService.deleteBook(book.id);
      this.closeDetailModal();
    }
  }

  setStatus(book: Book, status: BookStatus) {
    this.booksService.setStatus(book.id, status);
    const updated = this.booksService.books().find(x => x.id === book.id);
    if (updated) this.booksService.selectedBookId.set(updated.id);
  }

  addNote() {
    const b = this.selectedBook();
    const content = this.newNoteInput().trim();
    if (!b || !content) return;
    this.booksService.addNote(b.id, content, this.newNotePage());
    this.newNoteInput.set('');
    this.newNotePage.set(undefined);
    const updated = this.booksService.books().find(x => x.id === b.id);
    if (updated) this.booksService.selectedBookId.set(updated.id);
  }

  removeNote(bookId: string, noteId: string) {
    this.booksService.deleteNote(bookId, noteId);
    const b = this.selectedBook();
    if (b) {
      const updated = this.booksService.books().find(x => x.id === b.id);
      if (updated) this.booksService.selectedBookId.set(updated.id);
    }
  }

  toggleQuickActions(bookId: string, ev: Event) {
    ev.stopPropagation();
    this.showQuickActions.update(v => (v === bookId ? null : bookId));
  }

  getCategoryColor(cat: BookCategory): string {
    switch (cat) {
      case 'DESIGN': return '#3b82f6';
      case 'CREATIVE': return '#a855f7';
      case 'PRODUCTIVITY': return '#f97316';
      default: return '#71717a';
    }
  }

  getStatusIcon(status: BookStatus): string {
    switch (status) {
      case 'reading': return 'menu_book';
      case 'completed': return 'check_circle';
      case 'queued': return 'pending';
      default: return 'book';
    }
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatShortDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((today.getTime() - day.getTime()) / 864e5);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  updateNewBook<K extends keyof Book>(key: K, value: Book[K]) {
    this.newBook.update(n => ({ ...n, [key]: value }));
  }

  updateEditedBook<K extends keyof Book>(key: K, value: Book[K]) {
    this.editedBook.update(e => ({ ...e, [key]: value }));
  }

  openShortcutsHelp() {
    this.showShortcutsHelp.set(true);
  }

  closeShortcutsHelp() {
    this.showShortcutsHelp.set(false);
  }
}
