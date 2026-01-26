import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchLibrary, ResearchSource, ResearchSummary } from '../../services/research.service';

type ViewMode = 'libraries' | 'sources' | 'summaries';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './research.component.html',
  styleUrl: './research.component.css'
})
export class ResearchComponent {
  researchService = inject(ResearchService);

  // UI State
  viewMode = signal<ViewMode>('libraries');
  selectedLibrary = signal<ResearchLibrary | null>(null);

  // Modals
  showLibraryModal = signal(false);
  showSourceModal = signal(false);
  showSummaryModal = signal(false);
  showSourceDetailPanel = signal(false);
  selectedSource = signal<ResearchSource | null>(null);

  // Filter & Search
  searchQuery = signal('');
  filterStatus = signal<'ALL' | 'UNREAD' | 'READING' | 'PROCESSED'>('ALL');
  filterType = signal<'ALL' | 'WEB' | 'PDF' | 'INTERVIEW'>('ALL');

  // Form inputs - Library
  newLibraryName = signal('');
  newLibraryDesc = signal('');
  newLibraryColor = signal('#8b5cf6');

  // Form inputs - Source
  newSourceTitle = signal('');
  newSourceUrl = signal('');
  newSourceType = signal<ResearchSource['sourceType']>('WEB');
  newSourceTags = signal('');
  newSourceDesc = signal('');
  newSourceAuthor = signal('');

  // Form inputs - Summary
  newSummaryTitle = signal('');
  newSummaryContent = signal('');
  newSummaryTags = signal('');
  selectedSourceIds = signal<string[]>([]);

  // Editing
  editNotes = signal('');

  // Data
  libraries = this.researchService.libraries;
  sources = computed(() => {
    const lib = this.selectedLibrary();
    if (!lib) return [];
    return this.researchService.getSourcesByLibrary(lib.id);
  });
  summaries = computed(() => {
    const lib = this.selectedLibrary();
    if (!lib) return [];
    return this.researchService.getSummariesByLibrary(lib.id);
  });

  filteredSources = computed(() => {
    let list = this.sources();
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    const type = this.filterType();

    if (query) {
      list = list.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query)) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    if (status !== 'ALL') {
      list = list.filter(s => s.status === status);
    }

    if (type !== 'ALL') {
      list = list.filter(s => s.sourceType === type);
    }

    return list;
  });

  // Stats
  sourceStats = computed(() => {
    const list = this.sources();
    return {
      total: list.length,
      unread: list.filter(s => s.status === 'UNREAD').length,
      reading: list.filter(s => s.status === 'READING').length,
      processed: list.filter(s => s.status === 'PROCESSED').length
    };
  });

  // Library actions
  openLibraryModal() {
    this.newLibraryName.set('');
    this.newLibraryDesc.set('');
    this.newLibraryColor.set('#8b5cf6');
    this.showLibraryModal.set(true);
  }

  closeLibraryModal() {
    this.showLibraryModal.set(false);
  }

  saveLibrary() {
    if (!this.newLibraryName()) return;
    this.researchService.addLibrary({
      name: this.newLibraryName(),
      description: this.newLibraryDesc(),
      color: this.newLibraryColor()
    });
    this.closeLibraryModal();
  }

  selectLibrary(library: ResearchLibrary) {
    this.selectedLibrary.set(library);
    this.viewMode.set('sources');
  }

  backToLibraries() {
    this.selectedLibrary.set(null);
    this.viewMode.set('libraries');
  }

  deleteLibrary(library: ResearchLibrary, event: Event) {
    event.stopPropagation();
    if (confirm(`Delete library "${library.name}" and all its sources?`)) {
      this.researchService.deleteLibrary(library.id);
      if (this.selectedLibrary()?.id === library.id) {
        this.backToLibraries();
      }
    }
  }

  // Source actions
  openSourceModal() {
    this.newSourceTitle.set('');
    this.newSourceUrl.set('');
    this.newSourceType.set('WEB');
    this.newSourceTags.set('');
    this.newSourceDesc.set('');
    this.newSourceAuthor.set('');
    this.showSourceModal.set(true);
  }

  closeSourceModal() {
    this.showSourceModal.set(false);
  }

  saveSource() {
    const lib = this.selectedLibrary();
    if (!this.newSourceTitle() || !lib) return;

    this.researchService.addSource({
      libraryId: lib.id,
      title: this.newSourceTitle(),
      url: this.newSourceUrl(),
      sourceType: this.newSourceType(),
      tags: this.newSourceTags().split(',').map(t => t.trim()).filter(t => t),
      description: this.newSourceDesc(),
      author: this.newSourceAuthor(),
      status: 'UNREAD'
    });

    this.closeSourceModal();
  }

  openSourceDetail(source: ResearchSource) {
    this.selectedSource.set(source);
    this.editNotes.set(source.notes || '');
    this.showSourceDetailPanel.set(true);
  }

  closeSourceDetail() {
    this.showSourceDetailPanel.set(false);
    this.selectedSource.set(null);
  }

  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED') {
    const current = this.selectedSource();
    if (current) {
      this.researchService.updateSource(current.id, { status });
      this.selectedSource.update(s => s ? { ...s, status } : null);
    }
  }

  saveNotes() {
    const current = this.selectedSource();
    if (current) {
      this.researchService.updateSource(current.id, { notes: this.editNotes() });
    }
  }

  deleteCurrentSource() {
    const current = this.selectedSource();
    if (current && confirm('Delete this source?')) {
      this.researchService.deleteSource(current.id);
      this.closeSourceDetail();
    }
  }

  // Summary actions
  openSummaryModal() {
    this.newSummaryTitle.set('');
    this.newSummaryContent.set('');
    this.newSummaryTags.set('');
    this.selectedSourceIds.set([]);
    this.showSummaryModal.set(true);
  }

  closeSummaryModal() {
    this.showSummaryModal.set(false);
  }

  saveSummary() {
    const lib = this.selectedLibrary();
    if (!this.newSummaryTitle() || !lib) return;

    this.researchService.addSummary({
      libraryId: lib.id,
      title: this.newSummaryTitle(),
      content: this.newSummaryContent(),
      sourceIds: this.selectedSourceIds(),
      tags: this.newSummaryTags().split(',').map(t => t.trim()).filter(t => t)
    });

    this.closeSummaryModal();
  }

  toggleSourceSelection(sourceId: string) {
    this.selectedSourceIds.update(ids => {
      if (ids.includes(sourceId)) {
        return ids.filter(id => id !== sourceId);
      } else {
        return [...ids, sourceId];
      }
    });
  }

  isSourceSelected(sourceId: string): boolean {
    return this.selectedSourceIds().includes(sourceId);
  }

  // View switching
  showSources() {
    this.viewMode.set('sources');
  }

  showSummaries() {
    this.viewMode.set('summaries');
  }

  // Helpers
  getStatusColor(status: string) {
    switch (status) {
      case 'PROCESSED': return '#4ade80';
      case 'READING': return '#facc15';
      case 'UNREAD': return '#f87171';
      default: return '#9ca3af';
    }
  }

  getSourceIcon(type: string) {
    switch (type) {
      case 'WEB': return 'language';
      case 'PDF': return 'picture_as_pdf';
      case 'VIDEO': return 'smart_display';
      case 'INTERVIEW': return 'mic';
      case 'PHYSICAL': return 'menu_book';
      default: return 'article';
    }
  }
}
