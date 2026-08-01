import { Component, signal, computed, inject, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchCollection, ResearchSource, ResearchSummary, FileStorageService, StorageFile, AiService, ContextService, NotificationService } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage, BadgeComponent, ConfirmDialogComponent, FeatureSidebarComponent, TableComponent, EnvTableColumn, EnvTableAction, EnvTableActionEvent, EnvTableSortEvent, EnvTableRow, EmptyStateComponent, SliderPanelComponent } from '@envello/ui';

type ViewMode = 'sources' | 'summaries';
type SortField = 'title' | 'type' | 'date';

interface QueuedItem {
  id: string;
  type: 'url' | 'file' | 'note' | 'audio';
  title: string;
  url?: string;
  content?: string;
  file?: File;
  blob?: Blob;
  blobUrl?: string;
  mimeType?: string;
  fetchingMeta?: boolean;
}

const SOURCE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  WEB:       { label: 'Web',       icon: 'language',       color: '#3b82f6' },
  PDF:       { label: 'PDF',       icon: 'picture_as_pdf', color: '#ef4444' },
  VIDEO:     { label: 'Video',     icon: 'smart_display',  color: '#a855f7' },
  INTERVIEW: { label: 'Interview', icon: 'mic',            color: '#10b981' },
  PHYSICAL:  { label: 'Physical',  icon: 'menu_book',      color: '#f59e0b' },
  ARTICLE:   { label: 'Article',   icon: 'article',        color: '#06b6d4' },
  NOTE:      { label: 'Note',      icon: 'edit_note',      color: '#8b5cf6' },
};

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, BadgeComponent, ConfirmDialogComponent, FeatureSidebarComponent, TableComponent, EmptyStateComponent, SliderPanelComponent],
  templateUrl: './knowledge.component.html',
  styleUrl: './knowledge.component.css'
})
export class KnowledgeComponent implements OnDestroy {
  researchService        = inject(ResearchService);
  fileStorage            = inject(FileStorageService);
  private aiService      = inject(AiService);
  private contextService = inject(ContextService);
  private notify         = inject(NotificationService);

  protected aiEnabled = computed(() => this.aiService.aiEnabled());

  // ── View state ────────────────────────────────────────────────────────────
  selectedCollection  = signal<ResearchCollection | null>(null);
  sidebarType         = signal<string>('ALL');
  readonly viewMode   = computed<ViewMode>(() =>
    this.sidebarType() === 'SUMMARIES' ? 'summaries' : 'sources'
  );
  isDraggingOver      = signal(false);

  // ── Filter & Search ───────────────────────────────────────────────────────
  searchQuery         = signal('');
  selectedTag         = signal<string | null>(null);
  sidebarTagsExpanded = signal(false);

  // ── Sort ──────────────────────────────────────────────────────────────────
  sortField = signal<SortField>('date');
  sortDir   = signal<'asc' | 'desc'>('desc');

  // ── Add modal ─────────────────────────────────────────────────────────────
  showAddModal = signal(false);

  // ── Batch queue ───────────────────────────────────────────────────────────
  queue               = signal<QueuedItem[]>([]);
  batchCollectionMode = signal<'none' | 'existing' | 'new'>('none');
  batchNewColName     = signal('');
  batchExistingColId  = signal('');
  savingBatch         = signal(false);
  pendingUrl          = signal('');
  pendingUrlTitle     = signal('');
  pendingUrlFetching  = signal(false);
  showNoteForm        = signal(false);
  inlineNoteTitle     = signal('');
  inlineNoteContent   = signal('');
  showAudioForm       = signal(false);

  readonly saveLabel = computed(() => {
    const n = this.queue().length;
    return n === 0 ? 'Add Sources' : n === 1 ? 'Add 1 Source' : `Add ${n} Sources`;
  });

  // ── Audio recording ───────────────────────────────────────────────────────
  isRecording       = signal(false);
  recordingDuration = signal(0);
  recordedBlob      = signal<Blob | null>(null);
  recordedUrl       = signal('');
  recordingError    = signal('');
  audioTitle        = signal('');
  private mediaRecorder?: MediaRecorder;
  private audioChunks: BlobPart[] = [];
  private recordingTimer?: ReturnType<typeof setInterval>;

  // ── Other modals ──────────────────────────────────────────────────────────
  showSummaryModal       = signal(false);
  showSourceDetail       = signal(false);
  selectedSource         = signal<ResearchSource | null>(null);
  showDeleteCollection   = signal(false);
  showDeleteSource       = signal(false);
  showDeleteSummary      = signal(false);
  collectionToDelete     = signal<ResearchCollection | null>(null);
  sourceToDelete         = signal<ResearchSource | null>(null);
  summaryToDelete        = signal<ResearchSummary | null>(null);
  showBulkDeleteSources  = signal(false);
  bulkDeleteSourceIds    = signal<string[]>([]);
  showBulkDeleteSummaries = signal(false);
  bulkDeleteSummaryIds   = signal<string[]>([]);
  showSummaryDetail      = signal(false);
  selectedSummary        = signal<ResearchSummary | null>(null);
  editSummaryTitle       = signal('');
  editSummaryContent     = signal('');
  editSummaryTags        = signal('');
  showBulkMove           = signal(false);
  bulkMoveTargetId       = signal('');
  pendingMoveIds         = signal<string[]>([]);

  // ── Source detail ─────────────────────────────────────────────────────────
  editNotes          = signal('');
  editTitle          = signal('');
  editUrl            = signal('');
  editAuthor         = signal('');
  editDescription    = signal('');
  editTags           = signal('');
  generatingNotes    = signal(false);
  showUnsavedWarning = signal(false);
  showDetailsMeta    = signal(false);

  // ── Summary form ──────────────────────────────────────────────────────────
  newSummaryTitle   = signal('');
  newSummaryContent = signal('');
  newSummaryTags    = signal('');
  selectedSourceIds = signal<string[]>([]);
  generatingSummary = signal(false);

  // ── Sidebar new collection form ───────────────────────────────────────────
  sidebarNewColOpen  = signal(false);
  sidebarNewColName  = signal('');
  sidebarNewColColor = signal('#8b5cf6');
  readonly sidebarColors = ['#8b5cf6','#f97316','#10b981','#3b82f6','#ec4899','#f59e0b','#06b6d4','#ef4444'];

  openSidebarNewCol() { this.sidebarNewColOpen.set(true); }
  saveSidebarNewCol() {
    if (!this.sidebarNewColName()) return;
    this.researchService.addCollection({ name: this.sidebarNewColName(), color: this.sidebarNewColColor(), description: '' });
    this.sidebarNewColName.set(''); this.sidebarNewColColor.set('#8b5cf6'); this.sidebarNewColOpen.set(false);
  }
  cancelSidebarNewCol() {
    this.sidebarNewColName.set(''); this.sidebarNewColColor.set('#8b5cf6'); this.sidebarNewColOpen.set(false);
  }

  // ── AI Assistant ──────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);
  readonly aiSuggestions = [
    'How many sources are in each collection?',
    'Which collection has the most sources?',
    'List my sources by type',
    'What tags do I use most?',
    'Which sources have notes?',
  ];

  // ── Static data ───────────────────────────────────────────────────────────
  readonly sourceTypeOptions = Object.entries(SOURCE_TYPE_META).map(([id, m]) => ({ id, ...m }));

  // ── Table config ──────────────────────────────────────────────────────────
  readonly sourceColumns: EnvTableColumn[] = [
    { key: 'title',      header: 'Source',        type: 'primary-text', sortable: true },
    { key: 'sourceType', header: 'Type',           type: 'badge', sortable: true, badgeMap: {
      WEB:        { label: 'Web',        variant: 'info',    icon: 'language'       },
      PDF:        { label: 'PDF',        variant: 'error',   icon: 'picture_as_pdf' },
      VIDEO:      { label: 'Video',      variant: 'purple',  icon: 'smart_display'  },
      INTERVIEW:  { label: 'Interview',  variant: 'success', icon: 'mic'            },
      PHYSICAL:   { label: 'Physical',   variant: 'warning', icon: 'menu_book'      },
      ARTICLE:    { label: 'Article',    variant: 'info',    icon: 'article'        },
      NOTE:       { label: 'Note',       variant: 'purple',  icon: 'edit_note'      },
      COLLECTION: { label: 'Collection', variant: 'info',    icon: 'folder'         },
    }},
    { key: 'meta', header: 'Author · Date', sortable: true },
  ];

  summarySort = signal<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  readonly summaryColumns: EnvTableColumn[] = [
    { key: 'title',   header: 'Title',   type: 'primary-text', sortable: true },
    { key: 'sources', header: 'Sources' },
    { key: 'tags',    header: 'Tags' },
    { key: 'date',    header: 'Date',    sortable: true },
  ];

  readonly summaryActions: EnvTableAction[] = [
    { key: 'delete', label: 'Delete', icon: 'delete', danger: true },
  ];

  summaryTableRows = computed(() => {
    const { key, direction } = this.summarySort();
    const rows = this.summaries().map(s => ({
      id: s.id, title: s.title,
      sources:  s.sourceIds.length ? `${s.sourceIds.length} source${s.sourceIds.length !== 1 ? 's' : ''}` : '—',
      tags:     s.tags.join(', ') || '—',
      date:     this.formatDate(s.createdDate),
      _rawDate: s.createdDate,
    }));
    return [...rows].sort((a, b) => {
      const cmp = key === 'title' ? a.title.localeCompare(b.title) : (a._rawDate ?? '').localeCompare(b._rawDate ?? '');
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  onSummarySort(event: EnvTableSortEvent) { this.summarySort.set({ key: event.key, direction: event.direction }); }

  onSummaryAction(event: EnvTableActionEvent) {
    const summary = this.summaries().find(s => s.id === event.row['id']);
    if (!summary) return;
    if (event.actionKey === 'delete') { this.summaryToDelete.set(summary); this.showDeleteSummary.set(true); }
  }

  readonly sourceActions: EnvTableAction[] = [
    { key: 'move-collection', label: 'Move to', icon: 'drive_file_move' },
    { key: 'delete',          label: 'Delete',  icon: 'delete', danger: true },
  ];

  sourceTableRows = computed(() => {
    const type = this.sidebarType();
    const insideCollection = this.selectedCollection();
    const sourceRows = this.filteredSources().map(s => ({
      id: s.id, title: s.title, sourceType: s.sourceType, meta: this.formatSourceMetaShort(s),
    }));
    if (!insideCollection && (type === 'ALL' || type === 'COLLECTION')) {
      const q = this.searchQuery().toLowerCase();
      let cols = this.collections();
      if (q) cols = cols.filter(c => c.name.toLowerCase().includes(q));
      const colRows = cols.map(c => {
        const total = this.collectionSourceCounts().get(c.id) ?? 0;
        return { id: c.id, title: c.name, sourceType: 'COLLECTION', meta: total === 0 ? 'No sources' : `${total} source${total !== 1 ? 's' : ''}` };
      });
      return type === 'COLLECTION' ? colRows : [...colRows, ...sourceRows];
    }
    return sourceRows;
  });

  onSourceRowClick(row: EnvTableRow) {
    if (row['sourceType'] === 'COLLECTION') {
      const col = this.collections().find(c => c.id === row['id']);
      if (col) this.selectCollection(col);
    } else {
      const source = this.researchService.sources().find(s => s.id === row['id']);
      if (source) this.openSourceDetail(source);
    }
  }

  onSourceAction(event: EnvTableActionEvent) {
    if (event.row['sourceType'] === 'COLLECTION') {
      if (event.actionKey === 'delete') {
        const col = this.collections().find(c => c.id === event.row['id']);
        if (col) this.openDeleteCollection(col, new MouseEvent('click'));
      }
      return;
    }
    const source = this.researchService.sources().find(s => s.id === event.row['id']);
    if (!source) return;
    if (event.actionKey === 'move-collection') {
      this.pendingMoveIds.update(ids => [...ids, source.id]);
      if (!this.showBulkMove()) setTimeout(() => this.showBulkMove.set(true), 0);
    } else if (event.actionKey === 'delete') {
      this.openDeleteSource(source);
    }
  }

  onSourceBulkAction(event: { selectedIds: Set<string>; actionKey: string }) {
    const ids = [...event.selectedIds];
    if (event.actionKey === 'move-collection') {
      this.pendingMoveIds.set(ids);
      this.bulkMoveTargetId.set('');
      this.showBulkMove.set(true);
    } else if (event.actionKey === 'delete') {
      this.bulkDeleteSourceIds.set(ids);
      this.showBulkDeleteSources.set(true);
    }
  }

  confirmBulkDeleteSources() {
    this.bulkDeleteSourceIds().forEach(id => this.researchService.deleteSource(id));
    this.showBulkDeleteSources.set(false);
    this.bulkDeleteSourceIds.set([]);
  }

  onSummaryBulkAction(event: { selectedIds: Set<string>; actionKey: string }) {
    if (event.actionKey === 'delete') {
      this.bulkDeleteSummaryIds.set([...event.selectedIds]);
      this.showBulkDeleteSummaries.set(true);
    }
  }

  confirmBulkDeleteSummaries() {
    this.bulkDeleteSummaryIds().forEach(id => this.researchService.deleteSummary(id));
    this.showBulkDeleteSummaries.set(false);
    this.bulkDeleteSummaryIds.set([]);
  }

  onSourceSort(event: EnvTableSortEvent) {
    const keyMap: Record<string, SortField> = { title: 'title', sourceType: 'type', meta: 'date' };
    const field = keyMap[event.key];
    if (field) { this.sortField.set(field); this.sortDir.set(event.direction); }
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  collections = this.researchService.collections;

  sources = computed(() => {
    const lib = this.selectedCollection();
    return lib ? this.researchService.getSourcesByCollection(lib.id) : this.researchService.sources();
  });

  summaries = computed(() => {
    const lib = this.selectedCollection();
    return lib ? this.researchService.getSummariesByCollection(lib.id) : this.researchService.summaries();
  });

  filteredSources = computed(() => {
    let list = this.sources();
    const q    = this.searchQuery().toLowerCase();
    const type = this.sidebarType();
    const tag  = this.selectedTag();
    if (q)   list = list.filter(s => s.title.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)) || s.description?.toLowerCase().includes(q));
    if (type !== 'ALL' && type !== 'COLLECTION') list = list.filter(s => s.sourceType === type);
    if (tag) list = list.filter(s => s.tags.includes(tag));
    const field = this.sortField();
    const dir   = this.sortDir();
    return [...list].sort((a, b) => {
      let cmp = 0;
      if      (field === 'title') cmp = a.title.localeCompare(b.title);
      else if (field === 'type')  cmp = a.sourceType.localeCompare(b.sourceType);
      else if (field === 'date')  cmp = (a.createdDate ?? '').localeCompare(b.createdDate ?? '');
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  collectionSourceCounts = computed(() => {
    const map = new Map<string, number>();
    for (const lib of this.collections()) map.set(lib.id, this.researchService.getSourcesByCollection(lib.id).length);
    return map;
  });

  typeCountMap = computed(() => {
    const sources = this.researchService.sources();
    const map: Record<string, number> = { ALL: sources.length, COLLECTION: this.collections().length, SUMMARIES: this.researchService.summaries().length };
    for (const s of sources) map[s.sourceType] = (map[s.sourceType] ?? 0) + 1;
    return map;
  });

  allTags = computed(() => {
    const tagMap = new Map<string, number>();
    for (const s of this.researchService.sources()) for (const t of s.tags) tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
    return [...tagMap.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  });

  hasActiveFilters = computed(() => !!this.searchQuery() || (this.sidebarType() !== 'ALL' && this.sidebarType() !== 'COLLECTION') || !!this.selectedTag());

  notesDirty = computed(() => {
    const s = this.selectedSource();
    return s ? this.editNotes() !== (s.notes ?? '') : false;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  getSourceTypeMeta(type: string) { return SOURCE_TYPE_META[type] ?? SOURCE_TYPE_META['WEB']; }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isSafeUrl(url: string | undefined): boolean {
    if (!url) return false;
    try { const { protocol } = new URL(url); return protocol === 'http:' || protocol === 'https:'; }
    catch { return false; }
  }

  formatSourceMeta(source: ResearchSource): string {
    const parts: string[] = [this.getSourceTypeMeta(source.sourceType).label];
    if (source.author) parts.push(source.author);
    const date = source.lastAccessed || source.createdDate;
    if (date) parts.push(new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    return parts.join(' · ');
  }

  private formatSourceMetaShort(source: ResearchSource): string {
    const parts: string[] = [];
    if (source.author) parts.push(source.author);
    const date = source.lastAccessed || source.createdDate;
    if (date) parts.push(new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    return parts.join(' · ') || '—';
  }

  private resolveUploadCollectionId(): string | undefined {
    return this.selectedCollection()?.id;
  }

  // ── Collection actions ────────────────────────────────────────────────────
  setSidebarType(type: string) { this.selectedCollection.set(null); this.sidebarType.set(type); this.searchQuery.set(''); this.selectedTag.set(null); }
  showSummaries()  { this.sidebarType.set('SUMMARIES'); this.searchQuery.set(''); }
  selectAllSources() { this.setSidebarType('ALL'); }

  selectCollection(collection: ResearchCollection) {
    this.selectedCollection.set(collection); this.sidebarType.set('ALL'); this.searchQuery.set(''); this.selectedTag.set(null);
  }

  moveSourceToCollection(sourceId: string, collectionId: string) {
    const id = collectionId || undefined;
    this.researchService.updateSource(sourceId, { collectionId: id });
    if (this.selectedSource()?.id === sourceId) this.selectedSource.update(cur => cur ? { ...cur, collectionId: id } : null);
  }

  openDeleteCollection(collection: ResearchCollection, e: Event) {
    e.stopPropagation(); this.collectionToDelete.set(collection); this.showDeleteCollection.set(true);
  }
  cancelDeleteCollection() { this.showDeleteCollection.set(false); this.collectionToDelete.set(null); }
  confirmDeleteCollection() {
    const lib = this.collectionToDelete();
    if (lib) {
      this.researchService.getSourcesByCollection(lib.id).forEach(s => this.researchService.updateSource(s.id, { collectionId: undefined }));
      this.researchService.deleteCollection(lib.id);
      if (this.selectedCollection()?.id === lib.id) this.setSidebarType('COLLECTION');
      this.cancelDeleteCollection();
    }
  }

  // ── Batch Add ─────────────────────────────────────────────────────────────
  openAddModal(tab: 'url' | 'file' | 'note' | 'audio' = 'url') {
    this.clearQueue();
    this.pendingUrl.set(''); this.pendingUrlTitle.set(''); this.pendingUrlFetching.set(false);
    this.batchCollectionMode.set('none');
    this.batchNewColName.set('');
    this.batchExistingColId.set(this.selectedCollection()?.id ?? '');
    this.showNoteForm.set(tab === 'note');
    this.showAudioForm.set(tab === 'audio');
    this.inlineNoteTitle.set(''); this.inlineNoteContent.set('');
    this.discardRecording(); this.audioTitle.set(''); this.recordingError.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() {
    if (this.isRecording()) this.stopRecording();
    this.discardRecording();
    this.clearQueue();
    this.showAddModal.set(false);
  }

  private generateId(): string { return Math.random().toString(36).slice(2, 9); }

  async addUrlToQueue() {
    const url = this.pendingUrl().trim();
    if (!url) return;
    const id = this.generateId();
    const existingTitle = this.pendingUrlTitle().trim();
    const title = existingTitle || url;
    this.queue.update(q => [...q, { id, type: 'url', title, url, fetchingMeta: !existingTitle }]);
    this.pendingUrl.set(''); this.pendingUrlTitle.set(''); this.pendingUrlFetching.set(false);
    if (!existingTitle) this.fetchQueueItemMeta(id, url);
  }

  private async fetchQueueItemMeta(id: string, url: string) {
    try {
      const res  = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status === 'success' && json.data.title) {
        this.queue.update(q => q.map(item => item.id === id ? { ...item, title: json.data.title, fetchingMeta: false } : item));
        return;
      }
    } catch { /* silently fail */ }
    this.queue.update(q => q.map(item => item.id === id ? { ...item, fetchingMeta: false } : item));
  }

  async fetchPendingUrlMeta() {
    const url = this.pendingUrl().trim();
    if (!url || this.pendingUrlFetching()) return;
    this.pendingUrlFetching.set(true);
    try {
      const res  = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status === 'success' && json.data.title) this.pendingUrlTitle.set(json.data.title);
    } catch { /* silently fail */ }
    this.pendingUrlFetching.set(false);
  }

  onPendingUrlPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.startsWith('http://') || text.startsWith('https://')) setTimeout(() => this.fetchPendingUrlMeta(), 50);
  }

  onPendingUrlKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.addUrlToQueue(); }
  }

  addFilesToQueue(files: File[]) {
    for (const file of files) {
      const id = this.generateId();
      this.queue.update(q => [...q, { id, type: 'file', title: file.name.replace(/\.[^/.]+$/, ''), file, mimeType: file.type }]);
    }
  }

  addNoteToQueue() {
    const title = this.inlineNoteTitle().trim();
    if (!title) return;
    const id = this.generateId();
    this.queue.update(q => [...q, { id, type: 'note', title, content: this.inlineNoteContent() }]);
    this.inlineNoteTitle.set(''); this.inlineNoteContent.set(''); this.showNoteForm.set(false);
  }

  addAudioToQueue() {
    const blob = this.recordedBlob();
    if (!blob) return;
    const id     = this.generateId();
    const title  = this.audioTitle().trim() || `Recording ${new Date().toLocaleString()}`;
    const blobUrl = this.recordedUrl();
    this.queue.update(q => [...q, { id, type: 'audio', title, blob, blobUrl, mimeType: blob.type }]);
    this.recordedBlob.set(null); this.recordedUrl.set(''); this.audioTitle.set(''); this.showAudioForm.set(false);
  }

  removeFromQueue(id: string) {
    const item = this.queue().find(i => i.id === id);
    if (item?.blobUrl) URL.revokeObjectURL(item.blobUrl);
    this.queue.update(q => q.filter(i => i.id !== id));
  }

  clearQueue() {
    for (const item of this.queue()) if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
    this.queue.set([]);
  }

  private resolveBatchCollectionId(): string | undefined {
    const mode = this.batchCollectionMode();
    if (mode === 'existing') return this.batchExistingColId() || undefined;
    if (mode === 'new') {
      const name = this.batchNewColName().trim();
      if (name) {
        this.researchService.addCollection({ name, color: '#8b5cf6', description: '' });
        return this.researchService.collections().find(c => c.name === name)?.id;
      }
    }
    return this.selectedCollection()?.id;
  }

  async saveAll() {
    if (!this.queue().length || this.savingBatch()) return;
    this.savingBatch.set(true);
    const collectionId = this.resolveBatchCollectionId();
    for (const item of this.queue()) {
      if (item.type === 'url') {
        this.researchService.addSource({ collectionId, title: item.title, url: item.url, sourceType: 'WEB', tags: [] });
      } else if (item.type === 'note') {
        this.researchService.addSource({ collectionId, title: item.title, sourceType: 'NOTE', tags: [], notes: item.content });
      } else if (item.type === 'file' && item.file) {
        const uploaded = await this.fileStorage.uploadMany([item.file], { type: 'direct', id: 'knowledge' }, collectionId);
        this.createSourcesFromFiles(uploaded);
      } else if (item.type === 'audio' && item.blob) {
        const ext  = item.blob.type.includes('ogg') ? 'ogg' : item.blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([item.blob], `${item.title}.${ext}`, { type: item.blob.type });
        const uploaded = await this.fileStorage.uploadMany([file], { type: 'direct', id: 'knowledge' }, collectionId);
        this.createSourcesFromFiles(uploaded);
      }
    }
    this.savingBatch.set(false);
    this.closeAddModal();
  }

  private mimeToSourceType(mimeType: string): ResearchSource['sourceType'] {
    if (mimeType.startsWith('audio/')) return 'INTERVIEW';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType === 'application/pdf') return 'PDF';
    return 'ARTICLE';
  }

  private createSourcesFromFiles(uploaded: StorageFile[]) {
    for (const f of uploaded) {
      this.researchService.addSource({ collectionId: f.collectionId, title: f.name.replace(/\.[^/.]+$/, ''), sourceType: this.mimeToSourceType(f.mimeType), tags: [], fileId: f.id });
    }
  }

  async downloadSource(source: ResearchSource) {
    if (!source.fileId) return;
    const file = this.fileStorage.files().find(f => f.id === source.fileId);
    if (!file) return;
    try {
      const url = await this.fileStorage.getSignedUrl(file.storagePath);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.target = '_blank'; a.click();
    } catch (e) { console.error('[Knowledge] download failed:', e); }
  }

  openFileInputFromModal() {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) this.addFilesToQueue(files);
    };
    input.click();
  }

  // ── Source detail ─────────────────────────────────────────────────────────
  openSourceDetail(source: ResearchSource) {
    this.selectedSource.set(source);
    this.editNotes.set(source.notes || ''); this.editTitle.set(source.title);
    this.editUrl.set(source.url || ''); this.editAuthor.set(source.author || '');
    this.editDescription.set(source.description || ''); this.editTags.set(source.tags.join(', '));
    this.showSourceDetail.set(true);
  }

  closeSourceDetail() {
    if (this.notesDirty()) { this.showUnsavedWarning.set(true); return; }
    this.showSourceDetail.set(false); this.selectedSource.set(null);
  }

  discardNotesAndClose() { this.showUnsavedWarning.set(false); this.showSourceDetail.set(false); this.selectedSource.set(null); }
  cancelUnsavedWarning() { this.showUnsavedWarning.set(false); }

  saveSourceField(field: 'title' | 'url' | 'author' | 'description' | 'tags') {
    const s = this.selectedSource();
    if (!s) return;
    let updates: Partial<ResearchSource> = {};
    if (field === 'title') {
      const v = this.editTitle().trim(); if (!v || v === s.title) return; updates = { title: v };
    } else if (field === 'url') {
      const v = this.editUrl().trim(); if (v === (s.url ?? '')) return; updates = { url: v };
    } else if (field === 'author') {
      const v = this.editAuthor().trim(); if (v === (s.author ?? '')) return; updates = { author: v };
    } else if (field === 'description') {
      const v = this.editDescription().trim(); if (v === (s.description ?? '')) return; updates = { description: v };
    } else if (field === 'tags') {
      const tags = this.editTags().split(',').map(t => t.trim()).filter(t => t);
      if (JSON.stringify(tags) === JSON.stringify(s.tags)) return; updates = { tags };
    }
    this.researchService.updateSource(s.id, updates);
    this.selectedSource.update(cur => cur ? { ...cur, ...updates } : null);
  }

  saveNotes() {
    const s = this.selectedSource();
    if (!s) return;
    this.researchService.updateSource(s.id, { notes: this.editNotes() });
    this.selectedSource.update(cur => cur ? { ...cur, notes: this.editNotes() } : null);
  }

  async generateAiNotes() {
    const s = this.selectedSource();
    if (!s || this.generatingNotes() || !this.aiService.aiEnabled()) return;
    this.generatingNotes.set(true);
    try {
      const prompt = [
        'Generate concise research notes as 3-5 bullet points for this source:',
        `Title: ${s.title}`, `Type: ${this.getSourceTypeMeta(s.sourceType).label}`,
        s.author      ? `Author: ${s.author}`           : '',
        s.description ? `Description: ${s.description}` : '',
        s.url         ? `URL: ${s.url}`                  : '',
        '\nReturn only the bullet points, no preamble.',
      ].filter(Boolean).join('\n');
      const notes = await this.aiService.sendMessage(prompt);
      if (notes) this.editNotes.set(notes);
    } catch {
      this.notify.error('AI failed', 'Could not generate notes. Check your AI configuration in Settings.');
    }
    this.generatingNotes.set(false);
  }

  openDeleteSource(source: ResearchSource, e?: Event) { e?.stopPropagation(); this.sourceToDelete.set(source); this.showDeleteSource.set(true); }
  cancelDeleteSource() { this.showDeleteSource.set(false); this.sourceToDelete.set(null); }
  confirmDeleteSource() {
    const s = this.sourceToDelete();
    if (s) { this.researchService.deleteSource(s.id); if (this.selectedSource()?.id === s.id) this.closeSourceDetail(); this.cancelDeleteSource(); }
  }

  // ── Summary actions ───────────────────────────────────────────────────────
  openSummaryModal() {
    this.newSummaryTitle.set(''); this.newSummaryContent.set('');
    this.newSummaryTags.set(''); this.selectedSourceIds.set([]);
    this.generatingSummary.set(false); this.showSummaryModal.set(true);
  }
  closeSummaryModal() { this.showSummaryModal.set(false); }

  saveSummary() {
    if (!this.newSummaryTitle()) return;
    this.researchService.addSummary({
      collectionId: this.selectedCollection()?.id ?? '', title: this.newSummaryTitle(),
      content: this.newSummaryContent(), sourceIds: this.selectedSourceIds(),
      tags: this.newSummaryTags().split(',').map(t => t.trim()).filter(t => t),
    });
    this.closeSummaryModal();
  }

  async generateAiSummary() {
    if (this.generatingSummary() || !this.aiService.aiEnabled()) return;
    this.generatingSummary.set(true);
    try {
      const selectedSources = this.sources().filter(s => this.selectedSourceIds().includes(s.id));
      const sourceLines = selectedSources.map(s => [
        `- [${this.getSourceTypeMeta(s.sourceType).label}] ${s.title}`,
        s.author ? `  Author: ${s.author}` : '', s.description ? `  Description: ${s.description}` : '', s.notes ? `  Notes: ${s.notes}` : '',
      ].filter(Boolean).join('\n')).join('\n');
      const prompt = [
        'Write a concise, insightful research summary in 3-6 sentences based on the following material.',
        this.newSummaryTitle() ? `The summary is titled "${this.newSummaryTitle()}".` : '',
        'Focus on key insights, patterns, and takeaways. Use plain prose, no bullet points.',
        '', selectedSources.length ? `Sources:\n${sourceLines}` : 'No specific material selected — write a general synthesis placeholder.',
      ].join('\n');
      const result = await this.aiService.sendMessage(prompt);
      if (result) this.newSummaryContent.set(result);
    } catch {
      this.notify.error('AI failed', 'Could not generate summary. Check your AI configuration in Settings.');
    }
    this.generatingSummary.set(false);
  }

  cancelDeleteSummary() { this.showDeleteSummary.set(false); this.summaryToDelete.set(null); }
  confirmDeleteSummary() {
    const s = this.summaryToDelete();
    if (s) { this.researchService.deleteSummary(s.id); this.cancelDeleteSummary(); }
  }

  toggleSourceSelection(id: string) { this.selectedSourceIds.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]); }
  isSourceSelected(id: string) { return this.selectedSourceIds().includes(id); }
  clearFilters() { this.searchQuery.set(''); this.sidebarType.set('ALL'); this.selectedTag.set(null); }

  setTagFilter(tag: string) { this.selectedCollection.set(null); this.selectedTag.set(tag); this.sidebarType.set('ALL'); this.searchQuery.set(''); }
  clearTagFilter() { this.selectedTag.set(null); }

  openSummaryDetail(summary: ResearchSummary) {
    this.selectedSummary.set(summary); this.editSummaryTitle.set(summary.title);
    this.editSummaryContent.set(summary.content); this.editSummaryTags.set(summary.tags.join(', '));
    this.showSummaryDetail.set(true);
  }
  closeSummaryDetail() { this.showSummaryDetail.set(false); this.selectedSummary.set(null); }
  saveSummaryDetail() {
    const s = this.selectedSummary();
    if (!s) return;
    this.researchService.updateSummary(s.id, { title: this.editSummaryTitle(), content: this.editSummaryContent(), tags: this.editSummaryTags().split(',').map(t => t.trim()).filter(t => t) });
    this.closeSummaryDetail();
  }
  onSummaryRowClick(row: EnvTableRow) {
    const summary = this.researchService.summaries().find(s => s.id === row['id']);
    if (summary) this.openSummaryDetail(summary);
  }

  openBulkMove(ids: string[]) { this.pendingMoveIds.set(ids); this.bulkMoveTargetId.set(''); this.showBulkMove.set(true); }
  confirmBulkMove() {
    const collectionId = this.bulkMoveTargetId() || undefined;
    this.pendingMoveIds().forEach(id => this.researchService.updateSource(id, { collectionId }));
    this.showBulkMove.set(false); this.pendingMoveIds.set([]);
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading() || !this.aiService.aiEnabled()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    try {
      const lib  = this.selectedCollection();
      const srcs = lib ? this.researchService.getSourcesByCollection(lib.id) : this.researchService.collections().flatMap(l => this.researchService.getSourcesByCollection(l.id));
      const sourceList = srcs.map(s => `- ${s.title} [${s.sourceType}]${s.author ? `, by ${s.author}` : ''}${s.description ? `: ${s.description}` : ''}`).join('\n');
      const context = [
        'You are a research knowledge assistant for the Envello productivity app.',
        lib ? `The user is viewing the collection "${lib.name}"${lib.description ? ` (${lib.description})` : ''}.` : 'The user is viewing all their research collections.',
        srcs.length ? `It contains ${srcs.length} source${srcs.length !== 1 ? 's' : ''}:\n${sourceList}` : 'There are no sources yet.',
        'Answer concisely. Use markdown for lists and emphasis.',
      ].join('\n');
      const crossCtx   = await this.contextService.buildContext(text);
      const fullContext = crossCtx.blocks.length ? `${context}\n\n--- Cross-module context ---\n${crossCtx.formatted}` : context;
      const response   = await this.aiService.sendMessage(text, fullContext);
      this.aiMessages.update(m => [...m, { role: 'assistant', text: response || 'No response — check your AI configuration in Settings.' }]);
    } catch {
      this.aiMessages.update(m => [...m, { role: 'assistant', text: 'Something went wrong. Check your AI configuration in Settings.' }]);
    } finally { this.aiLoading.set(false); }
  }

  // ── Audio recording ───────────────────────────────────────────────────────
  async startRecording() {
    this.recordingError.set('');
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.audioChunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const type = this.mediaRecorder?.mimeType ?? 'audio/webm';
        const blob = new Blob(this.audioChunks, { type });
        this.audioChunks = [];
        if (this.recordedUrl()) URL.revokeObjectURL(this.recordedUrl());
        this.recordedBlob.set(blob);
        this.recordedUrl.set(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      this.mediaRecorder.start();
      this.isRecording.set(true); this.recordingDuration.set(0);
      this.recordingTimer = setInterval(() => this.recordingDuration.update(d => d + 1), 1000);
    } catch {
      this.recordingError.set('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  }

  stopRecording() { this.mediaRecorder?.stop(); this.isRecording.set(false); clearInterval(this.recordingTimer); }

  discardRecording() {
    if (this.recordedUrl()) { URL.revokeObjectURL(this.recordedUrl()); this.recordedUrl.set(''); }
    this.recordedBlob.set(null); this.recordingDuration.set(0); this.audioChunks = [];
  }

  openAudioFileInput() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'audio/*'; input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) this.addFilesToQueue(files);
    };
    input.click();
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnDestroy() {
    if (this.isRecording()) this.stopRecording();
    this.discardRecording();
    for (const item of this.queue()) if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
  }

  // ── File actions ──────────────────────────────────────────────────────────
  async onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (!files.length) return;
    if (this.showAddModal()) {
      this.addFilesToQueue(files);
    } else {
      const uploaded = await this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, this.resolveUploadCollectionId());
      this.createSourcesFromFiles(uploaded);
    }
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDraggingOver.set(true); }
  onDragLeave() { this.isDraggingOver.set(false); }

  openFileInput() {
    const collectionId = this.resolveUploadCollectionId();
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, collectionId);
    };
    input.click();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showUnsavedWarning())        this.cancelUnsavedWarning();
      else if (this.showSummaryModal())     this.closeSummaryModal();
      else if (this.showSummaryDetail())    this.closeSummaryDetail();
      else if (this.showBulkMove())         { this.showBulkMove.set(false); this.pendingMoveIds.set([]); }
      else if (this.showAddModal())         this.closeAddModal();
      else if (this.showDeleteSource())     this.cancelDeleteSource();
      else if (this.showDeleteSummary())    this.cancelDeleteSummary();
      else if (this.showDeleteCollection()) this.cancelDeleteCollection();
    }
  }
}
