import { Component, signal, computed, inject, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchCollection, ResearchSource, ResearchSummary, FileStorageService, StorageFile, AiService, StoreService } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage, ConfirmDialogComponent, FeatureSidebarComponent, TableComponent, EnvTableColumn, EnvTableAction, EnvTableActionEvent, EnvTableSortEvent, EnvTableRow } from '@envello/ui';

type ViewMode = 'sources' | 'summaries' | 'files';
type SortField = 'title' | 'status' | 'type' | 'date';

const SOURCE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  WEB:       { label: 'Web',       icon: 'language',       color: '#3b82f6' },
  PDF:       { label: 'PDF',       icon: 'picture_as_pdf', color: '#ef4444' },
  VIDEO:     { label: 'Video',     icon: 'smart_display',  color: '#a855f7' },
  INTERVIEW: { label: 'Interview', icon: 'mic',            color: '#10b981' },
  PHYSICAL:  { label: 'Physical',  icon: 'menu_book',      color: '#f59e0b' },
  ARTICLE:   { label: 'Article',   icon: 'article',        color: '#06b6d4' },
};


@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, ConfirmDialogComponent, FeatureSidebarComponent, TableComponent],
  templateUrl: './knowledge.component.html',
  styleUrl: './knowledge.component.css'
})
export class KnowledgeComponent implements OnDestroy {
  researchService = inject(ResearchService);
  fileStorage     = inject(FileStorageService);
  store           = inject(StoreService);
  private aiService = inject(AiService);

  // ── View state ────────────────────────────────────────────────────────────
  viewMode        = signal<ViewMode>('sources');
  selectedCollection = signal<ResearchCollection | null>(null);

  // ── Files ─────────────────────────────────────────────────────────────────
  fileFilterType = signal<'all' | 'image' | 'document' | 'video' | 'audio'>('all');
  isDraggingOver   = signal(false);
  fileToDelete     = signal<StorageFile | null>(null);
  showDeleteFile   = signal(false);

  filteredFiles = computed(() => {
    let list = this.fileStorage.files();
    const selectedLib = this.selectedCollection();
    if (selectedLib) list = list.filter(f => f.collectionId === selectedLib.id);
    const q = this.searchQuery().toLowerCase().trim();
    if (q) list = list.filter(f => f.name.toLowerCase().includes(q));
    const type = this.fileFilterType();
    if (type === 'image')    list = list.filter(f => f.mimeType.startsWith('image/'));
    if (type === 'video')    list = list.filter(f => f.mimeType.startsWith('video/'));
    if (type === 'document') list = list.filter(f => {
      const m = f.mimeType;
      return m === 'application/pdf'
        || m.includes('word') || m.includes('document')
        || m.includes('sheet') || m.includes('excel')
        || m.includes('presentation') || m.includes('powerpoint')
        || m.startsWith('text/');
    });
    if (type === 'audio') list = list.filter(f => f.mimeType.startsWith('audio/'));
    return list;
  });

  // ── Filter & Search ───────────────────────────────────────────────────────
  searchQuery  = signal('');
  filterStatus = signal<'ALL' | 'UNREAD' | 'READING' | 'PROCESSED'>('ALL');
  filterType   = signal<'ALL' | 'WEB' | 'PDF' | 'VIDEO' | 'INTERVIEW' | 'PHYSICAL' | 'ARTICLE'>('ALL');

  // ── Sort (feature 6) ──────────────────────────────────────────────────────
  sortField = signal<SortField>('date');
  sortDir   = signal<'asc' | 'desc'>('desc');

  // ── Bulk actions handled by env-table ────────────────────────────────────

  // ── Modals ────────────────────────────────────────────────────────────────
  showAddModal           = signal(false);
  showNewCollectionForm  = signal(false);
  addTab                 = signal<'url' | 'file' | 'note' | 'audio'>('url');
  addNoteContent      = signal('');

  // ── Audio recording ───────────────────────────────────────────────────────
  isRecording      = signal(false);
  recordingDuration = signal(0);
  recordedBlob     = signal<Blob | null>(null);
  recordedUrl      = signal('');
  recordingError   = signal('');
  audioTitle       = signal('');
  private mediaRecorder?: MediaRecorder;
  private audioChunks: BlobPart[] = [];
  private recordingTimer?: ReturnType<typeof setInterval>;
  showSummaryModal    = signal(false);
  showSourceDetail    = signal(false);
  selectedSource      = signal<ResearchSource | null>(null);
  showDeleteCollection   = signal(false);
  showDeleteSource    = signal(false);
  showDeleteSummary   = signal(false);
  collectionToDelete     = signal<ResearchCollection | null>(null);
  sourceToDelete      = signal<ResearchSource | null>(null);
  summaryToDelete     = signal<ResearchSummary | null>(null);

  // ── Collection form ──────────────────────────────────────────────────────────
  newCollectionName  = signal('');
  newCollectionDesc  = signal('');
  newCollectionColor = signal('#8b5cf6');

  readonly collectionColors = ['#8b5cf6','#f97316','#10b981','#3b82f6','#ec4899','#f59e0b','#06b6d4','#ef4444'];

  // ── Source form ───────────────────────────────────────────────────────────
  newSourceTitle     = signal('');
  newSourceUrl       = signal('');
  newSourceType      = signal<ResearchSource['sourceType']>('WEB');
  newSourceTags      = signal('');
  newSourceDesc      = signal('');
  newSourceAuthor    = signal('');
  newSourceCollectionId = signal('');   // optional — for add-from-all-sources
  fetchingMeta       = signal(false);
  suggestingTags     = signal(false);

  // ── Summary form ──────────────────────────────────────────────────────────
  newSummaryTitle    = signal('');
  newSummaryContent  = signal('');
  newSummaryTags     = signal('');
  selectedSourceIds  = signal<string[]>([]);
  selectedFileIds    = signal<string[]>([]);
  generatingSummary  = signal(false);

  // ── Source detail ─────────────────────────────────────────────────────────
  editNotes       = signal('');
  editTitle       = signal('');
  editUrl         = signal('');
  editAuthor      = signal('');
  editDescription = signal('');
  editTags        = signal('');
  generatingNotes    = signal(false);
  showLinkTask       = signal(false);
  taskSearch         = signal('');
  showUnsavedWarning = signal(false);

  // ── AI Assistant ──────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'Summarise this collection',
    'Which sources are unread?',
    'What topics do my sources cover?',
    'Which sources have been processed?',
    'Recommend what to read next',
  ];

  // ── Static data ───────────────────────────────────────────────────────────
  readonly sourceTypeOptions = Object.entries(SOURCE_TYPE_META).map(([id, m]) => ({ id, ...m }));

  // ── env-table config ──────────────────────────────────────────────────────
  readonly sourceColumns: EnvTableColumn[] = [
    { key: 'title',      header: 'Source',        sortable: true },
    { key: 'sourceType', header: 'Type',           type: 'badge', sortable: true, badgeMap: {
      WEB:       { label: 'Web',       dotColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)',   textColor: '#3b82f6' },
      PDF:       { label: 'PDF',       dotColor: '#ef4444', bgColor: 'rgba(239,68,68,0.1)',    textColor: '#ef4444' },
      VIDEO:     { label: 'Video',     dotColor: '#a855f7', bgColor: 'rgba(168,85,247,0.1)',   textColor: '#a855f7' },
      INTERVIEW: { label: 'Interview', dotColor: '#10b981', bgColor: 'rgba(16,185,129,0.1)',   textColor: '#10b981' },
      PHYSICAL:  { label: 'Physical',  dotColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)',   textColor: '#d97706' },
      ARTICLE:   { label: 'Article',   dotColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.1)',    textColor: '#0891b2' },
    }},
    { key: 'status', header: 'Status', type: 'badge', sortable: true, badgeMap: {
      UNREAD:    { label: 'Unread',    dotColor: '#f87171', bgColor: 'rgba(248,113,113,0.1)',  textColor: '#ef4444' },
      READING:   { label: 'Reading',   dotColor: '#facc15', bgColor: 'rgba(250,204,21,0.1)',   textColor: '#b45309' },
      PROCESSED: { label: 'Processed', dotColor: '#4ade80', bgColor: 'rgba(74,222,128,0.1)',   textColor: '#16a34a' },
    }},
    { key: 'meta', header: 'Author · Date', sortable: true },
  ];

  // ── File table config ────────────────────────────────────────────────────
  readonly fileColumns: EnvTableColumn[] = [
    { key: 'name', header: 'Name',  sortable: true },
    { key: 'type', header: 'Type' },
    { key: 'size', header: 'Size',  sortable: true },
  ];

  readonly fileActions: EnvTableAction[] = [
    { key: 'download', label: 'Download', icon: 'download', bulk: true  },
    { key: 'delete',   label: 'Delete',   icon: 'delete',   danger: true, bulk: false },
  ];

  fileTableRows = computed(() =>
    this.filteredFiles().map(f => ({
      id:   f.id,
      name: f.name,
      type: this.fileMimeLabel(f.mimeType),
      size: this.fileStorage.formatSize(f.size),
    }))
  );

  onFileAction(event: EnvTableActionEvent) {
    const file = this.fileStorage.files().find(f => f.id === event.row['id']);
    if (!file) return;
    switch (event.actionKey) {
      case 'download': this.downloadFile(file); break;
      case 'delete':   this.openDeleteFile(file); break;
    }
  }

  fileMimeLabel(mimeType: string): string {
    if (mimeType.startsWith('image/'))         return 'Image';
    if (mimeType.startsWith('video/'))         return 'Video';
    if (mimeType.startsWith('audio/'))         return 'Audio';
    if (mimeType === 'application/pdf')        return 'PDF';
    if (mimeType.startsWith('text/'))          return 'Text';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
    if (mimeType.includes('sheet') || mimeType.includes('excel'))   return 'Spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
    return 'File';
  }

  // ── Summary sort ─────────────────────────────────────────────────────────
  summarySort = signal<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // ── Summary table config ─────────────────────────────────────────────────
  readonly summaryColumns: EnvTableColumn[] = [
    { key: 'title',   header: 'Title',   sortable: true },
    { key: 'sources', header: 'Sources' },
    { key: 'tags',    header: 'Tags' },
    { key: 'date',    header: 'Date',    sortable: true },
  ];

  readonly summaryActions: EnvTableAction[] = [
    { key: 'delete', label: 'Delete', icon: 'delete', danger: true, bulk: false },
  ];

  summaryTableRows = computed(() => {
    const { key, direction } = this.summarySort();
    const rows = this.summaries().map(s => ({
      id:       s.id,
      title:    s.title,
      sources:  s.sourceIds.length ? `${s.sourceIds.length} source${s.sourceIds.length !== 1 ? 's' : ''}` : '—',
      tags:     s.tags.join(', ') || '—',
      date:     this.formatDate(s.createdDate),
      _rawDate: s.createdDate,
    }));
    return [...rows].sort((a, b) => {
      const cmp = key === 'title'
        ? a.title.localeCompare(b.title)
        : (a._rawDate ?? '').localeCompare(b._rawDate ?? '');
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  onSummarySort(event: EnvTableSortEvent) {
    this.summarySort.set({ key: event.key, direction: event.direction });
  }

  onSummaryAction(event: EnvTableActionEvent) {
    const summary = this.summaries().find(s => s.id === event.row['id']);
    if (!summary) return;
    if (event.actionKey === 'delete') {
      this.summaryToDelete.set(summary);
      this.showDeleteSummary.set(true);
    }
  }

  readonly sourceActions: EnvTableAction[] = [
    { key: 'mark-unread',    label: 'Unread',    icon: 'radio_button_unchecked', bulk: true  },
    { key: 'mark-reading',   label: 'Reading',   icon: 'menu_book',              bulk: true  },
    { key: 'mark-processed', label: 'Processed', icon: 'task_alt',               bulk: true  },
    { key: 'delete',         label: 'Delete',    icon: 'delete', danger: true,   bulk: false },
  ];

  sourceTableRows = computed(() =>
    this.filteredSources().map(s => ({
      id:         s.id,
      title:      s.title,
      sourceType: s.sourceType,
      status:     s.status,
      meta:       this.formatSourceMetaShort(s),
    }))
  );

  onSourceRowClick(row: EnvTableRow) {
    const source = this.researchService.sources().find(s => s.id === row['id']);
    if (source) this.openSourceDetail(source);
  }

  onSourceAction(event: EnvTableActionEvent) {
    const source = this.researchService.sources().find(s => s.id === event.row['id']);
    if (!source) return;
    switch (event.actionKey) {
      case 'mark-unread':    this.researchService.updateSource(source.id, { status: 'UNREAD' });    break;
      case 'mark-reading':   this.researchService.updateSource(source.id, { status: 'READING' });   break;
      case 'mark-processed': this.researchService.updateSource(source.id, { status: 'PROCESSED' }); break;
      case 'delete':         this.openDeleteSource(source);                                          break;
    }
  }

  onSourceSort(event: EnvTableSortEvent) {
    const keyMap: Record<string, SortField> = {
      title: 'title', sourceType: 'type', status: 'status', meta: 'date',
    };
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
    return lib ? this.researchService.getSummariesByCollection(lib.id) : [];
  });

  filteredSources = computed(() => {
    let list = this.sources();
    const q      = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    const type   = this.filterType();

    if (q)            list = list.filter(s => s.title.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)) || s.description?.toLowerCase().includes(q));
    if (status !== 'ALL') list = list.filter(s => s.status === status);
    if (type   !== 'ALL') list = list.filter(s => s.sourceType === type);

    // Sort (feature 6)
    const field = this.sortField();
    const dir   = this.sortDir();
    const STATUS_ORDER: Record<string, number> = { UNREAD: 0, READING: 1, PROCESSED: 2 };
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if      (field === 'title')  cmp = a.title.localeCompare(b.title);
      else if (field === 'status') cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
      else if (field === 'type')   cmp = a.sourceType.localeCompare(b.sourceType);
      else if (field === 'date')   cmp = (a.createdDate ?? '').localeCompare(b.createdDate ?? '');
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  collectionSourceCounts = computed(() => {
    const map = new Map<string, number>();
    for (const lib of this.collections()) {
      map.set(lib.id, this.researchService.getSourcesByCollection(lib.id).length);
    }
    return map;
  });

  hasActiveFilters = computed(() => !!this.searchQuery() || this.filterStatus() !== 'ALL' || this.filterType() !== 'ALL');

  // Feature 8: linked tasks
  linkedTasks = computed(() => {
    const s = this.selectedSource();
    if (!s?.linkedTaskIds?.length) return [];
    return this.store.tasks().filter(t => s.linkedTaskIds!.includes(t.id));
  });

  availableTasks = computed(() => {
    const s = this.selectedSource();
    const linked = s?.linkedTaskIds ?? [];
    const q = this.taskSearch().toLowerCase();
    return this.store.tasks()
      .filter(t => !linked.includes(t.id))
      .filter(t => !q || t.title.toLowerCase().includes(q))
      .slice(0, 8);
  });

  hasTasks = computed(() => this.store.tasks().length > 0);

  notesDirty = computed(() => {
    const s = this.selectedSource();
    return s ? this.editNotes() !== (s.notes ?? '') : false;
  });

  collectionFiles = computed(() => {
    const lib = this.selectedCollection();
    if (!lib) return this.fileStorage.files();
    return this.fileStorage.files().filter(f => f.collectionId === lib.id);
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
    try {
      const { protocol } = new URL(url);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
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
    return (this.showAddModal() ? this.newSourceCollectionId() : '') || this.selectedCollection()?.id;
  }

  // ── Collection actions ───────────────────────────────────────────────────────
  saveCollection() {
    if (!this.newCollectionName()) return;
    const newLib = this.researchService.addCollection({ name: this.newCollectionName(), description: this.newCollectionDesc(), color: this.newCollectionColor() });
    this.newSourceCollectionId.set(newLib.id);
    this.showNewCollectionForm.set(false);
    this.newCollectionName.set(''); this.newCollectionDesc.set(''); this.newCollectionColor.set('#8b5cf6');
  }

  switchView(mode: ViewMode) {
    this.viewMode.set(mode);
    this.searchQuery.set('');
    if (mode !== 'files') this.fileFilterType.set('all');
  }

  selectAllSources() {
    this.selectedCollection.set(null);
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterType.set('ALL');
  }

  selectCollection(collection: ResearchCollection) {
    this.selectedCollection.set(collection);
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterType.set('ALL');
  }

  moveSourceToCollection(sourceId: string, collectionId: string) {
    const id = collectionId || undefined;
    this.researchService.updateSource(sourceId, { collectionId: id });
    if (this.selectedSource()?.id === sourceId) {
      this.selectedSource.update(cur => cur ? { ...cur, collectionId: id } : null);
    }
  }

  openDeleteCollection(collection: ResearchCollection, e: Event) {
    e.stopPropagation();
    this.collectionToDelete.set(collection);
    this.showDeleteCollection.set(true);
  }
  cancelDeleteCollection() { this.showDeleteCollection.set(false); this.collectionToDelete.set(null); }
  confirmDeleteCollection() {
    const lib = this.collectionToDelete();
    if (lib) {
      this.researchService.deleteCollection(lib.id);
      if (this.selectedCollection()?.id === lib.id) this.selectedCollection.set(null);
      this.cancelDeleteCollection();
    }
  }

  // ── Source actions ────────────────────────────────────────────────────────
  openAddModal(tab: 'url' | 'file' | 'note' | 'audio' = 'url') {
    this.newSourceTitle.set(''); this.newSourceUrl.set(''); this.newSourceType.set('WEB');
    this.newSourceTags.set(''); this.newSourceDesc.set(''); this.newSourceAuthor.set('');
    this.newSourceCollectionId.set(this.selectedCollection()?.id ?? '');
    this.addNoteContent.set('');
    this.newCollectionName.set(''); this.newCollectionDesc.set(''); this.newCollectionColor.set('#8b5cf6');
    this.fetchingMeta.set(false); this.suggestingTags.set(false);
    this.showNewCollectionForm.set(false);
    this.discardRecording(); this.audioTitle.set(''); this.recordingError.set('');
    this.addTab.set(tab);
    this.showAddModal.set(true);
  }
  closeAddModal() {
    if (this.isRecording()) this.stopRecording();
    this.discardRecording();
    this.showAddModal.set(false);
    this.showNewCollectionForm.set(false);
  }

  saveSource() {
    if (!this.newSourceTitle()) return;
    const collectionId = this.selectedCollection()?.id ?? (this.newSourceCollectionId() || undefined);
    this.researchService.addSource({
      collectionId, title: this.newSourceTitle(), url: this.newSourceUrl(),
      sourceType: this.newSourceType(),
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      description: this.newSourceDesc(), author: this.newSourceAuthor(), status: 'UNREAD',
    });
    this.closeAddModal();
  }

  saveNote() {
    if (!this.newSourceTitle()) return;
    const collectionId = this.selectedCollection()?.id ?? (this.newSourceCollectionId() || undefined);
    this.researchService.addSource({
      collectionId, title: this.newSourceTitle(), sourceType: 'ARTICLE',
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      notes: this.addNoteContent(), status: 'UNREAD',
    });
    this.closeAddModal();
  }

  openFileInputFromModal() {
    const collectionId = this.resolveUploadCollectionId();
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) {
        this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, collectionId);
        this.closeAddModal();
      }
    };
    input.click();
  }

  // Feature 1: auto-fill metadata from URL
  async fetchMetadata() {
    const url = this.newSourceUrl().trim();
    if (!url || this.fetchingMeta()) return;
    this.fetchingMeta.set(true);
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status === 'success') {
        const d = json.data;
        if (d.title && !this.newSourceTitle()) this.newSourceTitle.set(d.title);
        if (d.description && !this.newSourceDesc()) this.newSourceDesc.set(d.description);
        if (d.author) this.newSourceAuthor.set(typeof d.author === 'string' ? d.author : (d.author?.name ?? ''));
        else if (d.publisher && !this.newSourceAuthor()) this.newSourceAuthor.set(d.publisher);
      }
    } catch { /* silently fail */ }
    this.fetchingMeta.set(false);
  }

  // Feature 7: AI-suggest tags
  async suggestTags() {
    if (this.suggestingTags() || (!this.newSourceTitle() && !this.newSourceUrl())) return;
    this.suggestingTags.set(true);
    try {
      const prompt = [
        'Suggest 3-5 concise, lowercase research tags for this source.',
        this.newSourceTitle() ? `Title: ${this.newSourceTitle()}` : '',
        this.newSourceUrl()   ? `URL: ${this.newSourceUrl()}`     : '',
        this.newSourceDesc()  ? `Description: ${this.newSourceDesc()}` : '',
        'Return only a comma-separated list of tags, no explanation, no quotes.',
      ].filter(Boolean).join('\n');
      const result = await this.aiService.sendMessage(prompt);
      const tags = result.split(',')
        .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').trim())
        .filter(t => t.length > 1 && t.length < 30).slice(0, 5);
      if (tags.length) this.newSourceTags.set(tags.join(', '));
    } catch { /* silently fail */ }
    this.suggestingTags.set(false);
  }

  openSourceDetail(source: ResearchSource) {
    this.selectedSource.set(source);
    this.editNotes.set(source.notes || '');
    this.editTitle.set(source.title);
    this.editUrl.set(source.url || '');
    this.editAuthor.set(source.author || '');
    this.editDescription.set(source.description || '');
    this.editTags.set(source.tags.join(', '));
    this.showLinkTask.set(false);
    this.taskSearch.set('');
    this.showSourceDetail.set(true);
  }

  closeSourceDetail() {
    if (this.notesDirty()) { this.showUnsavedWarning.set(true); return; }
    this.showSourceDetail.set(false);
    this.selectedSource.set(null);
  }

  discardNotesAndClose() {
    this.showUnsavedWarning.set(false);
    this.showSourceDetail.set(false);
    this.selectedSource.set(null);
  }

  cancelUnsavedWarning() { this.showUnsavedWarning.set(false); }

  saveSourceField(field: 'title' | 'url' | 'author' | 'description' | 'tags') {
    const s = this.selectedSource();
    if (!s) return;
    let updates: Partial<ResearchSource> = {};
    if (field === 'title') {
      const v = this.editTitle().trim();
      if (!v || v === s.title) return;
      updates = { title: v };
    } else if (field === 'url') {
      const v = this.editUrl().trim();
      if (v === (s.url ?? '')) return;
      updates = { url: v };
    } else if (field === 'author') {
      const v = this.editAuthor().trim();
      if (v === (s.author ?? '')) return;
      updates = { author: v };
    } else if (field === 'description') {
      const v = this.editDescription().trim();
      if (v === (s.description ?? '')) return;
      updates = { description: v };
    } else if (field === 'tags') {
      const tags = this.editTags().split(',').map(t => t.trim()).filter(t => t);
      if (JSON.stringify(tags) === JSON.stringify(s.tags)) return;
      updates = { tags };
    }
    this.researchService.updateSource(s.id, updates);
    this.selectedSource.update(cur => cur ? { ...cur, ...updates } : null);
  }

  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED') {
    const s = this.selectedSource();
    if (s) {
      this.researchService.updateSource(s.id, { status });
      this.selectedSource.update(cur => cur ? { ...cur, status } : null);
    }
  }


  saveNotes() {
    const s = this.selectedSource();
    if (!s) return;
    this.researchService.updateSource(s.id, { notes: this.editNotes() });
    this.selectedSource.update(cur => cur ? { ...cur, notes: this.editNotes() } : null);
  }

  // Feature 4: AI generate notes
  async generateAiNotes() {
    const s = this.selectedSource();
    if (!s || this.generatingNotes()) return;
    this.generatingNotes.set(true);
    try {
      const prompt = [
        'Generate concise research notes as 3-5 bullet points for this source:',
        `Title: ${s.title}`,
        `Type: ${this.getSourceTypeMeta(s.sourceType).label}`,
        s.author      ? `Author: ${s.author}`           : '',
        s.description ? `Description: ${s.description}` : '',
        s.url         ? `URL: ${s.url}`                  : '',
        '\nReturn only the bullet points, no preamble.',
      ].filter(Boolean).join('\n');
      const notes = await this.aiService.sendMessage(prompt);
      if (notes) this.editNotes.set(notes);
    } catch { /* silently fail */ }
    this.generatingNotes.set(false);
  }

  openDeleteSource(source: ResearchSource, e?: Event) {
    e?.stopPropagation();
    this.sourceToDelete.set(source);
    this.showDeleteSource.set(true);
  }
  cancelDeleteSource() { this.showDeleteSource.set(false); this.sourceToDelete.set(null); }
  confirmDeleteSource() {
    const s = this.sourceToDelete();
    if (s) {
      this.researchService.deleteSource(s.id);
      if (this.selectedSource()?.id === s.id) this.closeSourceDetail();
      this.cancelDeleteSource();
    }
  }

  // Feature 8: Link tasks to sources
  linkTask(taskId: string) {
    const s = this.selectedSource();
    if (!s) return;
    const linked = [...new Set([...(s.linkedTaskIds ?? []), taskId])];
    this.researchService.updateSource(s.id, { linkedTaskIds: linked });
    this.selectedSource.update(cur => cur ? { ...cur, linkedTaskIds: linked } : null);
    this.showLinkTask.set(false);
    this.taskSearch.set('');
  }

  unlinkTask(taskId: string) {
    const s = this.selectedSource();
    if (!s) return;
    const linked = (s.linkedTaskIds ?? []).filter(id => id !== taskId);
    this.researchService.updateSource(s.id, { linkedTaskIds: linked });
    this.selectedSource.update(cur => cur ? { ...cur, linkedTaskIds: linked } : null);
  }

  // ── Summary actions ───────────────────────────────────────────────────────
  openSummaryModal() {
    this.newSummaryTitle.set(''); this.newSummaryContent.set('');
    this.newSummaryTags.set(''); this.selectedSourceIds.set([]);
    this.selectedFileIds.set([]); this.generatingSummary.set(false);
    this.showSummaryModal.set(true);
  }
  closeSummaryModal() { this.showSummaryModal.set(false); }

  saveSummary() {
    const lib = this.selectedCollection();
    if (!this.newSummaryTitle() || !lib) return;
    this.researchService.addSummary({
      collectionId: lib.id, title: this.newSummaryTitle(), content: this.newSummaryContent(),
      sourceIds: this.selectedSourceIds(),
      fileIds: this.selectedFileIds(),
      tags: this.newSummaryTags().split(',').map(t => t.trim()).filter(t => t),
    });
    this.closeSummaryModal();
  }

  toggleFileSelection(id: string) {
    this.selectedFileIds.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }
  isFileSelected(id: string) { return this.selectedFileIds().includes(id); }

  async generateAiSummary() {
    if (this.generatingSummary()) return;
    this.generatingSummary.set(true);
    try {
      const selectedSources = this.sources().filter(s => this.selectedSourceIds().includes(s.id));
      const selectedFiles   = this.collectionFiles().filter(f => this.selectedFileIds().includes(f.id));
      const sourceLines = selectedSources.map(s => [
        `- [${this.getSourceTypeMeta(s.sourceType).label}] ${s.title}`,
        s.author      ? `  Author: ${s.author}`           : '',
        s.description ? `  Description: ${s.description}` : '',
        s.notes       ? `  Notes: ${s.notes}`             : '',
      ].filter(Boolean).join('\n')).join('\n');
      const fileLines = selectedFiles.map(f => `- [File] ${f.name} (${this.fileMimeLabel(f.mimeType)})`).join('\n');
      const context = [
        selectedSources.length ? `Sources:\n${sourceLines}` : '',
        selectedFiles.length   ? `Files:\n${fileLines}`     : '',
      ].filter(Boolean).join('\n\n');
      const titleHint = this.newSummaryTitle() ? `The summary is titled "${this.newSummaryTitle()}".` : '';
      const prompt = [
        'Write a concise, insightful research summary in 3-6 sentences based on the following material.',
        titleHint,
        'Focus on key insights, patterns, and takeaways. Use plain prose, no bullet points.',
        '',
        context || 'No specific material selected — write a general synthesis placeholder.',
      ].join('\n');
      const result = await this.aiService.sendMessage(prompt);
      if (result) this.newSummaryContent.set(result);
    } catch { /* silently fail */ }
    this.generatingSummary.set(false);
  }

  cancelDeleteSummary() { this.showDeleteSummary.set(false); this.summaryToDelete.set(null); }
  confirmDeleteSummary() {
    const s = this.summaryToDelete();
    if (s) { this.researchService.deleteSummary(s.id); this.cancelDeleteSummary(); }
  }

  toggleSourceSelection(id: string) {
    this.selectedSourceIds.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }
  isSourceSelected(id: string) { return this.selectedSourceIds().includes(id); }

  clearFilters() { this.searchQuery.set(''); this.filterStatus.set('ALL'); this.filterType.set('ALL'); }

  // ── AI ────────────────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    try {
      const lib = this.selectedCollection();
      const srcs = lib ? this.researchService.getSourcesByCollection(lib.id) : this.researchService.collections().flatMap(l => this.researchService.getSourcesByCollection(l.id));
      const sourceList = srcs.map(s =>
        `- ${s.title} [${s.sourceType}, ${s.status}]${s.author ? `, by ${s.author}` : ''}${s.description ? `: ${s.description}` : ''}`
      ).join('\n');
      const context = [
        'You are a research knowledge assistant for the Envello productivity app.',
        lib
          ? `The user is viewing the collection "${lib.name}"${lib.description ? ` (${lib.description})` : ''}.`
          : 'The user is viewing all their research collections.',
        srcs.length
          ? `It contains ${srcs.length} source${srcs.length !== 1 ? 's' : ''}:\n${sourceList}`
          : 'There are no sources yet.',
        'Answer concisely. Use markdown for lists and emphasis.',
      ].join('\n');
      const response = await this.aiService.sendMessage(text, context);
      this.aiMessages.update(m => [...m, { role: 'assistant', text: response || 'No response — check your AI configuration in Settings.' }]);
    } catch {
      this.aiMessages.update(m => [...m, { role: 'assistant', text: 'Something went wrong. Check your AI configuration in Settings.' }]);
    } finally {
      this.aiLoading.set(false);
    }
  }

  // ── Audio recording ───────────────────────────────────────────────────────
  async startRecording() {
    this.recordingError.set('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.audioChunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const type = this.mediaRecorder?.mimeType ?? 'audio/webm';
        const blob = new Blob(this.audioChunks, { type });
        if (this.recordedUrl()) URL.revokeObjectURL(this.recordedUrl());
        this.recordedBlob.set(blob);
        this.recordedUrl.set(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingDuration.set(0);
      this.recordingTimer = setInterval(() => this.recordingDuration.update(d => d + 1), 1000);
    } catch {
      this.recordingError.set('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  }

  stopRecording() {
    this.mediaRecorder?.stop();
    this.isRecording.set(false);
    clearInterval(this.recordingTimer);
  }

  discardRecording() {
    if (this.recordedUrl()) { URL.revokeObjectURL(this.recordedUrl()); this.recordedUrl.set(''); }
    this.recordedBlob.set(null);
    this.recordingDuration.set(0);
    this.audioChunks = [];
  }

  async saveAudioRecording() {
    const blob = this.recordedBlob();
    if (!blob) return;
    const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
    const title = this.audioTitle().trim() || `Recording ${new Date().toLocaleString()}`;
    const file = new File([blob], `${title}.${ext}`, { type: blob.type });
    await this.fileStorage.uploadMany([file], { type: 'direct', id: 'knowledge' }, this.resolveUploadCollectionId());
    this.discardRecording();
    this.closeAddModal();
  }

  openAudioFileInput() {
    const collectionId = this.resolveUploadCollectionId();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) { this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, collectionId); this.closeAddModal(); }
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
  }

  // ── File actions ──────────────────────────────────────────────────────────
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, this.resolveUploadCollectionId());
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDraggingOver.set(true); }
  onDragLeave() { this.isDraggingOver.set(false); }

  openFileInput() {
    const collectionId = this.resolveUploadCollectionId();
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, collectionId);
    };
    input.click();
  }

  openDeleteFile(file: StorageFile) {
    this.fileToDelete.set(file);
    this.showDeleteFile.set(true);
  }
  cancelDeleteFile() { this.showDeleteFile.set(false); this.fileToDelete.set(null); }
  async confirmDeleteFile() {
    const f = this.fileToDelete();
    if (f) {
      await this.fileStorage.delete(f.id);
      this.cancelDeleteFile();
    }
  }

  async downloadFile(file: StorageFile) {
    try {
      const url = await this.fileStorage.getSignedUrl(file.storagePath);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.target = '_blank';
      a.click();
    } catch (e) {
      console.error('[Knowledge] download failed:', e);
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showUnsavedWarning())  this.cancelUnsavedWarning();
      else if (this.showSourceDetail()) this.closeSourceDetail();
      else if (this.showSummaryModal()) this.closeSummaryModal();
      else if (this.showAddModal())     this.closeAddModal();
      else if (this.showDeleteSource())  this.cancelDeleteSource();
      else if (this.showDeleteSummary()) this.cancelDeleteSummary();
      else if (this.showDeleteCollection()) this.cancelDeleteCollection();
      else if (this.showDeleteFile())    this.cancelDeleteFile();
    }
  }
}
