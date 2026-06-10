import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionStore } from '@envello/state';
import { Transaction, TransactionType } from '@envello/domain';
import { ModalComponent, AiAssistantPanelComponent, AiPanelMessage, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent } from '@envello/ui';
import type { EnvTableColumn, EnvTableAction, EnvTableSortEvent, EnvTableActionEvent } from '@envello/ui';

const CATEGORY_COLORS: Record<string, string> = {
    software:       '#60a5fa',
    infrastructure: '#a78bfa',
    design:         '#f472b6',
    marketing:      '#4ade80',
    security:       '#fb923c',
    analytics:      '#fbbf24',
    communication:  '#34d399',
    finance:        '#e879f9',
    other:          '#94a3b8',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
    paused:    { label: 'Paused',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    cancelled: { label: 'Cancelled', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    completed: { label: 'Completed', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
};

const TYPE_META: Record<TransactionType, { label: string; icon: string; color: string }> = {
    'recurring': { label: 'Recurring',  icon: 'autorenew',        color: '#60a5fa' },
    'one-time':  { label: 'One-time',   icon: 'toll',             color: '#a78bfa' },
    'bill':      { label: 'Bills',      icon: 'receipt',          color: '#fb923c' },
    'purchase':  { label: 'Purchases',  icon: 'shopping_bag',     color: '#4ade80' },
    'refund':    { label: 'Refunds',    icon: 'currency_exchange', color: '#34d399' },
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

/** Auto-fill category, billing cycle, and currency for ~60 known SaaS vendors. */
const VENDOR_PRESETS: Record<string, { category: string; billingCycle: 'monthly' | 'yearly'; currency: string }> = {
    'github':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'github copilot':       { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'gitlab':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'aws':                  { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'amazon web services':  { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'gcp':                  { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'google cloud':         { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'azure':                { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'vercel':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'netlify':              { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'heroku':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'digitalocean':         { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'cloudflare':           { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'linode':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'cloudinary':           { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'render':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'railway':              { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'supabase':             { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'planetscale':          { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'neon':                 { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'figma':                { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'sketch':               { category: 'design',          billingCycle: 'yearly',  currency: 'USD' },
    'adobe':                { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'adobe creative cloud': { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'canva':                { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'framer':               { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'slack':                { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'discord':              { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'zoom':                 { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'microsoft teams':      { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'google workspace':     { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'twilio':               { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'notion':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'linear':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'jira':                 { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'asana':                { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'trello':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'clickup':              { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'monday':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'openai':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'anthropic':            { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'datadog':              { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'sentry':               { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'new relic':            { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'pagerduty':            { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'mixpanel':             { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'mailchimp':            { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'sendgrid':             { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'hubspot':              { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'postmark':             { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'resend':               { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'stripe':               { category: 'finance',         billingCycle: 'monthly', currency: 'USD' },
    'quickbooks':           { category: 'finance',         billingCycle: 'monthly', currency: 'USD' },
    'auth0':                { category: 'security',        billingCycle: 'monthly', currency: 'USD' },
    '1password':            { category: 'security',        billingCycle: 'yearly',  currency: 'USD' },
    'lastpass':             { category: 'security',        billingCycle: 'yearly',  currency: 'USD' },
    'bitwarden':            { category: 'security',        billingCycle: 'yearly',  currency: 'USD' },
    'tailscale':            { category: 'security',        billingCycle: 'monthly', currency: 'USD' },
};

@Component({
    selector: 'app-vendor',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent, AiAssistantPanelComponent, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent],
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
        <span class="vs-banner-label">Renewing soon:</span>
        @for (t of upcomingBanner(); track t.id) {
          @let bdays = daysUntil(t.date);
          <span class="vs-banner-chip" [class.vs-banner-urgent]="bdays !== null && bdays <= 3">
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
          (rowClick)="openDetails($any($event['_tx']))"
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

<!-- ── ADD / EDIT MODAL ── -->
@if (formMode() !== null) {
  <env-modal
    [isOpen]="true"
    [title]="formMode() === 'add' ? 'New Transaction' : 'Edit Transaction'"
    size="large"
    (closed)="closeForm()">

    <div body class="vendor-form-body">

      <!-- Row 1: Name + Category -->
      <div class="form-row">
        <div class="form-group fg-2">
          <label class="form-label">Service Name</label>
          <div class="vd-wrap">
            <div class="name-wrap">
              <span class="material-symbols-outlined vd-search-icon">search</span>
              <input type="text" class="form-input vendor-name-input vd-input"
                [ngModel]="formName()" (ngModelChange)="onNameChange($event)"
                (click)="showVendorDropdown.set(true)"
                (blur)="onVendorBlur()"
                (keydown)="onVendorKeydown($event)"
                placeholder="Search — GitHub, AWS, Figma…"
                autocomplete="off">
              @if (presetApplied()) {
                <span class="preset-badge">
                  <span class="material-symbols-outlined" style="font-size:11px">auto_awesome</span>
                  auto-filled
                </span>
              }
            </div>
            @if (showVendorDropdown() && vendorSuggestions().length > 0) {
              <div class="vd-dropdown">
                @if (!formName()) {
                  <div class="vd-section-label">
                    <span class="material-symbols-outlined" style="font-size:13px;vertical-align:middle">bolt</span>
                    Popular services
                  </div>
                }
                @for (v of vendorSuggestions(); track v.key; let i = $index) {
                  <button type="button" class="vd-item"
                    [class.vd-item-highlighted]="vendorHighlightIdx() === i"
                    (mousedown)="selectVendor(v)">
                    <div class="vd-avatar" [style.background]="avatarBg(v.displayName)">
                      {{ v.displayName.charAt(0).toUpperCase() }}
                    </div>
                    <div class="vd-info">
                      <span class="vd-name">{{ v.displayName }}</span>
                      <span class="vd-meta">
                        <span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">{{ categoryIcon(v.category) }}</span>
                        {{ v.category }}
                      </span>
                    </div>
                    <div class="vd-chips">
                      <span class="vd-chip">{{ v.billingCycle }}</span>
                      <span class="vd-chip vd-chip-currency">{{ v.currency }}</span>
                    </div>
                  </button>
                }
              </div>
            }
          </div>
        </div>
        <div class="form-group fg-1">
          <label class="form-label">Category</label>
          <input type="text" class="form-input" list="cat-list"
            [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)"
            placeholder="software">
          <datalist id="cat-list">
            @for (c of categoryOptions; track c) { <option [value]="c"> }
          </datalist>
        </div>
      </div>

      <!-- Row 2: Type · Amount -->
      <div class="form-row" style="margin-top:12px">
        <div class="form-group fg-2">
          <label class="form-label">Type</label>
          <div class="seg-ctrl">
            @for (opt of typeOptions; track opt) {
              <button type="button" class="seg-btn"
                [class.seg-active]="formType() === opt"
                (click)="formType.set(opt)">{{ typeMeta(opt).label }}</button>
            }
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Amount</label>
          <div class="price-wrap">
            <button type="button" class="currency-btn"
              (click)="rotateCurrency()"
              title="Click to change currency ({{ formCurrency() }})">
              {{ formCurrency() }}
            </button>
            <input type="number" step="0.01" min="0" class="form-input price-input"
              [ngModel]="formAmount()" (ngModelChange)="formAmount.set($event)"
              placeholder="0.00">
          </div>
        </div>
      </div>

      <!-- Row 3: Billing Cycle (recurring only) · Date -->
      <div class="form-row" style="margin-top:12px">
        @if (formType() === 'recurring') {
          <div class="form-group">
            <label class="form-label">Billing Cycle</label>
            <div class="seg-ctrl">
              <button type="button" class="seg-btn"
                [class.seg-active]="formCycle() === 'monthly'"
                (click)="setCycle('monthly')">Monthly</button>
              <button type="button" class="seg-btn"
                [class.seg-active]="formCycle() === 'yearly'"
                (click)="setCycle('yearly')">Yearly</button>
            </div>
          </div>
        }
        <div class="form-group fg-1">
          <label class="form-label">{{ formType() === 'recurring' || formType() === 'bill' ? 'Next Due Date' : 'Date' }}</label>
          <div class="renewal-wrap">
            <input type="date" class="form-input renewal-input"
              [ngModel]="formDate()" (ngModelChange)="formDate.set($event)">
            <div class="shortcut-row">
              <button type="button" class="shortcut-btn" title="+1 month"  (click)="addDateOffset(1)">+1m</button>
              <button type="button" class="shortcut-btn" title="+3 months" (click)="addDateOffset(3)">+3m</button>
              <button type="button" class="shortcut-btn" title="+6 months" (click)="addDateOffset(6)">+6m</button>
              <button type="button" class="shortcut-btn" title="+1 year"   (click)="addDateOffset(12)">+1y</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 4: Status -->
      <div class="form-row" style="margin-top:12px">
        <div class="form-group">
          <label class="form-label">Status</label>
          <div class="seg-ctrl">
            <button type="button" class="seg-btn seg-green"
              [class.seg-active]="formStatus() === 'active'"
              (click)="formStatus.set('active')">Active</button>
            <button type="button" class="seg-btn seg-yellow"
              [class.seg-active]="formStatus() === 'paused'"
              (click)="formStatus.set('paused')">Paused</button>
            <button type="button" class="seg-btn seg-grey"
              [class.seg-active]="formStatus() === 'cancelled'"
              (click)="formStatus.set('cancelled')">Cancelled</button>
          </div>
        </div>
      </div>

      <!-- Advanced -->
      <button type="button" class="advanced-toggle" (click)="toggleAdvanced()">
        <span class="material-symbols-outlined" style="font-size:16px">
          {{ showAdvanced() ? 'expand_less' : 'expand_more' }}
        </span>
        Advanced
      </button>
      @if (showAdvanced()) {
        <div class="form-row" style="margin-top:10px">
          <div class="form-group fg-1">
            <label class="form-label">Project Scope</label>
            <input type="text" class="form-input"
              [ngModel]="formProjectId()" (ngModelChange)="formProjectId.set($event)"
              placeholder="global">
          </div>
          <div class="form-group fg-2">
            <label class="form-label">Notes</label>
            <input type="text" class="form-input"
              [ngModel]="formNotes()" (ngModelChange)="formNotes.set($event)"
              placeholder="Optional notes…">
          </div>
        </div>
      }
    </div>

    <div footer style="display:flex;justify-content:flex-end;gap:8px;width:100%;align-items:center">
      @if (!canSave() && formName()) {
        <span class="save-hint">
          {{ formAmount() <= 0 ? 'Enter an amount' : '' }}
        </span>
      }
      <button type="button" class="vendor-cancel-btn" (click)="closeForm()">Cancel</button>
      @if (formMode() === 'add') {
        <button type="button" class="save-another-btn"
          [disabled]="!canSave()" (click)="saveAndAddAnother()">
          <span class="material-symbols-outlined">add</span>
          Save & Add Another
        </button>
      }
      <button type="button" class="vendor-save-btn"
        [disabled]="!canSave()" (click)="saveForm()">
        <span class="material-symbols-outlined">save</span>
        {{ formMode() === 'add' ? 'Save' : 'Update' }}
      </button>
    </div>
  </env-modal>
}

<!-- ── BULK IMPORT MODAL ── -->
@if (showImportModal()) {
  <env-modal [isOpen]="true" title="Import Transactions" (closed)="showImportModal.set(false)">
    <div body class="import-body">
      <p class="import-hint">
        One transaction per line.<br>
        Format: <code>Name, Amount, Type, Category, Currency, Cycle</code><br>
        <span style="color:var(--text-tertiary)">Type is <code>recurring</code>, <code>one-time</code>, <code>bill</code>, <code>purchase</code>, or <code>refund</code>. Cycle (<code>monthly</code>/<code>yearly</code>) applies to recurring only. Category and Currency are optional.</span>
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
    <div footer style="display:flex;justify-content:flex-end;gap:8px;width:100%">
      <button class="vendor-cancel-btn" (click)="showImportModal.set(false)">Cancel</button>
      <button class="vendor-save-btn" [disabled]="importPreviewCount() === 0" (click)="parseAndImport()">
        <span class="material-symbols-outlined">upload</span>
        Import {{ importPreviewCount() > 0 ? importPreviewCount() : '' }}
      </button>
    </div>
  </env-modal>
}

<!-- ── VIEW DETAILS MODAL ── -->
@if (viewingTx(); as tx) {
  <env-modal [isOpen]="true" [title]="''" size="large" (closed)="closeDetails()">
    <div body class="detail-body">

      <div class="detail-hero">
        <div class="detail-avatar" [style.background]="avatarBg(tx.name)">
          {{ tx.name.charAt(0).toUpperCase() }}
        </div>
        <div class="detail-hero-text">
          <h2 class="detail-name">{{ tx.name }}</h2>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span class="vs-status-badge" style="display:inline-block"
              [style.color]="statusMeta(tx.status).color"
              [style.background]="statusMeta(tx.status).bg">
              {{ statusMeta(tx.status).label }}
            </span>
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-tertiary)">
              <span class="material-symbols-outlined" style="font-size:13px" [style.color]="typeMeta(tx.type).color">{{ typeMeta(tx.type).icon }}</span>
              {{ typeMeta(tx.type).label }}
            </span>
          </div>
        </div>
        <div class="detail-cost-block">
          <div class="detail-price">{{ currencySymbol(tx.currency) }}{{ tx.amount | number:'1.2-2' }}</div>
          @if (tx.type === 'recurring' && tx.billingCycle) {
            <div class="detail-cycle">per {{ tx.billingCycle === 'monthly' ? 'month' : tx.billingCycle === 'weekly' ? 'week' : 'year' }}</div>
          }
        </div>
      </div>

      @if (tx.type === 'recurring') {
        <div class="detail-equiv">
          @if (tx.billingCycle === 'yearly') {
            <div class="detail-equiv-chip">
              <span class="equiv-label">Monthly equivalent</span>
              <span class="equiv-value">{{ monthlyCost(tx) }}</span>
            </div>
          }
          @if (tx.billingCycle === 'monthly') {
            <div class="detail-equiv-chip">
              <span class="equiv-label">Yearly equivalent</span>
              <span class="equiv-value">{{ yearlyCost(tx) }}</span>
            </div>
          }
        </div>
      }

      <div class="detail-grid">
        <div class="detail-field">
          <span class="detail-field-label">Category</span>
          <span class="detail-field-value capitalize">{{ tx.category || '—' }}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Currency</span>
          <span class="detail-field-value">{{ tx.currency || 'USD' }}</span>
        </div>
        @if (tx.type === 'recurring' && tx.billingCycle) {
          <div class="detail-field">
            <span class="detail-field-label">Billing Cycle</span>
            <span class="detail-field-value capitalize">{{ tx.billingCycle }}</span>
          </div>
        }
        <div class="detail-field">
          <span class="detail-field-label">{{ tx.type === 'recurring' || tx.type === 'bill' ? 'Due Date' : 'Date' }}</span>
          <div class="detail-field-value" style="display:flex;align-items:center;gap:8px">
            {{ formatDate(tx.date) }}
            @let days = daysUntil(tx.date);
            @if (days !== null && tx.status !== 'cancelled' && (tx.type === 'recurring' || tx.type === 'bill')) {
              <span class="vs-days-chip"
                [class.vs-days-ok]="days > 30"
                [class.vs-days-caution]="days <= 30 && days > 7"
                [class.vs-days-warn]="days <= 7">
                {{ days === 0 ? 'today' : 'in ' + days + 'd' }}
              </span>
            }
          </div>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Project Scope</span>
          <span class="detail-field-value">{{ tx.projectId || 'global' }}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">ID</span>
          <span class="detail-field-value detail-id">{{ tx.id }}</span>
        </div>
        @if (tx.notes) {
          <div class="detail-field detail-field-full">
            <span class="detail-field-label">Notes</span>
            <span class="detail-field-value">{{ tx.notes }}</span>
          </div>
        }
      </div>
    </div>

    <div footer style="display:flex;justify-content:flex-end;gap:8px;width:100%">
      <button class="vendor-cancel-btn" (click)="closeDetails()">Close</button>
      <button class="vendor-save-btn" (click)="editFromDetails(tx)">
        <span class="material-symbols-outlined">edit</span>
        Edit Transaction
      </button>
    </div>
  </env-modal>
}

@if (deleteConfirmId(); as subId) {
<env-confirm-dialog
    [isOpen]="true"
    title="Move to Bin"
    icon="delete"
    variant="danger"
    confirmLabel="Move to Bin"
    (confirmed)="doDelete(subId)"
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
    .capitalize { text-transform: capitalize; }

    /* ── Sidebar (container handled by env-feature-sidebar) ── */
    .vs-sb-nav     { padding: 4px 6px; flex-shrink: 0; }
    .vs-sb-section { padding: 4px 6px; flex-shrink: 0; }
    .vs-sb-section-title {
      padding: 6px 8px 4px;
      font-size: 9.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--text-tertiary);
    }
    .vs-sb-divider { height: 1px; background: var(--border-subtle); margin: 0 8px; flex-shrink: 0; }

    .vs-sb-item {
      width: 100%; display: flex; align-items: center; gap: 7px;
      padding: 5px 8px; background: transparent; border: none;
      border-radius: 6px; color: var(--text-secondary);
      font-size: 12.5px; font-weight: 500;
      cursor: pointer; transition: all 0.15s; text-align: left;
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
    }
    .vs-banner-urgent {
      background: color-mix(in srgb, var(--accent-red) 10%, transparent) !important;
      border-color: color-mix(in srgb, var(--accent-red) 30%, transparent) !important;
      color: var(--accent-red) !important;
    }
    .vs-banner-days { font-size: 10.5px; color: var(--text-tertiary); }

    /* ── Table ── */
    .vs-table-wrap { flex: 1 1 0; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }

    /* ── Form modal ── */
    .vendor-form-body { padding: 4px 0; }
    .form-row   { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .form-group { display: flex; flex-direction: column; }
    .fg-1 { flex: 1; min-width: 120px; }
    .fg-2 { flex: 2; min-width: 180px; }
    .form-label {
      font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--text-tertiary); margin-bottom: 6px;
    }
    .form-input {
      background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 6px;
      padding: 8px 12px; font-size: 13px; color: var(--text-primary); height: 38px; outline: none;
      transition: border-color 0.15s;
    }
    .form-input:focus { border-color: var(--accent-primary); }

    /* Vendor name combobox */
    .vd-wrap { position: relative; }
    .name-wrap { position: relative; display: flex; align-items: center; }
    .vd-search-icon {
      position: absolute; left: 10px; font-size: 17px;
      color: var(--text-tertiary); pointer-events: none; z-index: 1;
    }
    .vd-input { padding-left: 34px !important; }
    .name-wrap .form-input { flex: 1; }
    .preset-badge {
      position: absolute; right: 8px;
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; border-radius: 100px;
      background: color-mix(in srgb, #4ade80 10%, transparent);
      border: 1px solid color-mix(in srgb, #4ade80 25%, transparent); color: #4ade80;
      font-size: 10px; font-weight: 600; pointer-events: none;
    }
    .vd-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 9999; max-height: 320px; overflow-y: auto;
    }
    .vd-section-label {
      padding: 6px 10px 4px; font-size: 10.5px; font-weight: 600;
      color: var(--text-tertiary); letter-spacing: 0.04em;
      display: flex; align-items: center; gap: 4px;
    }
    .vd-item {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 8px 10px; border: none; border-radius: 7px;
      background: transparent; cursor: pointer; text-align: left; transition: background 0.1s;
    }
    .vd-item:hover, .vd-item-highlighted { background: var(--bg-hover); }
    .vd-avatar {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.25);
    }
    .vd-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .vd-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .vd-meta {
      font-size: 11px; color: var(--text-tertiary); text-transform: capitalize;
      display: flex; align-items: center; gap: 3px;
    }
    .vd-chips { display: flex; gap: 4px; flex-shrink: 0; }
    .vd-chip {
      padding: 2px 7px; border-radius: 4px; border: 1px solid var(--border-subtle);
      font-size: 10.5px; font-weight: 500; color: var(--text-secondary);
      background: var(--bg-hover); text-transform: capitalize;
    }
    .vd-chip-currency { color: var(--text-tertiary); }

    /* Price + currency */
    .price-wrap {
      display: flex; align-items: center; border: 1px solid var(--border-subtle);
      border-radius: 6px; overflow: hidden; background: var(--bg-app); height: 38px;
    }
    .price-wrap:focus-within { border-color: var(--accent-primary); }
    .currency-btn {
      padding: 0 10px; height: 100%; background: var(--bg-hover);
      border: none; border-right: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 11px; font-weight: 700;
      cursor: pointer; transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
    }
    .currency-btn:hover { background: var(--bg-active); color: var(--text-primary); }
    .price-input { border: none !important; border-radius: 0 !important; height: 100% !important; flex: 1; min-width: 80px; }

    /* Segmented controls */
    .seg-ctrl {
      display: flex; border: 1px solid var(--border-subtle); border-radius: 6px;
      overflow: hidden; height: 38px;
    }
    .seg-btn {
      flex: 1; background: transparent; border: none;
      border-right: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 12px; font-weight: 500;
      cursor: pointer; padding: 0 12px; transition: all 0.15s; white-space: nowrap;
    }
    .seg-btn:last-child { border-right: none; }
    .seg-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .seg-btn.seg-active { background: var(--accent-primary-dim); color: var(--accent-primary); font-weight: 600; }
    .seg-green.seg-active  { background: color-mix(in srgb, #4ade80 12%, transparent) !important; color: #4ade80 !important; }
    .seg-yellow.seg-active { background: color-mix(in srgb, #fbbf24 12%, transparent) !important; color: #fbbf24 !important; }
    .seg-grey.seg-active   { background: color-mix(in srgb, #94a3b8 12%, transparent) !important; color: #94a3b8 !important; }

    /* Renewal shortcuts */
    .renewal-wrap  { display: flex; flex-direction: column; gap: 4px; }
    .renewal-input { width: 100%; }
    .shortcut-row  { display: flex; gap: 4px; }
    .shortcut-btn {
      flex: 1; padding: 3px 0; background: var(--bg-hover); border: 1px solid var(--border-subtle);
      border-radius: 4px; color: var(--text-tertiary); font-size: 10px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .shortcut-btn:hover {
      background: var(--accent-primary-dim); border-color: var(--accent-primary); color: var(--accent-primary);
    }

    /* Advanced toggle */
    .advanced-toggle {
      display: inline-flex; align-items: center; gap: 4px; margin-top: 14px;
      background: transparent; border: none; color: var(--text-tertiary);
      font-size: 12px; font-weight: 500; cursor: pointer; padding: 0; transition: color 0.15s;
    }
    .advanced-toggle:hover { color: var(--text-secondary); }

    /* Modal footer buttons */
    .save-hint { font-size: 11px; color: var(--text-tertiary); margin-right: auto; }
    .vendor-cancel-btn {
      padding: 8px 16px; background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-secondary); border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .save-another-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; background: var(--bg-hover); color: var(--text-primary);
      border: 1px solid var(--border-main); border-radius: 6px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .save-another-btn:hover    { background: var(--bg-active); }
    .save-another-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .vendor-save-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .vendor-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── View Details modal ── */
    .detail-body { padding: 4px 0; display: flex; flex-direction: column; gap: 20px; }
    .detail-hero {
      display: flex; align-items: center; gap: 16px;
      padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle);
    }
    .detail-avatar {
      width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }
    .detail-hero-text { flex: 1; }
    .detail-name { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
    .detail-cost-block { text-align: right; }
    .detail-price { font-size: 24px; font-weight: 700; font-family: var(--font-mono); }
    .detail-cycle { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }

    .detail-equiv { display: flex; gap: 10px; }
    .detail-equiv-chip {
      display: flex; align-items: center; gap: 8px; padding: 8px 14px;
      border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-hover);
    }
    .equiv-label { font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
    .equiv-value { font-size: 13px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }

    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
      border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden;
      background: var(--border-subtle);
    }
    .detail-field { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; background: var(--bg-app); }
    .detail-field-full { grid-column: 1 / -1; }
    .detail-field-label {
      font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--text-tertiary);
    }
    .detail-field-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .detail-id { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-tertiary); }

    /* ── Import modal ── */
    .import-body  { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
    .import-hint  { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.7; }
    .import-hint code {
      background: var(--bg-hover); padding: 1px 5px; border-radius: 3px;
      font-size: 11px; color: var(--accent-primary);
    }
    .import-textarea {
      width: 100%; min-height: 140px; resize: vertical;
      background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 6px;
      padding: 10px 12px; font-size: 13px; color: var(--text-primary); outline: none;
      font-family: var(--font-mono); line-height: 1.6; box-sizing: border-box;
    }
    .import-textarea:focus { border-color: var(--accent-primary); }
    .import-count {
      font-size: 12px; color: #4ade80; margin: 0;
      display: flex; align-items: center; gap: 4px;
    }
  `]
})
export class VendorComponent {
    public transactionStore = inject(TransactionStore);

    readonly typeOptions: TransactionType[] = ['recurring', 'one-time', 'bill', 'purchase', 'refund'];
    readonly categoryOptions = ['software', 'infrastructure', 'design', 'marketing', 'security', 'analytics', 'communication', 'finance', 'utilities', 'shopping', 'travel', 'food', 'other'];
    readonly currencies = CURRENCIES;
    readonly vendorNames = Object.keys(VENDOR_PRESETS).map(k => k.charAt(0).toUpperCase() + k.slice(1));

    // ── Filter state ──────────────────────────────────────────────────────
    searchQuery    = signal('');
    selectedType   = signal<TransactionType | null>(null);
    selectedStatus = signal<string | null>(null);

    // ── Sort state ────────────────────────────────────────────────────────
    sortCol = signal<'name' | 'amount' | 'date'>('date');
    sortDir = signal<'asc' | 'desc'>('asc');

    // ── Form state ────────────────────────────────────────────────────────
    formMode      = signal<'add' | 'edit' | null>(null);
    editingId     = signal<string | null>(null);
    formName      = signal('');
    formType      = signal<TransactionType>('recurring');
    formCategory  = signal('');
    formProjectId = signal('global');
    formAmount    = signal<number>(0);
    formCurrency  = signal('USD');
    formCycle     = signal<'monthly' | 'yearly' | 'weekly'>('monthly');
    formDate      = signal('');
    formStatus    = signal<'active' | 'paused' | 'cancelled' | 'completed'>('active');
    formNotes     = signal('');
    showAdvanced  = signal(false);
    presetApplied = signal(false);
    showVendorDropdown = signal(false);
    vendorHighlightIdx = signal(-1);

    readonly POPULAR_KEYS = ['github', 'aws', 'figma', 'slack', 'notion', 'stripe', 'openai', 'vercel', 'datadog', 'adobe'];

    vendorSuggestions = computed(() => {
        const q = this.formName().toLowerCase().trim();
        const all = Object.entries(VENDOR_PRESETS).map(([key, val]) => ({
            key, displayName: this.toDisplayName(key), ...val,
        }));
        if (!q) return all.filter(v => this.POPULAR_KEYS.includes(v.key));
        return all.filter(v => v.key.includes(q) || v.displayName.toLowerCase().includes(q)).slice(0, 9);
    });

    // ── Modal / delete state ──────────────────────────────────────────────
    deleteConfirmId   = signal<string | null>(null);
    bulkDeleteConfirm = signal<string[] | null>(null);
    showImportModal   = signal(false);
    importText        = signal('');
    viewingTx         = signal<Transaction | null>(null);

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
    canSave = computed(() => !!this.formName() && this.formAmount() > 0);

    activeCount = computed(() =>
        this.transactionStore.transactions().filter(t => !t.status || t.status === 'active').length
    );
    pausedCount = computed(() =>
        this.transactionStore.transactions().filter(t => t.status === 'paused').length
    );
    cancelledCount = computed(() =>
        this.transactionStore.transactions().filter(t => t.status === 'cancelled').length
    );

    countByType = computed(() => {
        const counts: Record<string, number> = {};
        for (const t of this.transactionStore.transactions()) {
            counts[t.type] = (counts[t.type] ?? 0) + 1;
        }
        return counts;
    });

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
        { key: 'view',   label: 'View Details', icon: 'open_in_new', bulk: false },
        { key: 'edit',   label: 'Edit',         icon: 'edit',        bulk: false },
        { key: 'delete', label: 'Delete',        icon: 'delete',     danger: true },
    ];

    tableRows = computed(() =>
        this.filteredTransactions().map(t => ({
            id:      t.id,
            service: { name: t.name },
            type:    t.type,
            amount:  `${this.currencySymbol(t.currency)}${t.amount.toFixed(2)}${t.type === 'recurring' && t.billingCycle ? '/' + t.billingCycle.slice(0, 2) : ''}`,
            date:    this.formatDateDisplay(t),
            status:  t.status || 'active',
            _tx:     t,
        }))
    );

    handleTableAction(event: EnvTableActionEvent) {
        const t = event.row['_tx'] as Transaction;
        if (!t) return;
        switch (event.actionKey) {
            case 'view':   this.openDetails(t); break;
            case 'edit':   this.openEditForm(t); break;
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
        const d = this.formatDate(t.date);
        if (!t.date) return '—';
        if (t.type !== 'recurring' && t.type !== 'bill') return d;
        const days = this.daysUntil(t.date);
        if (days === null || t.status === 'cancelled') return d;
        if (days === 0) return `${d} · today`;
        return `${d} · in ${days}d`;
    }

    typeMeta(type: TransactionType) { return TYPE_META[type]; }

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

    // ── Sort ──────────────────────────────────────────────────────────────
    setSort(col: 'name' | 'amount' | 'date') {
        if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
        else { this.sortCol.set(col); this.sortDir.set('asc'); }
    }

    // ── Form open / close ─────────────────────────────────────────────────
    openAddForm() {
        if (this.formMode() !== null) { this.closeForm(); return; }
        this.resetForm();
        this.formDate.set(this.autoDate('monthly'));
        this.formMode.set('add');
        setTimeout(() => (document.querySelector('.vendor-name-input') as HTMLInputElement)?.focus(), 60);
    }

    openEditForm(t: Transaction) {
        this.editingId.set(t.id);
        this.formName.set(t.name);
        this.formType.set(t.type ?? 'recurring');
        this.formCategory.set(t.category ?? '');
        this.formProjectId.set(t.projectId ?? 'global');
        this.formAmount.set(t.amount);
        this.formCurrency.set(t.currency ?? 'USD');
        this.formCycle.set(t.billingCycle ?? 'monthly');
        this.formDate.set(t.date ? t.date.split('T')[0] : '');
        this.formStatus.set(t.status ?? 'active');
        this.formNotes.set(t.notes ?? '');
        this.presetApplied.set(false);
        this.showAdvanced.set((!!t.projectId && t.projectId !== 'global') || !!t.notes);
        this.formMode.set('edit');
    }

    closeForm() { this.formMode.set(null); this.resetForm(); }

    private resetForm() {
        this.editingId.set(null);
        this.formName.set('');
        this.formType.set(this.selectedType() ?? 'recurring');
        this.formCategory.set('');
        this.formProjectId.set('global');
        this.formAmount.set(0);
        this.formCurrency.set('USD');
        this.formCycle.set('monthly');
        this.formDate.set('');
        this.formStatus.set('active');
        this.formNotes.set('');
        this.showAdvanced.set(false);
        this.presetApplied.set(false);
    }

    // ── Save actions ──────────────────────────────────────────────────────
    private async saveFormInternal(): Promise<boolean> {
        if (!this.canSave()) return false;
        const type = this.formType();
        const payload: Partial<Transaction> = {
            name:         this.formName(),
            type,
            category:     this.formCategory() || undefined,
            projectId:    this.formProjectId() !== 'global' ? this.formProjectId() : undefined,
            amount:       Number(this.formAmount()),
            currency:     this.formCurrency(),
            date:         this.formDate() || new Date().toISOString().split('T')[0],
            billingCycle: type === 'recurring' ? this.formCycle() : undefined,
            status:       this.formStatus(),
            notes:        this.formNotes() || undefined,
        };
        if (this.formMode() === 'add') {
            await this.transactionStore.add({ id: crypto.randomUUID(), ...payload } as Transaction);
        } else if (this.editingId()) {
            await this.transactionStore.update(this.editingId()!, payload);
        }
        return true;
    }

    async saveForm() {
        if (await this.saveFormInternal()) this.closeForm();
    }

    async saveAndAddAnother() {
        if (await this.saveFormInternal()) {
            this.resetForm();
            this.formDate.set(this.autoDate('monthly'));
            this.formMode.set('add');
            setTimeout(() => (document.querySelector('.vendor-name-input') as HTMLInputElement)?.focus(), 60);
        }
    }

    async doDelete(id: string) {
        await this.transactionStore.delete(id);
        this.deleteConfirmId.set(null);
    }

    async cycleStatus(t: Transaction) {
        const order: Transaction['status'][] = ['active', 'paused', 'cancelled', 'completed'];
        const idx = order.indexOf(t.status ?? 'active');
        await this.transactionStore.update(t.id, { status: order[(idx + 1) % order.length] });
    }

    // ── Form field helpers ────────────────────────────────────────────────
    onNameChange(name: string) {
        this.formName.set(name);
        this.vendorHighlightIdx.set(-1);
        this.showVendorDropdown.set(true);
        if (this.formMode() !== 'add' || this.formType() !== 'recurring') return;
        const preset = VENDOR_PRESETS[name.toLowerCase().trim()];
        if (preset) {
            this.formCategory.set(preset.category);
            this.formCycle.set(preset.billingCycle);
            this.formCurrency.set(preset.currency);
            this.formDate.set(this.autoDate(preset.billingCycle));
            this.presetApplied.set(true);
        } else {
            this.presetApplied.set(false);
        }
    }

    selectVendor(v: { key: string; displayName: string; category: string; billingCycle: 'monthly' | 'yearly'; currency: string }) {
        this.formName.set(v.displayName);
        this.formCategory.set(v.category);
        this.formCycle.set(v.billingCycle);
        this.formCurrency.set(v.currency);
        if (this.formMode() === 'add') this.formDate.set(this.autoDate(v.billingCycle));
        this.presetApplied.set(true);
        this.showVendorDropdown.set(false);
        this.vendorHighlightIdx.set(-1);
    }

    onVendorBlur() { setTimeout(() => this.showVendorDropdown.set(false), 150); }

    onVendorKeydown(e: KeyboardEvent) {
        if (!this.showVendorDropdown()) return;
        const list = this.vendorSuggestions();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.vendorHighlightIdx.update(i => Math.min(i + 1, list.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.vendorHighlightIdx.update(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && this.vendorHighlightIdx() >= 0) {
            e.preventDefault();
            this.selectVendor(list[this.vendorHighlightIdx()]);
        } else if (e.key === 'Escape') {
            this.showVendorDropdown.set(false);
            this.vendorHighlightIdx.set(-1);
        }
    }

    categoryIcon(cat: string): string {
        const icons: Record<string, string> = {
            software: 'code', infrastructure: 'cloud', design: 'palette',
            marketing: 'campaign', security: 'shield', analytics: 'bar_chart',
            communication: 'chat', finance: 'payments', utilities: 'electrical_services',
            shopping: 'shopping_bag', travel: 'flight', food: 'restaurant', other: 'category',
        };
        return icons[cat] ?? 'category';
    }

    private toDisplayName(key: string): string {
        const overrides: Record<string, string> = {
            'aws': 'AWS', 'gcp': 'GCP', '1password': '1Password',
            'github': 'GitHub', 'github copilot': 'GitHub Copilot',
            'gitlab': 'GitLab', 'google cloud': 'Google Cloud',
            'google workspace': 'Google Workspace', 'microsoft teams': 'Microsoft Teams',
            'adobe creative cloud': 'Adobe Creative Cloud', 'new relic': 'New Relic',
        };
        return overrides[key] ?? key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    setCycle(cycle: 'monthly' | 'yearly' | 'weekly') {
        this.formCycle.set(cycle);
        if (this.formMode() === 'add') this.formDate.set(this.autoDate(cycle));
    }

    rotateCurrency() {
        const idx = CURRENCIES.indexOf(this.formCurrency());
        this.formCurrency.set(CURRENCIES[(idx + 1) % CURRENCIES.length]);
    }

    addDateOffset(months: number) {
        const base = this.formDate();
        const d = base ? new Date(base + 'T12:00:00') : new Date();
        d.setMonth(d.getMonth() + months);
        this.formDate.set(this.toLocalDateString(d));
    }

    toggleAdvanced() { this.showAdvanced.update(v => !v); }

    // ── Bulk import ───────────────────────────────────────────────────────
    async parseAndImport() {
        const lines = this.importText().trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 2) continue;
            const name   = parts[0];
            const amount = parseFloat(parts[1]);
            if (!name || isNaN(amount)) continue;

            const typeRaw  = (parts[2] ?? 'recurring').toLowerCase() as TransactionType;
            const type: TransactionType = this.typeOptions.includes(typeRaw) ? typeRaw : 'recurring';
            const preset   = VENDOR_PRESETS[name.toLowerCase()];
            const category = parts[3] || preset?.category || '';
            const currency = parts[4] || preset?.currency || 'USD';
            const cycle: 'monthly' | 'yearly' = (parts[5] ?? 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';

            await this.transactionStore.add({
                id:          crypto.randomUUID(),
                name, type, amount, category, currency,
                date:         this.autoDate(type === 'recurring' ? cycle : 'monthly'),
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

    statusMeta(status: string | undefined | null): { label: string; color: string; bg: string } {
        return STATUS_META[status || 'active'] ?? STATUS_META['active'];
    }

    monthlyCost(t: Transaction): string {
        if (t.type !== 'recurring') return `${this.currencySymbol(t.currency)}${t.amount.toFixed(2)}`;
        const sym = this.currencySymbol(t.currency);
        const val = t.billingCycle === 'yearly' ? t.amount / 12 : t.billingCycle === 'weekly' ? t.amount * 4.33 : t.amount;
        return `${sym}${val.toFixed(2)}/mo`;
    }

    yearlyCost(t: Transaction): string {
        if (t.type !== 'recurring') return '';
        const sym = this.currencySymbol(t.currency);
        const val = t.billingCycle === 'monthly' ? t.amount * 12 : t.billingCycle === 'weekly' ? t.amount * 52 : t.amount;
        return `${sym}${val.toFixed(2)}/yr`;
    }

    openDetails(t: Transaction) { this.viewingTx.set(t); }
    closeDetails()              { this.viewingTx.set(null); }

    editFromDetails(t: Transaction) {
        this.closeDetails();
        setTimeout(() => this.openEditForm(t), 50);
    }

    currencySymbol(currency: string | undefined): string {
        const map: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', INR: '₹', JPY: '¥' };
        return map[currency ?? 'USD'] ?? (currency ?? '$');
    }

    // ── AI Assistant methods ──────────────────────────────────────────────
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
            const sym = this.currencySymbol(this.defaultCurrency());
            const rec = txs.filter(t => t.type === 'recurring' && t.status === 'active').length;
            response = `Your recurring monthly spend is **${sym}${mo.toFixed(2)}/mo** (${sym}${yr.toFixed(2)}/yr) across ${rec} active recurring transaction${rec !== 1 ? 's' : ''}.`;
        } else if (q.includes('due') || q.includes('renew') || q.includes('soon') || q.includes('upcoming')) {
            const upcoming = this.upcomingBanner();
            response = upcoming.length
                ? `${upcoming.length} transaction${upcoming.length > 1 ? 's are' : ' is'} due in the next 14 days: ${upcoming.map(t => `${t.name} (${this.formatDate(t.date)})`).join(', ')}.`
                : `Nothing due in the next 14 days.`;
        } else if (q.includes('expensive') || q.includes('highest')) {
            const top = [...active.filter(t => t.type === 'recurring')].sort((a, b) => {
                const ma = a.billingCycle === 'yearly' ? a.amount / 12 : a.amount;
                const mb = b.billingCycle === 'yearly' ? b.amount / 12 : b.amount;
                return mb - ma;
            }).slice(0, 5);
            response = top.length
                ? `Top 5 recurring by monthly cost:\n${top.map((t, i) => `${i + 1}. ${t.name} — ${this.currencySymbol(t.currency)}${(t.billingCycle === 'yearly' ? t.amount / 12 : t.amount).toFixed(2)}/mo`).join('\n')}`
                : `No active recurring transactions to rank.`;
        } else if (q.includes('type') || q.includes('breakdown')) {
            const counts = this.countByType();
            const lines = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([type, n]) => `${TYPE_META[type as TransactionType]?.label ?? type}: ${n}`);
            response = lines.length ? `Breakdown by type:\n${lines.join('\n')}` : `No transactions yet.`;
        } else if (q.includes('refund')) {
            const refunds = txs.filter(t => t.type === 'refund');
            const total   = refunds.reduce((s, t) => s + t.amount, 0);
            response = refunds.length
                ? `You have ${refunds.length} refund${refunds.length > 1 ? 's' : ''} totalling ${this.currencySymbol(this.defaultCurrency())}${total.toFixed(2)}: ${refunds.map(t => t.name).join(', ')}.`
                : `No refunds recorded yet.`;
        } else {
            const mo  = this.transactionStore.totalMonthlyCost();
            const sym = this.currencySymbol(this.defaultCurrency());
            response = `You have ${txs.length} transaction${txs.length !== 1 ? 's' : ''} (${active.length} active). Recurring monthly spend: ${sym}${mo.toFixed(2)}/mo. Try asking about total spend, upcoming due dates, most expensive services, a type breakdown, or refunds.`;
        }

        this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
        this.aiLoading.set(false);

        setTimeout(() => {
            const el = document.querySelector('.ai-panel-messages');
            if (el) el.scrollTop = el.scrollHeight;
        }, 50);
    }

    // ── Private utilities ─────────────────────────────────────────────────
    private autoDate(cycle: 'monthly' | 'yearly' | 'weekly'): string {
        const d = new Date();
        if (cycle === 'monthly')      d.setMonth(d.getMonth() + 1);
        else if (cycle === 'yearly')  d.setFullYear(d.getFullYear() + 1);
        else                          d.setDate(d.getDate() + 7);
        return this.toLocalDateString(d);
    }

    private toLocalDateString(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
