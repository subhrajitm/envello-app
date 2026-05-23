import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchLibrary, ResearchSource, ResearchSummary, FileLibraryService, LibraryFile, AiService, StoreService } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage, ConfirmDialogComponent, FeatureSidebarComponent } from '@envello/ui';

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

const STATUS_META: Record<string, { label: string; color: string }> = {
  UNREAD:    { label: 'Unread',    color: '#f87171' },
  READING:   { label: 'Reading',   color: '#facc15' },
  PROCESSED: { label: 'Processed', color: '#4ade80' },
};

const STATUS_CYCLE: Record<string, ResearchSource['status']> = {
  UNREAD: 'READING', READING: 'PROCESSED', PROCESSED: 'UNREAD',
};

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, ConfirmDialogComponent, FeatureSidebarComponent],
  templateUrl: './knowledge.component.html',
  styleUrl: './knowledge.component.css'
})
export class KnowledgeComponent {
  researchService = inject(ResearchService);
  fileLibrary     = inject(FileLibraryService);
  store           = inject(StoreService);
  private aiService = inject(AiService);

  // ── View state ────────────────────────────────────────────────────────────
  viewMode        = signal<ViewMode>('sources');
  selectedLibrary = signal<ResearchLibrary | null>(null);

  // ── Files ─────────────────────────────────────────────────────────────────
  fileFilterType = signal<'all' | 'image' | 'document' | 'video' | 'audio'>('all');
  isDraggingOver   = signal(false);
  fileToDelete     = signal<LibraryFile | null>(null);
  showDeleteFile   = signal(false);

  filteredFiles = computed(() => {
    let list = this.fileLibrary.files();
    const selectedLib = this.selectedLibrary();
    if (selectedLib) list = list.filter(f => f.libraryId === selectedLib.id);
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

  // ── Bulk actions (feature 3) ──────────────────────────────────────────────
  bulkSelected   = signal<string[]>([]);
  showBulkDelete = signal(false);

  // ── Modals ────────────────────────────────────────────────────────────────
  showLibraryModal    = signal(false);
  showAddModal        = signal(false);
  addTab              = signal<'url' | 'file' | 'note'>('url');
  addNoteContent      = signal('');
  showSummaryModal    = signal(false);
  showSourceDetail    = signal(false);
  selectedSource      = signal<ResearchSource | null>(null);
  showDeleteLibrary   = signal(false);
  showDeleteSource    = signal(false);
  libraryToDelete     = signal<ResearchLibrary | null>(null);
  sourceToDelete      = signal<ResearchSource | null>(null);

  // ── Library form ──────────────────────────────────────────────────────────
  newLibraryName  = signal('');
  newLibraryDesc  = signal('');
  newLibraryColor = signal('#8b5cf6');

  readonly libraryColors = ['#8b5cf6','#f97316','#10b981','#3b82f6','#ec4899','#f59e0b','#06b6d4','#ef4444'];

  // ── Source form ───────────────────────────────────────────────────────────
  newSourceTitle     = signal('');
  newSourceUrl       = signal('');
  newSourceType      = signal<ResearchSource['sourceType']>('WEB');
  newSourceTags      = signal('');
  newSourceDesc      = signal('');
  newSourceAuthor    = signal('');
  newSourceLibraryId = signal('');   // optional — for add-from-all-sources
  fetchingMeta       = signal(false);
  suggestingTags     = signal(false);

  // ── Summary form ──────────────────────────────────────────────────────────
  newSummaryTitle   = signal('');
  newSummaryContent = signal('');
  newSummaryTags    = signal('');
  selectedSourceIds = signal<string[]>([]);

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

  // ── Data ──────────────────────────────────────────────────────────────────
  libraries = this.researchService.libraries;

  sources = computed(() => {
    const lib = this.selectedLibrary();
    // When a library is selected, show only its sources; otherwise show all
    return lib ? this.researchService.getSourcesByLibrary(lib.id) : this.researchService.sources();
  });

  summaries = computed(() => {
    const lib = this.selectedLibrary();
    return lib ? this.researchService.getSummariesByLibrary(lib.id) : [];
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

  librarySourceCounts = computed(() => {
    const map = new Map<string, number>();
    for (const lib of this.libraries()) {
      map.set(lib.id, this.researchService.getSourcesByLibrary(lib.id).length);
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

  libraryFiles = computed(() => {
    const lib = this.selectedLibrary();
    if (!lib) return this.fileLibrary.files();
    return this.fileLibrary.files().filter(f => f.libraryId === lib.id);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  getSourceTypeMeta(type: string)  { return SOURCE_TYPE_META[type] ?? SOURCE_TYPE_META['WEB']; }
  getStatusMeta(status: string)    { return STATUS_META[status] ?? STATUS_META['UNREAD']; }
  getLibraryForSource(s: ResearchSource) { return s.libraryId ? this.libraries().find(l => l.id === s.libraryId) : undefined; }

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

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  toggleSort(field: SortField) {
    if (this.sortField() === field) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortField.set(field); this.sortDir.set('asc'); }
  }

  isBulkSelected(id: string) { return this.bulkSelected().includes(id); }
  isBulkMode()               { return this.bulkSelected().length > 0; }

  // ── Library actions ───────────────────────────────────────────────────────
  openLibraryModal() {
    this.newLibraryName.set(''); this.newLibraryDesc.set(''); this.newLibraryColor.set('#8b5cf6');
    this.showLibraryModal.set(true);
  }
  closeLibraryModal() { this.showLibraryModal.set(false); }

  saveLibrary() {
    if (!this.newLibraryName()) return;
    this.researchService.addLibrary({ name: this.newLibraryName(), description: this.newLibraryDesc(), color: this.newLibraryColor() });
    this.closeLibraryModal();
  }

  switchView(mode: ViewMode) {
    this.viewMode.set(mode);
    this.searchQuery.set('');
    if (mode !== 'files') this.fileFilterType.set('all');
  }

  selectAllSources() {
    this.selectedLibrary.set(null);
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.bulkSelected.set([]);
  }

  selectLibrary(library: ResearchLibrary) {
    this.selectedLibrary.set(library);
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterType.set('ALL');
    this.bulkSelected.set([]);
  }

  moveSourceToLibrary(sourceId: string, libraryId: string) {
    const libId = libraryId || undefined;
    this.researchService.updateSource(sourceId, { libraryId: libId });
    if (this.selectedSource()?.id === sourceId) {
      this.selectedSource.update(cur => cur ? { ...cur, libraryId: libId } : null);
    }
  }

  openDeleteLibrary(library: ResearchLibrary, e: Event) {
    e.stopPropagation();
    this.libraryToDelete.set(library);
    this.showDeleteLibrary.set(true);
  }
  cancelDeleteLibrary() { this.showDeleteLibrary.set(false); this.libraryToDelete.set(null); }
  confirmDeleteLibrary() {
    const lib = this.libraryToDelete();
    if (lib) {
      this.researchService.deleteLibrary(lib.id);
      if (this.selectedLibrary()?.id === lib.id) this.selectedLibrary.set(null);
      this.cancelDeleteLibrary();
    }
  }

  // ── Source actions ────────────────────────────────────────────────────────
  openAddModal(tab: 'url' | 'file' | 'note' = 'url') {
    this.newSourceTitle.set(''); this.newSourceUrl.set(''); this.newSourceType.set('WEB');
    this.newSourceTags.set(''); this.newSourceDesc.set(''); this.newSourceAuthor.set('');
    this.newSourceLibraryId.set(this.selectedLibrary()?.id ?? '');
    this.addNoteContent.set('');
    this.fetchingMeta.set(false); this.suggestingTags.set(false);
    this.addTab.set(tab);
    this.showAddModal.set(true);
  }
  closeAddModal() { this.showAddModal.set(false); }

  saveSource() {
    if (!this.newSourceTitle()) return;
    const libraryId = this.selectedLibrary()?.id ?? (this.newSourceLibraryId() || undefined);
    this.researchService.addSource({
      libraryId, title: this.newSourceTitle(), url: this.newSourceUrl(),
      sourceType: this.newSourceType(),
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      description: this.newSourceDesc(), author: this.newSourceAuthor(), status: 'UNREAD',
    });
    this.closeAddModal();
  }

  saveNote() {
    if (!this.newSourceTitle()) return;
    const libraryId = this.selectedLibrary()?.id ?? (this.newSourceLibraryId() || undefined);
    this.researchService.addSource({
      libraryId, title: this.newSourceTitle(), sourceType: 'ARTICLE',
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      notes: this.addNoteContent(), status: 'UNREAD',
    });
    this.closeAddModal();
  }

  openFileInputFromModal() {
    const libraryId = this.selectedLibrary()?.id;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) {
        this.fileLibrary.uploadMany(files, { type: 'direct', id: 'library' }, libraryId);
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

  // Feature 2: inline status cycle in table row
  cycleSourceStatus(source: ResearchSource, e: Event) {
    e.stopPropagation();
    const next = STATUS_CYCLE[source.status] ?? 'UNREAD';
    this.researchService.updateSource(source.id, { status: next });
    if (this.selectedSource()?.id === source.id) {
      this.selectedSource.update(cur => cur ? { ...cur, status: next } : null);
    }
  }

  saveNotes() {
    const s = this.selectedSource();
    if (s) this.researchService.updateSource(s.id, { notes: this.editNotes() });
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

  // Feature 3: Bulk actions
  toggleBulkSelect(id: string, e: Event) {
    e.stopPropagation();
    this.bulkSelected.update(sel =>
      sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]
    );
  }

  clearBulkSelect() { this.bulkSelected.set([]); }

  bulkSetStatus(status: ResearchSource['status']) {
    for (const id of this.bulkSelected()) this.researchService.updateSource(id, { status });
    this.clearBulkSelect();
  }

  bulkDeleteConfirm() { this.showBulkDelete.set(true); }
  cancelBulkDelete()  { this.showBulkDelete.set(false); }
  confirmBulkDelete() {
    for (const id of this.bulkSelected()) this.researchService.deleteSource(id);
    this.clearBulkSelect();
    this.showBulkDelete.set(false);
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
    this.showSummaryModal.set(true);
  }
  closeSummaryModal() { this.showSummaryModal.set(false); }

  saveSummary() {
    const lib = this.selectedLibrary();
    if (!this.newSummaryTitle() || !lib) return;
    this.researchService.addSummary({
      libraryId: lib.id, title: this.newSummaryTitle(), content: this.newSummaryContent(),
      sourceIds: this.selectedSourceIds(),
      tags: this.newSummaryTags().split(',').map(t => t.trim()).filter(t => t),
    });
    this.closeSummaryModal();
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
      const lib = this.selectedLibrary();
      const srcs = lib ? this.researchService.getSourcesByLibrary(lib.id) : this.researchService.libraries().flatMap(l => this.researchService.getSourcesByLibrary(l.id));
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

  // ── File actions ──────────────────────────────────────────────────────────
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.fileLibrary.uploadMany(files, { type: 'direct', id: 'library' }, this.selectedLibrary()?.id);
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDraggingOver.set(true); }
  onDragLeave() { this.isDraggingOver.set(false); }

  openFileInput() {
    const libraryId = this.selectedLibrary()?.id;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length) this.fileLibrary.uploadMany(files, { type: 'direct', id: 'library' }, libraryId);
    };
    input.click();
  }

  openDeleteFile(file: LibraryFile) {
    this.fileToDelete.set(file);
    this.showDeleteFile.set(true);
  }
  cancelDeleteFile() { this.showDeleteFile.set(false); this.fileToDelete.set(null); }
  async confirmDeleteFile() {
    const f = this.fileToDelete();
    if (f) {
      await this.fileLibrary.delete(f.id);
      this.cancelDeleteFile();
    }
  }

  async downloadFile(file: LibraryFile) {
    try {
      const url = await this.fileLibrary.getSignedUrl(file.storagePath);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.target = '_blank';
      a.click();
    } catch (e) {
      console.error('[Library] download failed:', e);
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
      else if (this.showLibraryModal()) this.closeLibraryModal();
      else if (this.showDeleteSource()) this.cancelDeleteSource();
      else if (this.showDeleteLibrary()) this.cancelDeleteLibrary();
      else if (this.showDeleteFile())   this.cancelDeleteFile();
      else if (this.showBulkDelete())   this.cancelBulkDelete();
      else if (this.bulkSelected().length) this.clearBulkSelect();
    }
  }
}
