import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionStore } from '@envello/state';
import { Subscription } from '@envello/domain';

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
    imports: [CommonModule, FormsModule],
    template: `
    <div class="vendor-page">

      <!-- Page Header -->
      <header class="vendor-header">
        <div class="vendor-header-left">
          <div class="vendor-header-icon">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <div>
            <h1 class="vendor-title">Subscriptions & Vendors</h1>
            <p class="vendor-subtitle">Track SaaS spend and upcoming renewals across your workspace.</p>
          </div>
        </div>
        <div class="vendor-header-right">
          <div class="vendor-search-wrap">
            <span class="material-symbols-outlined vendor-search-icon">search</span>
            <input class="vendor-search-input" type="text"
              [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
              placeholder="Search subscriptions…">
            @if (searchQuery()) {
              <button class="vendor-search-clear" (click)="searchQuery.set('')">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>
          <button class="vendor-add-btn" (click)="openAddForm()"
            [class.vendor-add-btn--cancel]="formMode() !== null">
            <span class="material-symbols-outlined">{{ formMode() !== null ? 'close' : 'add' }}</span>
            {{ formMode() !== null ? 'Cancel' : 'Add Subscription' }}
          </button>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="vendor-stats-row">
        <div class="vendor-stat-card">
          <div class="vendor-stat-icon" style="background:rgba(96,165,250,0.1);border-color:rgba(96,165,250,0.2)">
            <span class="material-symbols-outlined" style="color:#60a5fa">inventory_2</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Active Subscriptions</div>
            <div class="vendor-stat-value" style="color:#60a5fa">{{ activeCount() }}</div>
          </div>
        </div>
        <div class="vendor-stat-card">
          <div class="vendor-stat-icon" style="background:rgba(74,222,128,0.1);border-color:rgba(74,222,128,0.2)">
            <span class="material-symbols-outlined" style="color:#4ade80">calendar_month</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Monthly Spend</div>
            <div class="vendor-stat-value" style="color:#4ade80">\${{ subscriptionStore.totalMonthlyCost() | number:'1.2-2' }}</div>
          </div>
          <div class="vendor-stat-badge">/ mo</div>
        </div>
        <div class="vendor-stat-card">
          <div class="vendor-stat-icon" style="background:rgba(251,191,36,0.1);border-color:rgba(251,191,36,0.2)">
            <span class="material-symbols-outlined" style="color:#fbbf24">trending_up</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Yearly Extrapolation</div>
            <div class="vendor-stat-value" style="color:#fbbf24">\${{ subscriptionStore.totalYearlyCost() | number:'1.2-2' }}</div>
          </div>
          <div class="vendor-stat-badge">/ yr</div>
        </div>
        <div class="vendor-stat-card" [class.vendor-stat-card--warn]="upcomingCount() > 0">
          <div class="vendor-stat-icon"
            [style.background]="upcomingCount() > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(161,161,170,0.1)'"
            [style.border-color]="upcomingCount() > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(161,161,170,0.2)'">
            <span class="material-symbols-outlined"
              [style.color]="upcomingCount() > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)'">notification_important</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Upcoming Renewals</div>
            <div class="vendor-stat-value"
              [style.color]="upcomingCount() > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)'">{{ upcomingCount() }}</div>
          </div>
          @if (upcomingCount() > 0) {
            <div class="vendor-stat-badge vendor-stat-badge--warn">≤ 7 days</div>
          }
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="vendor-filters">
        <div class="filter-group">
          <button class="filter-chip" [class.filter-chip--active]="selectedStatus() === null"
            (click)="selectedStatus.set(null)">
            All <span class="chip-count">{{ subscriptionStore.subscriptions().length }}</span>
          </button>
          <button class="filter-chip filter-chip--status"
            [class.filter-chip--active]="selectedStatus() === 'active'"
            (click)="toggleStatusFilter('active')">
            <span class="status-dot" style="background:#4ade80"></span>Active
          </button>
          <button class="filter-chip filter-chip--status"
            [class.filter-chip--active]="selectedStatus() === 'paused'"
            (click)="toggleStatusFilter('paused')">
            <span class="status-dot" style="background:#fbbf24"></span>Paused
          </button>
          <button class="filter-chip filter-chip--status"
            [class.filter-chip--active]="selectedStatus() === 'cancelled'"
            (click)="toggleStatusFilter('cancelled')">
            <span class="status-dot" style="background:#94a3b8"></span>Cancelled
          </button>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group">
          <button class="filter-chip" [class.filter-chip--active]="selectedCycle() === null"
            (click)="selectedCycle.set(null)">Cycle: All</button>
          <button class="filter-chip" [class.filter-chip--active]="selectedCycle() === 'monthly'"
            (click)="toggleCycleFilter('monthly')">Monthly</button>
          <button class="filter-chip" [class.filter-chip--active]="selectedCycle() === 'yearly'"
            (click)="toggleCycleFilter('yearly')">Yearly</button>
        </div>
        @if (allCategories().length > 0) {
          <div class="filter-divider"></div>
          <div class="filter-group">
            <button class="filter-chip" [class.filter-chip--active]="selectedCategory() === null"
              (click)="selectedCategory.set(null)">All Categories</button>
            @for (cat of allCategories(); track cat) {
              <button class="filter-chip"
                [class.filter-chip--active]="selectedCategory() === cat"
                (click)="toggleCategoryFilter(cat)">
                <span class="cat-dot" [style.background]="catColor(cat)"></span>{{ cat }}
              </button>
            }
          </div>
        }
      </div>

      <!-- Add / Edit Form Panel -->
      @if (formMode() !== null) {
      <div class="vendor-form-panel">
        <div class="vendor-form-header">
          <span class="material-symbols-outlined" style="color:var(--accent-primary);font-size:18px">
            {{ formMode() === 'add' ? 'add_circle' : 'edit' }}
          </span>
          <span style="font-weight:600;font-size:13px;color:var(--text-primary)">
            {{ formMode() === 'add' ? 'New Subscription' : 'Edit Subscription' }}
          </span>
        </div>
        <div class="vendor-form-body">
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
            <div class="vendor-form-actions">
              <button class="vendor-save-btn" (click)="saveForm()"
                [disabled]="!formName() || !formRenewal()">
                <span class="material-symbols-outlined">save</span>
                {{ formMode() === 'add' ? 'Save' : 'Update' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      }

      <!-- Table Panel -->
      <div class="vendor-table-panel">
        @if (filteredSubs().length > 0) {
        <table class="vendor-table">
          <thead>
            <tr>
              <th class="vendor-th-sort" (click)="setSort('name')">
                Vendor {{ sortIndicator('name') }}
              </th>
              <th>Category</th>
              <th class="vendor-th-sort" (click)="setSort('price')">
                Price {{ sortIndicator('price') }}
              </th>
              <th>Cycle</th>
              <th class="vendor-th-sort" (click)="setSort('renewalDate')">
                Next Renewal {{ sortIndicator('renewalDate') }}
              </th>
              <th>Status</th>
              <th>Scope</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (sub of filteredSubs(); track sub.id) {
            <tr class="vendor-row"
              [class.vendor-row--upcoming]="isUpcoming(sub.renewalDate)"
              [class.vendor-row--paused]="sub.status === 'paused'"
              [class.vendor-row--cancelled]="sub.status === 'cancelled'">
              <td>
                <div class="vendor-name-cell">
                  <div class="vendor-avatar" [style.background]="avatarBg(sub.name)">
                    {{ sub.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="vendor-name">{{ sub.name }}</div>
                    @if (sub.notes) {
                      <div class="vendor-row-notes">{{ sub.notes }}</div>
                    }
                    @if (isUpcoming(sub.renewalDate) && sub.status !== 'cancelled') {
                      <div class="vendor-upcoming-tag">Renewing soon</div>
                    }
                  </div>
                </div>
              </td>
              <td>
                @if (sub.category) {
                  <span class="vendor-cat-badge"
                    [style.color]="catColor(sub.category)"
                    [style.background]="catColor(sub.category) + '18'"
                    [style.border-color]="catColor(sub.category) + '40'">
                    {{ sub.category }}
                  </span>
                }
              </td>
              <td>
                <span class="vendor-price">{{ currencySymbol(sub.currency) }}{{ sub.price | number:'1.2-2' }}</span>
              </td>
              <td>
                <span class="vendor-cycle-badge" [class.vendor-cycle-badge--yearly]="sub.billingCycle === 'yearly'">
                  {{ sub.billingCycle }}
                </span>
              </td>
              <td>
                <div class="vendor-renewal-cell">
                  <span class="vendor-renewal-date" [class.vendor-renewal-date--warn]="isUpcoming(sub.renewalDate) && sub.status !== 'cancelled'">
                    {{ formatDate(sub.renewalDate) }}
                  </span>
                  @if (daysUntil(sub.renewalDate) !== null) {
                    <span class="vendor-days-chip" [class.vendor-days-chip--warn]="isUpcoming(sub.renewalDate) && sub.status !== 'cancelled'">
                      {{ daysUntil(sub.renewalDate) }}d
                    </span>
                  }
                </div>
              </td>
              <td>
                @if (sub.status && sub.status !== 'active') {
                  <span class="vendor-status-badge"
                    [style.color]="statusMeta(sub.status).color"
                    [style.background]="statusMeta(sub.status).bg"
                    [style.border-color]="statusMeta(sub.status).color + '40'">
                    {{ statusMeta(sub.status).label }}
                  </span>
                } @else {
                  <span class="vendor-status-badge vendor-status-badge--active">Active</span>
                }
              </td>
              <td>
                <span class="vendor-scope-badge">{{ sub.projectId || '—' }}</span>
              </td>
              <td class="vendor-td-actions">
                @if (deleteConfirmId() === sub.id) {
                  <div class="vendor-delete-confirm">
                    <span class="vendor-delete-confirm-text">Delete?</span>
                    <button class="vendor-confirm-yes" (click)="doDelete(sub.id)">Yes</button>
                    <button class="vendor-confirm-no" (click)="deleteConfirmId.set(null)">No</button>
                  </div>
                } @else {
                  <div class="vendor-row-actions">
                    <button class="vendor-action-btn" (click)="openEditForm(sub)" title="Edit">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="vendor-action-btn vendor-action-btn--danger" (click)="deleteConfirmId.set(sub.id)" title="Delete">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                }
              </td>
            </tr>
            }
          </tbody>
        </table>
        } @else if (searchQuery() || selectedStatus() !== null || selectedCycle() !== null || selectedCategory() !== null) {
        <div class="vendor-empty">
          <span class="material-symbols-outlined vendor-empty-icon">search_off</span>
          <p class="vendor-empty-title">No matching subscriptions</p>
          <p class="vendor-empty-sub">Try different filters or clear the search.</p>
          <button class="vendor-clear-filters-btn" (click)="clearFilters()">Clear Filters</button>
        </div>
        } @else {
        <div class="vendor-empty">
          <div class="vendor-empty-icon-wrap">
            <span class="material-symbols-outlined vendor-empty-icon">receipt_long</span>
          </div>
          <p class="vendor-empty-title">No subscriptions yet</p>
          <p class="vendor-empty-sub">Add your first vendor subscription to start tracking SaaS costs and renewal dates.</p>
          <button class="vendor-add-btn" style="margin-top:16px" (click)="openAddForm()">
            <span class="material-symbols-outlined">add</span>
            Add First Subscription
          </button>
        </div>
        }
      </div>

    </div>
  `,
    styles: [`
    :host { display: block; height: 100vh; background: var(--bg-app); overflow: hidden; }

    .vendor-page {
      display: flex; flex-direction: column;
      height: 100%; padding: 24px 28px 20px;
      gap: 14px; overflow: hidden;
    }

    /* Header */
    .vendor-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .vendor-header-left { display: flex; align-items: center; gap: 12px; }
    .vendor-header-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--accent-primary-dim); border: 1px solid var(--accent-primary-dim);
      display: flex; align-items: center; justify-content: center;
    }
    .vendor-header-icon .material-symbols-outlined { font-size: 20px; color: var(--accent-primary); }
    .vendor-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.2px; }
    .vendor-subtitle { font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0; }
    .vendor-header-right { display: flex; align-items: center; gap: 10px; }

    .vendor-search-wrap { position: relative; display: flex; align-items: center; }
    .vendor-search-icon { position: absolute; left: 10px; font-size: 16px; color: var(--text-tertiary); pointer-events: none; }
    .vendor-search-input {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 6px; padding: 7px 32px 7px 32px;
      font-size: 13px; color: var(--text-primary); outline: none; width: 220px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .vendor-search-input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-dim); }
    .vendor-search-input::placeholder { color: var(--text-tertiary); }
    .vendor-search-clear {
      position: absolute; right: 8px; display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border: none; background: none;
      color: var(--text-tertiary); cursor: pointer; border-radius: 4px;
    }
    .vendor-search-clear:hover { color: var(--text-primary); background: var(--bg-hover); }
    .vendor-search-clear .material-symbols-outlined { font-size: 14px; }

    .vendor-add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    }
    .vendor-add-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .vendor-add-btn--cancel { background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border-main); }
    .vendor-add-btn .material-symbols-outlined { font-size: 16px; }

    /* Stats */
    .vendor-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex-shrink: 0; }
    .vendor-stat-card {
      background: var(--bg-panel); border: 1px solid var(--border-main); border-radius: 8px;
      padding: 14px 16px; display: flex; align-items: center; gap: 12px;
      position: relative; overflow: hidden; transition: border-color 0.2s;
    }
    .vendor-stat-card--warn { border-color: rgba(248,113,113,0.4); }
    .vendor-stat-icon {
      width: 38px; height: 38px; border-radius: 9px; border: 1px solid;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .vendor-stat-icon .material-symbols-outlined { font-size: 18px; }
    .vendor-stat-body { flex: 1; min-width: 0; }
    .vendor-stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); margin-bottom: 4px; }
    .vendor-stat-value { font-size: 22px; font-weight: 700; font-family: var(--font-mono); line-height: 1; }
    .vendor-stat-badge {
      position: absolute; top: 10px; right: 10px; padding: 2px 6px; border-radius: 4px;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      background: var(--bg-hover); color: var(--text-tertiary); border: 1px solid var(--border-subtle);
    }
    .vendor-stat-badge--warn { background: rgba(248,113,113,0.1); color: var(--accent-red); border-color: rgba(248,113,113,0.3); }

    /* Filters */
    .vendor-filters {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex-shrink: 0;
    }
    .filter-group { display: flex; align-items: center; gap: 4px; }
    .filter-divider { width: 1px; height: 20px; background: var(--border-main); margin: 0 4px; }
    .filter-chip {
      display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
      border-radius: 20px; font-size: 11px; font-weight: 600;
      border: 1px solid var(--border-subtle); background: var(--bg-panel);
      color: var(--text-secondary); cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .filter-chip:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
    .filter-chip--active {
      background: var(--accent-primary-dim); border-color: var(--accent-primary);
      color: var(--accent-primary);
    }
    .status-dot, .cat-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .chip-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
      background: var(--bg-hover); color: var(--text-tertiary); font-size: 10px; font-weight: 700;
    }

    /* Form Panel */
    .vendor-form-panel {
      background: var(--bg-panel); border: 1px solid var(--border-main); border-radius: 8px;
      overflow: hidden; flex-shrink: 0; animation: slideDown 0.2s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .vendor-form-header {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle);
    }
    .vendor-form-body { padding: 14px 16px; }
    .vendor-form-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .vendor-form-actions { display: flex; align-items: flex-end; }
    .vendor-save-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s; height: 36px; white-space: nowrap;
    }
    .vendor-save-btn:hover:not(:disabled) { opacity: 0.9; }
    .vendor-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .vendor-save-btn .material-symbols-outlined { font-size: 15px; }

    /* Table Panel */
    .vendor-table-panel {
      flex: 1; background: var(--bg-panel); border: 1px solid var(--border-main);
      border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; min-height: 0;
    }
    .vendor-table { width: 100%; border-collapse: collapse; text-align: left; }
    .vendor-table thead { position: sticky; top: 0; background: var(--bg-hover); z-index: 10; }
    .vendor-table thead tr { border-bottom: 1px solid var(--border-main); }
    .vendor-table th {
      padding: 10px 14px; font-size: 10px; font-weight: 700;
      color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.6px;
    }
    .vendor-th-sort { cursor: pointer; user-select: none; }
    .vendor-th-sort:hover { color: var(--text-secondary); }
    .vendor-table-panel .vendor-table { display: block; overflow-y: auto; height: 100%; }
    .vendor-table thead, .vendor-table tbody { display: table; width: 100%; table-layout: fixed; }
    .vendor-row { border-bottom: 1px solid var(--border-subtle); transition: background 0.15s; }
    .vendor-row:last-child { border-bottom: none; }
    .vendor-row:hover { background: var(--bg-hover); }
    .vendor-row--upcoming { background: rgba(248,113,113,0.03); }
    .vendor-row--upcoming:hover { background: rgba(248,113,113,0.07); }
    .vendor-row--paused { opacity: 0.75; }
    .vendor-row--cancelled { opacity: 0.45; }
    .vendor-table td { padding: 10px 14px; vertical-align: middle; }

    .vendor-name-cell { display: flex; align-items: center; gap: 10px; }
    .vendor-avatar {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #000; flex-shrink: 0;
    }
    .vendor-name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.3; }
    .vendor-row-notes { font-size: 11px; color: var(--text-tertiary); margin-top: 1px; }
    .vendor-upcoming-tag { font-size: 10px; color: var(--accent-red); font-weight: 600; margin-top: 1px; }

    .vendor-cat-badge {
      display: inline-block; padding: 3px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: capitalize; letter-spacing: 0.3px;
      border: 1px solid;
    }

    .vendor-price { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--text-primary); }

    .vendor-cycle-badge {
      display: inline-block; padding: 3px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25);
    }
    .vendor-cycle-badge--yearly { background: rgba(168,85,247,0.1); color: #a855f7; border-color: rgba(168,85,247,0.25); }

    .vendor-renewal-cell { display: flex; align-items: center; gap: 7px; }
    .vendor-renewal-date { font-size: 13px; color: var(--text-secondary); }
    .vendor-renewal-date--warn { color: var(--accent-red); font-weight: 600; }
    .vendor-days-chip {
      padding: 2px 6px; border-radius: 4px;
      font-size: 10px; font-weight: 700; font-family: var(--font-mono);
      background: var(--bg-hover); color: var(--text-tertiary); border: 1px solid var(--border-subtle);
    }
    .vendor-days-chip--warn { background: rgba(248,113,113,0.1); color: var(--accent-red); border-color: rgba(248,113,113,0.3); }

    .vendor-status-badge {
      display: inline-block; padding: 3px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: capitalize; letter-spacing: 0.3px;
      border: 1px solid; background: rgba(74,222,128,0.1); color: #4ade80; border-color: rgba(74,222,128,0.3);
    }
    .vendor-status-badge--active { background: rgba(74,222,128,0.1); color: #4ade80; border-color: rgba(74,222,128,0.3); }

    .vendor-scope-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-tertiary); font-family: var(--font-mono); font-size: 10px;
    }

    .vendor-td-actions { text-align: right; width: 110px; }
    .vendor-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
    .vendor-action-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px; background: transparent;
      color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
    }
    .vendor-action-btn .material-symbols-outlined { font-size: 15px; }
    .vendor-action-btn:hover { background: var(--bg-hover); border-color: var(--border-subtle); color: var(--text-primary); }
    .vendor-action-btn--danger:hover { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: var(--accent-red); }

    .vendor-delete-confirm { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
    .vendor-delete-confirm-text { font-size: 11px; color: var(--text-tertiary); white-space: nowrap; }
    .vendor-confirm-yes {
      padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 600;
      background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4);
      color: var(--accent-red); cursor: pointer;
    }
    .vendor-confirm-yes:hover { background: rgba(248,113,113,0.25); }
    .vendor-confirm-no {
      padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 600;
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      color: var(--text-secondary); cursor: pointer;
    }
    .vendor-confirm-no:hover { border-color: var(--border-main); color: var(--text-primary); }

    /* Empty State */
    .vendor-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 64px 24px; text-align: center;
    }
    .vendor-empty-icon-wrap {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--bg-hover); border: 1px solid var(--border-main);
      display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
    }
    .vendor-empty-icon { font-size: 28px; color: var(--text-tertiary); opacity: 0.6; }
    .vendor-empty-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
    .vendor-empty-sub { font-size: 13px; color: var(--text-tertiary); margin: 0; max-width: 340px; line-height: 1.6; }
    .vendor-clear-filters-btn {
      margin-top: 14px; padding: 7px 16px; border-radius: 6px;
      background: var(--bg-hover); border: 1px solid var(--border-main);
      color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .vendor-clear-filters-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }

    /* Form shared */
    .form-group { display: flex; flex-direction: column; }
    .form-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); margin-bottom: 5px; }
    .form-input, .form-select {
      background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 6px;
      padding: 7px 10px; font-size: 13px; color: var(--text-primary); outline: none;
      height: 36px; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-input:focus, .form-select:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-dim); }
    .form-input::placeholder { color: var(--text-tertiary); }
    .form-select { -webkit-appearance: none; cursor: pointer; }
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

    statusMeta(status: string): { label: string; color: string; bg: string } {
        return STATUS_META[status] ?? STATUS_META['active'];
    }

    currencySymbol(currency: string | undefined): string {
        const map: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', INR: '₹', JPY: '¥' };
        return map[currency ?? 'USD'] ?? '$';
    }
}
