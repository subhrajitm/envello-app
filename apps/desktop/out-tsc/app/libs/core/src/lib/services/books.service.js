import { __decorate } from 'tslib';
import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, inject, signal, computed } from '@angular/core';
import { BinService } from './bin.service';
import { DataService } from '@envello/data';
import { StoreService } from './store.service';
let BooksService = class BooksService {
  bin = inject(BinService);
  db = inject(DataService);
  store = inject(StoreService);
  books = signal([]);
  selectedBookId = signal(null);
  viewFilter = signal('all');
  viewMode = signal('list');
  sortBy = signal('lastAccessed');
  sortDirection = signal('desc');
  searchQuery = signal('');
  selectedCategory = signal('');
  constructor() {
    this.loadFromDb();
  }
  async loadFromDb() {
    try {
      const list = await this.db.getAll('books');
      this.books.set(list);
    } catch (e) {
      logIfTauri('[BooksService] loadFromDb failed', e);
    }
  }
  persistBook(b) {
    this.db
      .upsert('books', b)
      .catch((e) => logIfTauri('[BooksService] persist failed', e));
  }
  selectedBook = computed(() => {
    const id = this.selectedBookId();
    return id ? (this.books().find((b) => b.id === id) ?? null) : null;
  });
  availableCategories = computed(() => {
    const set = new Set();
    this.books().forEach((b) => set.add(b.category));
    return Array.from(set).sort();
  });
  filteredBooks = computed(() => {
    let list = [...this.books()];
    const filter = this.viewFilter();
    if (filter !== 'all') {
      list = list.filter((b) => b.status === filter);
    }
    const cat = this.selectedCategory();
    if (cat) list = list.filter((b) => b.category === cat);
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q),
      );
    }
    const field = this.sortBy();
    const dir = this.sortDirection();
    list.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'author':
          cmp = a.author.localeCompare(b.author);
          break;
        case 'lastAccessed':
          cmp =
            new Date(a.lastAccessed).getTime() -
            new Date(b.lastAccessed).getTime();
          break;
        case 'progress':
          cmp = a.progress - b.progress;
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  });
  stats = computed(() => {
    const all = this.books();
    return {
      total: all.length,
      reading: all.filter((b) => b.status === 'reading').length,
      completed: all.filter((b) => b.status === 'completed').length,
      queued: all.filter((b) => b.status === 'queued').length,
      totalNotes: all.reduce((s, b) => s + b.notesCount, 0),
    };
  });
  booksByCategory = computed(() => {
    const map = new Map();
    this.books().forEach((b) =>
      map.set(b.category, (map.get(b.category) ?? 0) + 1),
    );
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  });
  addBook(book) {
    const now = new Date().toISOString();
    const created = {
      ...book,
      id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      notes: book.notes ?? [],
    };
    this.books.update((list) => [...list, created]);
    this.persistBook(created);
    // Auto-create Project
    const projectId = crypto.randomUUID();
    this.store.addProject({
      id: projectId,
      title: created.title,
      description: 'Book Reading Project: ' + created.author,
      status: 'PLANNING',
      words: '0',
      updated: now,
      icon: 'local_library',
      linkedResources: {
        books: [created.id],
      },
    });
    return created;
  }
  updateBook(id, patch) {
    const now = new Date().toISOString();
    this.books.update((list) =>
      list.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now } : b)),
    );
    const b = this.books().find((x) => x.id === id);
    if (b) this.persistBook(b);
  }
  deleteBook(id) {
    const book = this.books().find((b) => b.id === id);
    if (!book) return;
    this.bin.addToBin({
      type: 'book',
      originalId: id,
      title: book.title,
      payload: book,
    });
    this.books.update((list) => list.filter((b) => b.id !== id));
    if (this.selectedBookId() === id) this.selectedBookId.set(null);
    this.db
      .remove('books', id)
      .catch((e) => logIfTauri('[BooksService] remove failed', e));
  }
  setProgress(id, progress) {
    this.updateBook(id, { progress: Math.max(0, Math.min(100, progress)) });
  }
  setStatus(id, status) {
    const now = new Date().toISOString();
    this.books.update((list) =>
      list.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, status, updatedAt: now };
        if (status === 'completed') next.progress = 100;
        if (status === 'reading') next.lastAccessed = now;
        return next;
      }),
    );
    const b = this.books().find((x) => x.id === id);
    if (b) this.persistBook(b);
  }
  addNote(bookId, content, page) {
    const now = new Date().toISOString();
    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      content,
      page,
      createdAt: now,
    };
    this.books.update((list) =>
      list.map((b) => {
        if (b.id !== bookId) return b;
        const notes = [...(b.notes ?? []), note];
        return { ...b, notes, notesCount: notes.length, updatedAt: now };
      }),
    );
    const b = this.books().find((x) => x.id === bookId);
    if (b) this.persistBook(b);
  }
  deleteNote(bookId, noteId) {
    const now = new Date().toISOString();
    this.books.update((list) =>
      list.map((b) => {
        if (b.id !== bookId) return b;
        const notes = (b.notes ?? []).filter((n) => n.id !== noteId);
        return { ...b, notes, notesCount: notes.length, updatedAt: now };
      }),
    );
    const b = this.books().find((x) => x.id === bookId);
    if (b) this.persistBook(b);
  }
  touchLastAccessed(id) {
    const now = new Date().toISOString();
    this.updateBook(id, { lastAccessed: now });
  }
};
BooksService = __decorate([Injectable({ providedIn: 'root' })], BooksService);
export { BooksService };
