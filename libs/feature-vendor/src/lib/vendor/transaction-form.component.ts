import { Component, inject, signal, computed, input, output, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TransactionStore } from '@envello/state';
import { Transaction, TransactionType } from '@envello/domain';
import { ConfirmDialogComponent } from '@envello/ui';
import {
    TYPE_META, STATUS_META, CURRENCIES, CATEGORY_OPTIONS, POPULAR_VENDOR_KEYS,
    VENDOR_PRESETS, toDisplayName, toLocalDateString, autoDate, avatarBg,
    currencySymbol, categoryIcon,
} from './transaction.constants';


// Pre-built once at module load — avoids Object.entries().map() on every keystroke.
const ALL_VENDOR_OPTIONS = Object.entries(VENDOR_PRESETS).map(([key, val]) => ({
    key, displayName: toDisplayName(key), ...val,
}));
const POPULAR_VENDOR_OPTIONS = ALL_VENDOR_OPTIONS.filter(v => POPULAR_VENDOR_KEYS.includes(v.key));

@Component({
    selector: 'app-transaction-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<div class="tf-shell" [class.tf-shell--embedded]="embeddedMode()">

  <!-- ── SLIDER HEADER (embedded mode) ── -->
  @if (embeddedMode()) {
    <div class="tf-slider-header">
      <button class="tf-slider-close" (click)="back()" title="Close">
        <span class="material-symbols-outlined">close</span>
      </button>
      <span class="tf-slider-title">
        {{ isEditMode() ? 'Transaction Details' : 'New Transaction' }}
      </span>
      <span class="tf-slider-type-badge"
        [style.color]="typeMeta(formType()).color"
        [style.background]="'color-mix(in srgb, ' + typeMeta(formType()).color + ' 12%, transparent)'">
        <span class="material-symbols-outlined">{{ typeMeta(formType()).icon }}</span>
        {{ typeMeta(formType()).label }}
      </span>
      @if (isEditMode()) {
        <button class="tf-danger-btn" (click)="deleteConfirmOpen.set(true)" title="Delete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      }
    </div>
  }

  <!-- ── STANDARD TOPBAR (route mode) ── -->
  @if (!embeddedMode()) {
    <div class="tf-topbar">
      <button class="tf-back" (click)="back()">
        <span class="material-symbols-outlined">chevron_left</span>
        Transactions
      </button>
      @if (isEditMode()) {
        <button class="tf-danger-btn" (click)="deleteConfirmOpen.set(true)">
          <span class="material-symbols-outlined">delete</span>
          Delete
        </button>
      }
    </div>
  }

  <!-- Scrollable body -->
  <div class="tf-scroll">

    <!-- ── SLIDER HERO CARD (embedded mode) ── -->
    @if (embeddedMode()) {
      <div class="tf-slider-hero-card">
        <div class="tf-slider-hero-left">
          <div class="tf-hero-avatar tf-hero-avatar--lg" [style.background]="avatarBgFn(formName() || 'N')">
            {{ (formName() || 'N').charAt(0).toUpperCase() }}
          </div>
          <div class="tf-slider-hero-info">
            <div class="tf-slider-service-name" [class.tf-hero-ghost]="!formName()">
              {{ formName() || 'Service name' }}
            </div>
            <div class="tf-slider-status-row">
              <span class="tf-status-dot" [style.background]="statusMetaFn(formStatus()).color"></span>
              <span class="tf-slider-status-label" [style.color]="statusMetaFn(formStatus()).color">
                {{ statusMetaFn(formStatus()).label }}
              </span>
            </div>
          </div>
        </div>
        <div class="tf-slider-hero-right">
          <div class="tf-slider-amount" [class.tf-hero-ghost]="formAmount() <= 0">
            {{ previewAmountStr() }}
          </div>
          @if (formType() === 'recurring') {
            <div class="tf-slider-cycle-label">per {{ formCycle() }}</div>
          }
        </div>
      </div>

      <!-- Tabs (edit mode only) -->
      @if (isEditMode()) {
        <div class="tf-tabs">
          <button class="tf-tab" [class.tf-tab--active]="sliderTab() === 'details'"
            (click)="sliderTab.set('details')">Details</button>
          <button class="tf-tab" [class.tf-tab--active]="sliderTab() === 'updates'"
            (click)="sliderTab.set('updates')">Updates</button>
        </div>
      }
    }

    <!-- ── STANDARD HERO (route mode) ── -->
    @if (!embeddedMode()) {
      <div class="tf-hero">
        <div class="tf-hero-avatar" [style.background]="avatarBgFn(formName() || 'N')">
          {{ (formName() || 'N').charAt(0).toUpperCase() }}
        </div>
        <div class="tf-hero-info">
          <div class="tf-hero-eyebrow">{{ isEditMode() ? 'Edit Transaction' : 'New Transaction' }}</div>
          <h1 class="tf-hero-title" [class.tf-hero-ghost]="!formName()">
            {{ formName() || 'Untitled' }}
          </h1>
        </div>
      </div>
    }

    <!-- ── DETAILS TAB (embedded edit mode) ── -->
    @if (embeddedMode() && isEditMode() && sliderTab() === 'details') {
      <div class="tf-details-body">

        <!-- Date exchange card (recurring / bill) -->
        @if ((formType() === 'recurring' || formType() === 'bill') && formDate()) {
          @let days = daysUntilPreview();
          <div class="tf-slider-date-card">
            <div class="tf-slider-date-cell">
              <div class="tf-slider-date-label">{{ dateLabel() }}</div>
              <div class="tf-slider-date-val">{{ formatPreviewDate(formDate()) }}</div>
            </div>
            <span class="material-symbols-outlined tf-slider-date-icon">calendar_month</span>
            <div class="tf-slider-date-cell tf-slider-date-cell--right">
              <div class="tf-slider-date-label">Due in</div>
              <div class="tf-slider-date-val"
                [class.tf-due-soon]="days !== null && days! <= 7 && days! >= 0"
                [class.tf-overdue]="days !== null && days! < 0">
                @if (days === null) { — }
                @else if (days < 0) { Overdue }
                @else if (days === 0) { Today }
                @else { {{ days }} days }
              </div>
            </div>
          </div>
        }

        <!-- Info rows -->
        <div class="tf-details-section-label">Details</div>
        <div class="tf-details-rows">
          <div class="tf-details-row">
            <span class="tf-details-key">Type</span>
            <span class="tf-details-val tf-details-badge"
              [style.color]="typeMeta(formType()).color"
              [style.background]="'color-mix(in srgb, ' + typeMeta(formType()).color + ' 10%, transparent)'">
              <span class="material-symbols-outlined">{{ typeMeta(formType()).icon }}</span>
              {{ typeMeta(formType()).label }}
            </span>
          </div>
          <div class="tf-details-row">
            <span class="tf-details-key">Amount</span>
            <span class="tf-details-val tf-details-val--strong">{{ previewAmountStr() }}</span>
          </div>
          @if (formType() === 'recurring') {
            <div class="tf-details-row">
              <span class="tf-details-key">Billing Cycle</span>
              <span class="tf-details-val">{{ formCycle() | titlecase }}</span>
            </div>
          }
          @if (formCategory()) {
            <div class="tf-details-row">
              <span class="tf-details-key">Category</span>
              <span class="tf-details-val">{{ formCategory() }}</span>
            </div>
          }
          <div class="tf-details-row">
            <span class="tf-details-key">Currency</span>
            <span class="tf-details-val">{{ formCurrency() }}</span>
          </div>
          @if (formProjectId() && formProjectId() !== 'global') {
            <div class="tf-details-row">
              <span class="tf-details-key">Project</span>
              <span class="tf-details-val">{{ formProjectId() }}</span>
            </div>
          }
        </div>

        @if (formNotes()) {
          <div class="tf-details-section-label" style="margin-top:8px">Notes</div>
          <div class="tf-details-notes">{{ formNotes() }}</div>
        }
      </div>
    }

    <!-- ── UPDATES TAB: timeline ── -->
    @if (embeddedMode() && isEditMode() && sliderTab() === 'updates') {
      <div class="tf-timeline-body">
        @if (timelineEvents().length === 0) {
          <div class="tf-timeline-empty">
            <span class="material-symbols-outlined">history</span>
            <span>No activity yet</span>
          </div>
        } @else {
          @for (ev of timelineEvents(); track $index; let i = $index) {
            <div class="tf-tl-row" [class.tf-tl-row--first]="i === 0">
              <div class="tf-tl-rail">
                <div class="tf-tl-dot" [class.tf-tl-dot--latest]="i === 0" [class.tf-tl-dot--billed]="ev.kind === 'billed'">
                  @if (i > 0) {
                    <span class="material-symbols-outlined tf-tl-check">check</span>
                  }
                </div>
                @if (!$last) { <div class="tf-tl-line"></div> }
              </div>
              <div class="tf-tl-content">
                <div class="tf-tl-label" [class.tf-tl-label--current]="i === 0">{{ ev.label }}</div>
                @if (ev.detail) {
                  <div class="tf-tl-detail">{{ ev.detail }}</div>
                }
                <div class="tf-tl-date">{{ formatTimelineDate(ev.date) }}</div>
              </div>
            </div>
          }
        }
      </div>
    }

    <!-- ── FORM (add mode always; edit mode when in 'edit' state) ── -->
    @if (!embeddedMode() || !isEditMode() || sliderTab() === 'edit') {
      @if (embeddedMode() && !isEditMode()) {
        <div class="tf-slider-form-label">Fill in details</div>
      }

    <!-- Two-column layout -->
    <div class="tf-cols">

      <!-- Left: Form card -->
      <div class="tf-form-col">
        <div class="tf-card">

          <!-- Section: Type cards -->
          <div class="tf-section-label">Transaction Type</div>
          <div class="type-cards">
            @for (opt of typeOptions; track opt) {
              <button type="button" class="type-card"
                [class.type-card-active]="formType() === opt"
                [ngStyle]="typeCardStyle(opt)"
                (click)="selectType(opt)">
                <span class="material-symbols-outlined type-card-icon"
                  [style.color]="typeMeta(opt).color">{{ typeMeta(opt).icon }}</span>
                <span class="type-card-label">{{ typeMeta(opt).label }}</span>
                <span class="type-card-hint">{{ typeHint(opt) }}</span>
              </button>
            }
          </div>

          <div class="tf-divider"></div>

          <!-- Section: Name + Category -->
          <div class="form-grid">
            <div class="form-field fg-2">
              <label class="form-label">{{ nameLabel() }}</label>
              <div class="vd-wrap">
                <div class="name-wrap">
                  <span class="material-symbols-outlined vd-search-icon">search</span>
                  <input type="text" class="form-input vd-input vendor-name-input"
                    [ngModel]="formName()" (ngModelChange)="onNameChange($event)"
                    (click)="showVendorDropdown.set(true)"
                    (blur)="onVendorBlur()"
                    (keydown)="onVendorKeydown($event)"
                    [attr.placeholder]="namePlaceholder()"
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
                        <div class="vd-avatar" [style.background]="avatarBgFn(v.displayName)">
                          {{ v.displayName.charAt(0).toUpperCase() }}
                        </div>
                        <div class="vd-info">
                          <span class="vd-name">{{ v.displayName }}</span>
                          <span class="vd-meta">
                            <span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">{{ categoryIconFn(v.category) }}</span>
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
            <div class="form-field fg-1">
              <label class="form-label">Category</label>
              <input type="text" class="form-input" list="cat-list"
                [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)"
                placeholder="software">
              <datalist id="cat-list">
                @for (c of categoryOptions; track c) { <option [value]="c"> }
              </datalist>
            </div>
          </div>

          <div class="tf-divider"></div>

          <!-- Section: Amount + Cycle + Date -->
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">Amount</label>
              <div class="price-wrap">
                <select class="currency-select"
                  [ngModel]="formCurrency()" (ngModelChange)="formCurrency.set($event)">
                  @for (c of currencies; track c) {
                    <option [value]="c">{{ c }}</option>
                  }
                </select>
                <input type="number" step="0.01" min="0" class="form-input price-input"
                  [ngModel]="formAmount()" (ngModelChange)="formAmount.set($event)"
                  placeholder="0.00">
              </div>
            </div>
            @if (formType() === 'recurring') {
              <div class="form-field">
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
            <div class="form-field fg-1">
              <label class="form-label">{{ dateLabel() }}</label>
              <div class="renewal-wrap">
                <input type="date" class="form-input renewal-input"
                  [ngModel]="formDate()" (ngModelChange)="formDate.set($event)">
                @if (formType() === 'recurring' || formType() === 'bill') {
                  <div class="shortcut-row">
                    <button type="button" class="shortcut-btn" title="+1 month"  (click)="addDateOffset(1)">+1m</button>
                    <button type="button" class="shortcut-btn" title="+3 months" (click)="addDateOffset(3)">+3m</button>
                    <button type="button" class="shortcut-btn" title="+6 months" (click)="addDateOffset(6)">+6m</button>
                    <button type="button" class="shortcut-btn" title="+1 year"   (click)="addDateOffset(12)">+1y</button>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Status — inline for edit mode only -->
          @if (isEditMode()) {
            <div class="form-grid" style="margin-top:10px">
              <div class="form-field">
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
                  <button type="button" class="seg-btn seg-blue"
                    [class.seg-active]="formStatus() === 'completed'"
                    (click)="formStatus.set('completed')">Completed</button>
                </div>
              </div>
            </div>
          }

          <div class="tf-divider"></div>

          <!-- Advanced -->
          <button type="button" class="advanced-toggle" (click)="toggleAdvanced()">
            <span class="material-symbols-outlined" style="font-size:16px">
              {{ showAdvanced() ? 'expand_less' : 'expand_more' }}
            </span>
            Advanced
          </button>
          @if (showAdvanced()) {
            <div class="form-grid" style="margin-top:8px">
              <div class="form-field fg-1">
                <label class="form-label">Project Scope</label>
                <input type="text" class="form-input"
                  [ngModel]="formProjectId()" (ngModelChange)="formProjectId.set($event)"
                  placeholder="global">
              </div>
              <div class="form-field fg-2">
                <label class="form-label">Notes</label>
                <input type="text" class="form-input"
                  [ngModel]="formNotes()" (ngModelChange)="formNotes.set($event)"
                  placeholder="Optional notes…">
              </div>
            </div>
            @if (!isEditMode()) {
              <div class="form-grid" style="margin-top:10px">
                <div class="form-field">
                  <label class="form-label">Initial Status</label>
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
            }
          }

        </div>
      </div>

      <!-- Right: Preview panel -->
      <div class="tf-preview-col">
        <div class="tf-section-label preview-section-label">Preview</div>
        <div class="preview-card">
          <div class="preview-header">
            <div class="preview-avatar" [style.background]="avatarBgFn(formName() || 'N')">
              {{ (formName() || 'N').charAt(0).toUpperCase() }}
            </div>
            <div class="preview-info">
              <div class="preview-name" [class.preview-ghost]="!formName()">
                {{ formName() || 'Service name' }}
              </div>
              <div class="preview-type" [style.color]="typeMeta(formType()).color">
                <span class="material-symbols-outlined" style="font-size:12px">{{ typeMeta(formType()).icon }}</span>
                {{ typeMeta(formType()).label }}
              </div>
            </div>
          </div>
          <div class="preview-amount-row">
            <span class="preview-amount" [class.preview-ghost]="formAmount() <= 0">{{ previewAmountStr() }}</span>
            @if (formType() === 'recurring') {
              <span class="preview-cycle-badge">/ {{ formCycle() }}</span>
            }
          </div>
          <div class="preview-details">
            @if (formDate()) {
              <div class="preview-detail-row">
                <span class="preview-detail-label">{{ dateLabel() }}</span>
                <span class="preview-detail-val">{{ formatPreviewDate(formDate()) }}</span>
              </div>
              @let days = daysUntilPreview();
              @if ((formType() === 'recurring' || formType() === 'bill') && days !== null) {
                <div class="preview-detail-row">
                  <span class="preview-detail-label">Due in</span>
                  <span class="preview-detail-val"
                    [class.preview-due-soon]="days <= 7 && days >= 0"
                    [class.preview-overdue]="days < 0">
                    @if (days < 0) { overdue }
                    @else if (days === 0) { today }
                    @else { {{ days }}d }
                  </span>
                </div>
              }
            }
            @if (formCategory()) {
              <div class="preview-detail-row">
                <span class="preview-detail-label">Category</span>
                <span class="preview-detail-val">{{ formCategory() }}</span>
              </div>
            }
          </div>
          <div class="preview-status-row">
            <span class="status-dot" [style.background]="statusMetaFn(formStatus()).color"></span>
            <span class="preview-status-label" [style.color]="statusMetaFn(formStatus()).color">
              {{ statusMetaFn(formStatus()).label }}
            </span>
          </div>
        </div>
      </div>

    </div>
    } <!-- end Updates / add form -->

  </div> <!-- end tf-scroll -->

  <!-- Footer -->
  <div class="tf-footer" [class.tf-footer--embedded]="embeddedMode()">
    @if (embeddedMode() && isEditMode() && sliderTab() !== 'edit') {
      <!-- Details / Updates tab footer -->
      <button class="tf-cancel-btn tf-cancel-btn--embedded" (click)="back()">Close</button>
      <button class="tf-save-btn tf-save-btn--embedded" (click)="sliderTab.set('edit')">
        <span class="material-symbols-outlined">edit</span>
        Edit Details
      </button>
    } @else {
      @if (!canSave() && formName() && !embeddedMode()) {
        <span class="save-hint">{{ formAmount() <= 0 ? 'Enter an amount' : '' }}</span>
      }
      @if (embeddedMode() && isEditMode()) {
        <button class="tf-cancel-btn tf-cancel-btn--embedded" (click)="sliderTab.set('details')">
          ← Back
        </button>
      } @else {
        <button class="tf-cancel-btn" [class.tf-cancel-btn--embedded]="embeddedMode()" (click)="back()">
          Cancel
        </button>
      }
      <button class="tf-save-btn" [class.tf-save-btn--embedded]="embeddedMode()"
        [disabled]="!canSave()" (click)="save()">
        <span class="material-symbols-outlined">{{ isEditMode() ? 'sync' : 'add_circle' }}</span>
        {{ isEditMode() ? 'Update Transaction' : 'Save Transaction' }}
      </button>
    }
  </div>

</div>

@if (deleteConfirmOpen()) {
  <env-confirm-dialog
    [isOpen]="true"
    title="Delete Transaction"
    icon="delete"
    variant="danger"
    confirmLabel="Move to Bin"
    (confirmed)="confirmDelete()"
    (cancelled)="deleteConfirmOpen.set(false)">
    This transaction will be moved to the Bin and can be restored later.
  </env-confirm-dialog>
}
    `,
    styles: [`
    :host { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; }

    .tf-shell {
      display: flex; flex-direction: column; flex: 1 1 0;
      min-height: 0; background: var(--bg-app);
    }

    /* ── Top bar ── */
    .tf-topbar {
      display: flex; align-items: center; justify-content: space-between;
      height: 44px; padding: 0 16px; flex-shrink: 0;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-panel);
    }
    .tf-back {
      display: flex; align-items: center; gap: 2px;
      background: transparent; border: none;
      color: var(--text-secondary); font-size: 13px; font-weight: 500;
      cursor: pointer; padding: 0 6px 0 0; transition: color 0.15s;
    }
    .tf-back:hover { color: var(--accent-primary); }
    .tf-back .material-symbols-outlined { font-size: 18px; }
    .tf-danger-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 12px; background: transparent;
      border: 1px solid color-mix(in srgb, var(--accent-red, #ef4444) 40%, transparent);
      color: var(--accent-red, #ef4444); border-radius: 6px;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .tf-danger-btn:hover {
      background: color-mix(in srgb, var(--accent-red, #ef4444) 10%, transparent);
    }
    .tf-danger-btn .material-symbols-outlined { font-size: 15px; }

    /* ── Scrollable area ── */
    .tf-scroll { flex: 1 1 0; overflow-y: auto; padding: 16px 24px; }

    /* ── Hero ── */
    .tf-hero { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .tf-hero-avatar {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 700; color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }
    .tf-hero-eyebrow {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 2px;
    }
    .tf-hero-title {
      margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--text-primary); line-height: 1.2; transition: opacity 0.15s, font-style 0.15s;
    }
    .tf-hero-ghost { opacity: 0.35; font-style: italic; }

    /* ── Two-column layout ── */
    .tf-cols { display: flex; gap: 20px; align-items: flex-start; max-width: 860px; }
    .tf-form-col { flex: 1; min-width: 0; }
    .tf-preview-col { width: 224px; flex-shrink: 0; position: sticky; top: 0; align-self: flex-start; }

    /* ── Slider header ── */
    .tf-slider-header {
      display: flex; align-items: center; gap: 10px;
      height: 48px; padding: 0 14px; flex-shrink: 0;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-panel);
    }
    .tf-slider-close {
      background: transparent; border: none; color: var(--text-tertiary);
      cursor: pointer; padding: 5px; border-radius: 6px; transition: all 0.15s;
      display: flex; align-items: center; flex-shrink: 0;
    }
    .tf-slider-close:hover { background: var(--bg-hover); color: var(--text-primary); }
    .tf-slider-close .material-symbols-outlined { font-size: 18px; display: block; }
    .tf-slider-title {
      flex: 1; font-size: 14px; font-weight: 600; color: var(--text-primary);
    }
    .tf-slider-type-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 100px;
      font-size: 11px; font-weight: 600; flex-shrink: 0;
    }
    .tf-slider-type-badge .material-symbols-outlined { font-size: 12px; }

    /* ── Slider hero card ── */
    .tf-slider-hero-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0; gap: 12px;
    }
    .tf-slider-hero-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .tf-hero-avatar--lg { width: 46px !important; height: 46px !important; border-radius: 14px !important; font-size: 19px !important; }
    .tf-slider-hero-info { min-width: 0; }
    .tf-slider-service-name {
      font-size: 15px; font-weight: 700; color: var(--text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tf-slider-status-row { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
    .tf-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .tf-slider-status-label { font-size: 11.5px; font-weight: 600; }
    .tf-slider-hero-right { text-align: right; flex-shrink: 0; }
    .tf-slider-amount {
      font-size: 22px; font-weight: 800; color: var(--text-primary);
      letter-spacing: -0.5px; white-space: nowrap;
    }
    .tf-slider-cycle-label { font-size: 11px; color: var(--text-tertiary); margin-top: 3px; font-weight: 500; }

    /* ── Slider date exchange card ── */
    .tf-slider-date-card {
      display: flex; align-items: center; justify-content: space-between;
      margin: 12px 16px 0;
      padding: 12px 16px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 10px; flex-shrink: 0;
    }
    .tf-slider-date-cell { display: flex; flex-direction: column; gap: 3px; }
    .tf-slider-date-cell--right { align-items: flex-end; }
    .tf-slider-date-label { font-size: 10.5px; color: var(--text-tertiary); font-weight: 500; }
    .tf-slider-date-val { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .tf-due-soon { color: #f59e0b !important; }
    .tf-overdue  { color: #ef4444 !important; }
    .tf-slider-date-icon { font-size: 22px; color: var(--border-subtle); }

    /* ── Slider "Edit Details" section label ── */
    .tf-slider-form-label {
      font-size: 9.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-tertiary);
      padding: 14px 20px 6px;
    }

    /* ── Tabs ── */
    .tf-tabs {
      display: flex; padding: 0 20px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-panel); flex-shrink: 0; gap: 2px;
    }
    .tf-tab {
      padding: 10px 14px; background: transparent; border: none;
      font-size: 13px; font-weight: 500; color: var(--text-tertiary);
      cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: all 0.15s;
    }
    .tf-tab:hover { color: var(--text-primary); }
    .tf-tab--active { color: var(--accent-primary) !important; border-bottom-color: var(--accent-primary); font-weight: 600; }

    /* ── Details tab body ── */
    .tf-details-body { display: flex; flex-direction: column; padding: 0 0 16px; }
    .tf-details-section-label {
      font-size: 9.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-tertiary);
      padding: 14px 20px 6px;
    }
    .tf-details-rows {
      margin: 0 16px;
      border: 1px solid var(--border-subtle);
      border-radius: 10px; overflow: hidden;
      background: var(--bg-panel);
    }
    .tf-details-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; gap: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .tf-details-row:last-child { border-bottom: none; }
    .tf-details-key { font-size: 12.5px; color: var(--text-tertiary); font-weight: 500; }
    .tf-details-val {
      font-size: 12.5px; color: var(--text-primary); font-weight: 500;
      text-align: right; text-transform: capitalize;
    }
    .tf-details-val--strong { font-weight: 700; font-size: 13px; }
    .tf-details-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: 100px; font-size: 11px; font-weight: 600;
    }
    .tf-details-badge .material-symbols-outlined { font-size: 12px; }
    .tf-details-notes {
      margin: 0 16px; padding: 10px 14px;
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 10px; font-size: 12.5px; color: var(--text-secondary);
      line-height: 1.5;
    }

    /* ── Embedded overrides ── */
    .tf-shell--embedded .tf-scroll { overflow-x: hidden; padding: 0 0 16px; }
    .tf-shell--embedded .tf-cols { flex-wrap: wrap; padding: 0 16px; }
    .tf-shell--embedded .tf-preview-col { display: none; }
    .tf-shell--embedded .preview-card { display: none; }
    .tf-shell--embedded .preview-section-label { display: none; }

    /* ── Embedded footer ── */
    .tf-footer--embedded {
      padding: 10px 16px; gap: 10px;
    }
    .tf-cancel-btn--embedded {
      flex: 1; justify-content: center; text-align: center;
      padding: 10px 16px !important; font-size: 13px !important;
    }
    .tf-save-btn--embedded {
      flex: 1.6; justify-content: center;
      padding: 10px 16px !important; font-size: 13px !important; font-weight: 700 !important;
    }

    /* ── Timeline (Updates tab) ── */
    .tf-timeline-body { display: flex; flex-direction: column; padding: 16px 20px; gap: 0; }
    .tf-timeline-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 40px 0; color: var(--text-tertiary); font-size: 13px;
    }
    .tf-timeline-empty .material-symbols-outlined { font-size: 32px; }
    .tf-tl-row {
      display: flex; gap: 14px; align-items: flex-start;
    }
    .tf-tl-rail {
      display: flex; flex-direction: column; align-items: center;
      flex-shrink: 0; width: 22px;
    }
    .tf-tl-dot {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid var(--border-subtle); background: var(--bg-panel);
      display: flex; align-items: center; justify-content: center;
    }
    .tf-tl-dot--latest {
      background: var(--accent-primary);
      border-color: var(--accent-primary);
    }
    .tf-tl-dot--billed {
      background: color-mix(in srgb, #4ade80 12%, var(--bg-panel));
      border-color: color-mix(in srgb, #4ade80 40%, transparent);
    }
    .tf-tl-check { font-size: 13px; color: var(--text-tertiary); display: block; }
    .tf-tl-line {
      width: 2px; flex: 1; min-height: 20px;
      background: var(--border-subtle); margin: 2px 0;
    }
    .tf-tl-content { flex: 1; padding-bottom: 18px; }
    .tf-tl-row:last-child .tf-tl-content { padding-bottom: 0; }
    .tf-tl-label { font-size: 13px; font-weight: 500; color: var(--text-primary); line-height: 1.3; }
    .tf-tl-label--current { font-weight: 700; }
    .tf-tl-detail { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    .tf-tl-date { font-size: 11px; color: var(--text-tertiary); margin-top: 3px; }

    /* ── Card ── */
    .tf-card {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 16px;
    }

    /* ── Section ── */
    .tf-section-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-tertiary); margin-bottom: 8px;
    }
    .preview-section-label { margin-bottom: 6px; }
    .tf-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 12px 0; }

    /* ── Type cards ── */
    .type-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .type-card {
      display: flex; flex-direction: column; align-items: flex-start;
      padding: 8px 10px; border: 1.5px solid var(--border-subtle);
      border-radius: 8px; background: var(--bg-app);
      cursor: pointer; transition: all 0.15s; text-align: left; gap: 0;
    }
    .type-card:hover { border-color: var(--text-tertiary); background: var(--bg-hover); }
    .type-card-icon { font-size: 16px; margin-bottom: 5px; }
    .type-card-label { font-size: 11px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
    .type-card-hint { font-size: 9.5px; color: var(--text-tertiary); line-height: 1.3; margin-top: 2px; }

    /* ── Form layout ── */
    .form-grid { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .form-field { display: flex; flex-direction: column; }
    .fg-1 { flex: 1; min-width: 120px; }
    .fg-2 { flex: 2; min-width: 200px; }
    .form-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-tertiary); margin-bottom: 4px;
    }
    .form-input {
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 6px; padding: 5px 10px; font-size: 13px;
      color: var(--text-primary); height: 32px; outline: none;
      transition: border-color 0.15s;
    }
    .form-input:focus { border-color: var(--accent-primary); }

    /* ── Vendor name combobox ── */
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
      border: 1px solid color-mix(in srgb, #4ade80 25%, transparent);
      color: #4ade80; font-size: 10px; font-weight: 600; pointer-events: none;
    }
    .vd-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 9999; max-height: 280px; overflow-y: auto;
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

    /* ── Amount / currency ── */
    .price-wrap {
      display: flex; align-items: center; border: 1px solid var(--border-subtle);
      border-radius: 6px; overflow: hidden; background: var(--bg-app); height: 32px;
    }
    .price-wrap:focus-within { border-color: var(--accent-primary); }
    .currency-select {
      padding: 0 8px; height: 100%; background: var(--bg-hover);
      border: none; border-right: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 11px; font-weight: 700;
      cursor: pointer; flex-shrink: 0; outline: none; min-width: 58px;
      transition: all 0.15s;
    }
    .currency-select:hover { background: var(--bg-active); color: var(--text-primary); }
    .price-input { border: none !important; border-radius: 0 !important; height: 100% !important; flex: 1; min-width: 80px; }

    /* ── Segmented control ── */
    .seg-ctrl {
      display: flex; border: 1px solid var(--border-subtle); border-radius: 6px;
      overflow: hidden; height: 32px;
    }
    .seg-btn {
      flex: 1; background: transparent; border: none;
      border-right: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 11px; font-weight: 500;
      cursor: pointer; padding: 0 10px; transition: all 0.15s; white-space: nowrap;
    }
    .seg-btn:last-child { border-right: none; }
    .seg-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .seg-btn.seg-active { background: var(--accent-primary-dim); color: var(--accent-primary); font-weight: 600; }
    .seg-green.seg-active  { background: color-mix(in srgb, #4ade80 12%, transparent) !important; color: #4ade80 !important; }
    .seg-yellow.seg-active { background: color-mix(in srgb, #fbbf24 12%, transparent) !important; color: #fbbf24 !important; }
    .seg-grey.seg-active   { background: color-mix(in srgb, #94a3b8 12%, transparent) !important; color: #94a3b8 !important; }
    .seg-blue.seg-active   { background: color-mix(in srgb, #60a5fa 12%, transparent) !important; color: #60a5fa !important; }

    /* ── Date shortcuts ── */
    .renewal-wrap  { display: flex; flex-direction: column; gap: 3px; }
    .renewal-input { width: 100%; }
    .shortcut-row  { display: flex; gap: 3px; }
    .shortcut-btn {
      flex: 1; padding: 2px 0; background: var(--bg-hover);
      border: 1px solid var(--border-subtle); border-radius: 4px;
      color: var(--text-tertiary); font-size: 10px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .shortcut-btn:hover {
      background: var(--accent-primary-dim); border-color: var(--accent-primary);
      color: var(--accent-primary);
    }

    /* ── Advanced toggle ── */
    .advanced-toggle {
      display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;
      background: transparent; border: none; color: var(--text-tertiary);
      font-size: 11px; font-weight: 500; cursor: pointer; padding: 0;
      transition: color 0.15s;
    }
    .advanced-toggle:hover { color: var(--text-secondary); }

    /* ── Preview card ── */
    .preview-card {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 12px;
    }
    .preview-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .preview-avatar {
      width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.25);
    }
    .preview-info { flex: 1; min-width: 0; }
    .preview-name {
      font-size: 12px; font-weight: 600; color: var(--text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
    }
    .preview-ghost { color: var(--text-tertiary) !important; font-style: italic; opacity: 0.6; }
    .preview-type {
      display: flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 500; margin-top: 2px;
    }
    .preview-amount-row {
      display: flex; align-items: baseline; gap: 5px; margin-bottom: 10px;
    }
    .preview-amount {
      font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.4px;
      transition: opacity 0.15s;
    }
    .preview-cycle-badge { font-size: 10.5px; color: var(--text-tertiary); font-weight: 500; }
    .preview-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .preview-detail-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .preview-detail-label { font-size: 10.5px; color: var(--text-tertiary); }
    .preview-detail-val { font-size: 10.5px; font-weight: 500; color: var(--text-secondary); text-align: right; }
    .preview-due-soon { color: #fbbf24 !important; font-weight: 700 !important; }
    .preview-overdue { color: #ef4444 !important; font-weight: 700 !important; }
    .preview-status-row {
      display: flex; align-items: center; gap: 5px;
      padding-top: 8px; border-top: 1px solid var(--border-subtle);
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .preview-status-label { font-size: 10.5px; font-weight: 600; }

    /* ── Footer ── */
    .tf-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 8px;
      padding: 8px 16px; flex-shrink: 0;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-panel);
    }
    .save-hint { font-size: 11px; color: var(--text-tertiary); margin-right: auto; }
    .tf-cancel-btn {
      padding: 6px 14px; background: transparent;
      border: 1px solid var(--border-subtle); color: var(--text-secondary);
      border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .tf-cancel-btn:hover { background: var(--bg-hover); }
    .tf-save-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 14px; background: var(--accent-primary);
      color: var(--accent-primary-text); border: none; border-radius: 6px;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
    }
    .tf-save-btn:hover { opacity: 0.88; }
    .tf-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .tf-save-btn .material-symbols-outlined { font-size: 15px; }
    `]
})
export class TransactionFormComponent implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    readonly transactionStore = inject(TransactionStore);

    // ── Embedded slider mode ──────────────────────────────────────────────
    txId         = input<string | null>(null);
    embeddedMode = input(false);
    close        = output<void>();

    readonly typeOptions: TransactionType[] = ['recurring', 'one-time', 'bill', 'purchase', 'refund'];
    readonly categoryOptions = CATEGORY_OPTIONS;
    readonly currencies = CURRENCIES;

    // ── Mode ──────────────────────────────────────────────────────────────
    isEditMode = signal(false);
    editingId  = signal<string | null>(null);

    // ── Form state ────────────────────────────────────────────────────────
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

    deleteConfirmOpen = signal(false);
    sliderTab = signal<'details' | 'updates' | 'edit'>('details');

    // ── Computed ──────────────────────────────────────────────────────────
    private _editingTx = computed(() => {
        const id = this.editingId();
        if (!id) return null;
        return this.transactionStore.transactions().find(t => t.id === id) ?? null;
    });

    canSave = computed(() => !!this.formName() && this.formAmount() > 0);

    nameLabel = computed<string>(() => {
        const map: Record<TransactionType, string> = {
            'recurring': 'Service Name',
            'one-time':  'Service / Product',
            'bill':      'Biller',
            'purchase':  'Merchant',
            'refund':    'Refund From',
        };
        return map[this.formType()];
    });

    namePlaceholder = computed<string>(() => {
        const map: Record<TransactionType, string> = {
            'recurring': 'GitHub, AWS, Figma…',
            'one-time':  'Font license, Sketch…',
            'bill':      'Electricity, Internet…',
            'purchase':  'Amazon, Best Buy…',
            'refund':    'Stripe, PayPal…',
        };
        return map[this.formType()];
    });

    dateLabel = computed<string>(() => {
        const t = this.formType();
        if (t === 'recurring' || t === 'bill') return 'Next Due Date';
        if (t === 'refund') return 'Received Date';
        return 'Date';
    });

    previewAmountStr = computed(() => {
        const sym = currencySymbol(this.formCurrency());
        const amt = this.formAmount();
        if (!amt) return `${sym}–`;
        return `${sym}${Number(amt).toFixed(2)}`;
    });

    daysUntilPreview = computed<number | null>(() => {
        const date = this.formDate();
        if (!date) return null;
        const d = new Date(date + 'T12:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    });

    timelineEvents = computed(() => {
        const tx = this._editingTx();
        if (!tx) return [];

        type TimelineEntry = { date: Date; kind: string; label: string; detail?: string; synthetic?: boolean };
        const entries: TimelineEntry[] = [];

        // ── History events ────────────────────────────────────────────────
        for (const ev of tx.history ?? []) {
            entries.push({ date: new Date(ev.date), kind: ev.kind, label: ev.label, detail: ev.detail });
        }

        // ── Synthetic billing events (recurring / bill) ───────────────────
        if ((tx.type === 'recurring' || tx.type === 'bill') && tx.billingCycle && tx.date) {
            const nextDue  = new Date(tx.date + 'T12:00:00');
            const origin   = tx.createdAt ? new Date(tx.createdAt) : null;
            const today    = new Date();
            today.setHours(23, 59, 59, 0);
            const sym      = currencySymbol(tx.currency ?? 'USD');
            const stepMo   = tx.billingCycle === 'yearly' ? 12 : tx.billingCycle === 'weekly' ? 0 : 1;
            const stepDays = tx.billingCycle === 'weekly' ? 7 : 0;

            let cursor = new Date(nextDue);
            // Walk backwards from next due date to find past billings (up to 24 steps)
            for (let i = 0; i < 24; i++) {
                if (stepDays) cursor.setDate(cursor.getDate() - stepDays);
                else          cursor.setMonth(cursor.getMonth() - stepMo);
                if (origin && cursor < origin) break;
                if (cursor > today) continue;   // future — skip
                entries.push({
                    date: new Date(cursor),
                    kind: 'billed',
                    label: `Billed — ${cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                    detail: `${sym}${tx.amount.toFixed(2)}`,
                    synthetic: true,
                });
            }
        }

        // Sort descending (newest first)
        entries.sort((a, b) => b.date.getTime() - a.date.getTime());
        return entries;
    });

    vendorSuggestions = computed(() => {
        const q = this.formName().toLowerCase().trim();
        if (!q) return POPULAR_VENDOR_OPTIONS;
        return ALL_VENDOR_OPTIONS.filter(v => v.key.includes(q) || v.displayName.toLowerCase().includes(q)).slice(0, 9);
    });

    ngOnInit() {
        const id = this.embeddedMode()
            ? this.txId()
            : this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.editingId.set(id);
            const tx = this.transactionStore.transactions().find(t => t.id === id);
            if (tx) this.populateForm(tx);
            this.sliderTab.set('details');
        } else {
            this.formDate.set(autoDate('monthly'));
            this.sliderTab.set('updates');
        }
    }

    private populateForm(tx: Transaction) {
        this.formName.set(tx.name);
        this.formType.set(tx.type ?? 'recurring');
        this.formCategory.set(tx.category ?? '');
        this.formProjectId.set(tx.projectId ?? 'global');
        this.formAmount.set(tx.amount);
        this.formCurrency.set(tx.currency ?? 'USD');
        this.formCycle.set(tx.billingCycle ?? 'monthly');
        this.formDate.set(tx.date ? tx.date.split('T')[0] : '');
        this.formStatus.set(tx.status ?? 'active');
        this.formNotes.set(tx.notes ?? '');
        this.showAdvanced.set((!!tx.projectId && tx.projectId !== 'global') || !!tx.notes);
    }

    back() {
        if (this.embeddedMode()) this.close.emit();
        else this.router.navigate(['/transactions']);
    }

    async save() {
        if (!this.canSave()) return;
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
        if (this.isEditMode() && this.editingId()) {
            await this.transactionStore.update(this.editingId()!, payload);
            if (this.embeddedMode()) { this.sliderTab.set('updates'); return; }
        } else {
            await this.transactionStore.add({ id: crypto.randomUUID(), ...payload } as Transaction);
        }
        this.back();
    }

    async confirmDelete() {
        const id = this.editingId();
        if (id) await this.transactionStore.delete(id);
        this.back();
    }

    // ── Type card ────────────────────────────────────────────────────────
    typeHint(type: TransactionType): string {
        const hints: Record<TransactionType, string> = {
            'recurring': 'SaaS, subscriptions',
            'one-time':  'Licenses, domains',
            'bill':      'Utilities, rent',
            'purchase':  'Shopping, hardware',
            'refund':    'Returned payments',
        };
        return hints[type];
    }

    typeCardStyle(opt: TransactionType): Record<string, string> {
        if (this.formType() !== opt) return {};
        const color = TYPE_META[opt].color;
        return {
            'border-color': color,
            'background': `color-mix(in srgb, ${color} 8%, var(--bg-panel))`,
        };
    }

    selectType(type: TransactionType) {
        this.formType.set(type);
        if (!this.isEditMode()) {
            if (type === 'recurring' || type === 'bill') {
                this.formDate.set(autoDate(this.formCycle()));
            } else {
                this.formDate.set(toLocalDateString(new Date()));
            }
        }
        this.presetApplied.set(false);
    }

    // ── Vendor autocomplete ───────────────────────────────────────────────
    onNameChange(name: string) {
        this.formName.set(name);
        this.vendorHighlightIdx.set(-1);
        this.showVendorDropdown.set(true);
        if (this.isEditMode() || this.formType() !== 'recurring') return;
        const preset = VENDOR_PRESETS[name.toLowerCase().trim()];
        if (preset) {
            this.formCategory.set(preset.category);
            this.formCycle.set(preset.billingCycle);
            this.formCurrency.set(preset.currency);
            this.formDate.set(autoDate(preset.billingCycle));
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
        if (!this.isEditMode()) this.formDate.set(autoDate(v.billingCycle));
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

    // ── Form field helpers ────────────────────────────────────────────────
    setCycle(cycle: 'monthly' | 'yearly' | 'weekly') {
        this.formCycle.set(cycle);
        if (!this.isEditMode()) this.formDate.set(autoDate(cycle));
    }

    addDateOffset(months: number) {
        const base = this.formDate();
        const d = base ? new Date(base + 'T12:00:00') : new Date();
        d.setMonth(d.getMonth() + months);
        this.formDate.set(toLocalDateString(d));
    }

    toggleAdvanced() { this.showAdvanced.set(!this.showAdvanced()); }

    // ── Display helpers ───────────────────────────────────────────────────
    typeMeta(type: TransactionType)   { return TYPE_META[type]; }
    statusMetaFn(status: string)      { return STATUS_META[status] ?? STATUS_META['active']; }
    avatarBgFn(name: string)          { return avatarBg(name); }
    categoryIconFn(cat: string)       { return categoryIcon(cat); }

    formatPreviewDate(iso: string): string {
        if (!iso) return '';
        const d = new Date(iso + 'T12:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatTimelineDate(d: Date): string {
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)  return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7)  return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
