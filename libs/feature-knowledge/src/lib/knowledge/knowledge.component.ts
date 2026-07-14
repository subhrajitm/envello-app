import { Component, signal, computed, inject, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchCollection, ResearchSource, ResearchSummary, FileStorageService, StorageFile, AiService, ContextService } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage, BadgeComponent, ChipComponent, ConfirmDialogComponent, FeatureSidebarComponent, TableComponent, EnvTableColumn, EnvTableAction, EnvTableActionEvent, EnvTableSortEvent, EnvTableRow, EmptyStateComponent, SliderPanelComponent } from '@envello/ui';

type ViewMode = 'sources' | 'summaries';
type SortField = 'title' | 'type' | 'date';

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
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, BadgeComponent, ChipComponent, ConfirmDialogComponent, FeatureSidebarComponent, TableComponent, EmptyStateComponent, SliderPanelComponent],
  templateUrl: './knowledge.component.html',
  styleUrl: './knowledge.component.css'
})
export class KnowledgeComponent implements OnDestroy {
  researchService   = inject(ResearchService);
  fileStorage       = inject(FileStorageService);
  private aiService = inject(AiService);
  private contextService = inject(ContextService);

  protected aiEnabled = computed(() => this.aiService.aiEnabled());

  // ── View state ────────────────────────────────────────────────────────────
  viewMode           = signal<ViewMode>('sources');
  selectedCollection = signal<ResearchCollection | null>(null);
  sidebarType        = signal<string>('ALL');

  isDraggingOver = signal(false);

  // ── Filter & Search ───────────────────────────────────────────────────────
  searchQuery = signal('');

  // ── Tag filter (Change 3) ─────────────────────────────────────────────────
  selectedTag        = signal<string | null>(null);
  sidebarTagsExpanded = signal(false);

  // ── Sort (feature 6) ──────────────────────────────────────────────────────
  sortField = signal<SortField>('date');
  sortDir   = signal<'asc' | 'desc'>('desc');

  // ── Bulk actions handled by env-table ────────────────────────────────────

  // ── Modals ────────────────────────────────────────────────────────────────
  showAddModal = signal(false);
  addTab       = signal<'url' | 'file' | 'note' | 'audio'>('url');
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

  // ── Summary detail panel (Change 1) ──────────────────────────────────────
  showSummaryDetail  = signal(false);
  selectedSummary    = signal<ResearchSummary | null>(null);
  editSummaryTitle   = signal('');
  editSummaryContent = signal('');
  editSummaryTags    = signal('');

  // ── Quick URL capture (Change 7) ──────────────────────────────────────────
  quickUrl       = signal('');
  quickCapturing = signal(false);

  // ── Bulk move to collection (Change 8) ────────────────────────────────────
  showBulkMove     = signal(false);
  bulkMoveTargetId = signal('');
  pendingMoveIds   = signal<string[]>([]);


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
  newSummaryTitle   = signal('');
  newSummaryContent = signal('');
  newSummaryTags    = signal('');
  selectedSourceIds = signal<string[]>([]);
  generatingSummary = signal(false);

  // ── Sidebar new collection inline form ────────────────────────────────────
  sidebarNewColOpen  = signal(false);
  sidebarNewColName  = signal('');
  sidebarNewColColor = signal('#8b5cf6');

  readonly sidebarColors = ['#8b5cf6','#f97316','#10b981','#3b82f6','#ec4899','#f59e0b','#06b6d4','#ef4444'];

  openSidebarNewCol() { this.sidebarNewColOpen.set(true); }
  saveSidebarNewCol() {
    if (!this.sidebarNewColName()) return;
    this.researchService.addCollection({ name: this.sidebarNewColName(), color: this.sidebarNewColColor(), description: '' });
    this.sidebarNewColName.set('');
    this.sidebarNewColColor.set('#8b5cf6');
    this.sidebarNewColOpen.set(false);
  }
  cancelSidebarNewCol() {
    this.sidebarNewColName.set('');
    this.sidebarNewColColor.set('#8b5cf6');
    this.sidebarNewColOpen.set(false);
  }

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

  // ── env-table config ──────────────────────────────────────────────────────
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

  // ── Summary sort ─────────────────────────────────────────────────────────
  summarySort = signal<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // ── Summary table config ─────────────────────────────────────────────────
  readonly summaryColumns: EnvTableColumn[] = [
    { key: 'title',   header: 'Title',   type: 'primary-text', sortable: true },
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
    { key: 'move-collection', label: 'Move to', icon: 'drive_file_move', bulk: true  },
    { key: 'delete',          label: 'Delete',  icon: 'delete', danger: true, bulk: false },
  ];

  sourceTableRows = computed(() => {
    const type = this.sidebarType();
    const insideCollection = this.selectedCollection();

    const sourceRows = this.filteredSources().map(s => ({
      id: s.id, title: s.title, sourceType: s.sourceType,
      meta: this.formatSourceMetaShort(s),
    }));

    if (!insideCollection && (type === 'ALL' || type === 'COLLECTION')) {
      const q = this.searchQuery().toLowerCase();
      let cols = this.collections();
      if (q) cols = cols.filter(c => c.name.toLowerCase().includes(q));
      const colRows = cols.map(c => {
        const total = this.collectionSourceCounts().get(c.id) ?? 0;
        const meta = total === 0 ? 'No sources' : `${total} source${total !== 1 ? 's' : ''}`;
        return { id: c.id, title: c.name, sourceType: 'COLLECTION', meta };
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
    switch (event.actionKey) {
      case 'move-collection': {
        this.pendingMoveIds.update(ids => [...ids, source.id]);
        if (!this.showBulkMove()) {
          setTimeout(() => this.showBulkMove.set(true), 0);
        }
        break;
      }
      case 'delete':         this.openDeleteSource(source);                                          break;
    }
  }

  onSourceSort(event: EnvTableSortEvent) {
    const keyMap: Record<string, SortField> = {
      title: 'title', sourceType: 'type', meta: 'date',
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
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if      (field === 'title') cmp = a.title.localeCompare(b.title);
      else if (field === 'type')  cmp = a.sourceType.localeCompare(b.sourceType);
      else if (field === 'date')  cmp = (a.createdDate ?? '').localeCompare(b.createdDate ?? '');
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

  typeCountMap = computed(() => {
    const sources = this.researchService.sources();
    const map: Record<string, number> = { ALL: sources.length, COLLECTION: this.collections().length };
    for (const s of sources) map[s.sourceType] = (map[s.sourceType] ?? 0) + 1;
    return map;
  });

  allTags = computed(() => {
    const tagMap = new Map<string, number>();
    for (const s of this.researchService.sources()) {
      for (const t of s.tags) {
        tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
      }
    }
    return [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
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

  switchView(mode: ViewMode) {
    this.viewMode.set(mode);
    this.searchQuery.set('');
  }

  setSidebarType(type: string) {
    this.selectedCollection.set(null);
    this.sidebarType.set(type);
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.selectedTag.set(null);
  }

  selectAllSources() { this.setSidebarType('ALL'); }

  selectCollection(collection: ResearchCollection) {
    this.selectedCollection.set(collection);
    this.sidebarType.set('ALL');
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.selectedTag.set(null);
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
      // Unassign sources instead of deleting them
      const sourcesInCollection = this.researchService.getSourcesByCollection(lib.id);
      sourcesInCollection.forEach(s =>
        this.researchService.updateSource(s.id, { collectionId: undefined })
      );
      this.researchService.deleteCollection(lib.id);
      if (this.selectedCollection()?.id === lib.id) this.setSidebarType('COLLECTION');
      this.cancelDeleteCollection();
    }
  }

  // ── Source actions ────────────────────────────────────────────────────────
  openAddModal(tab: 'url' | 'file' | 'note' | 'audio' = 'url') {
    this.newSourceTitle.set(''); this.newSourceUrl.set(''); this.newSourceType.set('WEB');
    this.newSourceTags.set(''); this.newSourceDesc.set(''); this.newSourceAuthor.set('');
    this.newSourceCollectionId.set(this.selectedCollection()?.id ?? '');
    this.addNoteContent.set('');
    this.fetchingMeta.set(false); this.suggestingTags.set(false);
    this.discardRecording(); this.audioTitle.set(''); this.recordingError.set('');
    this.addTab.set(tab);
    this.showAddModal.set(true);
  }
  closeAddModal() {
    if (this.isRecording()) this.stopRecording();
    this.discardRecording();
    this.showAddModal.set(false);
  }

  saveSource() {
    if (!this.newSourceTitle()) return;
    const collectionId = this.selectedCollection()?.id ?? (this.newSourceCollectionId() || undefined);
    this.researchService.addSource({
      collectionId, title: this.newSourceTitle(), url: this.newSourceUrl(),
      sourceType: this.newSourceType(),
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      description: this.newSourceDesc(), author: this.newSourceAuthor(),
    });
    this.closeAddModal();
  }

  saveNote() {
    if (!this.newSourceTitle()) return;
    const collectionId = this.selectedCollection()?.id ?? (this.newSourceCollectionId() || undefined);
    this.researchService.addSource({
      collectionId, title: this.newSourceTitle(), sourceType: 'NOTE',
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      notes: this.addNoteContent(),
    });
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
      this.researchService.addSource({
        collectionId: f.collectionId,
        title: f.name.replace(/\.[^/.]+$/, ''),
        sourceType: this.mimeToSourceType(f.mimeType),
        tags: [],
        fileId: f.id,
      });
    }
    this.viewMode.set('sources');
  }

  async downloadSource(source: ResearchSource) {
    if (!source.fileId) return;
    const file = this.fileStorage.files().find(f => f.id === source.fileId);
    if (!file) return;
    try {
      const url = await this.fileStorage.getSignedUrl(file.storagePath);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.target = '_blank';
      a.click();
    } catch (e) {
      console.error('[Knowledge] download failed:', e);
    }
  }

  openFileInputFromModal() {
    const collectionId = this.resolveUploadCollectionId();
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) {
        this.closeAddModal();
        const uploaded = await this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, collectionId);
        this.createSourcesFromFiles(uploaded);
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

  onUrlPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.startsWith('http://') || text.startsWith('https://')) {
      setTimeout(() => this.fetchMetadata(), 50);
    }
  }

  // Feature 7: AI-suggest tags
  async suggestTags() {
    if (this.suggestingTags() || (!this.newSourceTitle() && !this.newSourceUrl()) || !this.aiService.aiEnabled()) return;
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



  saveNotes() {
    const s = this.selectedSource();
    if (!s) return;
    this.researchService.updateSource(s.id, { notes: this.editNotes() });
    this.selectedSource.update(cur => cur ? { ...cur, notes: this.editNotes() } : null);
  }

  // Feature 4: AI generate notes
  async generateAiNotes() {
    const s = this.selectedSource();
    if (!s || this.generatingNotes() || !this.aiService.aiEnabled()) return;
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

  // ── Summary actions ───────────────────────────────────────────────────────
  openSummaryModal() {
    this.newSummaryTitle.set(''); this.newSummaryContent.set('');
    this.newSummaryTags.set(''); this.selectedSourceIds.set([]);
    this.generatingSummary.set(false);
    this.showSummaryModal.set(true);
  }
  closeSummaryModal() { this.showSummaryModal.set(false); }

  saveSummary() {
    if (!this.newSummaryTitle()) return;
    const lib = this.selectedCollection();
    this.researchService.addSummary({
      collectionId: lib?.id ?? '', title: this.newSummaryTitle(), content: this.newSummaryContent(),
      sourceIds: this.selectedSourceIds(),
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
        s.author      ? `  Author: ${s.author}`           : '',
        s.description ? `  Description: ${s.description}` : '',
        s.notes       ? `  Notes: ${s.notes}`             : '',
      ].filter(Boolean).join('\n')).join('\n');
      const context = selectedSources.length ? `Sources:\n${sourceLines}` : '';
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

  clearFilters() { this.searchQuery.set(''); this.sidebarType.set('ALL'); this.selectedTag.set(null); }

  // ── Tag filter actions (Change 3) ─────────────────────────────────────────
  setTagFilter(tag: string) {
    this.selectedCollection.set(null);
    this.selectedTag.set(tag);
    this.sidebarType.set('ALL');
    this.viewMode.set('sources');
    this.searchQuery.set('');
  }
  clearTagFilter() { this.selectedTag.set(null); }

  // ── Summary detail panel (Change 1) ──────────────────────────────────────
  openSummaryDetail(summary: ResearchSummary) {
    this.selectedSummary.set(summary);
    this.editSummaryTitle.set(summary.title);
    this.editSummaryContent.set(summary.content);
    this.editSummaryTags.set(summary.tags.join(', '));
    this.showSummaryDetail.set(true);
  }
  closeSummaryDetail() {
    this.showSummaryDetail.set(false);
    this.selectedSummary.set(null);
  }
  saveSummaryDetail() {
    const s = this.selectedSummary();
    if (!s) return;
    const tags = this.editSummaryTags().split(',').map(t => t.trim()).filter(t => t);
    this.researchService.updateSummary(s.id, {
      title: this.editSummaryTitle(),
      content: this.editSummaryContent(),
      tags,
    });
    this.closeSummaryDetail();
  }
  onSummaryRowClick(row: EnvTableRow) {
    const summary = this.researchService.summaries().find(s => s.id === row['id']);
    if (summary) this.openSummaryDetail(summary);
  }

  // ── Quick URL capture (Change 7) ──────────────────────────────────────────
  async quickCaptureSource() {
    const url = this.quickUrl().trim();
    if (!url || this.quickCapturing()) return;
    try { new URL(url); } catch { return; } // must be valid URL
    this.quickCapturing.set(true);
    const tempTitle = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const collectionId = this.selectedCollection()?.id;
    this.researchService.addSource({
      collectionId, title: tempTitle, url,
      sourceType: 'WEB', tags: [],
    });
    this.quickUrl.set('');
    // Background metadata fetch to update the title
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status === 'success') {
        const added = this.researchService.sources().find(s => s.url === url);
        if (added && json.data?.title) {
          this.researchService.updateSource(added.id, {
            title: json.data.title,
            description: json.data.description ?? '',
            author: typeof json.data.author === 'string' ? json.data.author : (json.data.publisher ?? ''),
          });
        }
      }
    } catch { /* silently fail */ }
    this.quickCapturing.set(false);
  }

  onQuickUrlPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.startsWith('http://') || text.startsWith('https://')) {
      setTimeout(() => this.quickCaptureSource(), 50);
    }
  }

  // ── Bulk move to collection (Change 8) ────────────────────────────────────
  openBulkMove(ids: string[]) {
    this.pendingMoveIds.set(ids);
    this.bulkMoveTargetId.set('');
    this.showBulkMove.set(true);
  }

  confirmBulkMove() {
    const targetId = this.bulkMoveTargetId();
    const collectionId = targetId || undefined;
    this.pendingMoveIds().forEach(id =>
      this.researchService.updateSource(id, { collectionId })
    );
    this.showBulkMove.set(false);
    this.pendingMoveIds.set([]);
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading() || !this.aiService.aiEnabled()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    try {
      const lib = this.selectedCollection();
      const srcs = lib ? this.researchService.getSourcesByCollection(lib.id) : this.researchService.collections().flatMap(l => this.researchService.getSourcesByCollection(l.id));
      const sourceList = srcs.map(s =>
        `- ${s.title} [${s.sourceType}]${s.author ? `, by ${s.author}` : ''}${s.description ? `: ${s.description}` : ''}`
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
      const crossCtx = await this.contextService.buildContext(text);
      const fullContext = crossCtx.blocks.length ? `${context}\n\n--- Cross-module context ---\n${crossCtx.formatted}` : context;
      const response = await this.aiService.sendMessage(text, fullContext);
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
        // Clear raw chunks immediately — the compiled Blob is all we need
        this.audioChunks = [];
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
    const uploaded = await this.fileStorage.uploadMany([file], { type: 'direct', id: 'knowledge' }, this.resolveUploadCollectionId());
    this.discardRecording();
    this.closeAddModal();
    this.createSourcesFromFiles(uploaded);
  }

  openAudioFileInput() {
    const collectionId = this.resolveUploadCollectionId();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) {
        this.closeAddModal();
        const uploaded = await this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, collectionId);
        this.createSourcesFromFiles(uploaded);
      }
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
  async onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) {
      const uploaded = await this.fileStorage.uploadMany(files, { type: 'direct', id: 'knowledge' }, this.resolveUploadCollectionId());
      this.createSourcesFromFiles(uploaded);
    }
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
