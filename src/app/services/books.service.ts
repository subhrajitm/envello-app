import { Injectable, inject, signal, computed } from '@angular/core';
import { BinService } from './bin.service';

export type BookCategory = 'DESIGN' | 'CREATIVE' | 'PRODUCTIVITY' | 'OTHER';
export type BookStatus = 'reading' | 'completed' | 'queued';

export interface BookNote {
  id: string;
  content: string;
  page?: number;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  status: BookStatus;
  progress: number; // 0–100
  notesCount: number;
  lastAccessed: string; // ISO
  coverImage?: string;
  isbn?: string;
  year?: number;
  notes?: BookNote[];
  createdAt: string;
  updatedAt: string;
}

export type BookViewFilter = 'all' | 'reading' | 'completed' | 'queued';
export type BookViewMode = 'list' | 'grid';
export type BookSortBy = 'title' | 'author' | 'lastAccessed' | 'progress' | 'category';

const initialBooks: Book[] = [
  {
    id: '1',
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    category: 'DESIGN',
    status: 'reading',
    progress: 45,
    notesCount: 14,
    lastAccessed: '2026-01-24T14:20:00Z',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-01-24T14:20:00Z',
  },
  {
    id: '2',
    title: 'Story: Substance, Structure, Style',
    author: 'Robert McKee',
    category: 'CREATIVE',
    status: 'queued',
    progress: 0,
    notesCount: 0,
    lastAccessed: '2026-01-22T09:15:00Z',
    createdAt: '2025-08-10T00:00:00Z',
    updatedAt: '2026-01-22T09:15:00Z',
  },
  {
    id: '3',
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'PRODUCTIVITY',
    status: 'completed',
    progress: 100,
    notesCount: 86,
    lastAccessed: '2026-01-20T18:44:00Z',
    createdAt: '2025-03-15T00:00:00Z',
    updatedAt: '2026-01-20T18:44:00Z',
  },
  {
    id: '4',
    title: 'Deep Work',
    author: 'Cal Newport',
    category: 'PRODUCTIVITY',
    status: 'reading',
    progress: 62,
    notesCount: 22,
    lastAccessed: '2026-01-27T10:00:00Z',
    createdAt: '2025-09-01T00:00:00Z',
    updatedAt: '2026-01-27T10:00:00Z',
  },
  {
    id: '5',
    title: 'Steal Like an Artist',
    author: 'Austin Kleon',
    category: 'CREATIVE',
    status: 'completed',
    progress: 100,
    notesCount: 31,
    lastAccessed: '2025-12-05T16:30:00Z',
    createdAt: '2025-04-20T00:00:00Z',
    updatedAt: '2025-12-05T16:30:00Z',
  },
];

@Injectable({ providedIn: 'root' })
export class BooksService {
  private bin = inject(BinService);

  readonly books = signal<Book[]>(initialBooks);
  selectedBookId = signal<string | null>(null);
  viewFilter = signal<BookViewFilter>('all');
  viewMode = signal<BookViewMode>('list');
  sortBy = signal<BookSortBy>('lastAccessed');
  sortDirection = signal<'asc' | 'desc'>('desc');
  searchQuery = signal('');
  selectedCategory = signal<BookCategory | ''>('');

  readonly selectedBook = computed(() => {
    const id = this.selectedBookId();
    return id ? this.books().find(b => b.id === id) ?? null : null;
  });

  readonly availableCategories = computed(() => {
    const set = new Set<BookCategory>();
    this.books().forEach(b => set.add(b.category));
    return Array.from(set).sort();
  });

  readonly filteredBooks = computed(() => {
    let list = [...this.books()];
    const filter = this.viewFilter();
    if (filter !== 'all') {
      list = list.filter(b => b.status === filter);
    }
    const cat = this.selectedCategory();
    if (cat) list = list.filter(b => b.category === cat);
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      );
    }
    const field = this.sortBy();
    const dir = this.sortDirection();
    list.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'author': cmp = a.author.localeCompare(b.author); break;
        case 'lastAccessed': cmp = new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime(); break;
        case 'progress': cmp = a.progress - b.progress; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  readonly stats = computed(() => {
    const all = this.books();
    return {
      total: all.length,
      reading: all.filter(b => b.status === 'reading').length,
      completed: all.filter(b => b.status === 'completed').length,
      queued: all.filter(b => b.status === 'queued').length,
      totalNotes: all.reduce((s, b) => s + b.notesCount, 0),
    };
  });

  readonly booksByCategory = computed(() => {
    const map = new Map<BookCategory, number>();
    this.books().forEach(b => map.set(b.category, (map.get(b.category) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  });

  addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book {
    const now = new Date().toISOString();
    const created: Book = {
      ...book,
      id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      notes: book.notes ?? [],
    };
    this.books.update(list => [...list, created]);
    return created;
  }

  updateBook(id: string, patch: Partial<Book>): void {
    const now = new Date().toISOString();
    this.books.update(list =>
      list.map(b => (b.id === id ? { ...b, ...patch, updatedAt: now } : b))
    );
  }

  deleteBook(id: string): void {
    const book = this.books().find(b => b.id === id);
    if (!book) return;
    this.bin.addToBin({
      type: 'book',
      originalId: id,
      title: book.title,
      payload: book,
    });
    this.books.update(list => list.filter(b => b.id !== id));
    if (this.selectedBookId() === id) this.selectedBookId.set(null);
  }

  setProgress(id: string, progress: number): void {
    this.updateBook(id, { progress: Math.max(0, Math.min(100, progress)) });
  }

  setStatus(id: string, status: BookStatus): void {
    const now = new Date().toISOString();
    this.books.update(list =>
      list.map(b => {
        if (b.id !== id) return b;
        const next = { ...b, status, updatedAt: now };
        if (status === 'completed') next.progress = 100;
        if (status === 'reading') next.lastAccessed = now;
        return next;
      })
    );
  }

  addNote(bookId: string, content: string, page?: number): void {
    const now = new Date().toISOString();
    const note: BookNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      content,
      page,
      createdAt: now,
    };
    this.books.update(list =>
      list.map(b => {
        if (b.id !== bookId) return b;
        const notes = [...(b.notes ?? []), note];
        return { ...b, notes, notesCount: notes.length, updatedAt: now };
      })
    );
  }

  deleteNote(bookId: string, noteId: string): void {
    const now = new Date().toISOString();
    this.books.update(list =>
      list.map(b => {
        if (b.id !== bookId) return b;
        const notes = (b.notes ?? []).filter(n => n.id !== noteId);
        return { ...b, notes, notesCount: notes.length, updatedAt: now };
      })
    );
  }

  touchLastAccessed(id: string): void {
    const now = new Date().toISOString();
    this.updateBook(id, { lastAccessed: now });
  }
}
