import { Component, inject, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService, type Book, type WritingType, BookContentService } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage, TableComponent, type EnvTableColumn, type EnvTableAction, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent } from '@envello/ui';

const WRITING_TYPE_META: Record<string, { color: string; icon: string }> = {
  NOVEL:       { color: '#f59e0b', icon: 'menu_book'    },
  SHORT_STORY: { color: '#3b82f6', icon: 'auto_stories' },
  ARTICLE:     { color: '#10b981', icon: 'article'      },
  ESSAY:       { color: '#8b5cf6', icon: 'psychology'   },
  SCRIPT:      { color: '#ec4899', icon: 'description'  },
  POETRY:      { color: '#f43f5e', icon: 'draw'         },
  BLOG_POST:   { color: '#06b6d4', icon: 'edit_note'    },
  RESEARCH:    { color: '#6366f1', icon: 'science'      },
};

const STATUS_META: Record<string, { color: string; icon: string; label: string }> = {
  PLANNING:  { color: '#9ca3af', icon: 'lightbulb',    label: 'Planning'  },
  DRAFTING:  { color: '#fbbf24', icon: 'edit',         label: 'Drafting'  },
  REVISING:  { color: '#fb923c', icon: 'autorenew',    label: 'Revising'  },
  PUBLISHED: { color: '#4ade80', icon: 'check_circle', label: 'Published' },
};

@Component({
  selector: 'app-write',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent],
  templateUrl: './write.component.html',
  styleUrl: './write.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WriteComponent {
  private router = inject(Router);
  store = inject(StoreService);
  private bookContent = inject(BookContentService);

  // ── Filter / sort ─────────────────────────────────────────────────────────
  viewMode     = signal<'LIST' | 'GRID'>('LIST');
  selectedType = signal<WritingType | ''>('');
  statusFilter = signal<'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'>('ALL');
  sortBy       = signal<'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'>('UPDATED');
  searchQuery  = signal('');
  sortDropdownOpen = signal(false);


  // ── Add modal state ────────────────────────────────────────────────────────
  showAddModal      = signal(false);
  addModalSubmitting = signal(false);
  newBook = signal<{ title: string; writingType: WritingType; status: Book['status']; genre: string; targetWordCount: number; icon: string }>({
    title: '', writingType: 'NOVEL', status: 'PLANNING',
    genre: '', targetWordCount: 80000, icon: 'menu_book'
  });

  // ── Delete modal ───────────────────────────────────────────────────────────
  showDeleteModal = signal(false);
  bookToDelete   = signal<Book | null>(null);
  bulkDeleteIds  = signal<string[] | null>(null);
  bookMenuOpen   = signal<string | null>(null);

  // ── AI Assistant ──────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'How many writings do I have?',
    'Show me all drafts in progress',
    'What is my total word count?',
    'Which writings are ready to publish?',
    'Show a breakdown by writing type',
  ];
  // ── Table configuration ──────────────────────────────────────────────────
  readonly tableColumns: EnvTableColumn[] = [
    { key: 'title',    header: 'Title',    type: 'primary-text', sortable: true },
    { key: 'type',     header: 'Type',     type: 'badge', sortable: true, badgeMap: {
      'Novel':       { dotColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)',  textColor: '#f59e0b' },
      'Short Story': { dotColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)',  textColor: '#3b82f6' },
      'Article':     { dotColor: '#10b981', bgColor: 'rgba(16,185,129,0.12)',  textColor: '#10b981' },
      'Essay':       { dotColor: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)', textColor: '#8b5cf6' },
      'Script':      { dotColor: '#ec4899', bgColor: 'rgba(236,72,153,0.12)', textColor: '#ec4899' },
      'Poetry':      { dotColor: '#f43f5e', bgColor: 'rgba(244,63,94,0.12)',  textColor: '#f43f5e' },
      'Blog Post':   { dotColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.12)',  textColor: '#06b6d4' },
      'Research':    { dotColor: '#6366f1', bgColor: 'rgba(99,102,241,0.12)', textColor: '#6366f1' },
    }},
    { key: 'status',   header: 'Status',   type: 'badge', sortable: true, badgeMap: {
      'Planning':  { dotColor: '#9ca3af', bgColor: 'rgba(156,163,175,0.12)', textColor: '#9ca3af' },
      'Drafting':  { dotColor: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)',  textColor: '#fbbf24' },
      'Revising':  { dotColor: '#fb923c', bgColor: 'rgba(251,146,60,0.12)',  textColor: '#fb923c' },
      'Published': { dotColor: '#4ade80', bgColor: 'rgba(74,222,128,0.12)',  textColor: '#4ade80' },
    }},
    { key: 'progress', header: 'Progress', type: 'text',  sortable: true },
    { key: 'updated',  header: 'Updated',  type: 'text',  sortable: true },
  ];

  readonly tableActions: EnvTableAction[] = [
    { key: 'open',      label: 'Open',      icon: 'open_in_new',   bulk: false },
    { key: 'duplicate', label: 'Duplicate', icon: 'content_copy' },
    { key: 'delete',    label: 'Delete',    icon: 'delete',        danger: true },
  ];
  // ── Static data ───────────────────────────────────────────────────────────
  readonly writingTypes: { id: WritingType; label: string; defaultWords: number; defaultIcon: string }[] = [
    { id: 'NOVEL',       label: 'Book',         defaultWords: 80000, defaultIcon: 'menu_book'   },
    { id: 'SHORT_STORY', label: 'Short Story',  defaultWords: 10000, defaultIcon: 'auto_stories'},
    { id: 'ARTICLE',     label: 'Article',      defaultWords:  2000, defaultIcon: 'article'     },
    { id: 'ESSAY',       label: 'Essay',        defaultWords:  3000, defaultIcon: 'psychology'  },
    { id: 'SCRIPT',      label: 'Script',       defaultWords: 15000, defaultIcon: 'description' },
    { id: 'POETRY',      label: 'Poetry',       defaultWords:   500, defaultIcon: 'draw'        },
    { id: 'BLOG_POST',   label: 'Blog Post',    defaultWords:  1500, defaultIcon: 'edit_note'   },
    { id: 'RESEARCH',    label: 'Research',     defaultWords:  5000, defaultIcon: 'science'     },
  ];

  readonly allStatusItems = [
    { id: 'PLANNING'  as const, ...STATUS_META['PLANNING']  },
    { id: 'DRAFTING'  as const, ...STATUS_META['DRAFTING']  },
    { id: 'REVISING'  as const, ...STATUS_META['REVISING']  },
    { id: 'PUBLISHED' as const, ...STATUS_META['PUBLISHED'] },
  ];

  readonly bookIcons = [
    { id: 'menu_book',    label: 'Book'     },
    { id: 'auto_stories', label: 'Story'    },
    { id: 'article',      label: 'Article'  },
    { id: 'description',  label: 'Document' },
    { id: 'edit_note',    label: 'Notes'    },
    { id: 'draw',         label: 'Creative' },
    { id: 'token',        label: 'Token'    },
    { id: 'castle',       label: 'Castle'   },
    { id: 'rocket_launch',label: 'Sci-Fi'   },
    { id: 'water_drop',   label: 'Drop'     },
    { id: 'science',      label: 'Research' },
    { id: 'psychology',   label: 'Essay'    },
  ] as const;

  // ── Computed ──────────────────────────────────────────────────────────────
  allTypeStats = computed(() =>
    this.writingTypes.map(t => ({
      ...t,
      color: WRITING_TYPE_META[t.id]?.color ?? '#9ca3af',
      count: this.store.books().filter(n => n.writingType === t.id).length,
    })).filter(t => t.count > 0)
  );

  statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const n of this.store.books()) {
      counts[n.status] = (counts[n.status] ?? 0) + 1;
    }
    return counts;
  });

  hasActiveFilters = computed(() =>
    !!this.searchQuery() || !!this.selectedType() || this.statusFilter() !== 'ALL'
  );

  filteredBooks = computed(() => {
    const q      = this.searchQuery().trim().toLowerCase();
    const type   = this.selectedType();
    const status = this.statusFilter();
    const sort   = this.sortBy();

    let list = this.store.books();
    if (q)      list = list.filter(n => n.title.toLowerCase().includes(q) || n.genre.some(g => g.toLowerCase().includes(q)));
    if (type)   list = list.filter(n => n.writingType === type);
    if (status !== 'ALL') list = list.filter(n => n.status === status);

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'UPDATED': {
          const aMs = new Date(a.lastUpdated).getTime();
          const bMs = new Date(b.lastUpdated).getTime();
          const aSort = isNaN(aMs) ? new Date(a.createdAt ?? 0).getTime() : aMs;
          const bSort = isNaN(bMs) ? new Date(b.createdAt ?? 0).getTime() : bMs;
          return bSort - aSort;
        }
        case 'CREATED':  return new Date(b.createdAt ?? b.createdDate).getTime() - new Date(a.createdAt ?? a.createdDate).getTime();
        case 'TITLE':    return a.title.localeCompare(b.title);
        case 'PROGRESS': return b.progress - a.progress;
        default: return 0;
      }
    });
  });

  tableRows = computed(() =>
    this.filteredBooks().map(book => ({
      id: book.id,
      title: book.title,
      type: this.getWritingTypeLabel(book.writingType),
      status: this.getStatusMeta(book.status).label,
      progress: `${book.progress}% (${book.wordCount?.toLocaleString() || 0}/${book.targetWordCount?.toLocaleString() || 0})`,
      updated: this.formatDate(book.lastUpdated),
      book,
    }))
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTypeMeta(type?: string)  { return WRITING_TYPE_META[type ?? ''] ?? { color: '#9ca3af', icon: 'article' }; }
  getStatusMeta(status: string) { return STATUS_META[status] ?? STATUS_META['PLANNING']; }

  readingTime(wordCount: number): string {
    const mins = Math.ceil(wordCount / 200);
    return mins < 1 ? '<1 min' : `${mins} min`;
  }

  getWritingTypeLabel(type?: string): string {
    return this.writingTypes.find(t => t.id === type)?.label ?? 'Book';
  }

  getProgressColor(status: string): string {
    return status === 'PUBLISHED' ? '#4ade80' : '#fcd34d';
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
    });
  }

  // ── Sidebar / filter ─────────────────────────────────────────────────────
  clearFilters() {
    this.searchQuery.set('');
    this.selectedType.set('');
    this.statusFilter.set('ALL');
  }

  selectType(type: WritingType | '') {
    this.selectedType.set(this.selectedType() === type ? '' : type);
  }

  selectStatus(status: 'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED') {
    this.statusFilter.set(this.statusFilter() === status ? 'ALL' : status);
  }

  toggleSortDropdown() { this.sortDropdownOpen.update(v => !v); }

  selectSort(sort: 'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS') {
    this.sortBy.set(sort);
    this.sortDropdownOpen.set(false);
  }

  getSortLabel(): string {
    switch (this.sortBy()) {
      case 'UPDATED':  return 'Last Updated';
      case 'CREATED':  return 'Date Created';
      case 'TITLE':    return 'Title';
      case 'PROGRESS': return 'Progress';
      default: return 'Sort';
    }
  }

  // ── Table handlers ────────────────────────────────────────────────────────
  handleTableAction(event: any) {
    const actionKey = event.actionKey;
    const book = event.row['book'];
    if (!book) return;

    switch (actionKey) {
      case 'open':
        this.openBook(book.id);
        break;
      case 'duplicate':
        this.duplicateBook(book);
        break;
      case 'delete':
        this.openDeleteModal(book);
        break;
    }
  }

  handleBulkAction(event: { selectedIds: Set<unknown>; actionKey: string }) {
    const { selectedIds, actionKey } = event;
    const affected = this.tableRows().filter(r => selectedIds.has(r['id'])).map(r => r['book'] as Book);
    for (const book of affected) {
      if (!book) continue;
      switch (actionKey) {
        case 'duplicate': this.duplicateBook(book); break;
        case 'delete':
          this.bulkDeleteIds.set(affected.filter(b => b).map(b => b.id));
          this.showDeleteModal.set(true);
          return;
      }
    }
  }

  handleTableSort(event: any) {
    const map: Record<string, 'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'> = {
      title:    'TITLE',
      progress: 'PROGRESS',
      updated:  'UPDATED',
    };
    this.selectSort(map[event.key] ?? 'UPDATED');
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  openBook(id: string) { this.router.navigate(['/write', id]); }

  // ── Book menu ─────────────────────────────────────────────────────────────
  toggleBookMenu(bookId: string, e?: Event) {
    e?.stopPropagation();
    this.bookMenuOpen.update(id => id === bookId ? null : bookId);
  }
  closeBookMenu() { this.bookMenuOpen.set(null); }

  duplicateBook(book: Book, e?: Event) {
    e?.stopPropagation();
    const id = crypto.randomUUID();
    const now = new Date();
    const copy: Book = {
      ...book, id,
      title: `${book.title} (Copy)`,
      createdDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastUpdated: now.toISOString(),
      createdAt: now.toISOString(),
      isRecentlyUpdated: true,
    };
    this.store.addBook(copy);
    this.bookContent.cloneBookContent(book.id, id, copy.title).catch(err => console.error(err));
    this.closeBookMenu();
  }

  openDeleteModal(book: Book, e?: Event) {
    e?.stopPropagation();
    this.bookToDelete.set(book);
    this.showDeleteModal.set(true);
    this.closeBookMenu();
  }
  cancelDeleteBook() {
    this.showDeleteModal.set(false);
    this.bookToDelete.set(null);
    this.bulkDeleteIds.set(null);
  }
  confirmDeleteBook() {
    const ids = this.bulkDeleteIds();
    if (ids) {
      ids.forEach(id => this.store.deleteBook(id));
    } else {
      const book = this.bookToDelete();
      if (book) this.store.deleteBook(book.id);
    }
    this.cancelDeleteBook();
  }

  // ── Add modal ─────────────────────────────────────────────────────────────
  openAddModal() {
    this.newBook.set({ title: '', writingType: 'NOVEL', status: 'PLANNING', genre: '', targetWordCount: 80000, icon: 'menu_book' });
    this.showAddModal.set(true);
  }
  closeAddModal() { this.showAddModal.set(false); this.addModalSubmitting.set(false); }

  updateNewBook(key: 'title' | 'writingType' | 'status' | 'genre' | 'targetWordCount' | 'icon', value: string | number) {
    if (key === 'writingType') {
      const def = this.writingTypes.find(t => t.id === value);
      if (def) {
        this.newBook.update(n => ({ ...n, writingType: value as WritingType, targetWordCount: def.defaultWords, icon: def.defaultIcon }));
        return;
      }
    }
    this.newBook.update(n => ({ ...n, [key]: value }));
  }

  async addBook() {
    const form = this.newBook();
    const title = form.title.trim();
    if (!title) return;
    this.addModalSubmitting.set(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const genre = form.genre.trim() ? form.genre.split(',').map(s => s.trim()).filter(Boolean) : ['Fiction'];
      const book: Book = {
        id, title, icon: form.icon, status: form.status, writingType: form.writingType,
        wordCount: 0, targetWordCount: Math.max(0, form.targetWordCount) || 80000,
        progress: 0, chapters: 0, notesCount: 0,
        createdDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastUpdated: now.toISOString(), createdAt: now.toISOString(), genre, isRecentlyUpdated: true,
      };
      this.store.addBook(book);
      await this.bookContent.createAndPersistEmptyBook(id, title);
      this.closeAddModal();
      this.router.navigate(['/write', id]);
    } catch (e) {
      console.error('[BooksComponent] addBook failed', e);
      this.addModalSubmitting.set(false);
    }
  }

  // ── AI Assistant ──────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    const books = this.store.books();
    const q = text.toLowerCase();
    let response = '';

    if (q.includes('how many') || q.includes('count')) {
      response = `You have **${books.length}** writing${books.length !== 1 ? 's' : ''} in total.\n${this.writingTypes.map(t => {
        const n = books.filter(v => v.writingType === t.id).length;
        return n > 0 ? `${t.label}: ${n}` : null;
      }).filter(Boolean).join('\n')}`;
    } else if (q.includes('draft') || q.includes('in progress')) {
      const drafts = books.filter(n => n.status === 'DRAFTING' || n.status === 'REVISING');
      response = drafts.length
        ? `**${drafts.length}** writing${drafts.length !== 1 ? 's' : ''} in progress:\n${drafts.map((n, i) => `${i + 1}. ${n.title} — ${n.status} (${n.progress}%)`).join('\n')}`
        : 'No writings currently in draft or revision.';
    } else if (q.includes('word') || q.includes('total')) {
      const total = books.reduce((a, n) => a + n.wordCount, 0);
      response = `Total word count: **${total.toLocaleString()}** words across ${books.length} writings.\nAverage: ${books.length ? Math.round(total / books.length).toLocaleString() : 0} words per writing.`;
    } else if (q.includes('publish') || q.includes('ready')) {
      const pub = books.filter(n => n.status === 'PUBLISHED');
      response = pub.length
        ? `**${pub.length}** published writing${pub.length !== 1 ? 's' : ''}:\n${pub.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}`
        : 'No published writings yet.';
    } else if (q.includes('breakdown') || q.includes('type')) {
      response = `Writing by type:\n${this.writingTypes.map(t => `${t.label}: ${books.filter(n => n.writingType === t.id).length}`).join('\n')}`;
    } else {
      response = `You have ${books.length} writing${books.length !== 1 ? 's' : ''} with a total of ${books.reduce((a, n) => a + n.wordCount, 0).toLocaleString()} words. Ask about drafts, word counts, publishing status, or a breakdown by type.`;
    }

    this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    this.aiLoading.set(false);
    setTimeout(() => {
      const el = document.querySelector('.ai-panel-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.wr-sort-wrap'))  this.sortDropdownOpen.set(false);
    if (!target.closest('.book-menu-wrapper')) this.closeBookMenu();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showDeleteModal()) this.cancelDeleteBook();
      else if (this.showAddModal()) this.closeAddModal();
      else { this.closeBookMenu(); this.sortDropdownOpen.set(false); }
    }
  }
}
