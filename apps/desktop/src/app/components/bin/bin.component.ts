import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { BinService } from '@envello/core';
import { BinItemType } from '@envello/domain';
import { ConfirmDialogComponent } from '@envello/ui';

type FilterType = 'ALL' | BinItemType;

interface ConfirmDialog {
  mode: 'restore' | 'delete' | 'empty';
  itemId?: string;
  itemTitle?: string;
}

@Component({
  selector: 'app-bin',
  standalone: true,
  imports: [SlicePipe, ConfirmDialogComponent],
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
  confirmDialog = signal<ConfirmDialog | null>(null);

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

  openRestoreConfirm(id: string, title: string) {
    this.confirmDialog.set({ mode: 'restore', itemId: id, itemTitle: title });
  }

  openDeleteConfirm(id: string, title: string) {
    this.confirmDialog.set({ mode: 'delete', itemId: id, itemTitle: title });
  }

  openEmptyConfirm() {
    if (this.allItems().length === 0) return;
    this.confirmDialog.set({ mode: 'empty' });
  }

  cancelConfirm() {
    this.confirmDialog.set(null);
  }

  async confirmAction() {
    const dialog = this.confirmDialog();
    if (!dialog) return;
    this.confirmDialog.set(null);

    if (dialog.mode === 'restore' && dialog.itemId) {
      this.restoringId.set(dialog.itemId);
      await this.binService.restore(dialog.itemId);
      this.restoringId.set(null);
      if (this.expandedRowId() === dialog.itemId) this.expandedRowId.set(null);
    } else if (dialog.mode === 'delete' && dialog.itemId) {
      this.binService.permanentlyDelete(dialog.itemId);
      if (this.expandedRowId() === dialog.itemId) this.expandedRowId.set(null);
    } else if (dialog.mode === 'empty') {
      this.binService.emptyBin();
    }
  }

  emptyBin() {
    this.openEmptyConfirm();
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'task':            return 'check_circle';
      case 'daily-note':      return 'edit_note';
      case 'book':            return 'menu_book';
      case 'book-chapter':    return 'article';
      case 'book-note':       return 'sticky_note_2';
      case 'book-character':  return 'person';
      case 'book-location':   return 'location_on';
      case 'book-group':      return 'group';
      case 'meeting':         return 'event';
      case 'bookmark':        return 'bookmark';
      case 'credential':      return 'lock';
      case 'transaction':     return 'receipt_long';
      default:                return 'delete';
    }
  }

  formatType(type: string): string {
    switch (type) {
      case 'daily-note':      return 'Daily Note';
      case 'book-chapter':    return 'Chapter';
      case 'book-note':       return 'Book Note';
      case 'book-character':  return 'Character';
      case 'book-location':   return 'Location';
      case 'book-group':      return 'Group';
      case 'bookmark':        return 'Bookmark';
      case 'credential':      return 'Credential';
      case 'transaction':     return 'Transaction';
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
