import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionStore } from '@envello/state';

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
            <input class="vendor-search-input" type="text" [(ngModel)]="searchQuery" placeholder="Search subscriptions…">
          </div>
          <button class="vendor-add-btn" (click)="toggleForm()">
            <span class="material-symbols-outlined">{{ showAddSub() ? 'close' : 'add' }}</span>
            {{ showAddSub() ? 'Cancel' : 'Add Subscription' }}
          </button>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="vendor-stats-row">
        <div class="vendor-stat-card">
          <div class="vendor-stat-icon" style="background: rgba(96,165,250,0.1); border-color: rgba(96,165,250,0.2);">
            <span class="material-symbols-outlined" style="color: #60a5fa;">inventory_2</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Active Subscriptions</div>
            <div class="vendor-stat-value" style="color: #60a5fa;">{{ subscriptionStore.subscriptions().length }}</div>
          </div>
        </div>
        <div class="vendor-stat-card">
          <div class="vendor-stat-icon" style="background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.2);">
            <span class="material-symbols-outlined" style="color: #4ade80;">calendar_month</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Monthly Spend</div>
            <div class="vendor-stat-value" style="color: #4ade80;">\${{ subscriptionStore.totalMonthlyCost() | number:'1.2-2' }}</div>
          </div>
          <div class="vendor-stat-badge">/ mo</div>
        </div>
        <div class="vendor-stat-card">
          <div class="vendor-stat-icon" style="background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.2);">
            <span class="material-symbols-outlined" style="color: #fbbf24;">trending_up</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Yearly Extrapolation</div>
            <div class="vendor-stat-value" style="color: #fbbf24;">\${{ subscriptionStore.totalYearlyCost() | number:'1.2-2' }}</div>
          </div>
          <div class="vendor-stat-badge">/ yr</div>
        </div>
        <div class="vendor-stat-card" [class.vendor-stat-card--warn]="upcomingCount() > 0">
          <div class="vendor-stat-icon" [style.background]="upcomingCount() > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(161,161,170,0.1)'" [style.border-color]="upcomingCount() > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(161,161,170,0.2)'">
            <span class="material-symbols-outlined" [style.color]="upcomingCount() > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)'">notification_important</span>
          </div>
          <div class="vendor-stat-body">
            <div class="vendor-stat-label">Upcoming Renewals</div>
            <div class="vendor-stat-value" [style.color]="upcomingCount() > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)'">{{ upcomingCount() }}</div>
          </div>
          @if (upcomingCount() > 0) {
            <div class="vendor-stat-badge vendor-stat-badge--warn">≤ 7 days</div>
          }
        </div>
      </div>

      <!-- Add Subscription Form -->
      @if (showAddSub()) {
      <div class="vendor-form-panel">
        <div class="vendor-form-header">
          <span class="material-symbols-outlined" style="color: var(--accent-primary); font-size: 18px;">add_circle</span>
          <span style="font-weight: 600; font-size: 13px; color: var(--text-primary);">New Subscription</span>
        </div>
        <div class="vendor-form-body">
          <div class="vendor-form-row">
            <div class="form-group" style="flex:2; margin:0;">
              <label class="form-label">Vendor / Service Name</label>
              <input type="text" class="form-input" [(ngModel)]="newSubName" placeholder="e.g. AWS, GitHub, Figma">
            </div>
            <div class="form-group" style="flex:1; margin:0;">
              <label class="form-label">Project Scope</label>
              <input type="text" class="form-input" [(ngModel)]="newProjectId" placeholder="global">
            </div>
            <div class="form-group" style="width:110px; margin:0;">
              <label class="form-label">Price</label>
              <input type="number" step="0.01" min="0" class="form-input" [(ngModel)]="newSubPrice" placeholder="0.00">
            </div>
            <div class="form-group" style="width:130px; margin:0;">
              <label class="form-label">Billing Cycle</label>
              <select class="form-select" [(ngModel)]="newSubCycle">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div class="form-group" style="width:155px; margin:0;">
              <label class="form-label">Next Renewal</label>
              <input type="date" class="form-input" [(ngModel)]="newSubRenewal">
            </div>
            <div class="vendor-form-actions">
              <button class="vendor-save-btn" (click)="addSubscription()" [disabled]="!newSubName() || !newSubRenewal()">
                <span class="material-symbols-outlined">save</span>
                Save
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
              <th>Vendor</th>
              <th>Price</th>
              <th>Cycle</th>
              <th>Next Renewal</th>
              <th>Scope</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (sub of filteredSubs(); track sub.id) {
            <tr class="vendor-row" [class.vendor-row--upcoming]="isUpcoming(sub.renewalDate)">
              <td>
                <div class="vendor-name-cell">
                  <div class="vendor-avatar" [style.background]="avatarBg(sub.name)">
                    {{ sub.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="vendor-name">{{ sub.name }}</div>
                    @if (isUpcoming(sub.renewalDate)) {
                      <div class="vendor-upcoming-tag">Renewing soon</div>
                    }
                  </div>
                </div>
              </td>
              <td>
                <span class="vendor-price">\${{ sub.price | number:'1.2-2' }}</span>
              </td>
              <td>
                <span class="vendor-cycle-badge" [class.vendor-cycle-badge--yearly]="sub.billingCycle === 'yearly'">
                  {{ sub.billingCycle }}
                </span>
              </td>
              <td>
                <div class="vendor-renewal-cell">
                  <span class="vendor-renewal-date" [class.vendor-renewal-date--warn]="isUpcoming(sub.renewalDate)">
                    {{ sub.renewalDate | date:'MMM d, y' }}
                  </span>
                  @if (daysUntil(sub.renewalDate) !== null) {
                    <span class="vendor-days-chip" [class.vendor-days-chip--warn]="isUpcoming(sub.renewalDate)">
                      {{ daysUntil(sub.renewalDate) }}d
                    </span>
                  }
                </div>
              </td>
              <td>
                <span class="vendor-scope-badge">{{ sub.projectId }}</span>
              </td>
              <td class="vendor-td-actions">
                <button class="vendor-delete-btn" (click)="subscriptionStore.deleteSubscription(sub.id)" title="Delete">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
            }
          </tbody>
        </table>
        } @else if (searchQuery()) {
        <div class="vendor-empty">
          <span class="material-symbols-outlined vendor-empty-icon">search_off</span>
          <p class="vendor-empty-title">No results for "{{ searchQuery() }}"</p>
          <p class="vendor-empty-sub">Try a different name or clear the search.</p>
        </div>
        } @else {
        <div class="vendor-empty">
          <div class="vendor-empty-icon-wrap">
            <span class="material-symbols-outlined vendor-empty-icon">receipt_long</span>
          </div>
          <p class="vendor-empty-title">No subscriptions yet</p>
          <p class="vendor-empty-sub">Add your first vendor subscription to start tracking SaaS costs and renewal dates.</p>
          <button class="vendor-add-btn" style="margin-top:16px;" (click)="showAddSub.set(true)">
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
      gap: 16px; overflow: hidden;
    }

    /* Header */
    .vendor-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .vendor-header-left { display: flex; align-items: center; gap: 12px; }
    .vendor-header-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(74,222,128,0.1);
      border: 1px solid rgba(74,222,128,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .vendor-header-icon .material-symbols-outlined { font-size: 20px; color: #4ade80; }
    .vendor-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.2px; }
    .vendor-subtitle { font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0; }
    .vendor-header-right { display: flex; align-items: center; gap: 10px; }

    .vendor-search-wrap { position: relative; display: flex; align-items: center; }
    .vendor-search-icon { position: absolute; left: 10px; font-size: 16px; color: var(--text-tertiary); pointer-events: none; }
    .vendor-search-input {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 6px; padding: 7px 12px 7px 32px;
      font-size: 13px; color: var(--text-primary); outline: none; width: 220px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .vendor-search-input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-dim); }
    .vendor-search-input::placeholder { color: var(--text-tertiary); }

    .vendor-add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    }
    .vendor-add-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .vendor-add-btn .material-symbols-outlined { font-size: 16px; }

    /* Stats Cards */
    .vendor-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 12px; flex-shrink: 0;
    }
    .vendor-stat-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      position: relative; overflow: hidden;
      transition: border-color 0.2s;
    }
    .vendor-stat-card--warn { border-color: rgba(248,113,113,0.4); }
    .vendor-stat-icon {
      width: 38px; height: 38px; border-radius: 9px;
      border: 1px solid;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .vendor-stat-icon .material-symbols-outlined { font-size: 18px; }
    .vendor-stat-body { flex: 1; min-width: 0; }
    .vendor-stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); margin-bottom: 4px; }
    .vendor-stat-value { font-size: 22px; font-weight: 700; font-family: var(--font-mono); line-height: 1; }
    .vendor-stat-badge {
      position: absolute; top: 10px; right: 10px;
      padding: 2px 6px; border-radius: 4px;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      background: var(--bg-hover); color: var(--text-tertiary);
      border: 1px solid var(--border-subtle);
    }
    .vendor-stat-badge--warn { background: rgba(248,113,113,0.1); color: var(--accent-red); border-color: rgba(248,113,113,0.3); }

    /* Form Panel */
    .vendor-form-panel {
      background: var(--bg-panel); border: 1px solid var(--border-main);
      border-radius: 8px; overflow: hidden; flex-shrink: 0;
      animation: slideDown 0.2s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .vendor-form-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px;
      background: var(--bg-hover);
      border-bottom: 1px solid var(--border-subtle);
    }
    .vendor-form-body { padding: 16px; }
    .vendor-form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .vendor-form-actions { display: flex; align-items: flex-end; }
    .vendor-save-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; background: var(--accent-primary);
      color: var(--accent-primary-text); border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: opacity 0.2s; height: 36px; white-space: nowrap;
    }
    .vendor-save-btn:hover:not(:disabled) { opacity: 0.9; }
    .vendor-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .vendor-save-btn .material-symbols-outlined { font-size: 15px; }

    /* Table Panel */
    .vendor-table-panel {
      flex: 1; background: var(--bg-panel);
      border: 1px solid var(--border-main); border-radius: 8px;
      overflow: hidden; display: flex; flex-direction: column; min-height: 0;
    }
    .vendor-table { width: 100%; border-collapse: collapse; text-align: left; }
    .vendor-table thead { position: sticky; top: 0; background: var(--bg-hover); z-index: 10; }
    .vendor-table thead tr { border-bottom: 1px solid var(--border-main); }
    .vendor-table th {
      padding: 10px 16px;
      font-size: 10px; font-weight: 700;
      color: var(--text-tertiary);
      text-transform: uppercase; letter-spacing: 0.6px;
    }
    .vendor-table-panel .vendor-table { display: block; overflow-y: auto; height: 100%; }
    .vendor-table thead, .vendor-table tbody { display: table; width: 100%; table-layout: fixed; }
    .vendor-row {
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.15s;
    }
    .vendor-row:last-child { border-bottom: none; }
    .vendor-row:hover { background: var(--bg-hover); }
    .vendor-row--upcoming { background: rgba(248,113,113,0.03); }
    .vendor-row--upcoming:hover { background: rgba(248,113,113,0.07); }
    .vendor-table td { padding: 11px 16px; vertical-align: middle; }

    .vendor-name-cell { display: flex; align-items: center; gap: 10px; }
    .vendor-avatar {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #000; flex-shrink: 0;
    }
    .vendor-name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.3; }
    .vendor-upcoming-tag { font-size: 10px; color: var(--accent-red); font-weight: 600; margin-top: 1px; }

    .vendor-price { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--text-primary); }

    .vendor-cycle-badge {
      display: inline-block; padding: 3px 8px;
      border-radius: 4px; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      background: rgba(96,165,250,0.1); color: #60a5fa;
      border: 1px solid rgba(96,165,250,0.25);
    }
    .vendor-cycle-badge--yearly {
      background: rgba(168,85,247,0.1); color: #a855f7;
      border-color: rgba(168,85,247,0.25);
    }

    .vendor-renewal-cell { display: flex; align-items: center; gap: 7px; }
    .vendor-renewal-date { font-size: 13px; color: var(--text-secondary); }
    .vendor-renewal-date--warn { color: var(--accent-red); font-weight: 600; }
    .vendor-days-chip {
      padding: 2px 6px; border-radius: 4px;
      font-size: 10px; font-weight: 700; font-family: var(--font-mono);
      background: var(--bg-hover); color: var(--text-tertiary);
      border: 1px solid var(--border-subtle);
    }
    .vendor-days-chip--warn {
      background: rgba(248,113,113,0.1); color: var(--accent-red);
      border-color: rgba(248,113,113,0.3);
    }

    .vendor-scope-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-tertiary); font-family: var(--font-mono); font-size: 10px;
    }

    .vendor-td-actions { text-align: right; width: 56px; }
    .vendor-delete-btn {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; color: var(--text-tertiary);
      cursor: pointer; transition: all 0.15s; margin-left: auto;
    }
    .vendor-delete-btn .material-symbols-outlined { font-size: 15px; }
    .vendor-delete-btn:hover {
      background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3);
      color: var(--accent-red);
    }

    /* Empty State */
    .vendor-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 64px 24px; text-align: center;
    }
    .vendor-empty-icon-wrap {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--bg-hover); border: 1px solid var(--border-main);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .vendor-empty-icon { font-size: 28px; color: var(--text-tertiary); opacity: 0.6; }
    .vendor-empty-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
    .vendor-empty-sub { font-size: 13px; color: var(--text-tertiary); margin: 0; max-width: 340px; line-height: 1.6; }
  `]
})
export class VendorComponent {
    public subscriptionStore = inject(SubscriptionStore);

    showAddSub = signal(false);
    newSubName = signal('');
    newSubPrice = signal(0);
    newSubCycle = signal<'monthly'|'yearly'>('monthly');
    newSubRenewal = signal('');
    newProjectId = signal('global');
    searchQuery = signal('');

    filteredSubs = computed(() => {
        const q = this.searchQuery().toLowerCase();
        if (!q) return this.subscriptionStore.subscriptions();
        return this.subscriptionStore.subscriptions().filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.projectId?.toLowerCase().includes(q) ||
            s.billingCycle?.toLowerCase().includes(q)
        );
    });

    upcomingCount = computed(() => this.subscriptionStore.upcomingRenewals().length);

    isUpcoming(date: string): boolean {
        return this.subscriptionStore.upcomingRenewals().some((s: any) => s.renewalDate === date);
    }

    daysUntil(dateStr: string): number | null {
        if (!dateStr) return null;
        const diff = new Date(dateStr).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 60 ? days : null;
    }

    avatarBg(name: string): string {
        const colors = ['#60a5fa','#4ade80','#fbbf24','#a855f7','#fb923c','#f472b6','#34d399','#e879f9'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    toggleForm() {
        this.showAddSub.update(v => !v);
    }

    addSubscription() {
        if (!this.newSubName() || !this.newSubRenewal() || !this.newProjectId()) return;

        this.subscriptionStore.addSubscription({
            id: crypto.randomUUID(),
            name: this.newSubName(),
            category: 'software',
            price: Number(this.newSubPrice()),
            billingCycle: this.newSubCycle(),
            renewalDate: new Date(this.newSubRenewal()).toISOString(),
            projectId: this.newProjectId()
        });

        this.newSubName.set('');
        this.newSubPrice.set(0);
        this.newProjectId.set('global');
        this.newSubRenewal.set('');
        this.showAddSub.set(false);
    }
}
