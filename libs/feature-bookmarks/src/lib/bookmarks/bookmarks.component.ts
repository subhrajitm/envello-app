import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService, Bookmark, BookmarkFolder } from '@envello/core';
import { ModalComponent } from '@envello/ui';

type BookmarkView = 'all' | 'pinned' | 'archived' | 'recent';
type ViewMode = 'grid' | 'list';
type SortBy = 'createdAt' | 'title' | 'lastVisited' | 'visitCount';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './bookmarks.component.html',
  styleUrl: './bookmarks.component.css',
})
export class BookmarksComponent implements OnInit, OnDestroy {
  store = inject(StoreService);

  // ── View state ──────────────────────────────────────────────────────────────
  selectedView = signal<BookmarkView>('all');
  viewMode = signal<ViewMode>('grid');
  sortBy = signal<SortBy>('createdAt');
  sortAsc = signal<boolean>(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  searchQuery = signal<string>('');
  selectedFolderId = signal<string>('');
  selectedTags = signal<string[]>([]);

  // ── Add Bookmark modal ───────────────────────────────────────────────────────
  showAddModal = signal<boolean>(false);
  addUrl = signal<string>('');
  addTitle = signal<string>('');
  addDescription = signal<string>('');
  addNotes = signal<string>('');
  addTagInput = signal<string>('');
  addTags = signal<string[]>([]);
  addFolderId = signal<string>('');
  addColor = signal<string>('');

  // ── Edit Bookmark modal ──────────────────────────────────────────────────────
  showEditModal = signal<boolean>(false);
  editingBookmark = signal<Bookmark | null>(null);
  editUrl = signal<string>('');
  editTitle = signal<string>('');
  editDescription = signal<string>('');
  editNotes = signal<string>('');
  editTagInput = signal<string>('');
  editTags = signal<string[]>([]);
  editFolderId = signal<string>('');
  editColor = signal<string>('');

  // ── Add Folder modal ─────────────────────────────────────────────────────────
  showAddFolderModal = signal<boolean>(false);
  newFolderName = signal<string>('');
  newFolderIcon = signal<string>('folder');
  newFolderColor = signal<string>('');

  // ── Delete confirmation ──────────────────────────────────────────────────────
  showDeleteConfirm = signal<boolean>(false);
  deletingBookmarkId = signal<string>('');

  // ── Keyboard shortcuts help ──────────────────────────────────────────────────
  showShortcutsHelp = signal<boolean>(false);

  // ── Computed ─────────────────────────────────────────────────────────────────
  allTags = computed<string[]>(() => {
    const tagSet = new Set<string>();
    for (const b of this.store.bookmarks()) {
      for (const t of b.tags ?? []) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  });

  sidebarItems = computed(() => [
    {
      id: 'all',
      icon: 'bookmarks',
      label: 'All Bookmarks',
      count: this.store.bookmarks().filter(b => !b.isArchived).length,
    },
    {
      id: 'pinned',
      icon: 'push_pin',
      label: 'Pinned',
      count: this.store.bookmarks().filter(b => b.isPinned && !b.isArchived).length,
    },
    {
      id: 'recent',
      icon: 'history',
      label: 'Recently Added',
      count: 0,
    },
    {
      id: 'archived',
      icon: 'archive',
      label: 'Archived',
      count: this.store.bookmarks().filter(b => b.isArchived).length,
    },
  ]);

  filteredBookmarks = computed<Bookmark[]>(() => {
    const view = this.selectedView();
    const query = this.searchQuery().toLowerCase().trim();
    const folderId = this.selectedFolderId();
    const tags = this.selectedTags();
    const sort = this.sortBy();
    const asc = this.sortAsc();

    let items = this.store.bookmarks();

    // View filter
    if (view === 'all') items = items.filter(b => !b.isArchived);
    else if (view === 'pinned') items = items.filter(b => b.isPinned && !b.isArchived);
    else if (view === 'archived') items = items.filter(b => b.isArchived);
    else if (view === 'recent') {
      items = items
        .filter(b => !b.isArchived)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30);
    }

    // Folder filter
    if (folderId) items = items.filter(b => b.folderId === folderId);

    // Tag filter
    if (tags.length) items = items.filter(b => tags.every(t => b.tags?.includes(t)));

    // Search
    if (query) {
      items = items.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        (b.description ?? '').toLowerCase().includes(query) ||
        (b.tags ?? []).some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort (skip for 'recent' which is already sorted)
    if (view !== 'recent') {
      items = [...items].sort((a, b) => {
        let va: string | number = '';
        let vb: string | number = '';
        if (sort === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
        else if (sort === 'createdAt') { va = a.createdAt; vb = b.createdAt; }
        else if (sort === 'lastVisited') { va = a.lastVisited ?? ''; vb = b.lastVisited ?? ''; }
        else if (sort === 'visitCount') { va = a.visitCount ?? 0; vb = b.visitCount ?? 0; }
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
    }

    return items;
  });

  folderTree = computed(() => this.store.bookmarkFolders());

  bookmarkCountByFolder = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const b of this.store.bookmarks()) {
      if (b.folderId) counts[b.folderId] = (counts[b.folderId] ?? 0) + 1;
    }
    return counts;
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  private _keyHandler!: (e: KeyboardEvent) => void;

  ngOnInit() {
    this._keyHandler = (e: KeyboardEvent) => this.handleGlobalKey(e);
    window.addEventListener('keydown', this._keyHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this._keyHandler);
  }

  handleGlobalKey(e: KeyboardEvent) {
    const meta = e.metaKey || e.ctrlKey;

    if (meta && e.key === 'n') {
      e.preventDefault();
      this.openAddModal();
    }
    if (meta && e.key === 'f') {
      e.preventDefault();
      document.querySelector<HTMLInputElement>('.bm-search-input')?.focus();
    }
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
    if (meta && e.key === '/') {
      e.preventDefault();
      this.showShortcutsHelp.update(v => !v);
    }
  }

  // ── Add modal ────────────────────────────────────────────────────────────────
  openAddModal() {
    this.addUrl.set('');
    this.addTitle.set('');
    this.addDescription.set('');
    this.addNotes.set('');
    this.addTagInput.set('');
    this.addTags.set([]);
    this.addFolderId.set('');
    this.addColor.set('');
    this.showAddModal.set(true);
  }

  onAddUrlBlur() {
    const url = this.addUrl().trim();
    if (url && !this.addTitle()) {
      try {
        const hostname = new URL(url).hostname.replace('www.', '');
        this.addTitle.set(hostname);
      } catch {
        // ignore invalid URL
      }
    }
  }

  addTagFromInput() {
    const tag = this.addTagInput().trim().toLowerCase();
    if (tag && !this.addTags().includes(tag)) {
      this.addTags.update(t => [...t, tag]);
    }
    this.addTagInput.set('');
  }

  onAddTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.addTagFromInput();
    }
  }

  removeAddTag(tag: string) {
    this.addTags.update(t => t.filter(x => x !== tag));
  }

  submitAddBookmark() {
    const url = this.addUrl().trim();
    if (!url) return;

    const title = this.addTitle().trim() || url;
    const faviconUrl = this.getFaviconUrl(url);

    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      title,
      url,
      description: this.addDescription().trim() || undefined,
      faviconUrl,
      tags: this.addTags().length ? this.addTags() : undefined,
      folderId: this.addFolderId() || undefined,
      createdAt: new Date().toISOString(),
      notes: this.addNotes().trim() || undefined,
      color: this.addColor() || undefined,
      isPinned: false,
      isArchived: false,
      visitCount: 0,
    };

    this.store.addBookmark(bookmark);
    this.showAddModal.set(false);
  }

  // ── Edit modal ───────────────────────────────────────────────────────────────
  openEditModal(bookmark: Bookmark) {
    this.editingBookmark.set(bookmark);
    this.editUrl.set(bookmark.url);
    this.editTitle.set(bookmark.title);
    this.editDescription.set(bookmark.description ?? '');
    this.editNotes.set(bookmark.notes ?? '');
    this.editTagInput.set('');
    this.editTags.set([...(bookmark.tags ?? [])]);
    this.editFolderId.set(bookmark.folderId ?? '');
    this.editColor.set(bookmark.color ?? '');
    this.showEditModal.set(true);
  }

  editTagFromInput() {
    const tag = this.editTagInput().trim().toLowerCase();
    if (tag && !this.editTags().includes(tag)) {
      this.editTags.update(t => [...t, tag]);
    }
    this.editTagInput.set('');
  }

  onEditTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.editTagFromInput();
    }
  }

  removeEditTag(tag: string) {
    this.editTags.update(t => t.filter(x => x !== tag));
  }

  submitEditBookmark() {
    const bm = this.editingBookmark();
    if (!bm) return;
    const url = this.editUrl().trim();
    if (!url) return;

    this.store.updateBookmark(bm.id, {
      url,
      title: this.editTitle().trim() || url,
      description: this.editDescription().trim() || undefined,
      notes: this.editNotes().trim() || undefined,
      tags: this.editTags().length ? this.editTags() : undefined,
      folderId: this.editFolderId() || undefined,
      color: this.editColor() || undefined,
      faviconUrl: this.getFaviconUrl(url),
    });
    this.showEditModal.set(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  requestDelete(id: string) {
    this.deletingBookmarkId.set(id);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete() {
    this.store.deleteBookmark(this.deletingBookmarkId());
    this.showDeleteConfirm.set(false);
    this.deletingBookmarkId.set('');
  }

  // ── Quick actions ─────────────────────────────────────────────────────────────
  togglePin(bookmark: Bookmark) {
    this.store.updateBookmark(bookmark.id, { isPinned: !bookmark.isPinned });
  }

  toggleArchive(bookmark: Bookmark) {
    this.store.updateBookmark(bookmark.id, { isArchived: !bookmark.isArchived, isPinned: bookmark.isArchived ? bookmark.isPinned : false });
  }

  openBookmark(bookmark: Bookmark) {
    this.store.updateBookmark(bookmark.id, {
      lastVisited: new Date().toISOString(),
      visitCount: (bookmark.visitCount ?? 0) + 1,
    });
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  }

  // ── Tag filtering ─────────────────────────────────────────────────────────────
  toggleTagFilter(tag: string) {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  clearFilters() {
    this.selectedTags.set([]);
    this.selectedFolderId.set('');
    this.searchQuery.set('');
  }

  // ── Add folder ────────────────────────────────────────────────────────────────
  openAddFolderModal() {
    this.newFolderName.set('');
    this.newFolderIcon.set('folder');
    this.newFolderColor.set('');
    this.showAddFolderModal.set(true);
  }

  submitAddFolder() {
    const name = this.newFolderName().trim();
    if (!name) return;
    const folder: BookmarkFolder = {
      id: crypto.randomUUID(),
      name,
      icon: this.newFolderIcon() || 'folder',
      color: this.newFolderColor() || undefined,
      createdAt: new Date().toISOString(),
    };
    this.store.addBookmarkFolder(folder);
    this.showAddFolderModal.set(false);
  }

  deleteFolder(id: string) {
    this.store.deleteBookmarkFolder(id);
    if (this.selectedFolderId() === id) this.selectedFolderId.set('');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  getFaviconUrl(url: string): string {
    try {
      const { origin } = new URL(url);
      return `${origin}/favicon.ico`;
    } catch {
      return '';
    }
  }

  getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatRelativeDate(iso: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return this.formatDate(iso);
  }

  getBookmarkCardColor(bookmark: Bookmark): string {
    return bookmark.color || '';
  }

  folderName(folderId: string): string {
    return this.store.bookmarkFolders().find(f => f.id === folderId)?.name ?? '';
  }

  toggleSortAsc() { this.sortAsc.set(!this.sortAsc()); }

  trackById(_: number, item: Bookmark) { return item.id; }
  trackByFolderId(_: number, f: BookmarkFolder) { return f.id; }

  closeAllModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showAddFolderModal.set(false);
    this.showDeleteConfirm.set(false);
    this.showShortcutsHelp.set(false);
  }

  // Predefined colors for bookmark accent
  readonly accentColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#64748b',
  ];

  readonly folderIcons = [
    'folder', 'work', 'school', 'code', 'favorite',
    'star', 'rocket_launch', 'science', 'sports_esports', 'travel_explore',
  ];
}
