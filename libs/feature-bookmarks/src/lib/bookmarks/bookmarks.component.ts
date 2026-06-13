import { Component, computed, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService, Bookmark, BookmarkFolder, AiService, WebPreviewService } from '@envello/core';
import { ModalComponent, AiAssistantPanelComponent, AiPanelMessage, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent } from '@envello/ui';
import type { EnvTableAction, EnvTableColumn, EnvTableSortEvent, EnvTableActionEvent } from '@envello/ui';

type BookmarkView = 'all' | 'pinned' | 'archived' | 'recent';
type ViewMode = 'table' | 'grid';
type SortBy = 'createdAt' | 'title' | 'lastVisited' | 'visitCount';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, AiAssistantPanelComponent, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent],
  templateUrl: './bookmarks.component.html',
  styleUrl: './bookmarks.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookmarksComponent implements OnInit, OnDestroy {
  store = inject(StoreService);
  private aiService = inject(AiService);
  private webPreview = inject(WebPreviewService);

  // ── View state ──────────────────────────────────────────────────────────────
  selectedView = signal<BookmarkView>('all');
  viewMode = signal<ViewMode>('table');
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
  deletingBulkIds    = signal<string[]>([]);

  showDeleteFolderConfirm = signal<boolean>(false);
  deletingFolderId = signal<string>('');

  // ── Keyboard shortcuts help ──────────────────────────────────────────────────
  showShortcutsHelp = signal<boolean>(false);

  // ── AI Assistant panel ───────────────────────────────────────────────────────
  showAssistant = signal<boolean>(false);
  aiLoading = signal<boolean>(false);
  aiMessages = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'What topics do my bookmarks cover?',
    'Which bookmarks have I never visited?',
    'Suggest tags for untagged bookmarks',
    'Which bookmarks are my most visited?',
    'Find similar or duplicate bookmarks',
  ];

  // ── Computed ─────────────────────────────────────────────────────────────────
  allTags = computed<string[]>(() => {
    const tagSet = new Set<string>();
    for (const b of this.store.bookmarks()) {
      for (const t of b.tags ?? []) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  });

  readonly activeNavId = computed(() => this.selectedFolderId() ? '' : this.selectedView() as string);

  onNavItemClick(id: string) {
    this.selectedView.set(id as BookmarkView);
    this.selectedFolderId.set('');
  }

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

  readonly tableColumns: EnvTableColumn[] = [
    { key: 'title', header: 'Name', type: 'avatar-text', sortable: true },
    { key: 'domain', header: 'Domain' },
    { key: 'folder', header: 'Folder' },
    { key: 'tags', header: 'Tags' },
    { key: 'visitCount', header: 'Visits', sortable: true },
    { key: 'createdAt', header: 'Added', sortable: true },
  ];

  tableActions = computed<EnvTableAction[]>(() => [
    { key: 'open', label: 'Open', icon: 'open_in_new', bulk: false },
    { key: 'togglePin', label: 'Toggle pin', icon: 'push_pin' },
    { key: 'edit', label: 'Edit', icon: 'edit', bulk: false },
    {
      key: 'toggleArchive',
      label: this.selectedView() === 'archived' ? 'Unarchive' : 'Archive',
      icon: this.selectedView() === 'archived' ? 'unarchive' : 'archive',
    },
    { key: 'delete', label: 'Delete', icon: 'delete', danger: true },
  ]);

  emptyStateConfig = computed(() => {
    const view = this.selectedView();
    const hasFilter = !!this.searchQuery() || this.selectedTags().length > 0;
    if (hasFilter) return { icon: 'search_off', title: 'No results found', subtitle: '', showAdd: false, showClear: true };
    switch (view) {
      case 'pinned':   return { icon: 'push_pin', title: 'No pinned bookmarks', subtitle: 'Pin a bookmark to find it here quickly', showAdd: false, showClear: false };
      case 'archived': return { icon: 'archive',  title: 'No archived bookmarks', subtitle: 'Archive bookmarks to declutter your view', showAdd: false, showClear: false };
      case 'recent':   return { icon: 'history',  title: 'No recent bookmarks', subtitle: 'Your latest additions will appear here', showAdd: false, showClear: false };
      default:         return { icon: 'bookmarks', title: 'No bookmarks yet', subtitle: '', showAdd: true, showClear: false };
    }
  });

  tableRows = computed(() => this.filteredBookmarks().map(bookmark => ({
    id: bookmark.id,
    title: {
      name: bookmark.title,
      avatar: bookmark.faviconUrl || this.getFaviconUrl(bookmark.url),
    },
    domain: this.getDomain(bookmark.url),
    folder: bookmark.folderId ? this.folderName(bookmark.folderId) : '',
    tags: (bookmark.tags ?? []).slice(0, 2).map(tag => `#${tag}`).join(' '),
    visitCount: bookmark.visitCount ?? 0,
    createdAt: this.formatRelativeDate(bookmark.createdAt),
    bookmark,
  })));

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

  closeAddModal() { this.showAddModal.set(false); }
  closeEditModal() { this.showEditModal.set(false); }
  closeAddFolderModal() { this.showAddFolderModal.set(false); }

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
    const raw = this.addUrl().trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

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
    const raw = this.editUrl().trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

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
    this.deletingBulkIds.set([]);
    this.showDeleteConfirm.set(true);
  }

  requestBulkDelete(ids: string[]) {
    this.deletingBulkIds.set(ids);
    this.deletingBookmarkId.set('');
    this.showDeleteConfirm.set(true);
  }

  confirmDelete() {
    const bulk = this.deletingBulkIds();
    if (bulk.length > 0) {
      bulk.forEach(id => this.store.deleteBookmark(id));
    } else {
      this.store.deleteBookmark(this.deletingBookmarkId());
    }
    this.showDeleteConfirm.set(false);
    this.deletingBookmarkId.set('');
    this.deletingBulkIds.set([]);
  }

  get deleteConfirmTitle(): string {
    const count = this.deletingBulkIds().length;
    return count > 1 ? `Delete ${count} Bookmarks` : 'Delete Bookmark';
  }

  get deleteConfirmMessage(): string {
    const count = this.deletingBulkIds().length;
    return count > 1
      ? `${count} bookmarks will be permanently deleted. This cannot be undone.`
      : 'This bookmark will be permanently deleted. This cannot be undone.';
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
    const url = /^https?:\/\//i.test(bookmark.url) ? bookmark.url : `https://${bookmark.url}`;
    this.webPreview.open(url, bookmark.title || bookmark.url);
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

  requestDeleteFolder(id: string) {
    this.deletingFolderId.set(id);
    this.showDeleteFolderConfirm.set(true);
  }

  confirmDeleteFolder() {
    const id = this.deletingFolderId();
    this.store.deleteBookmarkFolder(id);
    if (this.selectedFolderId() === id) this.selectedFolderId.set('');
    this.showDeleteFolderConfirm.set(false);
    this.deletingFolderId.set('');
  }

  get deletingFolderName(): string {
    return this.store.bookmarkFolders().find(f => f.id === this.deletingFolderId())?.name ?? 'this folder';
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

  setSortBy(col: SortBy) {
    if (this.sortBy() === col) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortBy.set(col);
      this.sortAsc.set(false);
    }
  }

  currentViewLabel(): string {
    const labels: Record<BookmarkView, string> = {
      all: 'All Bookmarks', pinned: 'Pinned',
      recent: 'Recently Added', archived: 'Archived',
    };
    return labels[this.selectedView()];
  }

  handleTableAction(event: EnvTableActionEvent) {
    const bookmark = event.row['bookmark'] as Bookmark | undefined;
    if (!bookmark) return;

    switch (event.actionKey) {
      case 'open':
        this.openBookmark(bookmark);
        break;
      case 'togglePin':
        this.togglePin(bookmark);
        break;
      case 'edit':
        this.openEditModal(bookmark);
        break;
      case 'toggleArchive':
        this.toggleArchive(bookmark);
        break;
      case 'delete':
        this.requestDelete(bookmark.id);
        break;
    }
  }

  handleBulkAction(event: { selectedIds: Set<unknown>; actionKey: string }) {
    const { selectedIds, actionKey } = event;
    const affected = this.store.bookmarks().filter(b => selectedIds.has(b.id));
    if (actionKey === 'delete') {
      this.requestBulkDelete(affected.map(b => b.id));
      return;
    }
    for (const bookmark of affected) {
      switch (actionKey) {
        case 'togglePin':     this.togglePin(bookmark); break;
        case 'toggleArchive': this.toggleArchive(bookmark); break;
      }
    }
  }

  handleTableSort(event: EnvTableSortEvent) {
    const sortKey = event.key as SortBy;
    this.sortBy.set(sortKey);
    this.sortAsc.set(event.direction === 'asc');
  }

  trackById(_: number, item: Bookmark) { return item.id; }
  trackByFolderId(_: number, f: BookmarkFolder) { return f.id; }

  // ── AI Assistant methods ──────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    try {
      const bookmarks = this.store.bookmarks();
      const active = bookmarks.filter(b => !b.isArchived);
      const tags = this.allTags();
      const folders = this.store.bookmarkFolders();
      const bookmarkList = active.slice(0, 40).map(b => {
        const domain = (() => { try { return new URL(b.url).hostname; } catch { return b.url; } })();
        return `- ${b.title} [${domain}]${b.tags?.length ? ` tags: ${b.tags.join(', ')}` : ''}${b.isPinned ? ' (pinned)' : ''}${b.visitCount ? ` visits: ${b.visitCount}` : ''}${!b.lastVisited ? ' (never opened)' : ''}${b.folderId ? ` folder: ${folders.find(f => f.id === b.folderId)?.name ?? b.folderId}` : ''}`;
      }).join('\n');
      const context = [
        'You are a bookmark assistant for the Envello productivity app.',
        `The user has ${active.length} active bookmarks across ${folders.length} folder${folders.length !== 1 ? 's' : ''} and ${tags.length} tag${tags.length !== 1 ? 's' : ''}.`,
        active.length ? `Bookmarks (up to 40):\n${bookmarkList}` : 'No bookmarks yet.',
        tags.length ? `All tags: ${tags.join(', ')}` : '',
        'You can help find bookmarks, suggest tags, identify unvisited or duplicate links, summarize topics, or recommend what to read next. Answer concisely, use markdown lists.',
      ].filter(Boolean).join('\n');
      const aiResponse = await this.aiService.sendMessage(text, context);
      const response = aiResponse || this.bookmarkFallback(text, active, tags, folders);
      this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    } catch {
      const bookmarks = this.store.bookmarks();
      const active = bookmarks.filter(b => !b.isArchived);
      const tags = this.allTags();
      const folders = this.store.bookmarkFolders();
      this.aiMessages.update(m => [...m, { role: 'assistant', text: this.bookmarkFallback(text, active, tags, folders) }]);
    } finally {
      this.aiLoading.set(false);
    }
  }

  private bookmarkFallback(text: string, active: Bookmark[], tags: string[], folders: BookmarkFolder[]): string {
    const q = text.toLowerCase();
    if (q.includes('topic') || q.includes('cover')) {
      return tags.length
        ? `Your bookmarks span ${tags.length} topic${tags.length > 1 ? 's' : ''}: ${tags.slice(0, 8).map(t => `#${t}`).join(', ')}${tags.length > 8 ? ` and ${tags.length - 8} more` : ''}.`
        : `Your bookmarks don't have tags yet. Adding tags will help with discovery.`;
    }
    if (q.includes('unvisited') || q.includes('never visited') || q.includes('haven')) {
      const unvisited = active.filter(b => !b.lastVisited);
      return unvisited.length
        ? `${unvisited.length} bookmark${unvisited.length > 1 ? 's' : ''} never opened: ${unvisited.slice(0, 3).map(b => b.title).join(', ')}${unvisited.length > 3 ? ` and ${unvisited.length - 3} more` : '.'}`
        : `You've opened all your bookmarks at least once — great!`;
    }
    if (q.includes('most visited') || q.includes('popular')) {
      const top = [...active].sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0)).filter(b => (b.visitCount ?? 0) > 0).slice(0, 5);
      return top.length
        ? `Top by visits:\n${top.map((b, i) => `${i + 1}. ${b.title} — ${b.visitCount} visit${b.visitCount !== 1 ? 's' : ''}`).join('\n')}`
        : `No visit data yet.`;
    }
    if (q.includes('untagged') || q.includes('tag')) {
      const untagged = active.filter(b => !b.tags?.length);
      return untagged.length
        ? `${untagged.length} untagged bookmark${untagged.length > 1 ? 's' : ''}: ${untagged.slice(0, 3).map(b => b.title).join(', ')}${untagged.length > 3 ? ` and ${untagged.length - 3} more` : ''}.`
        : `All active bookmarks are tagged.`;
    }
    if (q.includes('duplicate') || q.includes('similar')) {
      const domains = active.map(b => { try { return new URL(b.url).hostname; } catch { return ''; } });
      const dupes = domains.filter((d, i) => d && domains.indexOf(d) !== i);
      return dupes.length
        ? `${dupes.length} bookmark${dupes.length > 1 ? 's share' : ' shares'} a domain with another.`
        : `No obvious duplicates across your ${active.length} bookmarks.`;
    }
    return `You have ${active.length} active bookmark${active.length !== 1 ? 's' : ''} across ${folders.length} folder${folders.length !== 1 ? 's' : ''} and ${tags.length} tag${tags.length !== 1 ? 's' : ''}. AI is unavailable — check Settings to configure a provider.`;
  }

  clearAiChat() { this.aiMessages.set([]); }

  closeAllModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showAddFolderModal.set(false);
    this.showDeleteConfirm.set(false);
    this.showDeleteFolderConfirm.set(false);
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
