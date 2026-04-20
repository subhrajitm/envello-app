import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionStore } from '@envello/state';
import { Subscription } from '@envello/domain';
import { ModalComponent } from '@envello/ui';

const CATEGORY_COLORS: Record<string, string> = {
    software:    '#60a5fa',
    infrastructure: '#a78bfa',
    design:      '#f472b6',
    marketing:   '#4ade80',
    security:    '#fb923c',
    analytics:   '#fbbf24',
    communication: '#34d399',
    finance:     '#e879f9',
    other:       '#94a3b8',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
    paused:    { label: 'Paused',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    cancelled: { label: 'Cancelled', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

@Component({
    selector: 'app-vendor',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent],
    template: `
    <div class="orbit-page">


      <header class="orbit-header">
        <div class="orbit-header-left">
          <h1 class="orbit-title">Subscriptions</h1>
          <p class="orbit-subtitle">Check out the most recent list of subscriptions!</p>
        </div>
        <div class="orbit-header-right">
          <div class="orbit-search-wrap">
            <span class="material-symbols-outlined orbit-search-icon">search</span>
            <input class="orbit-search-input" type="text"
              [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
              placeholder="Search here...">
          </div>
          <button class="orbit-icon-btn" (click)="clearFilters()">
            <span class="material-symbols-outlined">filter_list</span>
          </button>
          <button class="orbit-icon-btn orbit-date-btn">
            <span class="material-symbols-outlined">calendar_today</span>
            <span>Timeline</span>
          </button>
          
          <div class="orbit-add-dropdown-container group relative">
            <button class="orbit-btn-primary" (click)="openAddForm()">
              Add Subscription
              <span class="material-symbols-outlined icon-right">expand_more</span>
            </button>
            <div class="orbit-dropdown-menu absolute top-full right-0 mt-2 hidden group-hover:flex flex-col z-50 shadow-lg">
               <button class="orbit-dropdown-item" (click)="openAddForm()">
                 <span class="material-symbols-outlined">add</span> Add Manual
               </button>
               <button class="orbit-dropdown-item ai-item">
                 <span class="material-symbols-outlined text-green">auto_awesome</span> Generate with AI
               </button>
            </div>
          </div>
        </div>
      </header>

      @if (formMode() !== null) {
      <env-modal 
        [isOpen]="true" 
        [title]="formMode() === 'add' ? 'New Subscription' : 'Edit Subscription'" 
        size="large" 
        (closed)="closeForm()">
        <div header style="display:flex; align-items:center; margin-left: 8px;">
          <span class="material-symbols-outlined" style="color:var(--accent-primary);font-size:18px">
            {{ formMode() === 'add' ? 'add_circle' : 'edit' }}
          </span>
        </div>
        <div body class="vendor-form-body">
          <div class="vendor-form-row">
            <div class="form-group" style="flex:2;margin:0">
              <label class="form-label">Vendor / Service Name</label>
              <input type="text" class="form-input"
                [ngModel]="formName()" (ngModelChange)="formName.set($event)"
                placeholder="e.g. AWS, GitHub, Figma">
            </div>
            <div class="form-group" style="flex:1;margin:0">
              <label class="form-label">Category</label>
              <input type="text" class="form-input" list="cat-list"
                [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)"
                placeholder="software">
              <datalist id="cat-list">
                @for (c of categoryOptions; track c) { <option [value]="c"> }
              </datalist>
            </div>
            <div class="form-group" style="flex:1;margin:0">
              <label class="form-label">Project Scope</label>
              <input type="text" class="form-input"
                [ngModel]="formProjectId()" (ngModelChange)="formProjectId.set($event)"
                placeholder="global">
            </div>
          </div>
          <div class="vendor-form-row" style="margin-top:10px">
            <div class="form-group" style="width:110px;margin:0">
              <label class="form-label">Price</label>
              <input type="number" step="0.01" min="0" class="form-input"
                [ngModel]="formPrice()" (ngModelChange)="formPrice.set($event)"
                placeholder="0.00">
            </div>
            <div class="form-group" style="width:80px;margin:0">
              <label class="form-label">Currency</label>
              <select class="form-select"
                [ngModel]="formCurrency()" (ngModelChange)="formCurrency.set($event)">
                @for (cur of currencies; track cur) { <option [value]="cur">{{ cur }}</option> }
              </select>
            </div>
            <div class="form-group" style="width:130px;margin:0">
              <label class="form-label">Billing Cycle</label>
              <select class="form-select"
                [ngModel]="formCycle()" (ngModelChange)="formCycle.set($event)">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div class="form-group" style="width:155px;margin:0">
              <label class="form-label">Next Renewal</label>
              <input type="date" class="form-input"
                [ngModel]="formRenewal()" (ngModelChange)="formRenewal.set($event)">
            </div>
             <div class="form-group" style="width:130px;margin:0">
              <label class="form-label">Status</label>
              <select class="form-select"
                [ngModel]="formStatus()" (ngModelChange)="formStatus.set($event)">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;margin:0">
              <label class="form-label">Notes</label>
              <input type="text" class="form-input"
                [ngModel]="formNotes()" (ngModelChange)="formNotes.set($event)"
                placeholder="Optional notes…">
            </div>
          </div>
        </div>
        <div footer class="vendor-form-actions" style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
          <button class="vendor-cancel-btn" (click)="closeForm()" style="padding:8px 16px; background:transparent; border:1px solid var(--border-subtle); color:var(--text-secondary); border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">
            Cancel
          </button>
          <button class="vendor-save-btn" (click)="saveForm()"
            [disabled]="!formName() || !formRenewal()">
            <span class="material-symbols-outlined">save</span>
            {{ formMode() === 'add' ? 'Save' : 'Update' }}
          </button>
        </div>
      </env-modal>
      }

      <div class="orbit-table-container">
        @if (filteredSubs().length > 0) {
        <table class="orbit-table">
          <thead>
            <tr>
              <th (click)="setSort('name')" class="sortable">
                Client Name <span class="material-symbols-outlined sort-icon">unfold_more</span>
              </th>
              <th>Category</th>
              <th (click)="setSort('price')" class="sortable">
                Amount <span class="material-symbols-outlined sort-icon">unfold_more</span>
              </th>
              <th>Cycle</th>
              <th (click)="setSort('renewalDate')" class="sortable">
                Next Renewal <span class="material-symbols-outlined sort-icon">unfold_more</span>
              </th>
              <th>Status</th>
              <th>Scope</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (sub of filteredSubs(); track sub.id) {
            <tr class="orbit-row" [class.paused]="sub.status === 'paused'" [class.cancelled]="sub.status === 'cancelled'">
              <td>
                <div class="orbit-name-cell">
                  <div class="orbit-avatar" [style.background]="avatarBg(sub.name)">
                    <span class="avatar-text">{{ sub.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div>
                    <div class="orbit-vendor-name">{{ sub.name }}</div>
                    @if (sub.notes) { <div class="orbit-vendor-notes">{{ sub.notes }}</div> }
                  </div>
                </div>
              </td>
              <td><span class="orbit-text capitalize">{{ sub.category || '—' }}</span></td>
              <td><span class="orbit-price-text">{{ currencySymbol(sub.currency) }}{{ sub.price | number:'1.2-2' }}</span></td>
              <td><span class="orbit-text capitalize">{{ sub.billingCycle }}</span></td>
              <td>
                <div class="orbit-renewal-wrap">
                  <span class="orbit-text">{{ formatDate(sub.renewalDate) }}</span>
                  @if (isUpcoming(sub.renewalDate) && sub.status !== 'cancelled') {
                    <span class="orbit-badge-warn">Soon</span>
                  }
                </div>
              </td>
              <td>
                 <span class="orbit-status-badge" 
                    [style.color]="statusMeta(sub.status).color"
                    [style.background]="statusMeta(sub.status).bg">
                    {{ statusMeta(sub.status).label }}
                 </span>
              </td>
              <td><span class="orbit-text">{{ sub.projectId || '—' }}</span></td>
              <td class="orbit-actions-cell">
                 @if (deleteConfirmId() === sub.id) {
                    <div class="orbit-confirm">
                       <button class="orbit-btn-danger" (click)="doDelete(sub.id)">Y</button>
                       <button class="orbit-btn-cancel" (click)="deleteConfirmId.set(null)">N</button>
                    </div>
                 } @else {
                    <div class="orbit-row-actions relative group/actions">
                       <button class="orbit-more-btn">
                         <span class="material-symbols-outlined">more_vert</span>
                       </button>
                       <div class="orbit-actions-dropdown absolute right-0 top-[80%] hidden group-hover/actions:flex flex-col z-[100]">
                          <button class="orbit-dropdown-item" (click)="openEditForm(sub)">
                            <span class="material-symbols-outlined icon-[16px]">edit</span> Edit
                          </button>
                          <div class="dropdown-divider"></div>
                          <button class="orbit-dropdown-item text-red" (click)="deleteConfirmId.set(sub.id)">
                             <span class="material-symbols-outlined icon-[16px]">delete</span> Delete
                          </button>
                       </div>
                    </div>
                 }
              </td>
            </tr>
            }
          </tbody>
        </table>
        } @else {
           <div class="orbit-empty">
             <span class="material-symbols-outlined orbit-empty-icon">search_off</span>
             <p class="orbit-empty-title">No subscriptions found</p>
             <button class="orbit-clear-btn" (click)="clearFilters()">Clear Filters</button>
           </div>
        }
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; height: 100vh; background: var(--bg-app); overflow: hidden; }
    
    .orbit-page {
      display: flex; flex-direction: column; height: 100%;
      padding: 24px 32px 20px; box-sizing: border-box;
      background: var(--bg-app);
      color: var(--text-primary);
    }
    
    .icon-sm { font-size: 16px; }
    .icon-right { margin-left: auto; }
    .capitalize { text-transform: capitalize; }
    .text-green { color: #4ade80 !important; }
    .text-red { color: var(--accent-red) !important; }
    .icon-\\[16px\\] { font-size: 16px; }

    .orbit-workspace {
      display: inline-flex; align-items: center; gap: 8px; margin-bottom: 24px;
      color: var(--text-secondary); cursor: pointer;
    }
    .orbit-workspace-text { display: flex; flex-direction: column; }
    .orbit-workspace-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; color: var(--text-primary); }
    .orbit-workspace-plan { font-size: 11px; color: var(--text-tertiary); }
    
    .orbit-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-bottom: 24px; flex-shrink: 0;
    }
    .orbit-title { font-size: 28px; font-weight: 500; margin: 0; letter-spacing: -0.5px; }
    .orbit-subtitle { font-size: 13px; color: var(--text-tertiary); margin: 6px 0 0; }
    
    .orbit-header-right { display: flex; align-items: center; gap: 12px; }
    
    .orbit-search-wrap { position: relative; display: flex; align-items: center; }
    .orbit-search-icon { position: absolute; left: 12px; font-size: 18px; color: var(--text-tertiary); pointer-events: none; }
    .orbit-search-input {
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      border-radius: 8px; padding: 10px 16px 10px 38px;
      font-size: 13px; color: var(--text-primary); outline: none; width: 240px;
      transition: all 0.2s;
    }
    .orbit-search-input:focus { background: var(--bg-panel); border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-dim); }
    
    .orbit-icon-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      height: 38px; padding: 0 12px; background: transparent; border: 1px solid var(--border-subtle);
      border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500;
    }
    .orbit-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-main); }
    
    .orbit-add-dropdown-container { position: relative; z-index: 50; }
    .orbit-btn-primary {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      height: 38px; padding: 0 16px; background: #111; color: #fff;
      border: 1px solid #222; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;
      min-width: 150px;
    }
    :root[class~="dark"] .orbit-btn-primary { background: var(--text-primary); color: var(--bg-app); border-color: var(--text-secondary); }
    .orbit-btn-primary:hover { opacity: 0.9; }
    
    .orbit-dropdown-menu {
      width: 100%; min-width: 160px; padding: 6px; background: var(--bg-panel);
      border: 1px solid var(--border-subtle); border-radius: 8px;
    }
    .orbit-dropdown-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; width: 100%;
      background: transparent; border: none; border-radius: 6px; color: var(--text-secondary);
      font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.15s;
    }
    .orbit-dropdown-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .ai-item { background: rgba(74,222,128,0.05); color: #4ade80; }
    .ai-item:hover { background: rgba(74,222,128,0.1); color: #4ade80; }
    
    .dropdown-divider { height: 1px; background: var(--border-subtle); margin: 4px 0; }
    
    /* Table Panel */
    .orbit-table-container {
      flex: 1; overflow-y: auto; overflow-x: auto;
      background: var(--bg-app); border-radius: 8px;
      padding-bottom: 40px;
    }
    .orbit-table { width: 100%; border-collapse: collapse; text-align: left; }
    .orbit-table thead { position: sticky; top: 0; background: var(--bg-app); z-index: 10; }
    .orbit-table th {
      padding: 12px 16px; font-size: 11px; font-weight: 500; color: var(--text-tertiary);
      border-bottom: 1px solid var(--border-subtle); border-top: 1px solid var(--border-subtle);
      white-space: nowrap; user-select: none;
    }
    .orbit-table th.sortable { cursor: pointer; transition: color 0.2s; }
    .orbit-table th.sortable:hover { color: var(--text-secondary); }
    .sort-icon { font-size: 14px; vertical-align: middle; margin-left: 2px; opacity: 0.4; }
    
    .orbit-row { transition: background 0.2s; border-bottom: 1px solid var(--border-subtle); }
    .orbit-row:hover { background: rgba(255,255,255,0.02); }
    .orbit-row.paused { opacity: 0.7; }
    .orbit-row.cancelled { opacity: 0.4; }
    
    .orbit-table td { padding: 14px 16px; vertical-align: middle; }
    
    .orbit-name-cell { display: flex; align-items: center; gap: 12px; }
    .orbit-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .avatar-text { font-size: 14px; font-weight: 600; }
    .orbit-vendor-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .orbit-vendor-notes { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
    
    .orbit-text { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
    .orbit-price-text { font-size: 13px; font-weight: 600; color: var(--text-primary); font-family: var(--font-mono, monospace); }
    
    .orbit-renewal-wrap { display: flex; align-items: center; gap: 8px; }
    .orbit-badge-warn {
      padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;
      background: rgba(248,113,113,0.1); color: var(--accent-red); border: 1px solid rgba(248,113,113,0.2);
    }
    
    .orbit-status-badge {
      display: inline-block; padding: 4px 8px; border-radius: 6px;
      font-size: 10px; font-weight: 600; text-transform: capitalize;
    }
    
    .orbit-actions-cell { text-align: right; width: 60px; padding-right: 24px !important; }
    .orbit-more-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: 6px; color: var(--text-tertiary); cursor: pointer; transition: all 0.2s;
    }
    .orbit-more-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    
    .orbit-actions-dropdown { min-width: 140px; padding: 4px; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 8px; }
    
    .orbit-confirm { display: flex; gap: 6px; justify-content: flex-end; }
    .orbit-btn-danger, .orbit-btn-cancel {
      padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid transparent;
    }
    .orbit-btn-danger { background: rgba(248,113,113,0.1); color: var(--accent-red); border-color: rgba(248,113,113,0.3); }
    .orbit-btn-danger:hover { background: rgba(248,113,113,0.2); }
    .orbit-btn-cancel { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--border-subtle); }
    
    .orbit-empty { padding: 60px 20px; text-align: center; color: var(--text-tertiary); }
    .orbit-empty-icon { font-size: 32px; opacity: 0.5; margin-bottom: 12px; }
    .orbit-empty-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .orbit-clear-btn { margin-top: 16px; padding: 8px 16px; background: var(--bg-hover); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 500; }
    .orbit-clear-btn:hover { color: var(--text-primary); }
    
    /* Legacy Form Panel styles needed for Add/Edit */
    .vendor-form-panel { background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; margin-bottom: 24px; animation: slideDown 0.2s ease; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .vendor-form-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle); }
    .vendor-form-body { padding: 16px; }
    .vendor-form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .form-group { display: flex; flex-direction: column; }
    .form-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 6px; }
    .form-input, .form-select { background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 8px 12px; font-size: 13px; color: var(--text-primary); height: 38px; outline: none; }
    .form-input:focus, .form-select:focus { border-color: var(--accent-primary); }
    .form-select { -webkit-appearance: none; cursor: pointer; }
    .vendor-form-actions { display: flex; align-items: flex-end; }
    .vendor-save-btn { padding: 8px 16px; background: var(--accent-primary); color: var(--accent-primary-text); border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .vendor-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class VendorComponent {
    public subscriptionStore = inject(SubscriptionStore);

    readonly categoryOptions = ['software', 'infrastructure', 'design', 'marketing', 'security', 'analytics', 'communication', 'finance', 'other'];
    readonly currencies = CURRENCIES;

    // Filter state
    searchQuery    = signal('');
    selectedStatus   = signal<string | null>(null);
    selectedCycle    = signal<'monthly' | 'yearly' | null>(null);
    selectedCategory = signal<string | null>(null);

    // Sort state
    sortCol = signal<'name' | 'price' | 'renewalDate'>('renewalDate');
    sortDir = signal<'asc' | 'desc'>('asc');

    // Form state
    formMode       = signal<'add' | 'edit' | null>(null);
    editingId      = signal<string | null>(null);
    formName       = signal('');
    formCategory   = signal('software');
    formProjectId  = signal('global');
    formPrice      = signal<number>(0);
    formCurrency   = signal('USD');
    formCycle      = signal<'monthly' | 'yearly'>('monthly');
    formRenewal    = signal('');
    formStatus     = signal<'active' | 'paused' | 'cancelled'>('active');
    formNotes      = signal('');

    // Delete confirm
    deleteConfirmId = signal<string | null>(null);

    // Computed
    activeCount = computed(() =>
        this.subscriptionStore.subscriptions().filter(s => !s.status || s.status === 'active').length
    );
    upcomingCount = computed(() => this.subscriptionStore.upcomingRenewals().length);

    allCategories = computed(() => {
        const cats = new Set<string>();
        for (const s of this.subscriptionStore.subscriptions()) {
            if (s.category) cats.add(s.category);
        }
        return [...cats].sort();
    });

    filteredSubs = computed(() => {
        const q = this.searchQuery().toLowerCase();
        let list = this.subscriptionStore.subscriptions();

        if (q) {
            list = list.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.category?.toLowerCase().includes(q) ||
                s.projectId?.toLowerCase().includes(q) ||
                s.notes?.toLowerCase().includes(q)
            );
        }
        if (this.selectedStatus() !== null) {
            const st = this.selectedStatus()!;
            list = list.filter(s => (s.status ?? 'active') === st);
        }
        if (this.selectedCycle() !== null) {
            list = list.filter(s => s.billingCycle === this.selectedCycle());
        }
        if (this.selectedCategory() !== null) {
            list = list.filter(s => s.category === this.selectedCategory());
        }

        const col = this.sortCol();
        const dir = this.sortDir() === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => {
            if (col === 'name') return dir * a.name.localeCompare(b.name);
            if (col === 'price') return dir * (a.price - b.price);
            if (col === 'renewalDate') return dir * (new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
            return 0;
        });
    });

    @HostListener('document:click')
    onDocumentClick() {
        this.deleteConfirmId.set(null);
    }

    // Filter helpers
    toggleStatusFilter(status: string) {
        this.selectedStatus.set(this.selectedStatus() === status ? null : status);
    }
    toggleCycleFilter(cycle: 'monthly' | 'yearly') {
        this.selectedCycle.set(this.selectedCycle() === cycle ? null : cycle);
    }
    toggleCategoryFilter(cat: string) {
        this.selectedCategory.set(this.selectedCategory() === cat ? null : cat);
    }
    clearFilters() {
        this.searchQuery.set('');
        this.selectedStatus.set(null);
        this.selectedCycle.set(null);
        this.selectedCategory.set(null);
    }

    // Sort
    setSort(col: 'name' | 'price' | 'renewalDate') {
        if (this.sortCol() === col) {
            this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            this.sortCol.set(col);
            this.sortDir.set('asc');
        }
    }
    sortIndicator(col: string): string {
        if (this.sortCol() !== col) return '';
        return this.sortDir() === 'asc' ? '↑' : '↓';
    }

    // Form
    openAddForm() {
        if (this.formMode() !== null) { this.closeForm(); return; }
        this.resetForm();
        this.formMode.set('add');
    }
    openEditForm(sub: Subscription) {
        this.editingId.set(sub.id);
        this.formName.set(sub.name);
        this.formCategory.set(sub.category ?? 'software');
        this.formProjectId.set(sub.projectId ?? 'global');
        this.formPrice.set(sub.price);
        this.formCurrency.set(sub.currency ?? 'USD');
        this.formCycle.set(sub.billingCycle);
        this.formRenewal.set(sub.renewalDate ? new Date(sub.renewalDate).toISOString().split('T')[0] : '');
        this.formStatus.set(sub.status ?? 'active');
        this.formNotes.set(sub.notes ?? '');
        this.formMode.set('edit');
    }
    closeForm() {
        this.formMode.set(null);
        this.resetForm();
    }
    private resetForm() {
        this.editingId.set(null);
        this.formName.set('');
        this.formCategory.set('software');
        this.formProjectId.set('global');
        this.formPrice.set(0);
        this.formCurrency.set('USD');
        this.formCycle.set('monthly');
        this.formRenewal.set('');
        this.formStatus.set('active');
        this.formNotes.set('');
    }

    async saveForm() {
        if (!this.formName() || !this.formRenewal()) return;
        const payload: Partial<Subscription> = {
            name:         this.formName(),
            category:     this.formCategory() || 'software',
            projectId:    this.formProjectId() || undefined,
            price:        Number(this.formPrice()),
            currency:     this.formCurrency(),
            billingCycle: this.formCycle(),
            renewalDate:  new Date(this.formRenewal()).toISOString(),
            status:       this.formStatus(),
            notes:        this.formNotes() || undefined,
        };

        if (this.formMode() === 'add') {
            await this.subscriptionStore.addSubscription({ id: crypto.randomUUID(), ...payload } as Subscription);
        } else if (this.formMode() === 'edit' && this.editingId()) {
            await this.subscriptionStore.updateSubscription(this.editingId()!, payload);
        }
        this.closeForm();
    }

    async doDelete(id: string) {
        await this.subscriptionStore.deleteSubscription(id);
        this.deleteConfirmId.set(null);
    }

    // Display helpers
    isUpcoming(date: string): boolean {
        return this.subscriptionStore.upcomingRenewals().some((s: Subscription) => s.renewalDate === date);
    }

    daysUntil(dateStr: string): number | null {
        if (!dateStr) return null;
        const diff = new Date(dateStr).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 ? days : null;
    }

    formatDate(iso: string): string {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    avatarBg(name: string): string {
        const colors = ['#60a5fa','#4ade80','#fbbf24','#a855f7','#fb923c','#f472b6','#34d399','#e879f9'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    catColor(cat: string): string {
        return CATEGORY_COLORS[cat.toLowerCase()] ?? '#94a3b8';
    }
    statusMeta(status: string | undefined | null): { label: string; color: string; bg: string } {
        return STATUS_META[status || 'active'] ?? STATUS_META['active'];
    }

    currencySymbol(currency: string | undefined): string {
        const map: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', INR: '₹', JPY: '¥' };
        return map[currency ?? 'USD'] ?? '$';
    }
}
