import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchLibrary, ResearchSource, ResearchSummary } from '@envello/core';
import { ButtonComponent, ModalComponent, EmptyStateComponent, IconButtonComponent } from '@envello/ui';

type ViewMode = 'libraries' | 'sources' | 'summaries';

interface ResearchPlan {
  topic: string;
  overview: string;
  phases: Array<{
    name: string;
    duration: string;
    objectives: string[];
  }>;
  suggestedSources: Array<{
    title: string;
    type: string;
    priority: 'High' | 'Medium' | 'Low';
    rationale: string;
  }>;
  milestones: Array<{
    name: string;
    deadline: string;
    deliverables: string[];
  }>;
  estimatedTimeframe: string;
}

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent, EmptyStateComponent, IconButtonComponent],
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
  
  // Delete Modals
  showDeleteLibraryModal = signal(false);
  showDeleteSourceModal = signal(false);
  libraryToDelete = signal<ResearchLibrary | null>(null);
  sourceToDelete = signal<ResearchSource | null>(null);

  // Filter & Search
  searchQuery = signal('');
  filterStatus = signal<'ALL' | 'UNREAD' | 'READING' | 'PROCESSED'>('ALL');
  filterType = signal<'ALL' | 'WEB' | 'PDF' | 'VIDEO' | 'INTERVIEW' | 'PHYSICAL'>('ALL');

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
  showAIPanel = signal(true);
  aiLoading = signal(false);
  aiSuggestions = signal<string[]>([]);
  aiTopics = signal<string[]>([]);
  aiSourceAnalysis = signal('');
  showTopicDiscovery = signal(false);
  discoveredTopics = signal<Array<{ topic: string; relevance: number; sources: number }>>([]);

  // Research Plan Generator
  showResearchPlanModal = signal(false);
  researchPlanTopic = signal('');
  generatedPlan = signal<ResearchPlan | null>(null);


  // Editing
  editNotes = signal('');

  // Data
  libraries = this.researchService.libraries;

  filteredLibraries = computed(() => {
    const list = this.libraries();
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(lib =>
      lib.name.toLowerCase().includes(q) ||
      (lib.description ?? '').toLowerCase().includes(q)
    );
  });

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
    this.libraryToDelete.set(library);
    this.showDeleteLibraryModal.set(true);
  }

  confirmDeleteLibrary() {
    const library = this.libraryToDelete();
    if (library) {
      this.researchService.deleteLibrary(library.id);
      if (this.selectedLibrary()?.id === library.id) {
        this.backToLibraries();
      }
      this.showDeleteLibraryModal.set(false);
      this.libraryToDelete.set(null);
    }
  }

  cancelDeleteLibrary() {
    this.showDeleteLibraryModal.set(false);
    this.libraryToDelete.set(null);
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
    if (current) {
      this.sourceToDelete.set(current);
      this.showDeleteSourceModal.set(true);
    }
  }

  confirmDeleteSource() {
    const source = this.sourceToDelete();
    if (source) {
      this.researchService.deleteSource(source.id);
      if (this.selectedSource()?.id === source.id) {
        this.closeSourceDetail();
      }
      this.showDeleteSourceModal.set(false);
      this.sourceToDelete.set(null);
    }
  }

  cancelDeleteSource() {
    this.showDeleteSourceModal.set(false);
    this.sourceToDelete.set(null);
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

  getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
    switch (status) {
      case 'PROCESSED': return 'success';
      case 'READING': return 'warning';
      case 'UNREAD': return 'error';
      default: return 'default';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PROCESSED': return 'status-processed';
      case 'READING': return 'status-reading';
      case 'UNREAD': return 'status-unread';
      default: return 'status-default';
    }
  }

  getStatClass(stat: string): string {
    switch (stat) {
      case 'unread': return 'stat-unread';
      case 'reading': return 'stat-reading';
      case 'processed': return 'stat-processed';
      default: return 'stat-default';
    }
  }

  getPriorityVariant(priority: string): 'default' | 'success' | 'warning' | 'error' {
    switch (priority?.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
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

  getSourceTypeLabel(type: string): string {
    switch (type) {
      case 'WEB': return 'Web';
      case 'PDF': return 'PDF';
      case 'VIDEO': return 'Video';
      case 'INTERVIEW': return 'Interview';
      case 'PHYSICAL': return 'Physical';
      default: return type || 'Source';
    }
  }

  formatSourceMeta(source: ResearchSource): string {
    const parts: string[] = [this.getSourceTypeLabel(source.sourceType)];
    if (source.author) parts.push(source.author);
    const date = source.lastAccessed || source.createdDate;
    if (date) parts.push(new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    return parts.join(' · ');
  }

  // AI Features
  toggleAIPanel() {
    this.showAIPanel.update(v => !v);
  }

  async discoverTopics() {
    this.showTopicDiscovery.set(true);
    this.aiLoading.set(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    this.discoveredTopics.set([]);
    this.aiLoading.set(false);
  }

  async analyzeSource(_source: ResearchSource) {
    this.aiLoading.set(true);
    this.aiSourceAnalysis.set('');
    await new Promise(resolve => setTimeout(resolve, 200));
    this.aiSourceAnalysis.set('AI is not configured. Connect an AI provider to analyze sources.');
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
    await new Promise(resolve => setTimeout(resolve, 200));
    alert('AI is not configured. Connect an AI provider to generate summaries.');
    this.aiLoading.set(false);
  }

  async suggestSources() {
    const lib = this.selectedLibrary();
    if (!lib) return;
    this.aiLoading.set(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    this.aiSuggestions.set([]);
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

  // Research Plan Generator
  openResearchPlanModal() {
    this.researchPlanTopic.set('');
    this.generatedPlan.set(null);
    this.showResearchPlanModal.set(true);
  }

  closeResearchPlanModal() {
    this.showResearchPlanModal.set(false);
    this.generatedPlan.set(null);
  }

  async generateResearchPlan() {
    const topic = this.researchPlanTopic();
    if (!topic) {
      alert('Please enter a research topic');
      return;
    }
    this.aiLoading.set(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    this.generatedPlan.set(null);
    alert('AI is not configured. Connect an AI provider to generate research plans.');
    this.aiLoading.set(false);
  }

  async implementResearchPlan() {
    const plan = this.generatedPlan();
    const lib = this.selectedLibrary();

    if (!plan || !lib) return;

    this.aiLoading.set(true);

    // Create library if needed or use existing
    let targetLibrary = lib;

    // Add suggested sources to the library
    for (const source of plan.suggestedSources) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate adding sources

      this.researchService.addSource({
        libraryId: targetLibrary.id,
        title: source.title,
        sourceType: source.type as ResearchSource['sourceType'],
        tags: [plan.topic, source.priority, 'Research Plan'],
        description: source.rationale,
        status: 'UNREAD'
      });
    }

    // Create a summary with the research plan
    this.researchService.addSummary({
      libraryId: targetLibrary.id,
      title: `Research Plan: ${plan.topic}`,
      content: this.formatPlanAsSummary(plan),
      sourceIds: [],
      tags: ['Research Plan', plan.topic, 'Roadmap']
    });

    this.aiLoading.set(false);
    this.closeResearchPlanModal();

    // Switch to sources view to show added sources
    this.viewMode.set('sources');
  }

  private formatPlanAsSummary(plan: ResearchPlan): string {
    let summary = `# Research Plan: ${plan.topic}\n\n`;
    summary += `## Overview\n${plan.overview}\n\n`;
    summary += `**Estimated Timeframe:** ${plan.estimatedTimeframe}\n\n`;

    summary += `## Research Phases\n\n`;
    plan.phases.forEach((phase, idx) => {
      summary += `### ${phase.name} (${phase.duration})\n`;
      phase.objectives.forEach(obj => {
        summary += `- ${obj}\n`;
      });
      summary += '\n';
    });

    summary += `## Milestones\n\n`;
    plan.milestones.forEach(milestone => {
      summary += `### ${milestone.name} - ${milestone.deadline}\n`;
      milestone.deliverables.forEach(del => {
        summary += `- ${del}\n`;
      });
      summary += '\n';
    });

    summary += `## Suggested Sources (${plan.suggestedSources.length})\n\n`;
    plan.suggestedSources.forEach(source => {
      summary += `**${source.title}** [${source.priority} Priority]\n`;
      summary += `- Type: ${source.type}\n`;
      summary += `- Rationale: ${source.rationale}\n\n`;
    });

    return summary;
  }
}
