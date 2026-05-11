import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionStore } from '@envello/state';
import { Subscription } from '@envello/domain';
import { ModalComponent, AiAssistantPanelComponent, AiPanelMessage } from '@envello/ui';

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
    imports: [CommonModule, FormsModule, ModalComponent, AiAssistantPanelComponent],
    template: `
<div class="vs-view">

  <!-- ── SIDEBAR ── -->
  <aside class="vs-sb">
    <div class="vs-sb-header">
      <h1 class="vs-sb-title">Subscriptions</h1>
      <p class="vs-sb-stats">
        {{ currencySymbol(defaultCurrency()) }}{{ subscriptionStore.totalMonthlyCost() | number:'1.0-0' }}/mo
        &nbsp;·&nbsp;
        {{ currencySymbol(defaultCurrency()) }}{{ subscriptionStore.totalYearlyCost() | number:'1.0-0' }}/yr
      </p>
    </div>

    <nav class="vs-sb-nav">
      <button class="vs-sb-item"
        [class.active]="!selectedStatus() && !selectedCategory() && !selectedCycle()"
        (click)="clearFilters()">
        <span class="material-symbols-outlined">subscriptions</span>
        <span class="vs-sb-label">All</span>
        <span class="vs-sb-count">{{ subscriptionStore.subscriptions().length }}</span>
      </button>
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
    </nav>

    <div class="vs-sb-divider"></div>

    <div class="vs-sb-section">
      <div class="vs-sb-section-title">Billing Cycle</div>
      <button class="vs-sb-item" [class.active]="selectedCycle() === 'monthly'"
        (click)="toggleCycleFilter('monthly')">
        <span class="material-symbols-outlined">calendar_month</span>
        <span class="vs-sb-label">Monthly</span>
      </button>
      <button class="vs-sb-item" [class.active]="selectedCycle() === 'yearly'"
        (click)="toggleCycleFilter('yearly')">
        <span class="material-symbols-outlined">event_repeat</span>
        <span class="vs-sb-label">Yearly</span>
      </button>
    </div>

    <div class="vs-sb-divider"></div>

    <div class="vs-sb-section">
      <div class="vs-sb-section-title">Category</div>
      @for (cat of categoryOptions; track cat) {
        <button class="vs-sb-item" [class.active]="selectedCategory() === cat"
          (click)="toggleCategoryFilter(cat)">
          <span class="material-symbols-outlined">{{ categoryIcon(cat) }}</span>
          <span class="vs-sb-label capitalize">{{ cat }}</span>
          @if (countByCategory()[cat]) {
            <span class="vs-sb-count">{{ countByCategory()[cat] }}</span>
          }
        </button>
      }
    </div>
  </aside>

  <!-- ── MAIN ── -->
  <div class="vs-main">

    <!-- Toolbar -->
    <div class="vs-toolbar">
      <div class="vs-bc">
        <span class="vs-bc-root">Subscriptions</span>
        @if (selectedStatus()) {
          <span class="vs-bc-sep">›</span>
          <span class="vs-bc-leaf">{{ selectedStatus() }}</span>
        }
        @if (selectedCategory()) {
          <span class="vs-bc-sep">›</span>
          <span class="vs-bc-leaf">{{ selectedCategory() }}</span>
        }
        @if (selectedCycle()) {
          <span class="vs-bc-sep">›</span>
          <span class="vs-bc-leaf">{{ selectedCycle() }}</span>
        }
        <span class="vs-bc-count">{{ filteredSubs().length }}</span>
      </div>
      <div class="vs-toolbar-right">
        <div class="vs-search-wrap">
          <span class="material-symbols-outlined vs-search-icon">search</span>
          <input class="vs-search-input" type="text" placeholder="Search subscriptions…"
            [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)">
        </div>
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
          Add Subscription
        </button>
      </div>
    </div>

    <!-- Upcoming renewals banner -->
    @if (upcomingBanner().length > 0) {
      <div class="vs-banner">
        <span class="material-symbols-outlined vs-banner-icon">notifications_active</span>
        <span class="vs-banner-label">Renewing soon:</span>
        @for (sub of upcomingBanner(); track sub.id) {
          @let bdays = daysUntil(sub.renewalDate);
          <span class="vs-banner-chip" [class.vs-banner-urgent]="bdays !== null && bdays <= 3">
            {{ sub.name }}
            <span class="vs-banner-days">{{ bdays === 0 ? 'today' : 'in ' + bdays + 'd' }}</span>
          </span>
        }
      </div>
    }

    <!-- Table -->
    <div class="vs-table-wrap">

      <div class="vs-table-head">
        <div class="vs-th vs-col-service" (click)="setSort('name')">
          Service
          <span class="vs-sort-ico material-symbols-outlined">
            {{ sortCol() === 'name' ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
          </span>
        </div>
        <div class="vs-th vs-col-category">Category</div>
        <div class="vs-th vs-col-amount" (click)="setSort('price')">
          Amount
          <span class="vs-sort-ico material-symbols-outlined">
            {{ sortCol() === 'price' ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
          </span>
        </div>
        <div class="vs-th vs-col-cycle">Cycle</div>
        <div class="vs-th vs-col-renewal" (click)="setSort('renewalDate')">
          Next Renewal
          <span class="vs-sort-ico material-symbols-outlined">
            {{ sortCol() === 'renewalDate' ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
          </span>
        </div>
        <div class="vs-th vs-col-status">Status</div>
        <div class="vs-th vs-col-actions"></div>
      </div>

      @if (filteredSubs().length === 0) {
        <div class="vs-empty">
          @if (subscriptionStore.subscriptions().length === 0) {
            <span class="material-symbols-outlined vs-empty-icon">subscriptions</span>
            <p class="vs-empty-title">No subscriptions yet</p>
            <p class="vs-empty-sub">Track your SaaS costs — add one manually or import a list.</p>
            <div class="vs-empty-actions">
              <button class="vs-add-btn" (click)="openAddForm()">
                <span class="material-symbols-outlined">add</span>
                Add Subscription
              </button>
              <button class="vs-tool-btn" (click)="showImportModal.set(true)">
                <span class="material-symbols-outlined">upload</span>
                Import
              </button>
            </div>
          } @else {
            <span class="material-symbols-outlined vs-empty-icon">search_off</span>
            <p class="vs-empty-title">No results match your filters</p>
            <button class="vs-tool-btn" (click)="clearFilters()">Clear Filters</button>
          }
        </div>
      }

      @for (sub of filteredSubs(); track sub.id) {
        @let days = daysUntil(sub.renewalDate);
        <div class="vs-tr"
          [class.vs-tr--paused]="sub.status === 'paused'"
          [class.vs-tr--cancelled]="sub.status === 'cancelled'">

          <div class="vs-td vs-col-service" (click)="openDetails(sub)">
            <div class="vs-avatar" [style.background]="avatarBg(sub.name)">
              <span class="vs-avatar-letter">{{ sub.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="vs-service-info">
              <span class="vs-service-name">{{ sub.name }}</span>
              @if (sub.notes) {
                <span class="vs-service-notes">{{ sub.notes }}</span>
              }
            </div>
          </div>

          <div class="vs-td vs-col-category">
            @if (sub.category) {
              <span class="vs-cat-chip">{{ sub.category }}</span>
            } @else {
              <span class="vs-muted">—</span>
            }
          </div>

          <div class="vs-td vs-col-amount">
            <span class="vs-price">{{ currencySymbol(sub.currency) }}{{ sub.price | number:'1.2-2' }}</span>
          </div>

          <div class="vs-td vs-col-cycle">
            <span class="vs-muted capitalize">{{ sub.billingCycle }}</span>
          </div>

          <div class="vs-td vs-col-renewal">
            <span class="vs-date">{{ formatDate(sub.renewalDate) }}</span>
            @if (days !== null && sub.status !== 'cancelled') {
              <span class="vs-days-chip"
                [class.vs-days-ok]="days > 30"
                [class.vs-days-caution]="days <= 30 && days > 7"
                [class.vs-days-warn]="days <= 7">
                {{ days === 0 ? 'today' : 'in ' + days + 'd' }}
              </span>
            }
          </div>

          <div class="vs-td vs-col-status">
            <button class="vs-status-badge"
              [style.color]="statusMeta(sub.status).color"
              [style.background]="statusMeta(sub.status).bg"
              (click)="cycleStatus(sub)"
              title="Click to cycle status">
              {{ statusMeta(sub.status).label }}
            </button>
          </div>

          <div class="vs-td vs-col-actions">
            @if (deleteConfirmId() === sub.id) {
              <div class="vs-confirm">
                <button class="vs-confirm-del" (click)="doDelete(sub.id)">Delete</button>
                <button class="vs-confirm-cancel" (click)="deleteConfirmId.set(null)">Cancel</button>
              </div>
            } @else {
              <div class="vs-row-actions">
                <button class="vs-row-btn" (click)="openDetails(sub)" title="View details">
                  <span class="material-symbols-outlined">open_in_new</span>
                </button>
                <button class="vs-row-btn" (click)="openEditForm(sub)" title="Edit">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="vs-row-btn vs-row-btn--danger" (click)="deleteConfirmId.set(sub.id)" title="Delete">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            }
          </div>

        </div>
      }

    </div>
  </div>

  <!-- AI panel -->
  @if (showAssistant()) {
    <env-ai-panel
      title="Subscriptions Assistant"
      placeholder="Ask about your subscriptions…"
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
    [title]="formMode() === 'add' ? 'New Subscription' : 'Edit Subscription'"
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

      <!-- Row 2: Price · Cycle · Renewal -->
      <div class="form-row" style="margin-top:12px">
        <div class="form-group">
          <label class="form-label">Price</label>
          <div class="price-wrap">
            <button type="button" class="currency-btn"
              (click)="rotateCurrency()"
              title="Click to change currency ({{ formCurrency() }})">
              {{ formCurrency() }}
            </button>
            <input type="number" step="0.01" min="0" class="form-input price-input"
              [ngModel]="formPrice()" (ngModelChange)="formPrice.set($event)"
              placeholder="0.00">
          </div>
        </div>
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
        <div class="form-group fg-1">
          <label class="form-label">Next Renewal</label>
          <div class="renewal-wrap">
            <input type="date" class="form-input renewal-input"
              [ngModel]="formRenewal()" (ngModelChange)="formRenewal.set($event)">
            <div class="shortcut-row">
              <button type="button" class="shortcut-btn" title="+1 month"  (click)="addRenewalOffset(1)">+1m</button>
              <button type="button" class="shortcut-btn" title="+3 months" (click)="addRenewalOffset(3)">+3m</button>
              <button type="button" class="shortcut-btn" title="+6 months" (click)="addRenewalOffset(6)">+6m</button>
              <button type="button" class="shortcut-btn" title="+1 year"   (click)="addRenewalOffset(12)">+1y</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 3: Status -->
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
          {{ formPrice() <= 0 ? 'Enter a price' : !formRenewal() ? 'Pick a renewal date' : '' }}
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
  <env-modal [isOpen]="true" title="Import Subscriptions" (closed)="showImportModal.set(false)">
    <div body class="import-body">
      <p class="import-hint">
        One subscription per line.<br>
        Format: <code>Name, Price, Cycle, Category, Currency</code><br>
        <span style="color:var(--text-tertiary)">Cycle is <code>monthly</code> or <code>yearly</code>. Category and Currency are optional — known vendors are auto-detected.</span>
      </p>
      <textarea class="import-textarea"
        [ngModel]="importText()" (ngModelChange)="importText.set($event)"
        placeholder="GitHub, 4, monthly&#10;AWS, 150, monthly&#10;Figma, 180, yearly, design&#10;1Password, 36, yearly, security, USD"></textarea>
      @if (importPreviewCount() > 0) {
        <p class="import-count">
          <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle">check_circle</span>
          {{ importPreviewCount() }} subscription{{ importPreviewCount() === 1 ? '' : 's' }} ready to import
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
@if (viewingSub(); as sub) {
  <env-modal [isOpen]="true" [title]="''" size="large" (closed)="closeDetails()">
    <div body class="detail-body">

      <div class="detail-hero">
        <div class="detail-avatar" [style.background]="avatarBg(sub.name)">
          {{ sub.name.charAt(0).toUpperCase() }}
        </div>
        <div class="detail-hero-text">
          <h2 class="detail-name">{{ sub.name }}</h2>
          <span class="vs-status-badge" style="display:inline-block;margin-top:4px"
            [style.color]="statusMeta(sub.status).color"
            [style.background]="statusMeta(sub.status).bg">
            {{ statusMeta(sub.status).label }}
          </span>
        </div>
        <div class="detail-cost-block">
          <div class="detail-price">{{ currencySymbol(sub.currency) }}{{ sub.price | number:'1.2-2' }}</div>
          <div class="detail-cycle">per {{ sub.billingCycle === 'monthly' ? 'month' : 'year' }}</div>
        </div>
      </div>

      <div class="detail-equiv">
        @if (sub.billingCycle === 'yearly') {
          <div class="detail-equiv-chip">
            <span class="equiv-label">Monthly equivalent</span>
            <span class="equiv-value">{{ monthlyCost(sub) }}</span>
          </div>
        }
        @if (sub.billingCycle === 'monthly') {
          <div class="detail-equiv-chip">
            <span class="equiv-label">Yearly equivalent</span>
            <span class="equiv-value">{{ yearlyCost(sub) }}</span>
          </div>
        }
      </div>

      <div class="detail-grid">
        <div class="detail-field">
          <span class="detail-field-label">Category</span>
          <span class="detail-field-value capitalize">{{ sub.category || '—' }}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Currency</span>
          <span class="detail-field-value">{{ sub.currency || 'USD' }}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Billing Cycle</span>
          <span class="detail-field-value capitalize">{{ sub.billingCycle }}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Next Renewal</span>
          <div class="detail-field-value" style="display:flex;align-items:center;gap:8px">
            {{ formatDate(sub.renewalDate) }}
            @let days = daysUntil(sub.renewalDate);
            @if (days !== null && sub.status !== 'cancelled') {
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
          <span class="detail-field-value">{{ sub.projectId || 'global' }}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">ID</span>
          <span class="detail-field-value detail-id">{{ sub.id }}</span>
        </div>
        @if (sub.notes) {
          <div class="detail-field detail-field-full">
            <span class="detail-field-label">Notes</span>
            <span class="detail-field-value">{{ sub.notes }}</span>
          </div>
        }
      </div>
    </div>

    <div footer style="display:flex;justify-content:flex-end;gap:8px;width:100%">
      <button class="vendor-cancel-btn" (click)="closeDetails()">Close</button>
      <button class="vendor-save-btn" (click)="editFromDetails(sub)">
        <span class="material-symbols-outlined">edit</span>
        Edit Subscription
      </button>
    </div>
  </env-modal>
}
  `,
    styles: [`
    :host { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; }
    .vs-view { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; background: var(--bg-app); }
    .capitalize { text-transform: capitalize; }

    /* ── Sidebar ── */
    .vs-sb {
      width: 200px; flex-shrink: 0;
      background: var(--bg-panel);
      border-right: 1px solid var(--border-main);
      display: flex; flex-direction: column;
      overflow-y: auto; overflow-x: hidden;
    }
    .vs-sb-header {
      padding: 16px 12px 12px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .vs-sb-title { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .vs-sb-stats { margin: 0; font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono); }

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
    .vs-bc { display: flex; align-items: center; gap: 6px; }
    .vs-bc-root { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .vs-bc-sep  { font-size: 14px; color: var(--text-tertiary); }
    .vs-bc-leaf { font-size: 13px; font-weight: 600; color: var(--text-primary); text-transform: capitalize; }
    .vs-bc-count {
      font-size: 11px; color: var(--text-tertiary);
      background: var(--bg-hover); border-radius: 10px; padding: 1px 7px;
    }

    .vs-toolbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .vs-tb-divider { width: 1px; height: 18px; background: var(--border-subtle); margin: 0 2px; }

    .vs-search-wrap { position: relative; display: flex; align-items: center; }
    .vs-search-icon {
      position: absolute; left: 8px; font-size: 16px;
      color: var(--text-tertiary); pointer-events: none;
    }
    .vs-search-input {
      height: 28px; padding: 0 10px 0 28px;
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      border-radius: 5px; font-size: 12px; color: var(--text-primary);
      outline: none; width: 190px; transition: all 0.2s;
    }
    .vs-search-input:focus { background: var(--bg-panel); border-color: var(--accent-primary); }

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
    .vs-table-wrap { flex: 1 1 0; min-height: 0; overflow-y: auto; overflow-x: auto; }

    .vs-table-head {
      display: flex; align-items: center; height: 36px;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border-main);
      position: sticky; top: 0; z-index: 10;
    }
    .vs-th {
      display: flex; align-items: center; gap: 4px;
      padding: 0 14px;
      font-size: 11px; font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase; letter-spacing: 0.04em;
      user-select: none;
      border-right: 1px solid var(--border-subtle);
    }
    .vs-th:last-child { border-right: none; }
    .vs-sort-ico { font-size: 13px; opacity: 0.5; }

    /* Column widths */
    .vs-col-service  { flex: 1; min-width: 180px; cursor: pointer; }
    .vs-col-category { width: 120px; flex-shrink: 0; }
    .vs-col-amount   { width: 110px; flex-shrink: 0; justify-content: flex-end; }
    .vs-col-cycle    { width: 80px;  flex-shrink: 0; }
    .vs-col-renewal  { width: 170px; flex-shrink: 0; }
    .vs-col-status   { width: 100px; flex-shrink: 0; }
    .vs-col-actions  { width: 110px; flex-shrink: 0; justify-content: flex-end; }

    .vs-th.vs-col-service,
    .vs-th.vs-col-amount,
    .vs-th.vs-col-renewal { cursor: pointer; transition: color 0.12s; }
    .vs-th.vs-col-service:hover,
    .vs-th.vs-col-amount:hover,
    .vs-th.vs-col-renewal:hover { color: var(--text-secondary); }

    /* Rows */
    .vs-tr {
      display: flex; align-items: center;
      height: 44px; border-bottom: 1px solid var(--border-subtle);
      transition: background 0.12s;
    }
    .vs-tr:last-child { border-bottom: none; }
    .vs-tr:hover { background: var(--bg-hover); }
    .vs-tr--paused    { opacity: 0.6; }
    .vs-tr--cancelled { opacity: 0.35; }

    /* Hover-reveal row actions */
    .vs-col-actions { opacity: 0; transition: opacity 0.1s; }
    .vs-tr:hover .vs-col-actions { opacity: 1; }

    /* Cells */
    .vs-td { display: flex; align-items: center; gap: 8px; padding: 0 14px; overflow: hidden; }

    /* Service */
    .vs-col-service.vs-td { cursor: pointer; }
    .vs-avatar {
      width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .vs-avatar-letter { font-size: 11px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.25); }
    .vs-service-info  { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .vs-service-name  {
      font-size: 13px; font-weight: 500; color: var(--text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .vs-col-service:hover .vs-service-name { color: var(--accent-primary); }
    .vs-service-notes {
      font-size: 10.5px; color: var(--text-tertiary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* Category chip */
    .vs-cat-chip {
      display: inline-flex; padding: 1px 7px; border-radius: 4px;
      border: 1px solid var(--border-subtle); background: transparent;
      font-size: 11px; color: var(--text-secondary); text-transform: capitalize;
    }
    .vs-muted { font-size: 12.5px; color: var(--text-tertiary); }

    /* Amount */
    .vs-col-amount.vs-td { justify-content: flex-end; }
    .vs-price { font-size: 13px; font-weight: 600; color: var(--text-primary); font-family: var(--font-mono); }

    /* Renewal */
    .vs-date { font-size: 12.5px; color: var(--text-primary); white-space: nowrap; }
    .vs-days-chip {
      padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-subtle);
      font-size: 10.5px; font-weight: 500; white-space: nowrap;
    }
    .vs-days-ok      { color: var(--text-tertiary); background: var(--bg-hover); }
    .vs-days-caution { color: #d97706; background: color-mix(in srgb, #fbbf24 8%, transparent); border-color: color-mix(in srgb, #fbbf24 30%, transparent); }
    .vs-days-warn    { color: var(--accent-red); background: color-mix(in srgb, var(--accent-red) 8%, transparent); border-color: color-mix(in srgb, var(--accent-red) 30%, transparent); }

    /* Status badge */
    .vs-status-badge {
      display: inline-flex; align-items: center;
      padding: 2px 10px; border-radius: 100px;
      border: 1px solid currentColor;
      font-size: 11px; font-weight: 500; text-transform: capitalize;
      cursor: pointer; transition: opacity 0.12s; background: transparent;
    }
    .vs-status-badge:hover { opacity: 0.65; }

    /* Row actions */
    .vs-row-actions { display: flex; align-items: center; gap: 2px; justify-content: flex-end; }
    .vs-row-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: 5px;
      color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
    }
    .vs-row-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vs-row-btn--danger:hover { background: color-mix(in srgb, var(--accent-red) 12%, transparent); color: var(--accent-red); }
    .vs-row-btn .material-symbols-outlined { font-size: 16px; }

    .vs-confirm { display: flex; gap: 5px; justify-content: flex-end; }
    .vs-confirm-del, .vs-confirm-cancel {
      padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
      cursor: pointer; border: 1px solid transparent;
    }
    .vs-confirm-del    { background: color-mix(in srgb, var(--accent-red) 10%, transparent); color: var(--accent-red); border-color: color-mix(in srgb, var(--accent-red) 30%, transparent); }
    .vs-confirm-del:hover { background: color-mix(in srgb, var(--accent-red) 20%, transparent); }
    .vs-confirm-cancel { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--border-subtle); }

    /* Empty state */
    .vs-empty { padding: 60px 20px; text-align: center; color: var(--text-tertiary); }
    .vs-empty-icon  { font-size: 32px; opacity: 0.4; margin-bottom: 12px; display: block; }
    .vs-empty-title { font-size: 14px; font-weight: 500; color: var(--text-primary); margin: 0 0 4px; }
    .vs-empty-sub   { font-size: 12px; color: var(--text-tertiary); margin: 0 0 16px; }
    .vs-empty-actions { display: flex; gap: 8px; justify-content: center; }

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
    public subscriptionStore = inject(SubscriptionStore);

    readonly categoryOptions = ['software', 'infrastructure', 'design', 'marketing', 'security', 'analytics', 'communication', 'finance', 'other'];
    readonly currencies = CURRENCIES;
    readonly vendorNames = Object.keys(VENDOR_PRESETS).map(k => k.charAt(0).toUpperCase() + k.slice(1));

    // ── Filter state ──────────────────────────────────────────────────────
    searchQuery      = signal('');
    selectedStatus   = signal<string | null>(null);
    selectedCycle    = signal<'monthly' | 'yearly' | null>(null);
    selectedCategory = signal<string | null>(null);

    // ── Sort state ────────────────────────────────────────────────────────
    sortCol = signal<'name' | 'price' | 'renewalDate'>('renewalDate');
    sortDir = signal<'asc' | 'desc'>('asc');

    // ── Form state ────────────────────────────────────────────────────────
    formMode      = signal<'add' | 'edit' | null>(null);
    editingId     = signal<string | null>(null);
    formName      = signal('');
    formCategory  = signal('software');
    formProjectId = signal('global');
    formPrice     = signal<number>(0);
    formCurrency  = signal('USD');
    formCycle     = signal<'monthly' | 'yearly'>('monthly');
    formRenewal   = signal('');
    formStatus    = signal<'active' | 'paused' | 'cancelled'>('active');
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
    deleteConfirmId = signal<string | null>(null);
    showImportModal = signal(false);
    importText      = signal('');
    viewingSub      = signal<Subscription | null>(null);

    // ── AI Assistant ──────────────────────────────────────────────────────
    showAssistant = signal(false);
    aiLoading     = signal(false);
    aiMessages    = signal<AiPanelMessage[]>([]);

    readonly aiSuggestions = [
        'What is my total monthly spend?',
        'Which subscriptions renew soon?',
        'What are my most expensive subscriptions?',
        'Show me a breakdown by category',
        'Which subscriptions are paused or cancelled?',
    ];

    // ── Computed ──────────────────────────────────────────────────────────
    canSave = computed(() => !!this.formName() && !!this.formRenewal() && this.formPrice() > 0);

    activeCount = computed(() =>
        this.subscriptionStore.subscriptions().filter(s => !s.status || s.status === 'active').length
    );

    pausedCount = computed(() =>
        this.subscriptionStore.subscriptions().filter(s => s.status === 'paused').length
    );

    cancelledCount = computed(() =>
        this.subscriptionStore.subscriptions().filter(s => s.status === 'cancelled').length
    );

    countByCategory = computed(() => {
        const counts: Record<string, number> = {};
        for (const s of this.subscriptionStore.subscriptions()) {
            const cat = s.category || 'other';
            counts[cat] = (counts[cat] ?? 0) + 1;
        }
        return counts;
    });

    hasActiveFilters = computed(() =>
        !!this.searchQuery() || this.selectedStatus() !== null ||
        this.selectedCycle() !== null || this.selectedCategory() !== null
    );

    defaultCurrency = computed(() => {
        const subs = this.subscriptionStore.subscriptions();
        if (!subs.length) return 'USD';
        const freq: Record<string, number> = {};
        for (const s of subs) {
            const cur = s.currency ?? 'USD';
            freq[cur] = (freq[cur] ?? 0) + 1;
        }
        return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    });

    upcomingBanner = computed(() => {
        const now = Date.now();
        const limit = 14 * 24 * 60 * 60 * 1000;
        return this.subscriptionStore.subscriptions()
            .filter(s => s.status !== 'cancelled' && !!s.renewalDate)
            .filter(s => {
                const diff = new Date(s.renewalDate).getTime() - now;
                return diff >= 0 && diff <= limit;
            })
            .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
    });

    importPreviewCount = computed(() =>
        this.importText().trim().split('\n').filter(l => {
            const p = l.split(',').map(x => x.trim());
            return p.length >= 2 && p[0] && !isNaN(parseFloat(p[1]));
        }).length
    );

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
            if (col === 'name')        return dir * a.name.localeCompare(b.name);
            if (col === 'price')       return dir * (a.price - b.price);
            if (col === 'renewalDate') return dir * (new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
            return 0;
        });
    });

    // ── Filter helpers ────────────────────────────────────────────────────
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

    // ── Sort ──────────────────────────────────────────────────────────────
    setSort(col: 'name' | 'price' | 'renewalDate') {
        if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
        else { this.sortCol.set(col); this.sortDir.set('asc'); }
    }

    // ── Form open / close ─────────────────────────────────────────────────
    openAddForm() {
        if (this.formMode() !== null) { this.closeForm(); return; }
        this.resetForm();
        this.formRenewal.set(this.autoRenewalDate('monthly'));
        this.formMode.set('add');
        setTimeout(() => (document.querySelector('.vendor-name-input') as HTMLInputElement)?.focus(), 60);
    }

    openEditForm(sub: Subscription) {
        this.editingId.set(sub.id);
        this.formName.set(sub.name);
        this.formCategory.set(sub.category ?? 'software');
        this.formProjectId.set(sub.projectId ?? 'global');
        this.formPrice.set(sub.price);
        this.formCurrency.set(sub.currency ?? 'USD');
        this.formCycle.set(sub.billingCycle);
        this.formRenewal.set(sub.renewalDate ? sub.renewalDate.split('T')[0] : '');
        this.formStatus.set(sub.status ?? 'active');
        this.formNotes.set(sub.notes ?? '');
        this.presetApplied.set(false);
        this.showAdvanced.set((!!sub.projectId && sub.projectId !== 'global') || !!sub.notes);
        this.formMode.set('edit');
    }

    closeForm() { this.formMode.set(null); this.resetForm(); }

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
        this.showAdvanced.set(false);
        this.presetApplied.set(false);
    }

    // ── Save actions ──────────────────────────────────────────────────────
    private async saveFormInternal(): Promise<boolean> {
        if (!this.canSave()) return false;
        const payload: Partial<Subscription> = {
            name:         this.formName(),
            category:     this.formCategory() || 'software',
            projectId:    this.formProjectId() || undefined,
            price:        Number(this.formPrice()),
            currency:     this.formCurrency(),
            billingCycle: this.formCycle(),
            renewalDate:  this.formRenewal(),
            status:       this.formStatus(),
            notes:        this.formNotes() || undefined,
        };
        if (this.formMode() === 'add') {
            await this.subscriptionStore.addSubscription({ id: crypto.randomUUID(), ...payload } as Subscription);
        } else if (this.editingId()) {
            await this.subscriptionStore.updateSubscription(this.editingId()!, payload);
        }
        return true;
    }

    async saveForm() {
        if (await this.saveFormInternal()) this.closeForm();
    }

    async saveAndAddAnother() {
        if (await this.saveFormInternal()) {
            this.resetForm();
            this.formRenewal.set(this.autoRenewalDate('monthly'));
            this.formMode.set('add');
            setTimeout(() => (document.querySelector('.vendor-name-input') as HTMLInputElement)?.focus(), 60);
        }
    }

    async doDelete(id: string) {
        await this.subscriptionStore.deleteSubscription(id);
        this.deleteConfirmId.set(null);
    }

    async cycleStatus(sub: Subscription) {
        const order: ('active' | 'paused' | 'cancelled')[] = ['active', 'paused', 'cancelled'];
        const idx = order.indexOf(sub.status ?? 'active');
        await this.subscriptionStore.updateSubscription(sub.id, { status: order[(idx + 1) % 3] });
    }

    // ── Form field helpers ────────────────────────────────────────────────
    onNameChange(name: string) {
        this.formName.set(name);
        this.vendorHighlightIdx.set(-1);
        this.showVendorDropdown.set(true);
        if (this.formMode() !== 'add') return;
        const preset = VENDOR_PRESETS[name.toLowerCase().trim()];
        if (preset) {
            this.formCategory.set(preset.category);
            this.formCycle.set(preset.billingCycle);
            this.formCurrency.set(preset.currency);
            this.formRenewal.set(this.autoRenewalDate(preset.billingCycle));
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
        if (this.formMode() === 'add') this.formRenewal.set(this.autoRenewalDate(v.billingCycle));
        this.presetApplied.set(true);
        this.showVendorDropdown.set(false);
        this.vendorHighlightIdx.set(-1);
    }

    onVendorBlur() {
        setTimeout(() => this.showVendorDropdown.set(false), 150);
    }

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
            communication: 'chat', finance: 'payments', other: 'category',
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

    setCycle(cycle: 'monthly' | 'yearly') {
        this.formCycle.set(cycle);
        if (this.formMode() === 'add') this.formRenewal.set(this.autoRenewalDate(cycle));
    }

    rotateCurrency() {
        const idx = CURRENCIES.indexOf(this.formCurrency());
        this.formCurrency.set(CURRENCIES[(idx + 1) % CURRENCIES.length]);
    }

    addRenewalOffset(months: number) {
        const base = this.formRenewal();
        const d = base ? new Date(base + 'T12:00:00') : new Date();
        d.setMonth(d.getMonth() + months);
        this.formRenewal.set(this.toLocalDateString(d));
    }

    toggleAdvanced() { this.showAdvanced.update(v => !v); }

    // ── Bulk import ───────────────────────────────────────────────────────
    async parseAndImport() {
        const lines = this.importText().trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 2) continue;
            const name  = parts[0];
            const price = parseFloat(parts[1]);
            if (!name || isNaN(price)) continue;

            const cycleRaw = (parts[2] ?? 'monthly').toLowerCase();
            const cycle: 'monthly' | 'yearly' = cycleRaw === 'yearly' ? 'yearly' : 'monthly';
            const preset   = VENDOR_PRESETS[name.toLowerCase()];
            const category = parts[3] || preset?.category  || 'software';
            const currency = parts[4] || preset?.currency  || 'USD';

            await this.subscriptionStore.addSubscription({
                id:          crypto.randomUUID(),
                name,
                price,
                billingCycle: cycle,
                category,
                currency,
                renewalDate:  this.autoRenewalDate(cycle),
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

    monthlyCost(sub: Subscription): string {
        const sym = this.currencySymbol(sub.currency);
        const val = sub.billingCycle === 'yearly' ? sub.price / 12 : sub.price;
        return `${sym}${val.toFixed(2)}/mo`;
    }

    yearlyCost(sub: Subscription): string {
        const sym = this.currencySymbol(sub.currency);
        const val = sub.billingCycle === 'monthly' ? sub.price * 12 : sub.price;
        return `${sym}${val.toFixed(2)}/yr`;
    }

    openDetails(sub: Subscription) { this.viewingSub.set(sub); }
    closeDetails() { this.viewingSub.set(null); }

    editFromDetails(sub: Subscription) {
        this.closeDetails();
        setTimeout(() => this.openEditForm(sub), 50);
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

        const subs = this.subscriptionStore.subscriptions();
        const active = subs.filter(s => !s.status || s.status === 'active');
        const q = text.toLowerCase();
        let response = '';

        if (q.includes('total') || q.includes('spend') || q.includes('cost')) {
            const mo = this.subscriptionStore.totalMonthlyCost();
            const yr = this.subscriptionStore.totalYearlyCost();
            const sym = this.currencySymbol(this.defaultCurrency());
            response = `Your total monthly spend is **${sym}${mo.toFixed(2)}/mo** (${sym}${yr.toFixed(2)}/yr) across ${active.length} active subscription${active.length !== 1 ? 's' : ''}.`;
        } else if (q.includes('renew') || q.includes('soon') || q.includes('upcoming')) {
            const upcoming = this.upcomingBanner();
            response = upcoming.length
                ? `${upcoming.length} subscription${upcoming.length > 1 ? 's renew' : ' renews'} in the next 14 days: ${upcoming.map(s => `${s.name} (${this.formatDate(s.renewalDate)})`).join(', ')}.`
                : `No subscriptions renewing in the next 14 days.`;
        } else if (q.includes('expensive') || q.includes('most') || q.includes('highest')) {
            const top = [...active].sort((a, b) => {
                const ma = a.billingCycle === 'yearly' ? a.price / 12 : a.price;
                const mb = b.billingCycle === 'yearly' ? b.price / 12 : b.price;
                return mb - ma;
            }).slice(0, 5);
            response = top.length
                ? `Top 5 by monthly cost:\n${top.map((s, i) => `${i + 1}. ${s.name} — ${this.currencySymbol(s.currency)}${(s.billingCycle === 'yearly' ? s.price / 12 : s.price).toFixed(2)}/mo`).join('\n')}`
                : `No active subscriptions to rank.`;
        } else if (q.includes('category') || q.includes('breakdown')) {
            const counts = this.countByCategory();
            const lines = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cat, n]) => `${cat}: ${n}`);
            response = lines.length
                ? `Breakdown by category:\n${lines.join('\n')}`
                : `No subscriptions yet.`;
        } else if (q.includes('paused') || q.includes('cancelled')) {
            const paused    = subs.filter(s => s.status === 'paused');
            const cancelled = subs.filter(s => s.status === 'cancelled');
            response = `You have ${paused.length} paused (${paused.map(s => s.name).join(', ') || 'none'}) and ${cancelled.length} cancelled subscription${cancelled.length !== 1 ? 's' : ''} (${cancelled.map(s => s.name).join(', ') || 'none'}).`;
        } else {
            const mo = this.subscriptionStore.totalMonthlyCost();
            const sym = this.currencySymbol(this.defaultCurrency());
            response = `You have ${active.length} active subscription${active.length !== 1 ? 's' : ''} costing ${sym}${mo.toFixed(2)}/mo. Try asking about your total spend, upcoming renewals, most expensive services, or a category breakdown.`;
        }

        this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
        this.aiLoading.set(false);

        setTimeout(() => {
            const el = document.querySelector('.ai-panel-messages');
            if (el) el.scrollTop = el.scrollHeight;
        }, 50);
    }

    // ── Private utilities ─────────────────────────────────────────────────
    private autoRenewalDate(cycle: 'monthly' | 'yearly'): string {
        const d = new Date();
        if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
        else d.setFullYear(d.getFullYear() + 1);
        return this.toLocalDateString(d);
    }

    private toLocalDateString(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
