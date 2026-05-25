import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchCollection, ResearchSource } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage, FeatureSidebarComponent } from '@envello/ui';

type ViewMode = 'sources' | 'summaries';

const SOURCE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  WEB:       { label: 'Web',       icon: 'language',       color: '#3b82f6' },
  PDF:       { label: 'PDF',       icon: 'picture_as_pdf', color: '#ef4444' },
  VIDEO:     { label: 'Video',     icon: 'smart_display',  color: '#a855f7' },
  INTERVIEW: { label: 'Interview', icon: 'mic',            color: '#10b981' },
  PHYSICAL:  { label: 'Physical',  icon: 'menu_book',      color: '#f59e0b' },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  UNREAD:    { label: 'Unread',    color: '#f87171' },
  READING:   { label: 'Reading',   color: '#facc15' },
  PROCESSED: { label: 'Processed', color: '#4ade80' },
};

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, FeatureSidebarComponent],
  templateUrl: './knowledge.component.html',
  styleUrl: './knowledge.component.css'
})
export class KnowledgeComponent {
  researchService = inject(ResearchService);

  // ── View state ────────────────────────────────────────────────────────────
  viewMode        = signal<ViewMode>('sources');
  selectedCollection = signal<ResearchCollection | null>(null);

  // ── Filter & Search ───────────────────────────────────────────────────────
  searchQuery  = signal('');
  filterStatus = signal<'ALL' | 'UNREAD' | 'READING' | 'PROCESSED'>('ALL');
  filterType   = signal<'ALL' | 'WEB' | 'PDF' | 'VIDEO' | 'INTERVIEW' | 'PHYSICAL'>('ALL');

  // ── Modals ────────────────────────────────────────────────────────────────
  showCollectionModal    = signal(false);
  showSourceModal     = signal(false);
  showSummaryModal    = signal(false);
  showSourceDetail    = signal(false);
  selectedSource      = signal<ResearchSource | null>(null);
  showDeleteCollection   = signal(false);
  showDeleteSource    = signal(false);
  collectionToDelete     = signal<ResearchCollection | null>(null);
  sourceToDelete      = signal<ResearchSource | null>(null);

  // ── Collection form ───────────────────────────────────────────────────────
  newCollectionName  = signal('');
  newCollectionDesc  = signal('');
  newCollectionColor = signal('#8b5cf6');

  readonly collectionColors = ['#8b5cf6','#f97316','#10b981','#3b82f6','#ec4899','#f59e0b','#06b6d4','#ef4444'];

  // ── Source form ───────────────────────────────────────────────────────────
  newSourceTitle  = signal('');
  newSourceUrl    = signal('');
  newSourceType   = signal<ResearchSource['sourceType']>('WEB');
  newSourceTags   = signal('');
  newSourceDesc   = signal('');
  newSourceAuthor = signal('');

  // ── Summary form ──────────────────────────────────────────────────────────
  newSummaryTitle   = signal('');
  newSummaryContent = signal('');
  newSummaryTags    = signal('');
  selectedSourceIds = signal<string[]>([]);

  // ── Source detail ─────────────────────────────────────────────────────────
  editNotes        = signal('');
  aiSourceAnalysis = signal('');

  // ── AI Assistant ──────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'How many sources are in this collection?',
    'Show unread sources',
    'Which sources have been processed?',
    'Summarise the collection topics',
    'Show all web sources',
  ];

  // ── Static data ───────────────────────────────────────────────────────────
  readonly sourceTypeOptions = Object.entries(SOURCE_TYPE_META).map(([id, m]) => ({ id, ...m }));

  // ── Data ──────────────────────────────────────────────────────────────────
  libraries = this.researchService.collections;

  filteredLibraries = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.libraries();
    return this.libraries().filter(lib =>
      lib.name.toLowerCase().includes(q) || (lib.description ?? '').toLowerCase().includes(q)
    );
  });

  sources = computed(() => {
    const lib = this.selectedCollection();
    return lib ? this.researchService.getSourcesByCollection(lib.id) : [];
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
    return list;
  });

  sourceStats = computed(() => {
    const list = this.sources();
    return {
      total:     list.length,
      unread:    list.filter(s => s.status === 'UNREAD').length,
      reading:   list.filter(s => s.status === 'READING').length,
      processed: list.filter(s => s.status === 'PROCESSED').length,
    };
  });

  totalSources = computed(() => this.libraries().reduce((acc, lib) => acc + this.researchService.getSourcesByCollection(lib.id).length, 0));

  hasActiveFilters = computed(() => !!this.searchQuery() || this.filterStatus() !== 'ALL' || this.filterType() !== 'ALL');

  // ── Helpers ───────────────────────────────────────────────────────────────
  getSourceTypeMeta(type: string) { return SOURCE_TYPE_META[type] ?? SOURCE_TYPE_META['WEB']; }
  getStatusMeta(status: string)   { return STATUS_META[status] ?? STATUS_META['UNREAD']; }

  formatSourceMeta(source: ResearchSource): string {
    const parts: string[] = [this.getSourceTypeMeta(source.sourceType).label];
    if (source.author) parts.push(source.author);
    const date = source.lastAccessed || source.createdDate;
    if (date) parts.push(new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    return parts.join(' · ');
  }

  // ── Collection actions ────────────────────────────────────────────────────
  openCollectionModal() {
    this.newCollectionName.set(''); this.newCollectionDesc.set(''); this.newCollectionColor.set('#8b5cf6');
    this.showCollectionModal.set(true);
  }
  closeCollectionModal() { this.showCollectionModal.set(false); }

  saveCollection() {
    if (!this.newCollectionName()) return;
    this.researchService.addCollection({ name: this.newCollectionName(), description: this.newCollectionDesc(), color: this.newCollectionColor() });
    this.closeCollectionModal();
  }

  selectCollection(collection: ResearchCollection) {
    this.selectedCollection.set(collection);
    this.viewMode.set('sources');
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterType.set('ALL');
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
  openSourceModal() {
    this.newSourceTitle.set(''); this.newSourceUrl.set(''); this.newSourceType.set('WEB');
    this.newSourceTags.set(''); this.newSourceDesc.set(''); this.newSourceAuthor.set('');
    this.showSourceModal.set(true);
  }
  closeSourceModal() { this.showSourceModal.set(false); }

  saveSource() {
    const lib = this.selectedCollection();
    if (!this.newSourceTitle() || !lib) return;
    this.researchService.addSource({
      collectionId: lib.id, title: this.newSourceTitle(), url: this.newSourceUrl(),
      sourceType: this.newSourceType(),
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      description: this.newSourceDesc(), author: this.newSourceAuthor(), status: 'UNREAD',
    });
    this.closeSourceModal();
  }

  openSourceDetail(source: ResearchSource) {
    this.selectedSource.set(source);
    this.editNotes.set(source.notes || '');
    this.aiSourceAnalysis.set('');
    this.showSourceDetail.set(true);
  }
  closeSourceDetail() { this.showSourceDetail.set(false); this.selectedSource.set(null); }

  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED') {
    const s = this.selectedSource();
    if (s) {
      this.researchService.updateSource(s.id, { status });
      this.selectedSource.update(cur => cur ? { ...cur, status } : null);
    }
  }

  saveNotes() {
    const s = this.selectedSource();
    if (s) this.researchService.updateSource(s.id, { notes: this.editNotes() });
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
    this.showSummaryModal.set(true);
  }
  closeSummaryModal() { this.showSummaryModal.set(false); }

  saveSummary() {
    const lib = this.selectedCollection();
    if (!this.newSummaryTitle() || !lib) return;
    this.researchService.addSummary({
      collectionId: lib.id, title: this.newSummaryTitle(), content: this.newSummaryContent(),
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
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    const lib = this.selectedCollection();
    const srcs = lib ? this.researchService.getSourcesByCollection(lib.id) : [];
    const q = text.toLowerCase();
    let response = '';
    if (q.includes('how many') || q.includes('count')) {
      response = `Collection **${lib?.name ?? 'N/A'}** has **${srcs.length}** source${srcs.length !== 1 ? 's' : ''}.\nUnread: ${srcs.filter(s => s.status === 'UNREAD').length} · Reading: ${srcs.filter(s => s.status === 'READING').length} · Processed: ${srcs.filter(s => s.status === 'PROCESSED').length}`;
    } else if (q.includes('unread')) {
      const u = srcs.filter(s => s.status === 'UNREAD');
      response = u.length ? `**${u.length}** unread:\n${u.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}` : 'No unread sources.';
    } else if (q.includes('processed')) {
      const p = srcs.filter(s => s.status === 'PROCESSED');
      response = p.length ? `**${p.length}** processed:\n${p.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}` : 'No processed sources yet.';
    } else if (q.includes('web')) {
      const w = srcs.filter(s => s.sourceType === 'WEB');
      response = w.length ? `**${w.length}** web source${w.length !== 1 ? 's' : ''}:\n${w.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}` : 'No web sources.';
    } else {
      response = `Collection has ${srcs.length} sources. Ask about unread, processed, web sources, or request a summary.`;
    }
    this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    this.aiLoading.set(false);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showSourceDetail())   this.closeSourceDetail();
      else if (this.showSummaryModal())  this.closeSummaryModal();
      else if (this.showSourceModal())   this.closeSourceModal();
      else if (this.showCollectionModal())  this.closeCollectionModal();
      else if (this.showDeleteSource())  this.cancelDeleteSource();
      else if (this.showDeleteCollection()) this.cancelDeleteCollection();
    }
  }
}
