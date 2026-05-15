import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BinService, BinItem } from '@envello/core';
import type { BinItemType } from '@envello/core';

type FilterType = 'ALL' | BinItemType;

@Component({
  selector: 'app-bin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bin.component.html',
  styleUrl: './bin.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BinComponent {
  private binService = inject(BinService);
  private router = inject(Router);

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
        (i.title ?? '').toLowerCase().includes(query) ||
        i.originalId.toLowerCase().includes(query) ||
        i.type.toLowerCase().includes(query)
      );
    }
    return list;
  });

  totalCount = computed(() => this.allItems().length);
  visibleCount = computed(() => this.filteredItems().length);
  restorableCount = computed(() => this.allItems().filter(i => this.binService.canRestore(i.type)).length);
  oldestItem = computed(() => {
    const items = this.allItems();
    if (!items.length) return null;
    return items[items.length - 1];
  });

  goBack() {
    this.router.navigate(['/workspace']);
  }

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

  async restore(id: string) {
    this.restoringId.set(id);
    const ok = await this.binService.restore(id);
    this.restoringId.set(null);
    if (!ok) {
      alert('This item type cannot be automatically restored.');
    }
  }

  permanentlyDelete(id: string) {
    if (confirm('Delete forever? This cannot be undone.')) {
      this.binService.permanentlyDelete(id);
      if (this.expandedRowId() === id) this.expandedRowId.set(null);
    }
  }

  emptyBin() {
    if (!this.allItems().length) return;
    if (confirm('Empty Bin? All items will be permanently deleted. This cannot be undone.')) {
      this.binService.emptyBin();
    }
  }

  canRestore(type: BinItemType): boolean {
    return this.binService.canRestore(type);
  }

  getIconForType(type: BinItemType): string {
    switch (type) {
      case 'task': return 'task_alt';
      case 'daily-note': return 'edit_note';
      case 'novel': return 'menu_book';
      case 'novel-chapter': return 'article';
      case 'novel-note': return 'sticky_note_2';
      case 'novel-character': return 'person';
      case 'novel-location': return 'location_on';
      case 'novel-group': return 'folder';
      case 'book': return 'import_contacts';
      case 'meeting': return 'groups';
      default: return 'delete';
    }
  }

  formatType(type: BinItemType): string {
    switch (type) {
      case 'daily-note': return 'Daily Note';
      case 'novel': return 'Novel';
      case 'novel-chapter': return 'Chapter';
      case 'novel-note': return 'Novel Note';
      case 'novel-character': return 'Character';
      case 'novel-location': return 'Location';
      case 'novel-group': return 'Group';
      case 'task': return 'Task';
      case 'book': return 'Book';
      case 'meeting': return 'Meeting';
      default: return type;
    }
  }

  formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  payloadPreview(item: BinItem): { label: string; value: string }[] {
    const p: any = item.payload;
    if (!p || typeof p !== 'object') return [];
    const fields: { label: string; value: string }[] = [];
    if (p['id'])        fields.push({ label: 'ORIGINAL ID', value: p['id'] });
    if (p['status'])    fields.push({ label: 'STATUS',      value: p['status'] });
    if (p['priority'])  fields.push({ label: 'PRIORITY',    value: p['priority'] });
    if (p['due'])       fields.push({ label: 'DUE DATE',    value: p['due'] });
    if (p['date'])      fields.push({ label: 'DATE',        value: p['date'] });
    if (p['createdAt']) fields.push({ label: 'CREATED',     value: p['createdAt'] });
    return fields.slice(0, 4);
  }
}
