import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VaultStore } from '@envello/state';
import { EncryptionUtil } from '@envello/core';
import { Credential } from '@envello/domain';
import { ModalComponent } from '@envello/ui';

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  login:   { label: 'Login',    icon: 'person',        color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  api_key: { label: 'API Key',  icon: 'key',           color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  ssh:     { label: 'SSH',      icon: 'terminal',      color: '#a855f7', bg: 'rgba(168,85,247,0.1)'  },
  db:      { label: 'Database', icon: 'database',      color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  note:    { label: 'Note',     icon: 'sticky_note_2', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
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
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="vault-page">

      <!-- Page Header -->
      <header class="vault-header">
        <div class="vault-header-left">
          <div class="vault-header-icon">
            <span class="material-symbols-outlined">lock</span>
          </div>
          <div>
            <h1 class="vault-title">Credentials Vault</h1>
            <p class="vault-subtitle">Encrypted workspace credentials, globally scoped.</p>
          </div>
          <div class="vault-count-pill">{{ vaultStore.credentials().length }}</div>
        </div>
        <div class="vault-header-right">
          <div class="vault-search-wrap">
            <span class="material-symbols-outlined vault-search-icon">search</span>
            <input class="vault-search-input" type="text" placeholder="Search credentials…"
              [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)">
            @if (searchQuery()) {
              <button class="vault-search-clear" (click)="searchQuery.set('')">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>
          <button class="vault-add-btn" (click)="openAddForm()">
            <span class="material-symbols-outlined">{{ formMode() === 'add' ? 'close' : 'add' }}</span>
            {{ formMode() === 'add' ? 'Cancel' : 'New Credential' }}
          </button>
        </div>
      </header>

      <!-- Type Filter Chips -->
      <div class="vault-filter-row">
        <button class="vault-filter-chip" [class.active]="!selectedType()" (click)="selectedType.set('')">
          All <span class="vf-count">{{ vaultStore.credentials().length }}</span>
        </button>
        @for (entry of allTypeStats(); track entry.type) {
          <button class="vault-filter-chip" [class.active]="selectedType() === entry.type"
            [style.--chip-color]="entry.color" [style.--chip-bg]="entry.bg"
            (click)="selectedType.set(selectedType() === entry.type ? '' : entry.type)">
            <span class="material-symbols-outlined" style="font-size:12px;">{{ entry.icon }}</span>
            {{ entry.label }}
            <span class="vf-count">{{ entry.count }}</span>
          </button>
        }
      </div>

      <!-- Add / Edit Form Panel -->
      @if (formMode() !== null) {
      <env-modal
        [isOpen]="true"
        [title]="formMode() === 'edit' ? 'Edit Credential' : 'New Credential'"
        size="large"
        (closed)="closeForm()">
        <div header style="display:flex; align-items:center; gap:8px; margin-left:8px;">
          <span class="material-symbols-outlined" style="color:var(--accent-primary);font-size:18px;">
            {{ formMode() === 'edit' ? 'edit' : 'add_circle' }}
          </span>
          @if (formMode() === 'edit') {
            <span class="vault-form-editing-name">{{ editName() }}</span>
          }
        </div>
        <div body class="vault-form-body">
          <div class="vault-form-grid">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input type="text" class="form-input" placeholder="e.g. Production DB Password"
                [ngModel]="formMode() === 'edit' ? editName() : newCredName()"
                (ngModelChange)="formMode() === 'edit' ? editName.set($event) : newCredName.set($event)">
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-select"
                [ngModel]="formMode() === 'edit' ? editType() : newCredType()"
                (ngModelChange)="formMode() === 'edit' ? editType.set($event) : newCredType.set($event)">
                <option value="login">Login</option>
                <option value="api_key">API Key</option>
                <option value="ssh">SSH</option>
                <option value="db">Database</option>
                <option value="note">Secure Note</option>
              </select>
            </div>
            @if (activeType() !== 'note') {
            <div class="form-group">
              <label class="form-label">{{ usernameLabel() }}</label>
              <input type="text" class="form-input" [placeholder]="usernameLabel()"
                [ngModel]="formMode() === 'edit' ? editUsername() : newCredUsername()"
                (ngModelChange)="formMode() === 'edit' ? editUsername.set($event) : newCredUsername.set($event)">
            </div>
            }
            <div class="form-group">
              <label class="form-label">{{ valueLabel() }}
                @if (formMode() === 'edit') { <span class="form-label-hint">(leave blank to keep existing)</span> }
              </label>
              <input type="password" class="form-input" [placeholder]="valueLabel()"
                [ngModel]="formMode() === 'edit' ? editValue() : newCredValue()"
                (ngModelChange)="formMode() === 'edit' ? editValue.set($event) : newCredValue.set($event)">
            </div>
            <div class="form-group">
              <label class="form-label">{{ urlLabel() }}</label>
              <input type="text" class="form-input" [placeholder]="urlLabel()"
                [ngModel]="formMode() === 'edit' ? editUrl() : newCredUrl()"
                (ngModelChange)="formMode() === 'edit' ? editUrl.set($event) : newCredUrl.set($event)">
            </div>
            <div class="form-group">
              <label class="form-label">Project Scope</label>
              <input type="text" class="form-input" placeholder="global"
                [ngModel]="formMode() === 'edit' ? editProjectId() : newProjectId()"
                (ngModelChange)="formMode() === 'edit' ? editProjectId.set($event) : newProjectId.set($event)">
            </div>
            <div class="form-group form-group--wide">
              <label class="form-label">Notes</label>
              <input type="text" class="form-input" placeholder="Optional description…"
                [ngModel]="formMode() === 'edit' ? editNotes() : newCredNotes()"
                (ngModelChange)="formMode() === 'edit' ? editNotes.set($event) : newCredNotes.set($event)">
            </div>
          </div>
        </div>
        <div footer class="vault-form-footer" style="padding:16px; width: 100%;">
          <button class="vault-cancel-btn" (click)="closeForm()">Cancel</button>
          <button class="vault-save-btn" (click)="formMode() === 'edit' ? saveEdit() : addCredential()"
            [disabled]="formMode() === 'edit' ? !editName() : (!newCredName() || !newCredValue())">
            <span class="material-symbols-outlined">save</span>
            {{ formMode() === 'edit' ? 'Save Changes' : 'Save Credential' }}
          </button>
        </div>
      </env-modal>
      }

      <!-- Table Panel -->
      <div class="vault-table-panel">
        @if (filteredCredentials().length > 0) {
        <table class="vault-table">
          <thead>
            <tr>
              <th class="vault-th-sortable" (click)="setSort('name')">
                Credential
                <span class="sort-indicator">{{ sortIndicator('name') }}</span>
              </th>
              <th class="vault-th-sortable" (click)="setSort('type')">
                Type
                <span class="sort-indicator">{{ sortIndicator('type') }}</span>
              </th>
              <th>Username</th>
              <th>Secret</th>
              <th>Scope</th>
              <th class="vault-th-sortable" (click)="setSort('createdAt')">
                Created
                <span class="sort-indicator">{{ sortIndicator('createdAt') }}</span>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (cred of filteredCredentials(); track cred.id) {
            <tr class="vault-row">
              <td class="vault-td-name">
                <div class="vault-cred-name-cell">
                  <div class="vault-cred-icon" [style.background]="getTypeMeta(cred.type).bg">
                    <span class="material-symbols-outlined" [style.color]="getTypeMeta(cred.type).color" style="font-size:16px;">{{ getTypeMeta(cred.type).icon }}</span>
                  </div>
                  <div class="vault-cred-name-body">
                    <span class="vault-cred-name">{{ cred.name }}</span>
                    @if (cred.url) {
                      <span class="vault-cred-url">{{ cred.url }}</span>
                    }
                    @if (cred.notes) {
                      <span class="vault-cred-notes">{{ cred.notes }}</span>
                    }
                  </div>
                </div>
              </td>
              <td>
                <span class="vault-type-badge" [style.background]="getTypeMeta(cred.type).bg" [style.color]="getTypeMeta(cred.type).color" [style.border-color]="getTypeMeta(cred.type).color + '40'">
                  {{ getTypeMeta(cred.type).label }}
                </span>
              </td>
              <td>
                <span class="vault-username">{{ cred.username || '—' }}</span>
              </td>
              <td class="vault-td-secret">
                <div class="vault-secret-cell">
                  <code class="vault-secret-value">{{ visibleCreds().has(cred.id) ? decryptCred(cred.value) : '•  •  •  •  •  •  •  •  •  •  •  •' }}</code>
                  <div class="vault-secret-actions">
                    <button class="vault-icon-btn" (click)="toggleCredVisibility(cred.id)" [title]="visibleCreds().has(cred.id) ? 'Hide' : 'Reveal'">
                      <span class="material-symbols-outlined">{{ visibleCreds().has(cred.id) ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                    <button class="vault-icon-btn" [class.vault-copied]="copiedId() === cred.id" (click)="copyCred(cred.id, cred.value)" title="Copy to clipboard">
                      <span class="material-symbols-outlined">{{ copiedId() === cred.id ? 'check' : 'content_copy' }}</span>
                    </button>
                  </div>
                </div>
              </td>
              <td>
                <span class="vault-scope-badge">{{ cred.projectId || 'global' }}</span>
              </td>
              <td class="vault-td-date">
                <span class="vault-date-text">{{ formatDate(cred.lastAccessedAt || cred.createdAt) }}</span>
                @if (cred.lastAccessedAt) {
                  <span class="vault-date-label">accessed</span>
                } @else {
                  <span class="vault-date-label">created</span>
                }
              </td>
              <td class="vault-td-actions">
                @if (deleteConfirmId() === cred.id) {
                  <div class="vault-confirm-row">
                    <span class="vault-confirm-text">Delete?</span>
                    <button class="vault-confirm-yes" (click)="confirmDelete(cred.id)">Yes</button>
                    <button class="vault-confirm-no" (click)="deleteConfirmId.set(null)">No</button>
                  </div>
                } @else {
                  <div class="vault-row-actions">
                    <button class="vault-icon-btn" title="Edit" (click)="openEditForm(cred)">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="vault-delete-btn" title="Delete" (click)="deleteConfirmId.set(cred.id)">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                }
              </td>
            </tr>
            }
          </tbody>
        </table>
        } @else if (searchQuery() || selectedType()) {
        <div class="vault-empty">
          <span class="material-symbols-outlined vault-empty-icon">search_off</span>
          <p class="vault-empty-title">No results</p>
          <p class="vault-empty-sub">Try a different search term or clear the filters.</p>
          <button class="vault-cancel-btn" style="margin-top:12px;" (click)="searchQuery.set(''); selectedType.set('')">Clear filters</button>
        </div>
        } @else {
        <div class="vault-empty">
          <div class="vault-empty-icon-wrap">
            <span class="material-symbols-outlined vault-empty-icon">vpn_key</span>
          </div>
          <p class="vault-empty-title">Vault is empty</p>
          <p class="vault-empty-sub">Store API keys, passwords, SSH creds and secure notes in one place.</p>
          <button class="vault-add-btn" style="margin-top:16px;" (click)="openAddForm()">
            <span class="material-symbols-outlined">add</span>
            Add First Credential
          </button>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; background: var(--bg-app); overflow: hidden; }

    .vault-page {
      display: flex; flex-direction: column;
      height: 100%; padding: 24px 28px 20px;
      gap: 14px; overflow: hidden;
    }

    /* Header */
    .vault-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .vault-header-left { display: flex; align-items: center; gap: 12px; }
    .vault-header-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--accent-primary-dim); border: 1px solid rgba(255,215,0,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .vault-header-icon .material-symbols-outlined { font-size: 20px; color: var(--accent-primary); }
    .vault-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.2px; }
    .vault-subtitle { font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0; }
    .vault-count-pill {
      padding: 2px 8px; border-radius: 20px;
      background: var(--bg-active); border: 1px solid var(--border-highlight);
      font-size: 11px; font-weight: 700; color: var(--text-secondary); font-family: var(--font-mono);
    }
    .vault-header-right { display: flex; align-items: center; gap: 10px; }

    .vault-search-wrap { position: relative; display: flex; align-items: center; }
    .vault-search-icon { position: absolute; left: 10px; font-size: 16px; color: var(--text-tertiary); pointer-events: none; }
    .vault-search-input {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 6px; padding: 7px 28px 7px 32px;
      font-size: 13px; color: var(--text-primary); outline: none; width: 220px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .vault-search-input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-dim); }
    .vault-search-input::placeholder { color: var(--text-tertiary); }
    .vault-search-clear {
      position: absolute; right: 6px; background: transparent; border: none;
      color: var(--text-tertiary); cursor: pointer; padding: 2px; border-radius: 3px;
      display: flex; align-items: center;
    }
    .vault-search-clear:hover { color: var(--text-primary); }
    .vault-search-clear .material-symbols-outlined { font-size: 14px; }

    .vault-add-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s, transform 0.15s;
    }
    .vault-add-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .vault-add-btn .material-symbols-outlined { font-size: 16px; }

    /* Filter Chips */
    .vault-filter-row { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
    .vault-filter-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px;
      border: 1px solid var(--border-subtle); background: transparent;
      color: var(--text-tertiary); font-size: 11px; font-weight: 500;
      cursor: pointer; transition: all 0.15s;
    }
    .vault-filter-chip:hover { background: var(--bg-hover); color: var(--text-secondary); }
    .vault-filter-chip.active {
      background: var(--chip-bg, var(--accent-primary-dim));
      border-color: var(--chip-color, var(--accent-primary));
      color: var(--chip-color, var(--accent-primary));
      font-weight: 600;
    }
    .vf-count {
      font-size: 10px; font-weight: 700; font-family: var(--font-mono);
      background: rgba(0,0,0,0.08); border-radius: 8px; padding: 0 4px; line-height: 1.4;
    }
    .vault-filter-chip.active .vf-count { background: rgba(0,0,0,0.12); }

    /* Form Panel */
    .vault-form-panel {
      background: var(--bg-panel); border: 1px solid var(--border-main);
      border-radius: 8px; overflow: hidden; flex-shrink: 0;
      animation: slideDown 0.2s ease;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .vault-form-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; background: var(--bg-hover);
      border-bottom: 1px solid var(--border-subtle);
    }
    .vault-form-editing-name {
      font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono);
      background: var(--bg-app); padding: 1px 6px; border-radius: 4px;
      border: 1px solid var(--border-subtle); margin-left: 4px;
    }
    .vault-form-body { padding: 16px; }
    .vault-form-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px;
    }
    .form-group--wide { grid-column: span 3; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-label {
      font-size: 11px; font-weight: 600; color: var(--text-tertiary);
      text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;
    }
    .form-label-hint { font-size: 10px; text-transform: none; letter-spacing: 0; color: var(--text-tertiary); font-weight: 400; opacity: 0.7; }
    .form-input {
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 6px; padding: 7px 10px; font-size: 13px; color: var(--text-primary);
      outline: none; transition: border-color 0.2s;
    }
    .form-input:focus { border-color: var(--accent-primary); }
    .form-select {
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 6px; padding: 7px 10px; font-size: 13px; color: var(--text-primary);
      outline: none; cursor: pointer;
    }
    .vault-form-footer { display: flex; justify-content: flex-end; gap: 8px; }
    .vault-cancel-btn {
      padding: 7px 14px; background: transparent; border: 1px solid var(--border-subtle);
      border-radius: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer;
      transition: all 0.15s;
    }
    .vault-cancel-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .vault-save-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s; white-space: nowrap;
    }
    .vault-save-btn:hover:not(:disabled) { opacity: 0.9; }
    .vault-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .vault-save-btn .material-symbols-outlined { font-size: 15px; }

    /* Table Panel */
    .vault-table-panel {
      flex: 1; background: var(--bg-panel); border: 1px solid var(--border-main);
      border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; min-height: 0;
    }
    .vault-table { width: 100%; border-collapse: collapse; text-align: left; }
    .vault-table thead { position: sticky; top: 0; background: var(--bg-hover); z-index: 10; }
    .vault-table thead tr { border-bottom: 1px solid var(--border-main); }
    .vault-table th {
      padding: 10px 16px; font-size: 10px; font-weight: 700;
      color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.6px;
    }
    .vault-th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
    .vault-th-sortable:hover { color: var(--text-secondary); }
    .sort-indicator { font-size: 11px; margin-left: 3px; opacity: 0.7; }
    .vault-table-panel .vault-table { display: block; overflow-y: auto; height: 100%; }
    .vault-table thead, .vault-table tbody { display: table; width: 100%; table-layout: fixed; }
    .vault-row { border-bottom: 1px solid var(--border-subtle); transition: background 0.15s; }
    .vault-row:last-child { border-bottom: none; }
    .vault-row:hover { background: var(--bg-hover); }
    .vault-table td { padding: 10px 16px; vertical-align: middle; }

    .vault-cred-name-cell { display: flex; align-items: center; gap: 10px; }
    .vault-cred-icon {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .vault-cred-name-body { display: flex; flex-direction: column; min-width: 0; }
    .vault-cred-name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vault-cred-url { font-size: 10px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .vault-cred-notes { font-size: 10px; color: var(--text-tertiary); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .vault-type-badge {
      display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid;
    }

    .vault-username { font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono); }

    .vault-secret-cell { display: flex; align-items: center; gap: 8px; }
    .vault-secret-value {
      font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary);
      letter-spacing: 0.5px; min-width: 160px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .vault-secret-actions { display: flex; gap: 2px; margin-left: 4px; }
    .vault-icon-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
    }
    .vault-icon-btn .material-symbols-outlined { font-size: 15px; }
    .vault-icon-btn:hover { background: var(--bg-active); border-color: var(--border-highlight); color: var(--text-primary); }
    .vault-icon-btn.vault-copied { color: #4ade80; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.08); }

    .vault-scope-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-tertiary); font-family: var(--font-mono); font-size: 10px; text-transform: lowercase;
    }

    .vault-td-date { white-space: nowrap; }
    .vault-date-text { font-size: 11px; color: var(--text-tertiary); display: block; }
    .vault-date-label { font-size: 9px; color: var(--text-tertiary); opacity: 0.6; text-transform: uppercase; letter-spacing: 0.4px; }

    .vault-td-actions { text-align: right; width: 90px; }
    .vault-row-actions { display: flex; justify-content: flex-end; gap: 2px; }
    .vault-delete-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
    }
    .vault-delete-btn .material-symbols-outlined { font-size: 15px; }
    .vault-delete-btn:hover { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: var(--accent-red); }

    .vault-confirm-row { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
    .vault-confirm-text { font-size: 11px; color: var(--text-tertiary); white-space: nowrap; }
    .vault-confirm-yes {
      padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
      background: rgba(248,113,113,0.15); color: var(--accent-red);
      border: 1px solid rgba(248,113,113,0.3); cursor: pointer; transition: all 0.15s;
    }
    .vault-confirm-yes:hover { background: rgba(248,113,113,0.25); }
    .vault-confirm-no {
      padding: 2px 8px; border-radius: 4px; font-size: 11px;
      background: transparent; color: var(--text-tertiary);
      border: 1px solid var(--border-subtle); cursor: pointer; transition: all 0.15s;
    }
    .vault-confirm-no:hover { background: var(--bg-hover); color: var(--text-primary); }

    /* Empty State */
    .vault-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 64px 24px; text-align: center;
    }
    .vault-empty-icon-wrap {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--bg-hover); border: 1px solid var(--border-main);
      display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
    }
    .vault-empty-icon { font-size: 28px; color: var(--text-tertiary); opacity: 0.6; }
    .vault-empty-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
    .vault-empty-sub { font-size: 13px; color: var(--text-tertiary); margin: 0; max-width: 320px; line-height: 1.6; }
  `]
})
export class VaultComponent {
  public vaultStore = inject(VaultStore);

  // Search & filter
  searchQuery  = signal('');
  selectedType = signal('');
  sortCol      = signal<'name' | 'type' | 'createdAt'>('createdAt');
  sortDir      = signal<'asc' | 'desc'>('desc');

  // Form state — shared between add and edit
  formMode     = signal<'add' | 'edit' | null>(null);
  // Add-mode fields
  newCredName     = signal('');
  newCredType     = signal<Credential['type']>('login');
  newCredUsername = signal('');
  newCredValue    = signal('');
  newCredUrl      = signal('');
  newCredNotes    = signal('');
  newProjectId    = signal('global');
  // Edit-mode fields
  editingId    = signal<string | null>(null);
  editName     = signal('');
  editType     = signal<Credential['type']>('login');
  editUsername = signal('');
  editValue    = signal(''); // blank = keep existing
  editUrl      = signal('');
  editNotes    = signal('');
  editProjectId = signal('global');

  // Visibility & copy feedback
  visibleCreds    = signal<Set<string>>(new Set());
  copiedId        = signal<string | null>(null);
  deleteConfirmId = signal<string | null>(null);

  // Auto-hide timeouts
  private hideTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Computed helpers
  activeType = computed(() => this.formMode() === 'edit' ? this.editType() : this.newCredType());
  usernameLabel = computed(() => USERNAME_LABEL[this.activeType()] ?? 'Username');
  valueLabel    = computed(() => VALUE_LABEL[this.activeType()]    ?? 'Secret');
  urlLabel      = computed(() => URL_LABEL[this.activeType()]      ?? 'URL');

  allTypeStats = computed(() =>
    Object.entries(TYPE_META).map(([type, meta]) => ({
      type, ...meta,
      count: this.vaultStore.credentials().filter(c => c.type === type).length
    })).filter(e => e.count > 0)
  );

  filteredCredentials = computed(() => {
    const q    = this.searchQuery().toLowerCase();
    const type = this.selectedType();
    const col  = this.sortCol();
    const dir  = this.sortDir();

    let list = this.vaultStore.credentials();
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.type.includes(q) ||
      (c.username ?? '').toLowerCase().includes(q) ||
      (c.url ?? '').toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q) ||
      (c.projectId ?? '').toLowerCase().includes(q)
    );
    if (type) list = list.filter(c => c.type === type);

    return [...list].sort((a, b) => {
      const av = col === 'name' ? a.name : col === 'type' ? a.type : (a.createdAt ?? '');
      const bv = col === 'name' ? b.name : col === 'type' ? b.type : (b.createdAt ?? '');
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  });

  // ─── Sorting ───────────────────────────────────────────────────────────────

  setSort(col: 'name' | 'type' | 'createdAt') {
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

  // ─── Form ──────────────────────────────────────────────────────────────────

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

  closeForm() {
    this.formMode.set(null);
    this.editingId.set(null);
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

  // ─── Delete ────────────────────────────────────────────────────────────────

  confirmDelete(id: string) {
    this.vaultStore.deleteCredential(id);
    this.deleteConfirmId.set(null);
    if (this.editingId() === id) this.closeForm();
  }

  // ─── Visibility & copy ─────────────────────────────────────────────────────

  toggleCredVisibility(id: string) {
    const set = new Set(this.visibleCreds());
    if (set.has(id)) {
      set.delete(id);
      clearTimeout(this.hideTimers.get(id));
      this.hideTimers.delete(id);
    } else {
      set.add(id);
      this.vaultStore.touchCredential(id);
      // auto-hide after 30 s
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

  decryptCred(cipher: string): string {
    return EncryptionUtil.decrypt(cipher);
  }

  copyCred(id: string, cipher: string) {
    navigator.clipboard.writeText(this.decryptCred(cipher));
    this.copiedId.set(id);
    this.vaultStore.touchCredential(id);
    setTimeout(() => this.copiedId.set(null), 1800);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getTypeMeta(type: string) {
    return TYPE_META[type] ?? TYPE_META['login'];
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
