import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionStore } from '@envello/state';
import { Transaction, TransactionType } from '@envello/domain';
import { AiAssistantPanelComponent, AiPanelMessage, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent } from '@envello/ui';
import type { EnvTableColumn, EnvTableAction, EnvTableSortEvent, EnvTableActionEvent } from '@envello/ui';
import {
    TYPE_META, STATUS_META, CURRENCIES, VENDOR_PRESETS,
    autoDate, toLocalDateString, avatarBg, currencySymbol,
} from './transaction.constants';
import { TransactionFormComponent } from './transaction-form.component';

@Component({
    selector: 'app-vendor',
    standalone: true,
    imports: [CommonModule, FormsModule, AiAssistantPanelComponent, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent, TransactionFormComponent, SliderPanelComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<div class="vs-view">

  <!-- ── SIDEBAR ── -->
  <env-feature-sidebar [title]="'Transactions'">

    <nav class="vs-sb-nav">
      <button class="vs-sb-item"
        [class.active]="selectedType() === null"
        (click)="clearFilters()">
        <span class="material-symbols-outlined">receipt_long</span>
        <span class="vs-sb-label">All</span>
        <span class="vs-sb-count">{{ transactionStore.transactions().length }}</span>
      </button>
      @for (type of typeOptions; track type) {
        <button class="vs-sb-item" [class.active]="selectedType() === type"
          (click)="toggleTypeFilter(type)">
          <span class="material-symbols-outlined" [style.color]="typeMeta(type).color">{{ typeMeta(type).icon }}</span>
          <span class="vs-sb-label">{{ typeMeta(type).label }}</span>
          <span class="vs-sb-count">{{ countByType()[type] || 0 }}</span>
        </button>
      }
    </nav>

    <div class="vs-sb-divider"></div>

    <div class="vs-sb-section">
      <div class="vs-sb-section-title">Status</div>
      <button class="vs-sb-item" [class.active]="selectedStatus() === 'active'"
        (click)="toggleStatusFilter('active')">
        <span class="vs-status-dot vs-dot-active"></span>
        <span class="vs-sb-label">Active</span>
        <span class="vs-sb-count">{{ activeCount() }}</span>
      </button>
      <button class="vs-sb-item" [class.active]="selectedStatus() === 'paused'"
        (click)="toggleStatusFilter('paused')">
        <span class="vs-status-dot vs-dot-paused"></span>
        <span class="vs-sb-label">Paused</span>
        <span class="vs-sb-count">{{ pausedCount() }}</span>
      </button>
      <button class="vs-sb-item" [class.active]="selectedStatus() === 'cancelled'"
        (click)="toggleStatusFilter('cancelled')">
        <span class="vs-status-dot vs-dot-cancelled"></span>
        <span class="vs-sb-label">Cancelled</span>
        <span class="vs-sb-count">{{ cancelledCount() }}</span>
      </button>
    </div>
  </env-feature-sidebar>

  <!-- ── MAIN ── -->
  <div class="vs-main">

    <!-- Toolbar -->
    <div class="vs-toolbar">
      <div class="vs-search-wrap">
        <span class="material-symbols-outlined vs-search-icon">search</span>
        <input class="vs-search-input" type="text" placeholder="Search transactions…"
          [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)">
      </div>
      <div class="vs-toolbar-right">
        @if (hasActiveFilters()) {
          <button class="vs-tool-btn" title="Clear filters" (click)="clearFilters()">
            <span class="material-symbols-outlined">filter_list_off</span>
          </button>
        }
        <div class="vs-tb-divider"></div>
        <button class="vs-tool-btn" title="Bulk import" (click)="showImportModal.set(true)">
          <span class="material-symbols-outlined">upload</span>
        </button>
        <button class="vs-tool-btn" [class.vs-tool-btn--active]="showAssistant()"
          title="AI Assistant" (click)="toggleAssistant()">
          <span class="material-symbols-outlined">auto_awesome</span>
          AI
        </button>
        <div class="vs-tb-divider"></div>
        <button class="vs-add-btn" (click)="openAddForm()">
          <span class="material-symbols-outlined">add</span>
          Add Transaction
        </button>
      </div>
    </div>

    <!-- Upcoming renewals banner -->
    @if (upcomingBanner().length > 0) {
      <div class="vs-banner">
        <span class="material-symbols-outlined vs-banner-icon">notifications_active</span>
        <span class="vs-banner-label">Due soon:</span>
        @for (t of upcomingBanner(); track t.id) {
          @let bdays = daysUntil(t.date);
          <span class="vs-banner-chip" [class.vs-banner-urgent]="bdays !== null && bdays <= 3"
            (click)="navigateToTx(t.id)" style="cursor:pointer">
            {{ t.name }}
            <span class="vs-banner-days">{{ bdays === 0 ? 'today' : 'in ' + bdays + 'd' }}</span>
          </span>
        }
      </div>
    }

    <!-- Table -->
    <div class="vs-table-wrap">
      @if (filteredTransactions().length === 0) {
        @if (transactionStore.transactions().length === 0) {
          <env-empty-state
            icon="receipt_long"
            title="No transactions yet"
            description="Track your costs — add one manually or import a list."
            ctaLabel="Add Transaction"
            ctaIcon="add"
            secondaryCtaLabel="Import"
            (ctaClicked)="openAddForm()"
            (secondaryCtaClicked)="showImportModal.set(true)">
          </env-empty-state>
        } @else {
          <env-empty-state
            icon="search_off"
            title="No results match your filters"
            secondaryCtaLabel="Clear Filters"
            (secondaryCtaClicked)="clearFilters()">
          </env-empty-state>
        }
      } @else {
        <env-table
          class="env-table--compact"
          [columns]="tableColumns"
          [rows]="tableRows()"
          [actions]="tableActions"
          [showToolbar]="false"
          rowIdKey="id"
          (rowClick)="navigateToTx($any($event['id']))"
          (actionClick)="handleTableAction($event)"
          (bulkActionClick)="handleBulkAction($event)"
          (sortChange)="handleTableSort($event)"
        ></env-table>
      }
    </div>
  </div>

  <!-- AI panel -->
  @if (showAssistant()) {
    <env-ai-panel
      title="Transactions Assistant"
      placeholder="Ask about your transactions…"
      [suggestions]="aiSuggestions"
      [messages]="aiMessages()"
      [loading]="aiLoading()"
      (send)="sendAiMessage($event)"
      (cleared)="clearAiChat()"
      (closed)="toggleAssistant()"
    ></env-ai-panel>
  }

</div>

<!-- ── SLIDER PANEL (Add / Edit) ── -->
<env-slider-panel [isOpen]="showSlider()" (closed)="closeSlider()">
  <app-transaction-form
    [txId]="sliderTxId()"
    [embeddedMode]="true"
    (close)="closeSlider()">
  </app-transaction-form>
</env-slider-panel>

<!-- ── BULK IMPORT MODAL ── -->
@if (showImportModal()) {
  <div class="vs-modal-overlay" (click)="showImportModal.set(false)">
    <div class="vs-modal-box" (click)="$event.stopPropagation()">
      <div class="vs-modal-header">
        <span class="vs-modal-title">Import Transactions</span>
        <button class="vs-modal-close" (click)="showImportModal.set(false)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="vs-modal-body">
        <p class="import-hint">
          One transaction per line.<br>
          Format: <code>Name, Amount, Type, Category, Currency, Cycle</code><br>
          <span style="color:var(--text-tertiary)">Type is <code>recurring</code>, <code>one-time</code>, <code>bill</code>, <code>purchase</code>, or <code>refund</code>. Cycle (<code>monthly</code>/<code>yearly</code>) applies to recurring only.</span>
        </p>
        <textarea class="import-textarea"
          [ngModel]="importText()" (ngModelChange)="importText.set($event)"
          placeholder="GitHub, 4, recurring, software, USD, monthly&#10;AWS, 150, bill&#10;Figma, 180, recurring, design, USD, yearly&#10;Laptop, 1200, purchase"></textarea>
        @if (importPreviewCount() > 0) {
          <p class="import-count">
            <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle">check_circle</span>
            {{ importPreviewCount() }} transaction{{ importPreviewCount() === 1 ? '' : 's' }} ready to import
          </p>
        }
      </div>
      <div class="vs-modal-footer">
        <button class="vs-cancel-btn" (click)="showImportModal.set(false)">Cancel</button>
        <button class="vs-save-btn" [disabled]="importPreviewCount() === 0" (click)="parseAndImport()">
          <span class="material-symbols-outlined">upload</span>
          Import {{ importPreviewCount() > 0 ? importPreviewCount() : '' }}
        </button>
      </div>
    </div>
  </div>
}

@if (deleteConfirmId(); as txId) {
  <env-confirm-dialog
    [isOpen]="true"
    title="Move to Bin"
    icon="delete"
    variant="danger"
    confirmLabel="Move to Bin"
    (confirmed)="doDelete(txId)"
    (cancelled)="deleteConfirmId.set(null)">
    This transaction will be moved to the Bin and can be restored later.
  </env-confirm-dialog>
}

@if (bulkDeleteConfirm(); as ids) {
  <env-confirm-dialog
    [isOpen]="true"
    title="Move to Bin"
    icon="delete"
    variant="danger"
    confirmLabel="Move to Bin"
    (confirmed)="confirmBulkDelete()"
    (cancelled)="bulkDeleteConfirm.set(null)">
    <strong>{{ ids.length }} transaction{{ ids.length !== 1 ? 's' : '' }}</strong> will be moved to the Bin and can be restored later.
  </env-confirm-dialog>
}
    `,
    styles: [`
    :host { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; }
    .vs-view { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; background: var(--bg-app); }

    /* ── Sidebar ── */
    .vs-sb-nav     { padding: 4px 6px; flex-shrink: 0; }
    .vs-sb-section { padding: 4px 6px; flex-shrink: 0; }
    .vs-sb-section-title {
      padding: 6px 8px 4px; font-size: 9.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary);
    }
    .vs-sb-divider { height: 1px; background: var(--border-subtle); margin: 0 8px; flex-shrink: 0; }
    .vs-sb-item {
      width: 100%; display: flex; align-items: center; gap: 7px;
      padding: 5px 8px; background: transparent; border: none;
      border-radius: 6px; color: var(--text-secondary);
      font-size: 12.5px; font-weight: 500; cursor: pointer;
      transition: all 0.15s; text-align: left;
    }
    .vs-sb-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vs-sb-item.active { background: var(--accent-primary-dim); color: var(--accent-primary); }
    .vs-sb-item .material-symbols-outlined { font-size: 16px; flex-shrink: 0; color: var(--text-tertiary); }
    .vs-sb-item.active .material-symbols-outlined { color: var(--accent-primary); }
    .vs-sb-label { flex: 1; }
    .vs-sb-count {
      font-size: 10.5px; color: var(--text-tertiary);
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 0 5px;
      font-family: var(--font-mono); min-width: 16px; text-align: center;
    }
    .vs-sb-item.active .vs-sb-count {
      background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
      border-color: var(--accent-primary); color: var(--accent-primary);
    }
    .vs-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .vs-dot-active    { background: #4ade80; }
    .vs-dot-paused    { background: #fbbf24; }
    .vs-dot-cancelled { background: var(--text-tertiary); }

    /* ── Main ── */
    .vs-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }

    /* ── Toolbar ── */
    .vs-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      height: 44px; padding: 0 16px; gap: 8px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0; background: var(--bg-panel);
    }
    .vs-search-wrap { position: relative; display: flex; align-items: center; }
    .vs-search-icon {
      position: absolute; left: 8px; font-size: 16px;
      color: var(--text-tertiary); pointer-events: none;
    }
    .vs-search-input {
      height: 28px; padding: 0 10px 0 28px;
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      border-radius: 5px; font-size: 12px; color: var(--text-primary);
      outline: none; width: 200px; transition: all 0.2s;
    }
    .vs-search-input:focus { background: var(--bg-panel); border-color: var(--accent-primary); }
    .vs-toolbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .vs-tb-divider { width: 1px; height: 18px; background: var(--border-subtle); margin: 0 2px; }
    .vs-tool-btn {
      height: 28px; padding: 0 10px; display: flex; align-items: center; gap: 5px;
      background: transparent; border: 1px solid var(--border-subtle);
      border-radius: 5px; color: var(--text-secondary); font-size: 12px; font-weight: 500;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .vs-tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vs-tool-btn--active { background: var(--accent-primary-dim) !important; border-color: var(--accent-primary) !important; color: var(--accent-primary) !important; }
    .vs-tool-btn .material-symbols-outlined { font-size: 15px; }
    .vs-add-btn {
      height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 5px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 5px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
    }
    .vs-add-btn:hover { opacity: 0.88; }
    .vs-add-btn .material-symbols-outlined { font-size: 16px; }

    /* ── Banner ── */
    .vs-banner {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 20px; flex-shrink: 0;
      background: color-mix(in srgb, #fbbf24 6%, transparent);
      border-bottom: 1px solid color-mix(in srgb, #fbbf24 20%, transparent);
    }
    .vs-banner-icon  { font-size: 17px; color: #fbbf24; }
    .vs-banner-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
    .vs-banner-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 8px; border-radius: 100px;
      background: color-mix(in srgb, #fbbf24 10%, transparent);
      border: 1px solid color-mix(in srgb, #fbbf24 25%, transparent);
      font-size: 11.5px; font-weight: 500; color: var(--text-primary);
      transition: opacity 0.15s;
    }
    .vs-banner-chip:hover { opacity: 0.8; }
    .vs-banner-urgent {
      background: color-mix(in srgb, var(--accent-red) 10%, transparent) !important;
      border-color: color-mix(in srgb, var(--accent-red) 30%, transparent) !important;
      color: var(--accent-red) !important;
    }
    .vs-banner-days { font-size: 10.5px; color: var(--text-tertiary); }

    /* ── Table ── */
    .vs-table-wrap { flex: 1 1 0; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }

    /* ── Import modal (inline) ── */
    .vs-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .vs-modal-box {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 12px; width: 520px; max-width: 95vw;
      display: flex; flex-direction: column; box-shadow: 0 16px 48px rgba(0,0,0,0.25);
    }
    .vs-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-subtle);
    }
    .vs-modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .vs-modal-close {
      background: transparent; border: none; color: var(--text-tertiary);
      cursor: pointer; padding: 2px; border-radius: 4px;
    }
    .vs-modal-close:hover { color: var(--text-primary); }
    .vs-modal-close .material-symbols-outlined { font-size: 18px; display: block; }
    .vs-modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .vs-modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 20px; border-top: 1px solid var(--border-subtle);
    }
    .import-hint { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.7; }
    .import-hint code {
      background: var(--bg-hover); padding: 1px 5px; border-radius: 3px;
      font-size: 11px; color: var(--accent-primary);
    }
    .import-textarea {
      width: 100%; min-height: 130px; resize: vertical;
      background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 6px;
      padding: 10px 12px; font-size: 13px; color: var(--text-primary); outline: none;
      font-family: var(--font-mono); line-height: 1.6; box-sizing: border-box;
    }
    .import-textarea:focus { border-color: var(--accent-primary); }
    .import-count {
      font-size: 12px; color: #4ade80; margin: 0;
      display: flex; align-items: center; gap: 4px;
    }
    .vs-cancel-btn {
      padding: 8px 16px; background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-secondary); border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .vs-save-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .vs-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    `]
})
export class VendorComponent {
    public transactionStore = inject(TransactionStore);

    readonly typeOptions: TransactionType[] = ['recurring', 'one-time', 'bill', 'purchase', 'refund'];

    // ── Filter state ──────────────────────────────────────────────────────
    searchQuery    = signal('');
    selectedType   = signal<TransactionType | null>(null);
    selectedStatus = signal<string | null>(null);

    // ── Sort state ────────────────────────────────────────────────────────
    sortCol = signal<'name' | 'amount' | 'date'>('date');
    sortDir = signal<'asc' | 'desc'>('asc');

    // ── Slider (add / edit panel) ─────────────────────────────────────────
    showSlider  = signal(false);
    sliderTxId  = signal<string | null>(null);

    // ── Delete / bulk state ───────────────────────────────────────────────
    deleteConfirmId   = signal<string | null>(null);
    bulkDeleteConfirm = signal<string[] | null>(null);

    // ── Import state ──────────────────────────────────────────────────────
    showImportModal = signal(false);
    importText      = signal('');

    // ── AI Assistant ──────────────────────────────────────────────────────
    showAssistant = signal(false);
    aiLoading     = signal(false);
    aiMessages    = signal<AiPanelMessage[]>([]);

    readonly aiSuggestions = [
        'What is my total monthly spend?',
        'Which transactions are due soon?',
        'What are my most expensive recurring services?',
        'Show me a breakdown by type',
        'Show me all refunds',
    ];

    // ── Computed ──────────────────────────────────────────────────────────
    // Single pass over transactions for all sidebar counts.
    private _stats = computed(() => {
        let active = 0, paused = 0, cancelled = 0;
        const byType: Record<string, number> = {};
        for (const t of this.transactionStore.transactions()) {
            byType[t.type] = (byType[t.type] ?? 0) + 1;
            const s = t.status ?? 'active';
            if (s === 'active')    active++;
            else if (s === 'paused')    paused++;
            else if (s === 'cancelled') cancelled++;
        }
        return { active, paused, cancelled, byType };
    });

    activeCount    = computed(() => this._stats().active);
    pausedCount    = computed(() => this._stats().paused);
    cancelledCount = computed(() => this._stats().cancelled);
    countByType    = computed(() => this._stats().byType);

    hasActiveFilters = computed(() =>
        !!this.searchQuery() || this.selectedType() !== null || this.selectedStatus() !== null
    );

    defaultCurrency = computed(() => {
        const txs = this.transactionStore.transactions();
        if (!txs.length) return 'USD';
        const freq: Record<string, number> = {};
        for (const t of txs) { const cur = t.currency ?? 'USD'; freq[cur] = (freq[cur] ?? 0) + 1; }
        return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    });

    upcomingBanner = computed(() => {
        const now = Date.now();
        const limit = 14 * 24 * 60 * 60 * 1000;
        return this.transactionStore.transactions()
            .filter(t => (t.type === 'recurring' || t.type === 'bill') && t.status !== 'cancelled' && !!t.date)
            .filter(t => { const diff = new Date(t.date).getTime() - now; return diff >= 0 && diff <= limit; })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    importPreviewCount = computed(() =>
        this.importText().trim().split('\n').filter(l => {
            const p = l.split(',').map(x => x.trim());
            return p.length >= 2 && p[0] && !isNaN(parseFloat(p[1]));
        }).length
    );

    filteredTransactions = computed(() => {
        const q = this.searchQuery().toLowerCase();
        let list = this.transactionStore.transactions();

        if (q) list = list.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q)
        );
        if (this.selectedType() !== null) list = list.filter(t => t.type === this.selectedType());
        if (this.selectedStatus() !== null) list = list.filter(t => (t.status ?? 'active') === this.selectedStatus());

        const col = this.sortCol();
        const dir = this.sortDir() === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => {
            if (col === 'name')   return dir * a.name.localeCompare(b.name);
            if (col === 'amount') return dir * (a.amount - b.amount);
            if (col === 'date')   return dir * (new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
            return 0;
        });
    });

    // ── Table config ──────────────────────────────────────────────────────
    readonly tableColumns: EnvTableColumn[] = [
        { key: 'service', header: 'Name',   type: 'avatar-text', sortable: true },
        { key: 'type',    header: 'Type',   type: 'badge', badgeMap: {
            'recurring': { label: 'Recurring',  dotColor: '#60a5fa', bgColor: 'rgba(96,165,250,0.1)',  textColor: '#60a5fa' },
            'one-time':  { label: 'One-time',   dotColor: '#a78bfa', bgColor: 'rgba(167,139,250,0.1)', textColor: '#a78bfa' },
            'bill':      { label: 'Bill',       dotColor: '#fb923c', bgColor: 'rgba(251,146,60,0.1)',  textColor: '#fb923c' },
            'purchase':  { label: 'Purchase',   dotColor: '#4ade80', bgColor: 'rgba(74,222,128,0.1)',  textColor: '#4ade80' },
            'refund':    { label: 'Refund',     dotColor: '#34d399', bgColor: 'rgba(52,211,153,0.1)',  textColor: '#34d399' },
        }},
        { key: 'amount',  header: 'Amount', sortable: true },
        { key: 'date',    header: 'Date',   sortable: true },
        { key: 'status',  header: 'Status', type: 'badge', badgeMap: {
            active:    { label: 'Active',    dotColor: '#4ade80', bgColor: 'rgba(74,222,128,0.1)',  textColor: '#4ade80'  },
            paused:    { label: 'Paused',    dotColor: '#fbbf24', bgColor: 'rgba(251,191,36,0.1)',  textColor: '#fbbf24'  },
            cancelled: { label: 'Cancelled', dotColor: '#94a3b8', bgColor: 'rgba(148,163,184,0.1)', textColor: '#94a3b8'  },
            completed: { label: 'Completed', dotColor: '#60a5fa', bgColor: 'rgba(96,165,250,0.1)',  textColor: '#60a5fa'  },
        }},
    ];

    readonly tableActions: EnvTableAction[] = [
        { key: 'edit',   label: 'Edit',   icon: 'edit',   bulk: false },
        { key: 'delete', label: 'Delete', icon: 'delete', danger: true },
    ];

    tableRows = computed(() =>
        this.filteredTransactions().map(t => ({
            id:      t.id,
            service: { name: t.name },
            type:    t.type,
            amount:  `${currencySymbol(t.currency)}${t.amount.toFixed(2)}${t.type === 'recurring' && t.billingCycle ? '/' + t.billingCycle.slice(0, 2) : ''}`,
            date:    this.formatDateDisplay(t),
            status:  t.status || 'active',
            _tx:     t,
        }))
    );

    handleTableAction(event: EnvTableActionEvent) {
        const t = event.row['_tx'] as Transaction;
        if (!t) return;
        switch (event.actionKey) {
            case 'edit':   this.navigateToTx(t.id); break;
            case 'delete': this.deleteConfirmId.set(t.id); break;
        }
    }

    handleBulkAction(event: { selectedIds: Set<unknown>; actionKey: string }) {
        if (event.actionKey === 'delete') this.bulkDeleteConfirm.set([...event.selectedIds] as string[]);
    }

    async confirmBulkDelete() {
        const ids = this.bulkDeleteConfirm();
        if (ids) { for (const id of ids) await this.transactionStore.delete(id); }
        this.bulkDeleteConfirm.set(null);
    }

    handleTableSort(event: EnvTableSortEvent) {
        const colMap: Record<string, 'name' | 'amount' | 'date'> = {
            service: 'name', amount: 'amount', date: 'date',
        };
        const col = colMap[event.key];
        if (col) { this.sortCol.set(col); this.sortDir.set(event.direction); }
    }

    private formatDateDisplay(t: Transaction): string {
        if (!t.date) return '—';
        const d = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (t.type !== 'recurring' && t.type !== 'bill') return d;
        const days = this.daysUntil(t.date);
        if (days === null || t.status === 'cancelled') return d;
        if (days === 0) return `${d} · today`;
        return `${d} · in ${days}d`;
    }

    typeMeta(type: TransactionType) { return TYPE_META[type]; }

    // ── Slider ────────────────────────────────────────────────────────────
    openAddForm()            { this.sliderTxId.set(null); this.showSlider.set(true); }
    navigateToTx(id: string) { this.sliderTxId.set(id);  this.showSlider.set(true); }
    closeSlider()            { this.showSlider.set(false); this.sliderTxId.set(null); }

    // ── Filter helpers ────────────────────────────────────────────────────
    toggleTypeFilter(type: TransactionType) {
        this.selectedType.set(this.selectedType() === type ? null : type);
    }
    toggleStatusFilter(status: string) {
        this.selectedStatus.set(this.selectedStatus() === status ? null : status);
    }
    clearFilters() {
        this.searchQuery.set('');
        this.selectedType.set(null);
        this.selectedStatus.set(null);
    }

    // ── Delete ────────────────────────────────────────────────────────────
    async doDelete(id: string) {
        await this.transactionStore.delete(id);
        this.deleteConfirmId.set(null);
    }

    async cycleStatus(t: Transaction) {
        const order: Transaction['status'][] = ['active', 'paused', 'cancelled', 'completed'];
        const idx = order.indexOf(t.status ?? 'active');
        await this.transactionStore.update(t.id, { status: order[(idx + 1) % order.length] });
    }

    // ── Bulk import ───────────────────────────────────────────────────────
    async parseAndImport() {
        const typeOptions: TransactionType[] = ['recurring', 'one-time', 'bill', 'purchase', 'refund'];
        const lines = this.importText().trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 2) continue;
            const name   = parts[0];
            const amount = parseFloat(parts[1]);
            if (!name || isNaN(amount)) continue;

            const typeRaw  = (parts[2] ?? 'recurring').toLowerCase() as TransactionType;
            const type: TransactionType = typeOptions.includes(typeRaw) ? typeRaw : 'recurring';
            const preset   = VENDOR_PRESETS[name.toLowerCase()];
            const category = parts[3] || preset?.category || '';
            const currency = parts[4] || preset?.currency || 'USD';
            const cycle: 'monthly' | 'yearly' = (parts[5] ?? 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';

            await this.transactionStore.add({
                id:          crypto.randomUUID(),
                name, type, amount, category, currency,
                date:         autoDate(type === 'recurring' ? cycle : 'monthly'),
                billingCycle: type === 'recurring' ? cycle : undefined,
                status:       'active',
            });
        }
        this.showImportModal.set(false);
        this.importText.set('');
    }

    // ── Display helpers ───────────────────────────────────────────────────
    daysUntil(dateStr: string): number | null {
        if (!dateStr) return null;
        const diff = new Date(dateStr).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 ? days : null;
    }

    // ── AI Assistant ──────────────────────────────────────────────────────
    toggleAssistant() { this.showAssistant.update(v => !v); }
    clearAiChat()     { this.aiMessages.set([]); }

    async sendAiMessage(text: string) {
        if (!text || this.aiLoading()) return;
        this.aiMessages.update(m => [...m, { role: 'user', text }]);
        this.aiLoading.set(true);

        await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

        const txs    = this.transactionStore.transactions();
        const active = txs.filter(t => !t.status || t.status === 'active');
        const q      = text.toLowerCase();
        let response = '';

        if (q.includes('total') || q.includes('spend') || q.includes('cost')) {
            const mo  = this.transactionStore.totalMonthlyCost();
            const yr  = this.transactionStore.totalYearlyCost();
            const sym = currencySymbol(this.defaultCurrency());
            const rec = txs.filter(t => t.type === 'recurring' && t.status === 'active').length;
            response = `Your recurring monthly spend is **${sym}${mo.toFixed(2)}/mo** (${sym}${yr.toFixed(2)}/yr) across ${rec} active recurring transaction${rec !== 1 ? 's' : ''}.`;
        } else if (q.includes('due') || q.includes('renew') || q.includes('soon') || q.includes('upcoming')) {
            const upcoming = this.upcomingBanner();
            response = upcoming.length
                ? `${upcoming.length} transaction${upcoming.length > 1 ? 's are' : ' is'} due in the next 14 days: ${upcoming.map(t => `${t.name} (${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`).join(', ')}.`
                : `Nothing due in the next 14 days.`;
        } else if (q.includes('expensive') || q.includes('highest')) {
            const top = [...active.filter(t => t.type === 'recurring')].sort((a, b) => {
                const ma = a.billingCycle === 'yearly' ? a.amount / 12 : a.amount;
                const mb = b.billingCycle === 'yearly' ? b.amount / 12 : b.amount;
                return mb - ma;
            }).slice(0, 5);
            response = top.length
                ? `Top 5 recurring by monthly cost:\n${top.map((t, i) => `${i + 1}. ${t.name} — ${currencySymbol(t.currency)}${(t.billingCycle === 'yearly' ? t.amount / 12 : t.amount).toFixed(2)}/mo`).join('\n')}`
                : `No active recurring transactions to rank.`;
        } else if (q.includes('type') || q.includes('breakdown')) {
            const counts = this.countByType();
            const lines = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([type, n]) => `${TYPE_META[type as TransactionType]?.label ?? type}: ${n}`);
            response = lines.length ? `Breakdown by type:\n${lines.join('\n')}` : `No transactions yet.`;
        } else if (q.includes('refund')) {
            const refunds = txs.filter(t => t.type === 'refund');
            const total   = refunds.reduce((s, t) => s + t.amount, 0);
            response = refunds.length
                ? `You have ${refunds.length} refund${refunds.length > 1 ? 's' : ''} totalling ${currencySymbol(this.defaultCurrency())}${total.toFixed(2)}: ${refunds.map(t => t.name).join(', ')}.`
                : `No refunds recorded yet.`;
        } else {
            const mo  = this.transactionStore.totalMonthlyCost();
            const sym = currencySymbol(this.defaultCurrency());
            response = `You have ${txs.length} transaction${txs.length !== 1 ? 's' : ''} (${active.length} active). Recurring monthly spend: ${sym}${mo.toFixed(2)}/mo. Try asking about total spend, upcoming due dates, most expensive services, a type breakdown, or refunds.`;
        }

        this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
        this.aiLoading.set(false);
    }
}
