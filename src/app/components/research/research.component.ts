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

  // AI Features
  showAIPanel = signal(false);
  aiLoading = signal(false);
  aiSuggestions = signal<string[]>([]);
  aiTopics = signal<string[]>([]);
  aiSourceAnalysis = signal('');
  showTopicDiscovery = signal(false);
  discoveredTopics = signal<Array<{ topic: string; relevance: number; sources: number }>>([]);


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

  // AI Features
  toggleAIPanel() {
    this.showAIPanel.update(v => !v);
  }

  async discoverTopics() {
    this.showTopicDiscovery.set(true);
    this.aiLoading.set(true);

    // Simulate AI topic discovery
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockTopics = [
      { topic: 'Victorian Architecture', relevance: 95, sources: 3 },
      { topic: 'Urban Planning', relevance: 87, sources: 2 },
      { topic: 'Industrial Revolution', relevance: 78, sources: 2 },
      { topic: 'Steam Technology', relevance: 72, sources: 1 },
      { topic: 'Social History', relevance: 65, sources: 1 }
    ];

    this.discoveredTopics.set(mockTopics);
    this.aiLoading.set(false);
  }

  async analyzeSource(source: ResearchSource) {
    this.aiLoading.set(true);
    this.aiSourceAnalysis.set('');

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1200));

    const analysis = `**Key Insights:**
• This source provides comprehensive coverage of ${source.title.toLowerCase()}
• Highly relevant to your research on ${source.tags[0] || 'this topic'}
• Contains valuable primary source material
• Recommended reading priority: ${source.status === 'UNREAD' ? 'High' : 'Medium'}

**Main Themes:**
- Historical context and background
- Technical specifications and details
- Cultural and social implications

**Suggested Actions:**
- Cross-reference with sources on ${source.tags[1] || 'related topics'}
- Extract key quotes for summary
- Note contradictions with other sources`;

    this.aiSourceAnalysis.set(analysis);
    this.aiLoading.set(false);
  }

  async generateAutoSummary() {
    const selectedSources = this.sources().filter(s =>
      this.selectedSourceIds().includes(s.id)
    );

    if (selectedSources.length === 0) {
      alert('Please select at least one source to generate a summary');
      return;
    }

    this.aiLoading.set(true);

    // Simulate AI summary generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sourceTitles = selectedSources.map(s => s.title).join(', ');
    const commonTags = this.findCommonTags(selectedSources);

    const autoSummary = `Based on analysis of ${selectedSources.length} sources (${sourceTitles}), this research reveals several key findings:

**Overview:**
The selected sources provide comprehensive coverage of ${commonTags[0] || 'the research topic'}, with particular emphasis on historical context and contemporary applications.

**Key Findings:**
1. Primary evidence suggests significant developments in the field
2. Multiple sources corroborate the importance of ${commonTags[1] || 'key themes'}
3. Emerging patterns indicate future research directions

**Synthesis:**
The integration of these sources reveals a coherent narrative about ${commonTags[0] || 'the subject matter'}, highlighting both consensus and areas of ongoing debate.

**Recommendations:**
- Further investigation into ${commonTags[2] || 'related topics'}
- Cross-reference with additional primary sources
- Consider contemporary applications of historical findings`;

    this.newSummaryContent.set(autoSummary);
    this.newSummaryTitle.set(`AI Summary: ${commonTags[0] || 'Research Findings'}`);
    this.newSummaryTags.set(commonTags.join(', '));

    this.aiLoading.set(false);
  }

  async suggestSources() {
    const lib = this.selectedLibrary();
    if (!lib) return;

    this.aiLoading.set(true);

    // Simulate AI source suggestions
    await new Promise(resolve => setTimeout(resolve, 1500));

    const suggestions = [
      'Victorian London: A Historical Atlas (British Library)',
      'The Industrial Revolution in Britain (Cambridge Press)',
      'Urban Development in 19th Century Europe (Oxford)',
      'Steam Power and Society (MIT Press)',
      'Architecture and Social Change (Yale)'
    ];

    this.aiSuggestions.set(suggestions);
    this.aiLoading.set(false);
  }

  private findCommonTags(sources: ResearchSource[]): string[] {
    const tagCounts = new Map<string, number>();

    sources.forEach(source => {
      source.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  }

  addSuggestedSource(suggestion: string) {
    this.newSourceTitle.set(suggestion);
    this.newSourceType.set('WEB');
    this.openSourceModal();
    this.aiSuggestions.set([]);
  }

  closeTopicDiscovery() {
    this.showTopicDiscovery.set(false);
    this.discoveredTopics.set([]);
  }

  searchByTopic(topic: string) {
    this.searchQuery.set(topic);
    this.closeTopicDiscovery();
  }
}
