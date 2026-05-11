import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VaultStore } from '@envello/state';
import { EncryptionUtil } from '@envello/core';
import { Credential } from '@envello/domain';
import { AiAssistantPanelComponent, AiPanelMessage } from '@envello/ui';

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  login:   { label: 'Login',       icon: 'person',        color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  api_key: { label: 'API Key',     icon: 'key',           color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  ssh:     { label: 'SSH',         icon: 'terminal',      color: '#a855f7', bg: 'rgba(168,85,247,0.1)'  },
  db:      { label: 'Database',    icon: 'database',      color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  note:    { label: 'Secure Note', icon: 'sticky_note_2', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
};

const USERNAME_LABEL: Record<string, string> = {
  login: 'Username', api_key: 'Key Label', ssh: 'Host / User', db: 'DB User', note: ''
};
const VALUE_LABEL: Record<string, string> = {
  login: 'Password', api_key: 'API Key', ssh: 'Private Key', db: 'Connection String', note: 'Content'
};
const URL_LABEL: Record<string, string> = {
  login: 'Website URL', api_key: 'API Endpoint', ssh: 'Host URL', db: 'Host', note: 'Reference URL'
};

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent],
  template: `
<div class="vt-view">

  <!-- ── SIDEBAR ── -->
  <aside class="vt-sb">
    <div class="vt-sb-header">
      <h1 class="vt-sb-title">Vault</h1>
      <p class="vt-sb-stats">{{ vaultStore.credentials().length }} credential{{ vaultStore.credentials().length !== 1 ? 's' : '' }}</p>
    </div>

    <nav class="vt-sb-nav">
      <button class="vt-sb-item" [class.active]="!selectedType()" (click)="selectedType.set('')">
        <span class="material-symbols-outlined">lock</span>
        <span class="vt-sb-label">All Credentials</span>
        <span class="vt-sb-count">{{ vaultStore.credentials().length }}</span>
      </button>
      @for (entry of allTypeStats(); track entry.type) {
        <button class="vt-sb-item" [class.active]="selectedType() === entry.type"
          (click)="selectedType.set(selectedType() === entry.type ? '' : entry.type)">
          <span class="material-symbols-outlined" [style.color]="selectedType() === entry.type ? '' : entry.color">{{ entry.icon }}</span>
          <span class="vt-sb-label">{{ entry.label }}</span>
          <span class="vt-sb-count">{{ entry.count }}</span>
        </button>
      }
    </nav>

    <div class="vt-sb-divider"></div>

    <div class="vt-sb-section">
      <div class="vt-sb-section-title">Scope</div>
      <button class="vt-sb-item" [class.active]="selectedScope() === 'global'"
        (click)="selectedScope.set(selectedScope() === 'global' ? '' : 'global')">
        <span class="material-symbols-outlined">public</span>
        <span class="vt-sb-label">Global</span>
        <span class="vt-sb-count">{{ countByScope()['global'] || 0 }}</span>
      </button>
    </div>
  </aside>

  <!-- ── MAIN ── -->
  <div class="vt-main">

    <!-- Toolbar -->
    <div class="vt-toolbar">
      <div class="vt-bc">
        <span class="vt-bc-root">Vault</span>
        @if (selectedType()) {
          <span class="vt-bc-sep">›</span>
          <span class="vt-bc-leaf">{{ getTypeMeta(selectedType()).label }}</span>
        }
        @if (selectedScope()) {
          <span class="vt-bc-sep">›</span>
          <span class="vt-bc-leaf capitalize">{{ selectedScope() }}</span>
        }
        <span class="vt-bc-count">{{ filteredCredentials().length }}</span>
      </div>
      <div class="vt-toolbar-right">
        <div class="vt-search-wrap">
          <span class="material-symbols-outlined vt-search-icon">search</span>
          <input class="vt-search-input" type="text" placeholder="Search credentials…"
            [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)">
          @if (searchQuery()) {
            <button class="vt-search-clear" (click)="searchQuery.set('')">
              <span class="material-symbols-outlined">close</span>
            </button>
          }
        </div>
        @if (hasActiveFilters()) {
          <button class="vt-tool-btn" title="Clear filters" (click)="clearFilters()">
            <span class="material-symbols-outlined">filter_list_off</span>
          </button>
        }
        <div class="vt-tb-divider"></div>
        <button class="vt-tool-btn" [class.vt-tool-btn--active]="showAssistant()"
          title="AI Assistant" (click)="toggleAssistant()">
          <span class="material-symbols-outlined">auto_awesome</span>
          AI
        </button>
        <div class="vt-tb-divider"></div>
        <button class="vt-add-btn" (click)="openAddForm()">
          <span class="material-symbols-outlined">add</span>
          New Credential
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="vt-table-wrap">

      <div class="vt-table-head">
        <div class="vt-th vt-col-name" (click)="setSort('name')">
          Credential
          <span class="vt-sort-ico material-symbols-outlined">
            {{ sortCol() === 'name' ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
          </span>
        </div>
        <div class="vt-th vt-col-type" (click)="setSort('type')">
          Type
          <span class="vt-sort-ico material-symbols-outlined">
            {{ sortCol() === 'type' ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
          </span>
        </div>
        <div class="vt-th vt-col-username">Username</div>
        <div class="vt-th vt-col-secret">Secret</div>
        <div class="vt-th vt-col-scope">Scope</div>
        <div class="vt-th vt-col-date" (click)="setSort('createdAt')">
          Date
          <span class="vt-sort-ico material-symbols-outlined">
            {{ sortCol() === 'createdAt' ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
          </span>
        </div>
        <div class="vt-th vt-col-actions"></div>
      </div>

      @if (filteredCredentials().length === 0) {
        <div class="vt-empty">
          @if (vaultStore.credentials().length === 0) {
            <span class="material-symbols-outlined vt-empty-icon">vpn_key</span>
            <p class="vt-empty-title">Vault is empty</p>
            <p class="vt-empty-sub">Store API keys, passwords, SSH credentials and secure notes in one encrypted place.</p>
            <div class="vt-empty-actions">
              <button class="vt-add-btn" (click)="openAddForm()">
                <span class="material-symbols-outlined">add</span>
                Add First Credential
              </button>
            </div>
          } @else {
            <span class="material-symbols-outlined vt-empty-icon">search_off</span>
            <p class="vt-empty-title">No results match your filters</p>
            <button class="vt-tool-btn" (click)="clearFilters()">Clear Filters</button>
          }
        </div>
      }

      @for (cred of filteredCredentials(); track cred.id) {
        <div class="vt-tr">

          <!-- Name -->
          <div class="vt-td vt-col-name">
            <div class="vt-cred-icon" [style.background]="getTypeMeta(cred.type).bg">
              <span class="material-symbols-outlined" [style.color]="getTypeMeta(cred.type).color">{{ getTypeMeta(cred.type).icon }}</span>
            </div>
            <div class="vt-cred-info">
              <span class="vt-cred-name">{{ cred.name }}</span>
              @if (cred.url) {
                <span class="vt-cred-url">{{ cred.url }}</span>
              } @else if (cred.notes) {
                <span class="vt-cred-url">{{ cred.notes }}</span>
              }
            </div>
          </div>

          <!-- Type -->
          <div class="vt-td vt-col-type">
            <span class="vt-type-badge"
              [style.background]="getTypeMeta(cred.type).bg"
              [style.color]="getTypeMeta(cred.type).color"
              [style.border-color]="getTypeMeta(cred.type).color + '40'">
              {{ getTypeMeta(cred.type).label }}
            </span>
          </div>

          <!-- Username -->
          <div class="vt-td vt-col-username">
            <span class="vt-username">{{ cred.username || '—' }}</span>
          </div>

          <!-- Secret -->
          <div class="vt-td vt-col-secret">
            <code class="vt-secret-value">{{ visibleCreds().has(cred.id) ? decryptCred(cred.value) : '•  •  •  •  •  •  •  •' }}</code>
            <div class="vt-secret-actions">
              <button class="vt-icon-btn" (click)="toggleCredVisibility(cred.id)"
                [title]="visibleCreds().has(cred.id) ? 'Hide' : 'Reveal'">
                <span class="material-symbols-outlined">{{ visibleCreds().has(cred.id) ? 'visibility_off' : 'visibility' }}</span>
              </button>
              <button class="vt-icon-btn" [class.vt-copied]="copiedId() === cred.id"
                (click)="copyCred(cred.id, cred.value)" title="Copy to clipboard">
                <span class="material-symbols-outlined">{{ copiedId() === cred.id ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
          </div>

          <!-- Scope -->
          <div class="vt-td vt-col-scope">
            <span class="vt-scope-badge">{{ cred.projectId || 'global' }}</span>
          </div>

          <!-- Date -->
          <div class="vt-td vt-col-date">
            <span class="vt-date-text">{{ formatDate(cred.lastAccessedAt || cred.createdAt) }}</span>
            <span class="vt-date-label">{{ cred.lastAccessedAt ? 'accessed' : 'created' }}</span>
          </div>

          <!-- Actions -->
          <div class="vt-td vt-col-actions">
            @if (deleteConfirmId() === cred.id) {
              <div class="vt-confirm">
                <button class="vt-confirm-del" (click)="confirmDelete(cred.id)">Delete</button>
                <button class="vt-confirm-cancel" (click)="deleteConfirmId.set(null)">Cancel</button>
              </div>
            } @else {
              <div class="vt-row-actions">
                <button class="vt-row-btn" (click)="openEditForm(cred)" title="Edit">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="vt-row-btn vt-row-btn--danger" (click)="deleteConfirmId.set(cred.id)" title="Delete">
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
      title="Vault Assistant"
      placeholder="Ask about your credentials…"
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
  <div class="vta-backdrop" (click)="closeForm()">
    <div class="vta-modal" (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="vta-header">
        <div class="vta-header-left">
          <span class="material-symbols-outlined vta-header-icon">vpn_key</span>
          <h2 class="vta-header-title">{{ formMode() === 'edit' ? 'Edit Credential' : 'New Credential' }}</h2>
          @if (formMode() === 'edit') {
            <span class="vta-editing-chip">{{ editName() }}</span>
          }
        </div>
        <div class="vta-header-right">
          <kbd class="vta-esc-key">Esc</kbd>
          <button class="vta-close-btn" (click)="closeForm()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Body: two-pane -->
      <div class="vta-body">

        <!-- Left: Type sidebar -->
        <nav class="vta-type-sidebar">
          <div class="vta-sidebar-header">TYPE</div>
          @for (opt of typeOptions; track opt.type) {
            <button class="vta-type-item" [class.vta-type-item--active]="activeType() === opt.type"
              (click)="setFormType(opt.type)">
              <div class="vta-type-icon-wrap" [style.background]="activeType() === opt.type ? opt.color : 'transparent'"
                [style.border-color]="activeType() === opt.type ? opt.color : 'var(--border-subtle)'">
                <span class="material-symbols-outlined"
                  [style.color]="activeType() === opt.type ? 'white' : opt.color">{{ opt.icon }}</span>
              </div>
              <span class="vta-type-label">{{ opt.label }}</span>
            </button>
          }
        </nav>

        <!-- Right: Form fields -->
        <div class="vta-form-pane">

          <!-- Name bar -->
          <div class="vta-name-bar">
            <div class="vta-name-icon-wrap">
              <span class="material-symbols-outlined" [style.color]="getTypeMeta(activeType()).color">
                {{ getTypeMeta(activeType()).icon }}
              </span>
            </div>
            <input class="vta-name-input" type="text" placeholder="Credential name…" autofocus
              [ngModel]="formMode() === 'edit' ? editName() : newCredName()"
              (ngModelChange)="formMode() === 'edit' ? editName.set($event) : newCredName.set($event)">
          </div>

          <!-- Fields -->
          <div class="vta-fields">
            @if (activeType() !== 'note') {
              <div class="vta-field-group">
                <label class="vta-label">{{ usernameLabel() }}</label>
                <input type="text" class="vta-input" [placeholder]="usernameLabel()"
                  [ngModel]="formMode() === 'edit' ? editUsername() : newCredUsername()"
                  (ngModelChange)="formMode() === 'edit' ? editUsername.set($event) : newCredUsername.set($event)">
              </div>
            }
            <div class="vta-field-group">
              <label class="vta-label">
                {{ valueLabel() }}
                @if (formMode() === 'edit') {
                  <span class="vta-label-hint">(leave blank to keep existing)</span>
                }
              </label>
              <input type="password" class="vta-input" [placeholder]="valueLabel()"
                [ngModel]="formMode() === 'edit' ? editValue() : newCredValue()"
                (ngModelChange)="formMode() === 'edit' ? editValue.set($event) : newCredValue.set($event)">
            </div>
            <div class="vta-field-group">
              <label class="vta-label">{{ urlLabel() }}</label>
              <input type="text" class="vta-input" [placeholder]="urlLabel()"
                [ngModel]="formMode() === 'edit' ? editUrl() : newCredUrl()"
                (ngModelChange)="formMode() === 'edit' ? editUrl.set($event) : newCredUrl.set($event)">
            </div>
            <div class="vta-field-group">
              <label class="vta-label">Project Scope</label>
              <input type="text" class="vta-input" placeholder="global"
                [ngModel]="formMode() === 'edit' ? editProjectId() : newProjectId()"
                (ngModelChange)="formMode() === 'edit' ? editProjectId.set($event) : newProjectId.set($event)">
            </div>
            <div class="vta-field-group vta-field-group--wide">
              <label class="vta-label">Notes</label>
              <input type="text" class="vta-input" placeholder="Optional description…"
                [ngModel]="formMode() === 'edit' ? editNotes() : newCredNotes()"
                (ngModelChange)="formMode() === 'edit' ? editNotes.set($event) : newCredNotes.set($event)">
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="vta-footer">
        <div class="vta-footer-hints">
          <span class="vta-hint"><kbd>Tab</kbd> Next field</span>
          <span class="vta-hint"><kbd>Enter</kbd> Save</span>
          <span class="vta-hint"><kbd>Esc</kbd> Close</span>
        </div>
        <div class="vta-footer-actions">
          <button class="vta-cancel-btn" (click)="closeForm()">Cancel</button>
          <button class="vta-save-btn" (click)="formMode() === 'edit' ? saveEdit() : addCredential()"
            [disabled]="formMode() === 'edit' ? !editName() : (!newCredName() || !newCredValue())">
            <span class="material-symbols-outlined">save</span>
            {{ formMode() === 'edit' ? 'Save Changes' : 'Save Credential' }}
          </button>
        </div>
      </div>

    </div>
  </div>
}
  `,
  styles: [`
    :host { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; }
    .vt-view { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; background: var(--bg-app); }
    .capitalize { text-transform: capitalize; }

    /* ── Sidebar ── */
    .vt-sb {
      width: 200px; flex-shrink: 0;
      background: var(--bg-panel);
      border-right: 1px solid var(--border-main);
      display: flex; flex-direction: column;
      overflow-y: auto; overflow-x: hidden;
    }
    .vt-sb-header {
      padding: 16px 12px 12px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .vt-sb-title  { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .vt-sb-stats  { margin: 0; font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono); }

    .vt-sb-nav     { padding: 4px 6px; flex-shrink: 0; }
    .vt-sb-section { padding: 4px 6px; flex-shrink: 0; }
    .vt-sb-section-title {
      padding: 6px 8px 4px;
      font-size: 9.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--text-tertiary);
    }
    .vt-sb-divider { height: 1px; background: var(--border-subtle); margin: 0 8px; flex-shrink: 0; }

    .vt-sb-item {
      width: 100%; display: flex; align-items: center; gap: 7px;
      padding: 5px 8px; background: transparent; border: none;
      border-radius: 6px; color: var(--text-secondary);
      font-size: 12.5px; font-weight: 500;
      cursor: pointer; transition: all 0.15s; text-align: left;
    }
    .vt-sb-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vt-sb-item.active { background: var(--accent-primary-dim); color: var(--accent-primary); }
    .vt-sb-item .material-symbols-outlined { font-size: 16px; flex-shrink: 0; }
    .vt-sb-item.active .material-symbols-outlined { color: var(--accent-primary); }
    .vt-sb-label { flex: 1; }
    .vt-sb-count {
      font-size: 10.5px; color: var(--text-tertiary);
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 0 5px;
      font-family: var(--font-mono); min-width: 16px; text-align: center;
    }
    .vt-sb-item.active .vt-sb-count {
      background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
      border-color: var(--accent-primary); color: var(--accent-primary);
    }

    /* ── Main ── */
    .vt-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }

    /* ── Toolbar ── */
    .vt-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      height: 44px; padding: 0 16px; gap: 8px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0; background: var(--bg-panel);
    }
    .vt-bc { display: flex; align-items: center; gap: 6px; }
    .vt-bc-root  { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .vt-bc-sep   { font-size: 14px; color: var(--text-tertiary); }
    .vt-bc-leaf  { font-size: 13px; font-weight: 600; color: var(--text-primary); text-transform: capitalize; }
    .vt-bc-count {
      font-size: 11px; color: var(--text-tertiary);
      background: var(--bg-hover); border-radius: 10px; padding: 1px 7px;
    }

    .vt-toolbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .vt-tb-divider { width: 1px; height: 18px; background: var(--border-subtle); margin: 0 2px; }

    .vt-search-wrap { position: relative; display: flex; align-items: center; }
    .vt-search-icon {
      position: absolute; left: 8px; font-size: 16px;
      color: var(--text-tertiary); pointer-events: none;
    }
    .vt-search-input {
      height: 28px; padding: 0 26px 0 28px;
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      border-radius: 5px; font-size: 12px; color: var(--text-primary);
      outline: none; width: 190px; transition: all 0.2s;
    }
    .vt-search-input:focus { background: var(--bg-panel); border-color: var(--accent-primary); }
    .vt-search-clear {
      position: absolute; right: 5px; background: transparent; border: none;
      color: var(--text-tertiary); cursor: pointer; padding: 2px; border-radius: 3px;
      display: flex; align-items: center;
    }
    .vt-search-clear:hover { color: var(--text-primary); }
    .vt-search-clear .material-symbols-outlined { font-size: 14px; }

    .vt-tool-btn {
      height: 28px; padding: 0 10px; display: flex; align-items: center; gap: 5px;
      background: transparent; border: 1px solid var(--border-subtle);
      border-radius: 5px; color: var(--text-secondary); font-size: 12px; font-weight: 500;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .vt-tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vt-tool-btn--active { background: var(--accent-primary-dim) !important; border-color: var(--accent-primary) !important; color: var(--accent-primary) !important; }
    .vt-tool-btn .material-symbols-outlined { font-size: 15px; }

    .vt-add-btn {
      height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 5px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 5px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
    }
    .vt-add-btn:hover { opacity: 0.88; }
    .vt-add-btn .material-symbols-outlined { font-size: 16px; }

    /* ── Table ── */
    .vt-table-wrap { flex: 1 1 0; min-height: 0; overflow-y: auto; overflow-x: auto; display: flex; flex-direction: column; }

    .vt-table-head {
      display: flex; align-items: center; height: 36px;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border-main);
      position: sticky; top: 0; z-index: 10;
    }
    .vt-th {
      display: flex; align-items: center; gap: 4px;
      padding: 0 14px;
      font-size: 11px; font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase; letter-spacing: 0.04em;
      user-select: none;
      border-right: 1px solid var(--border-subtle);
    }
    .vt-th:last-child { border-right: none; }
    .vt-sort-ico { font-size: 13px; opacity: 0.5; }
    .vt-th.vt-col-name,
    .vt-th.vt-col-type,
    .vt-th.vt-col-date { cursor: pointer; transition: color 0.12s; }
    .vt-th.vt-col-name:hover,
    .vt-th.vt-col-type:hover,
    .vt-th.vt-col-date:hover { color: var(--text-secondary); }

    /* Column widths */
    .vt-col-name     { flex: 1; min-width: 180px; }
    .vt-col-type     { width: 110px; flex-shrink: 0; }
    .vt-col-username { width: 120px; flex-shrink: 0; }
    .vt-col-secret   { width: 260px; flex-shrink: 0; }
    .vt-col-scope    { width: 80px;  flex-shrink: 0; }
    .vt-col-date     { width: 100px; flex-shrink: 0; }
    .vt-col-actions  { width: 90px;  flex-shrink: 0; justify-content: flex-end; }

    /* Rows */
    .vt-tr {
      display: flex; align-items: center;
      height: 48px; border-bottom: 1px solid var(--border-subtle);
      transition: background 0.12s;
    }
    .vt-tr:last-child { border-bottom: none; }
    .vt-tr:hover { background: var(--bg-hover); }

    /* Hover-reveal row actions */
    .vt-col-actions { opacity: 0; transition: opacity 0.1s; }
    .vt-tr:hover .vt-col-actions { opacity: 1; }

    /* Cells */
    .vt-td { display: flex; align-items: center; gap: 8px; padding: 0 14px; overflow: hidden; }

    /* Name cell */
    .vt-cred-icon {
      width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .vt-cred-icon .material-symbols-outlined { font-size: 15px; }
    .vt-cred-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .vt-cred-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vt-cred-url  { font-size: 10.5px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Type badge */
    .vt-type-badge {
      display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      border: 1px solid; white-space: nowrap;
    }

    /* Username */
    .vt-username { font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Secret */
    .vt-secret-value {
      font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary);
      letter-spacing: 0.5px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .vt-secret-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .vt-icon-btn {
      width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
    }
    .vt-icon-btn .material-symbols-outlined { font-size: 14px; }
    .vt-icon-btn:hover { background: var(--bg-active); border-color: var(--border-subtle); color: var(--text-primary); }
    .vt-copied { color: #4ade80 !important; border-color: color-mix(in srgb, #4ade80 30%, transparent) !important; background: color-mix(in srgb, #4ade80 8%, transparent) !important; }

    /* Scope */
    .vt-scope-badge {
      display: inline-block; padding: 1px 6px; border-radius: 4px;
      background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-tertiary); font-family: var(--font-mono); font-size: 10px;
    }

    /* Date */
    .vt-date-text  { font-size: 11.5px; color: var(--text-primary); display: block; white-space: nowrap; }
    .vt-date-label { font-size: 9px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.4px; display: block; }

    /* Row actions */
    .vt-row-actions { display: flex; align-items: center; gap: 2px; justify-content: flex-end; }
    .vt-row-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: 5px;
      color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
    }
    .vt-row-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vt-row-btn--danger:hover { background: color-mix(in srgb, var(--accent-red) 12%, transparent); color: var(--accent-red); }
    .vt-row-btn .material-symbols-outlined { font-size: 16px; }

    .vt-confirm { display: flex; gap: 5px; justify-content: flex-end; }
    .vt-confirm-del, .vt-confirm-cancel {
      padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
      cursor: pointer; border: 1px solid transparent;
    }
    .vt-confirm-del    { background: color-mix(in srgb, var(--accent-red) 10%, transparent); color: var(--accent-red); border-color: color-mix(in srgb, var(--accent-red) 30%, transparent); }
    .vt-confirm-del:hover { background: color-mix(in srgb, var(--accent-red) 20%, transparent); }
    .vt-confirm-cancel { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--border-subtle); }

    /* Empty state */
    .vt-empty {
      flex: 1; width: 100%;
      padding: 60px 20px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; color: var(--text-tertiary);
    }
    .vt-empty-icon  { font-size: 36px; opacity: 0.35; margin-bottom: 14px; display: block; }
    .vt-empty-title { font-size: 14px; font-weight: 500; color: var(--text-primary); margin: 0 0 6px; }
    .vt-empty-sub   { font-size: 12.5px; color: var(--text-tertiary); margin: 0 auto 20px; max-width: 340px; line-height: 1.65; }
    .vt-empty-actions { display: flex; gap: 8px; justify-content: center; }

    /* ── Add/Edit Modal (vta-*) ── */
    .vta-backdrop {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
      display: flex; align-items: flex-start; justify-content: center;
      padding: 24px; overflow-y: auto;
      animation: vtaFadeIn 0.12s ease-out;
    }
    @keyframes vtaFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .vta-modal {
      width: 100%; max-width: 620px;
      max-height: calc(100vh - 48px);
      background: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 10px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1);
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: vtaSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes vtaSlideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }

    /* Header */
    .vta-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .vta-header-left  { display: flex; align-items: center; gap: 10px; }
    .vta-header-icon  { font-size: 20px; color: var(--accent-primary); }
    .vta-header-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .vta-editing-chip {
      font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono);
      background: var(--bg-app); padding: 1px 7px; border-radius: 4px;
      border: 1px solid var(--border-subtle);
    }
    .vta-header-right { display: flex; align-items: center; gap: 8px; }
    .vta-esc-key {
      display: inline-flex; align-items: center; padding: 3px 7px;
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 4px; font-size: 11px; font-weight: 500; font-family: var(--font-mono);
      color: var(--text-tertiary);
    }
    .vta-close-btn {
      width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: 6px;
      color: var(--text-tertiary); cursor: pointer; transition: all 0.12s;
    }
    .vta-close-btn:hover { background: color-mix(in srgb, #ef4444 10%, transparent); color: #ef4444; }
    .vta-close-btn .material-symbols-outlined { font-size: 18px; }

    /* Body */
    .vta-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }

    /* Left: Type sidebar */
    .vta-type-sidebar {
      width: 148px; flex-shrink: 0;
      border-right: 1px solid var(--border-subtle);
      background: var(--bg-app);
      display: flex; flex-direction: column;
      padding: 6px;
      overflow-y: auto;
    }
    .vta-sidebar-header {
      padding: 6px 8px 4px;
      font-size: 9.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-tertiary);
    }
    .vta-type-item {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 7px 8px; margin-bottom: 2px;
      background: transparent; border: none; border-radius: 6px;
      cursor: pointer; text-align: left; color: var(--text-secondary);
      font-size: 12.5px; font-weight: 500; transition: all 0.12s;
    }
    .vta-type-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vta-type-item--active { background: var(--bg-hover); color: var(--text-primary); }
    .vta-type-icon-wrap {
      width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border-subtle); transition: all 0.12s;
    }
    .vta-type-icon-wrap .material-symbols-outlined { font-size: 15px; }
    .vta-type-label { flex: 1; }

    /* Right: Form pane */
    .vta-form-pane {
      flex: 1; min-width: 0; display: flex; flex-direction: column;
      overflow-y: auto; padding: 12px 14px;
    }

    /* Name bar */
    .vta-name-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; margin-bottom: 14px;
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 7px; transition: border-color 0.2s;
    }
    .vta-name-bar:focus-within { border-color: var(--accent-primary); }
    .vta-name-icon-wrap { display: flex; align-items: center; flex-shrink: 0; }
    .vta-name-icon-wrap .material-symbols-outlined { font-size: 18px; }
    .vta-name-input {
      flex: 1; background: transparent; border: none; outline: none;
      font-size: 14px; font-weight: 500; color: var(--text-primary);
    }
    .vta-name-input::placeholder { color: var(--text-tertiary); font-weight: 400; }

    /* Fields */
    .vta-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .vta-field-group { display: flex; flex-direction: column; gap: 4px; }
    .vta-field-group--wide { grid-column: span 2; }
    .vta-label {
      font-size: 10px; font-weight: 600; color: var(--text-tertiary);
      text-transform: uppercase; letter-spacing: 0.5px;
      display: flex; align-items: center; gap: 5px;
    }
    .vta-label-hint { font-size: 10px; text-transform: none; letter-spacing: 0; font-weight: 400; opacity: 0.7; }
    .vta-input {
      height: 34px; padding: 0 10px;
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 6px; font-size: 13px; color: var(--text-primary);
      outline: none; transition: border-color 0.2s; box-sizing: border-box; width: 100%;
    }
    .vta-input:focus { border-color: var(--accent-primary); }

    /* Footer */
    .vta-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; border-top: 1px solid var(--border-subtle);
      background: var(--bg-app); flex-shrink: 0;
    }
    .vta-footer-hints { display: flex; align-items: center; gap: 12px; }
    .vta-hint {
      display: flex; align-items: center; gap: 3px;
      font-size: 10px; color: var(--text-tertiary);
    }
    .vta-hint kbd {
      padding: 2px 5px; background: var(--bg-panel);
      border: 1px solid var(--border-subtle); border-radius: 4px;
      font-size: 10px; font-weight: 600; font-family: var(--font-mono);
      color: var(--text-secondary);
    }
    .vta-footer-actions { display: flex; align-items: center; gap: 8px; }
    .vta-cancel-btn {
      padding: 7px 14px; background: transparent; border: 1px solid var(--border-subtle);
      border-radius: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
    }
    .vta-cancel-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vta-save-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s; white-space: nowrap;
    }
    .vta-save-btn:hover:not(:disabled) { opacity: 0.9; }
    .vta-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .vta-save-btn .material-symbols-outlined { font-size: 15px; }
  `]
})
export class VaultComponent {
  public vaultStore = inject(VaultStore);

  readonly typeOptions = (Object.keys(TYPE_META) as Array<Credential['type']>).map(type => ({ type, ...TYPE_META[type] }));

  // ── Filter / sort state ───────────────────────────────────────────────────
  searchQuery   = signal('');
  selectedType  = signal('');
  selectedScope = signal('');
  sortCol       = signal<'name' | 'type' | 'createdAt'>('createdAt');
  sortDir       = signal<'asc' | 'desc'>('desc');

  // ── Form state ────────────────────────────────────────────────────────────
  formMode        = signal<'add' | 'edit' | null>(null);
  newCredName     = signal('');
  newCredType     = signal<Credential['type']>('login');
  newCredUsername = signal('');
  newCredValue    = signal('');
  newCredUrl      = signal('');
  newCredNotes    = signal('');
  newProjectId    = signal('global');
  editingId       = signal<string | null>(null);
  editName        = signal('');
  editType        = signal<Credential['type']>('login');
  editUsername    = signal('');
  editValue       = signal('');
  editUrl         = signal('');
  editNotes       = signal('');
  editProjectId   = signal('global');

  // ── Visibility & copy ────────────────────────────────────────────────────
  visibleCreds    = signal<Set<string>>(new Set());
  copiedId        = signal<string | null>(null);
  deleteConfirmId = signal<string | null>(null);
  private hideTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // ── AI Assistant ─────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'How many credentials are stored?',
    'Which credentials were accessed recently?',
    'Show me all API keys',
    'Which credentials have no URL set?',
    'Show a breakdown by type',
  ];

  // ── Computed ─────────────────────────────────────────────────────────────
  activeType    = computed(() => this.formMode() === 'edit' ? this.editType() : this.newCredType());
  usernameLabel = computed(() => USERNAME_LABEL[this.activeType()] ?? 'Username');
  valueLabel    = computed(() => VALUE_LABEL[this.activeType()]    ?? 'Secret');
  urlLabel      = computed(() => URL_LABEL[this.activeType()]      ?? 'URL');

  allTypeStats = computed(() =>
    Object.entries(TYPE_META).map(([type, meta]) => ({
      type, ...meta,
      count: this.vaultStore.credentials().filter(c => c.type === type).length
    })).filter(e => e.count > 0)
  );

  countByScope = computed(() => {
    const counts: Record<string, number> = {};
    for (const c of this.vaultStore.credentials()) {
      const scope = c.projectId || 'global';
      counts[scope] = (counts[scope] ?? 0) + 1;
    }
    return counts;
  });

  hasActiveFilters = computed(() => !!this.searchQuery() || !!this.selectedType() || !!this.selectedScope());

  filteredCredentials = computed(() => {
    const q     = this.searchQuery().toLowerCase();
    const type  = this.selectedType();
    const scope = this.selectedScope();
    const col   = this.sortCol();
    const dir   = this.sortDir();

    let list = this.vaultStore.credentials();
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.type.includes(q) ||
      (c.username ?? '').toLowerCase().includes(q) ||
      (c.url ?? '').toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q) ||
      (c.projectId ?? '').toLowerCase().includes(q)
    );
    if (type)  list = list.filter(c => c.type === type);
    if (scope) list = list.filter(c => (c.projectId || 'global') === scope);

    return [...list].sort((a, b) => {
      const av = col === 'name' ? a.name : col === 'type' ? a.type : (a.createdAt ?? '');
      const bv = col === 'name' ? b.name : col === 'type' ? b.type : (b.createdAt ?? '');
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  });

  // ── Sorting ───────────────────────────────────────────────────────────────
  setSort(col: 'name' | 'type' | 'createdAt') {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
  }

  clearFilters() { this.searchQuery.set(''); this.selectedType.set(''); this.selectedScope.set(''); }

  // ── Form ──────────────────────────────────────────────────────────────────
  openAddForm() {
    if (this.formMode() === 'add') { this.formMode.set(null); return; }
    this.editingId.set(null);
    this.formMode.set('add');
    this.newCredName.set(''); this.newCredType.set('login'); this.newCredUsername.set('');
    this.newCredValue.set(''); this.newCredUrl.set(''); this.newCredNotes.set('');
    this.newProjectId.set('global');
  }

  openEditForm(cred: Credential) {
    this.formMode.set('edit');
    this.editingId.set(cred.id);
    this.editName.set(cred.name);
    this.editType.set(cred.type);
    this.editUsername.set(cred.username ?? '');
    this.editValue.set('');
    this.editUrl.set(cred.url ?? '');
    this.editNotes.set(cred.notes ?? '');
    this.editProjectId.set(cred.projectId ?? 'global');
  }

  closeForm() { this.formMode.set(null); this.editingId.set(null); }

  setFormType(type: Credential['type']) {
    if (this.formMode() === 'edit') this.editType.set(type);
    else this.newCredType.set(type);
  }

  addCredential() {
    if (!this.newCredName() || !this.newCredValue()) return;
    this.vaultStore.addCredential({
      id: crypto.randomUUID(),
      name: this.newCredName(),
      type: this.newCredType(),
      username: this.newCredUsername() || undefined,
      url: this.newCredUrl() || undefined,
      notes: this.newCredNotes() || undefined,
      projectId: this.newProjectId() || 'global',
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      unencryptedValue: this.newCredValue(),
    });
    this.closeForm();
  }

  saveEdit() {
    const id = this.editingId();
    if (!id || !this.editName()) return;
    this.vaultStore.updateCredential(id, {
      name: this.editName(),
      type: this.editType(),
      username: this.editUsername() || undefined,
      url: this.editUrl() || undefined,
      notes: this.editNotes() || undefined,
      projectId: this.editProjectId() || 'global',
      ...(this.editValue() ? { newUnencryptedValue: this.editValue() } : {}),
    });
    this.closeForm();
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  confirmDelete(id: string) {
    this.vaultStore.deleteCredential(id);
    this.deleteConfirmId.set(null);
    if (this.editingId() === id) this.closeForm();
  }

  // ── Visibility & copy ────────────────────────────────────────────────────
  toggleCredVisibility(id: string) {
    const set = new Set(this.visibleCreds());
    if (set.has(id)) {
      set.delete(id);
      clearTimeout(this.hideTimers.get(id));
      this.hideTimers.delete(id);
    } else {
      set.add(id);
      this.vaultStore.touchCredential(id);
      const timer = setTimeout(() => {
        const next = new Set(this.visibleCreds());
        next.delete(id);
        this.visibleCreds.set(next);
        this.hideTimers.delete(id);
      }, 30_000);
      this.hideTimers.set(id, timer);
    }
    this.visibleCreds.set(set);
  }

  decryptCred(cipher: string): string { return EncryptionUtil.decrypt(cipher); }

  copyCred(id: string, cipher: string) {
    navigator.clipboard.writeText(this.decryptCred(cipher));
    this.copiedId.set(id);
    this.vaultStore.touchCredential(id);
    setTimeout(() => this.copiedId.set(null), 1800);
  }

  // ── AI Assistant ─────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    await new Promise(r => setTimeout(r, 700 + Math.random() * 400));

    const creds = this.vaultStore.credentials();
    const q = text.toLowerCase();
    let response = '';

    if (q.includes('how many') || q.includes('count') || q.includes('stored')) {
      const byType = Object.entries(TYPE_META).map(([type, m]) => {
        const n = creds.filter(c => c.type === type).length;
        return n > 0 ? `${m.label}: ${n}` : null;
      }).filter(Boolean);
      response = `You have **${creds.length}** credential${creds.length !== 1 ? 's' : ''} stored.\n${byType.join('\n')}`;
    } else if (q.includes('recent') || q.includes('accessed')) {
      const recent = [...creds]
        .filter(c => c.lastAccessedAt)
        .sort((a, b) => (b.lastAccessedAt ?? '').localeCompare(a.lastAccessedAt ?? ''))
        .slice(0, 5);
      response = recent.length
        ? `Recently accessed:\n${recent.map((c, i) => `${i + 1}. ${c.name} — ${this.formatDate(c.lastAccessedAt!)}`).join('\n')}`
        : `No credentials have been accessed yet.`;
    } else if (q.includes('api key') || q.includes('api_key')) {
      const keys = creds.filter(c => c.type === 'api_key');
      response = keys.length
        ? `You have ${keys.length} API key${keys.length !== 1 ? 's' : ''}: ${keys.map(c => c.name).join(', ')}.`
        : `No API keys stored yet.`;
    } else if (q.includes('no url') || q.includes('without url') || q.includes('missing url')) {
      const noUrl = creds.filter(c => !c.url);
      response = noUrl.length
        ? `${noUrl.length} credential${noUrl.length !== 1 ? 's have' : ' has'} no URL: ${noUrl.slice(0, 5).map(c => c.name).join(', ')}${noUrl.length > 5 ? ` and ${noUrl.length - 5} more` : ''}.`
        : `All credentials have a URL set.`;
    } else if (q.includes('breakdown') || q.includes('type')) {
      const lines = Object.entries(TYPE_META).map(([type, m]) => {
        const n = creds.filter(c => c.type === type).length;
        return `${m.label}: ${n}`;
      });
      response = `Credentials by type:\n${lines.join('\n')}`;
    } else {
      response = `You have ${creds.length} credential${creds.length !== 1 ? 's' : ''} in the vault. Try asking about recent access, API keys, credentials without URLs, or a type breakdown.`;
    }

    this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    this.aiLoading.set(false);
    setTimeout(() => {
      const el = document.querySelector('.ai-panel-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTypeMeta(type: string) { return TYPE_META[type] ?? TYPE_META['login']; }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
