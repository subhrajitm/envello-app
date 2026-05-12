import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EnvTableColumn {
  key: string;
  header: string;
  /** Defaults to 'text'. 'avatar-text' expects cell value { name, avatar?, initials? }. */
  type?: 'text' | 'avatar-text' | 'badge';
  sortable?: boolean;
  /**
   * For type='badge': maps row value string → badge appearance.
   * Example: { 'New': { label: 'New', dotColor: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)', textColor: '#8b5cf6' } }
   */
  badgeMap?: Record<string, { label?: string; dotColor: string; bgColor: string; textColor: string }>;
}

export interface EnvTableTab {
  key: string;
  label: string;
  count?: number;
}

export interface EnvTableAction {
  key: string;
  label: string;
  icon?: string;
  danger?: boolean;
}

export type EnvTableRow = Record<string, any>;

export interface EnvTableSortEvent {
  key: string;
  direction: 'asc' | 'desc';
}

export interface EnvTableActionEvent {
  row: EnvTableRow;
  actionKey: string;
}

@Component({
  selector: 'env-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent {
  // ── Data ────────────────────────────────────────────────────────────────────
  @Input() columns: EnvTableColumn[] = [];
  @Input() rows: EnvTableRow[] = [];
  /** Property name used as unique row identifier for selection tracking. */
  @Input() rowIdKey = 'id';

  // ── Tabs ────────────────────────────────────────────────────────────────────
  @Input() tabs: EnvTableTab[] = [];
  @Input() activeTab = '';

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  @Input() showSearch = true;
  @Input() searchPlaceholder = 'Search...';
  @Input() searchValue = '';
  @Input() showSortFilter = true;
  @Input() showToolbar = true;

  // ── Actions column ───────────────────────────────────────────────────────────
  /** Menu items rendered in the kebab-menu action column. Pass [] to hide the column. */
  @Input() actions: EnvTableAction[] = [];

  // ── Pagination ───────────────────────────────────────────────────────────────
  @Input() showPagination = true;
  @Input() totalEntries = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;

  // ── State ────────────────────────────────────────────────────────────────────
  @Input() loading = false;

  // ── Outputs ──────────────────────────────────────────────────────────────────
  @Output() tabChange        = new EventEmitter<string>();
  @Output() searchChange     = new EventEmitter<string>();
  @Output() sortChange       = new EventEmitter<EnvTableSortEvent>();
  @Output() selectionChange  = new EventEmitter<EnvTableRow[]>();
  @Output() actionClick      = new EventEmitter<EnvTableActionEvent>();
  @Output() pageChange       = new EventEmitter<number>();
  @Output() rowClick         = new EventEmitter<EnvTableRow>();
  @Output() sortByClick      = new EventEmitter<void>();
  @Output() filterClick      = new EventEmitter<void>();

  // ── Internal state ───────────────────────────────────────────────────────────
  sortKey   = signal('');
  sortDir   = signal<'asc' | 'desc'>('asc');
  selectedIds  = signal<Set<any>>(new Set());
  openMenuId   = signal<any>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  get totalPages() { return Math.max(1, Math.ceil(this.totalEntries / this.pageSize)); }
  get showingFrom() { return this.totalEntries === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get showingTo()   { return Math.min(this.currentPage * this.pageSize, this.totalEntries); }

  get allSelected() {
    return this.rows.length > 0 && this.rows.every(r => this.selectedIds().has(r[this.rowIdKey]));
  }
  get someSelected() {
    return this.rows.some(r => this.selectedIds().has(r[this.rowIdKey])) && !this.allSelected;
  }

  get skeletonRows() { return [1, 2, 3, 4, 5]; }

  // ── Pagination pages ─────────────────────────────────────────────────────────
  visiblePages(): (number | '...')[] {
    const total = this.totalPages;
    const cur   = this.currentPage;
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);

    if (cur <= 3)         return [1, 2, 3, '...', total - 1, total];
    if (cur >= total - 2) return [1, 2, '...', total - 2, total - 1, total];
    return [1, '...', cur - 1, cur, cur + 1, '...', total];
  }

  isEllipsis(p: number | '...'): p is '...' { return p === '...'; }

  padNum(n: number): string { return n < 10 ? '0' + n : String(n); }

  // ── Selection ────────────────────────────────────────────────────────────────
  isSelected(row: EnvTableRow) { return this.selectedIds().has(row[this.rowIdKey]); }

  toggleSelect(row: EnvTableRow) {
    this.selectedIds.update(set => {
      const next = new Set(set);
      const id = row[this.rowIdKey];
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    this.emitSelection();
  }

  toggleAll() {
    if (this.allSelected) {
      this.selectedIds.update(set => {
        const next = new Set(set);
        this.rows.forEach(r => next.delete(r[this.rowIdKey]));
        return next;
      });
    } else {
      this.selectedIds.update(set => {
        const next = new Set(set);
        this.rows.forEach(r => next.add(r[this.rowIdKey]));
        return next;
      });
    }
    this.emitSelection();
  }

  private emitSelection() {
    const ids = this.selectedIds();
    this.selectionChange.emit(this.rows.filter(r => ids.has(r[this.rowIdKey])));
  }

  // ── Sort ─────────────────────────────────────────────────────────────────────
  onSort(col: EnvTableColumn) {
    if (!col.sortable) return;
    const dir = this.sortKey() === col.key && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.sortKey.set(col.key);
    this.sortDir.set(dir);
    this.sortChange.emit({ key: col.key, direction: dir });
  }

  // ── Action menu ──────────────────────────────────────────────────────────────
  toggleMenu(row: EnvTableRow, e: Event) {
    e.stopPropagation();
    const id = row[this.rowIdKey];
    this.openMenuId.update(cur => (cur === id ? null : id));
  }

  isMenuOpen(row: EnvTableRow) { return this.openMenuId() === row[this.rowIdKey]; }

  onAction(row: EnvTableRow, actionKey: string) {
    this.openMenuId.set(null);
    this.actionClick.emit({ row, actionKey });
  }

  // ── Page navigation ──────────────────────────────────────────────────────────
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  // ── Cell helpers ─────────────────────────────────────────────────────────────
  getAvatarCell(row: EnvTableRow, col: EnvTableColumn): { name: string; avatar?: string } {
    const val = row[col.key];
    if (val && typeof val === 'object') return val;
    return { name: String(val ?? '') };
  }

  getInitials(name: string): string {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getAvatarBg(row: EnvTableRow, col: EnvTableColumn): string {
    const cell = this.getAvatarCell(row, col);
    return cell.avatar ? `url(${cell.avatar})` : '';
  }

  getBadge(row: EnvTableRow, col: EnvTableColumn): { label: string; dotColor: string; bgColor: string; textColor: string } {
    const val      = row[col.key];
    const fallback = { label: String(val ?? ''), dotColor: 'var(--text-tertiary)', bgColor: 'var(--bg-hover)', textColor: 'var(--text-secondary)' };
    if (!col.badgeMap) return fallback;
    const entry = col.badgeMap[val];
    if (!entry) return fallback;
    return { label: entry.label ?? String(val ?? ''), dotColor: entry.dotColor, bgColor: entry.bgColor, textColor: entry.textColor };
  }

  // ── Close menu on outside click ──────────────────────────────────────────────
  @HostListener('document:click')
  onDocClick() { this.openMenuId.set(null); }
}
