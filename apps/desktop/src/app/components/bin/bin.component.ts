import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { BinService } from '@envello/core';
import { BinItemType } from '@envello/domain';

type FilterType = 'ALL' | BinItemType;

@Component({
  selector: 'app-bin',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './bin.component.html',
  styleUrl: './bin.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BinComponent {
  private binService = inject(BinService);

  searchQuery = signal('');
  activeFilter = signal<FilterType>('ALL');
  expandedRowId = signal<string | null>(null);
  restoringId = signal<string | null>(null);

  allItems = computed(() =>
    [...this.binService.items()].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    )
  );

  filteredItems = computed(() => {
    let list = this.allItems();
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase();

    if (filter !== 'ALL') {
      list = list.filter(i => i.type === filter);
    }
    if (query) {
      list = list.filter(i =>
        (i.title || i.originalId).toLowerCase().includes(query)
      );
    }
    return list;
  });

  totalCount = computed(() => this.allItems().length);
  visibleCount = computed(() => this.filteredItems().length);

  setFilter(filter: FilterType) {
    this.activeFilter.set(filter);
    this.expandedRowId.set(null);
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  toggleRow(id: string) {
    this.expandedRowId.set(this.expandedRowId() === id ? null : id);
  }

  canRestore(type: BinItemType): boolean {
    return this.binService.canRestore(type);
  }

  async restore(id: string) {
    this.restoringId.set(id);
    await this.binService.restore(id);
    this.restoringId.set(null);
    if (this.expandedRowId() === id) this.expandedRowId.set(null);
  }

  permanentlyDelete(id: string) {
    const confirmed = confirm('Delete forever?\n\nThis cannot be recovered.');
    if (confirmed) {
      this.binService.permanentlyDelete(id);
      if (this.expandedRowId() === id) this.expandedRowId.set(null);
    }
  }

  emptyBin() {
    if (this.allItems().length === 0) return;
    const confirmed = confirm('Empty Bin?\n\nAll items will be permanently removed. This action cannot be undone.');
    if (confirmed) this.binService.emptyBin();
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'task':            return 'check_circle';
      case 'daily-note':      return 'edit_note';
      case 'novel':           return 'menu_book';
      case 'novel-chapter':   return 'article';
      case 'novel-note':      return 'sticky_note_2';
      case 'novel-character': return 'person';
      case 'novel-location':  return 'location_on';
      case 'novel-group':     return 'group';
      case 'book':            return 'auto_stories';
      case 'meeting':         return 'event';
      default:                return 'delete';
    }
  }

  formatType(type: string): string {
    switch (type) {
      case 'daily-note':      return 'Daily Note';
      case 'novel-chapter':   return 'Chapter';
      case 'novel-note':      return 'Novel Note';
      case 'novel-character': return 'Character';
      case 'novel-location':  return 'Location';
      case 'novel-group':     return 'Group';
      default:                return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }
}
