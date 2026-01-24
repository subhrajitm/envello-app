import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResearchService, ResearchEntry } from '../../services/research.service';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './research.component.html',
  styleUrl: './research.component.css'
})
export class ResearchComponent {
  private researchService = inject(ResearchService);

  // UI State
  showAddModal = signal(false);
  showDetailPanel = signal(false);
  selectedEntry = signal<ResearchEntry | null>(null);

  // Filter & Search State
  searchQuery = signal('');
  filterStatus = signal<'ALL' | 'UNREAD' | 'READING' | 'PROCESSED'>('ALL');
  filterType = signal<'ALL' | 'WEB' | 'PDF' | 'INTERVIEW'>('ALL');

  // Input State for New Entry
  newEntryTitle = signal('');
  newEntryUrl = signal('');
  newEntryType = signal<ResearchEntry['sourceType']>('WEB');
  newEntryTags = signal(''); // comma separated
  newEntryDesc = signal('');

  // Editing State
  editNotes = signal(''); // For the detail panel notes

  entries = this.researchService.entries;

  filteredEntries = computed(() => {
    let list = this.entries();
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    const type = this.filterType();

    if (query) {
      list = list.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.tags.some(t => t.toLowerCase().includes(query)) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    if (status !== 'ALL') {
      list = list.filter(e => e.status === status);
    }

    if (type !== 'ALL') {
      list = list.filter(e => e.sourceType === type);
    }

    return list;
  });

  // Analytics
  stats = computed(() => {
    const list = this.entries();
    return {
      total: list.length,
      unread: list.filter(e => e.status === 'UNREAD').length,
      reading: list.filter(e => e.status === 'READING').length,
      processed: list.filter(e => e.status === 'PROCESSED').length
    };
  });

  openDetail(entry: ResearchEntry) {
    this.selectedEntry.set(entry);
    this.editNotes.set(entry.notes || '');
    this.showDetailPanel.set(true);
  }

  closeDetail() {
    this.showDetailPanel.set(false);
    this.selectedEntry.set(null);
  }

  openAddModal() {
    this.newEntryTitle.set('');
    this.newEntryUrl.set('');
    this.newEntryType.set('WEB');
    this.newEntryTags.set('');
    this.newEntryDesc.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  saveNewEntry() {
    if (!this.newEntryTitle()) return;

    this.researchService.addEntry({
      title: this.newEntryTitle(),
      url: this.newEntryUrl(),
      sourceType: this.newEntryType(),
      tags: this.newEntryTags().split(',').map(t => t.trim()).filter(t => t),
      description: this.newEntryDesc(),
      status: 'UNREAD'
    });

    this.closeAddModal();
  }

  updateEntryStatus(status: 'UNREAD' | 'READING' | 'PROCESSED') {
    const current = this.selectedEntry();
    if (current) {
      this.researchService.updateEntry(current.id, { status });
      // Update local selected entry to reflect change immediately in UI if needed, 
      // though signal selectedEntry relies on object ref, better to refresh it or let UI bind to service
      this.selectedEntry.update(e => e ? { ...e, status } : null);
    }
  }

  saveNotes() {
    const current = this.selectedEntry();
    if (current) {
      this.researchService.updateEntry(current.id, { notes: this.editNotes() });
    }
  }

  deleteCurrentEntry() {
    const current = this.selectedEntry();
    if (current && confirm('Delete this research source?')) {
      this.researchService.deleteEntry(current.id);
      this.closeDetail();
    }
  }

  autoFillFromUrl() {
    // Simulate AI/Scraper
    if (this.newEntryUrl()) {
      this.newEntryTitle.set('Auto-detected Title from URL');
      this.newEntryDesc.set('Automatically captured description metadata from the provided link...');
    }
  }

  // Helpers for UI
  getStatusColor(status: string) {
    switch (status) {
      case 'PROCESSED': return '#4ade80'; // Green
      case 'READING': return '#facc15'; // Yellow
      case 'UNREAD': return '#f87171'; // Red
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
