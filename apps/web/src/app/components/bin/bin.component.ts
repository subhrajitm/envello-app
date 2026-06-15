import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BinService } from '@envello/core';
import type { BinEntry, BinEntryType } from '@envello/domain';
import { ConfirmDialogComponent } from '@envello/ui';

type FilterType = 'ALL' | BinEntryType;

interface ConfirmDialog {
  mode: 'restore' | 'delete' | 'empty';
  itemId?: string;
  itemTitle?: string;
}

@Component({
  selector: 'app-bin',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
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
  confirmDialog = signal<ConfirmDialog | null>(null);

  allItems = computed(() =>
    [...this.binService.items()].sort(
      (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
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
        i.id.toLowerCase().includes(query) ||
        i.type.toLowerCase().includes(query)
      );
    }
    return list;
  });

  totalCount = computed(() => this.allItems().length);
  visibleCount = computed(() => this.filteredItems().length);
  restorableCount = computed(() => this.allItems().length);
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

  openRestoreConfirm(id: string, title: string) {
    this.confirmDialog.set({ mode: 'restore', itemId: id, itemTitle: title });
  }

  openDeleteConfirm(id: string, title: string) {
    this.confirmDialog.set({ mode: 'delete', itemId: id, itemTitle: title });
  }

  openEmptyConfirm() {
    if (!this.allItems().length) return;
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

  canRestore(_type: BinEntryType): boolean {
    return true;
  }

  getIconForType(type: BinEntryType): string {
    switch (type) {
      case 'task': return 'task_alt';
      case 'daily-note': return 'edit_note';
      case 'write': return 'edit';
      case 'meeting': return 'groups';
      case 'bookmark': return 'bookmark';
      case 'credential': return 'lock';
      case 'transaction': return 'receipt_long';
      default: return 'delete';
    }
  }

  formatType(type: BinEntryType): string {
    switch (type) {
      case 'daily-note': return 'Daily Note';
      case 'write': return 'Write';
      case 'task': return 'Task';
      case 'meeting': return 'Meeting';
      case 'bookmark': return 'Bookmark';
      case 'credential': return 'Credential';
      case 'transaction': return 'Transaction';
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

  payloadPreview(item: BinEntry): { label: string; value: string }[] {
    const p: any = item.payload;
    if (!p || typeof p !== 'object') return [];
    const fields: { label: string; value: string }[] = [];
    if (p['id'])          fields.push({ label: 'ORIGINAL ID', value: p['id'] });
    if (p['url'])         fields.push({ label: 'URL',         value: p['url'] });
    if (p['type'])        fields.push({ label: 'TYPE',        value: p['type'] });
    if (p['status'])      fields.push({ label: 'STATUS',      value: p['status'] });
    if (p['priority'])    fields.push({ label: 'PRIORITY',    value: p['priority'] });
    if (p['price'])       fields.push({ label: 'PRICE',       value: String(p['price']) });
    if (p['renewalDate']) fields.push({ label: 'RENEWAL',     value: p['renewalDate'] });
    if (p['due'])         fields.push({ label: 'DUE DATE',    value: p['due'] });
    if (p['date'])        fields.push({ label: 'DATE',        value: p['date'] });
    if (p['createdAt'])   fields.push({ label: 'CREATED',     value: p['createdAt'] });
    return fields.slice(0, 4);
  }
}
