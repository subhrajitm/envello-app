import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VaultStore } from '@envello/state';
import { EncryptionUtil } from '@envello/core';

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  login:   { label: 'Login',    icon: 'person',         color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  api_key: { label: 'API Key',  icon: 'key',            color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  ssh:     { label: 'SSH',      icon: 'terminal',       color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  db:      { label: 'Database', icon: 'database',       color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  note:    { label: 'Note',     icon: 'sticky_note_2',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
};

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            <input class="vault-search-input" type="text" [(ngModel)]="searchQuery" placeholder="Search credentials…">
          </div>
          <button class="vault-add-btn" (click)="toggleForm()">
            <span class="material-symbols-outlined">{{ showAddCredential() ? 'close' : 'add' }}</span>
            {{ showAddCredential() ? 'Cancel' : 'New Credential' }}
          </button>
        </div>
      </header>

      <!-- Stats Strip -->
      <div class="vault-stats-strip">
        @for (entry of typeStats(); track entry.type) {
          <div class="vault-stat-chip" [style.border-color]="entry.color" [style.background]="entry.bg">
            <span class="material-symbols-outlined" [style.color]="entry.color" style="font-size:14px;">{{ entry.icon }}</span>
            <span class="vault-stat-chip-label" [style.color]="entry.color">{{ entry.label }}</span>
            <span class="vault-stat-chip-count" [style.color]="entry.color">{{ entry.count }}</span>
          </div>
        }
      </div>

      <!-- Add Credential Form -->
      @if (showAddCredential()) {
      <div class="vault-form-panel">
        <div class="vault-form-header">
          <span class="material-symbols-outlined" style="color: var(--accent-primary); font-size: 18px;">add_circle</span>
          <span style="font-weight: 600; font-size: 13px; color: var(--text-primary);">New Credential</span>
        </div>
        <div class="vault-form-body">
          <div class="vault-form-row">
            <div class="form-group" style="flex:2; margin:0;">
              <label class="form-label">Credential Name</label>
              <input type="text" class="form-input" [(ngModel)]="newCredName" placeholder="e.g. Production DB Password">
            </div>
            <div class="form-group" style="flex:1; margin:0;">
              <label class="form-label">Type</label>
              <select class="form-select" [(ngModel)]="newCredType">
                <option value="login">Login</option>
                <option value="api_key">API Key</option>
                <option value="ssh">SSH</option>
                <option value="db">Database</option>
                <option value="note">Secure Note</option>
              </select>
            </div>
            <div class="form-group" style="flex:2; margin:0;">
              <label class="form-label">Secret Value</label>
              <input type="password" class="form-input" [(ngModel)]="newCredValue" placeholder="Enter secret…">
            </div>
            <div class="form-group" style="flex:1; margin:0;">
              <label class="form-label">Project Scope</label>
              <input type="text" class="form-input" [(ngModel)]="newProjectId" placeholder="global">
            </div>
            <div class="vault-form-actions">
              <button class="vault-save-btn" (click)="addCredential()" [disabled]="!newCredName() || !newCredValue()">
                <span class="material-symbols-outlined">save</span>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      }

      <!-- Table Panel -->
      <div class="vault-table-panel">
        @if (filteredCredentials().length > 0) {
        <table class="vault-table">
          <thead>
            <tr>
              <th>Credential</th>
              <th>Type</th>
              <th>Secret</th>
              <th>Scope</th>
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
                  <span class="vault-cred-name">{{ cred.name }}</span>
                </div>
              </td>
              <td>
                <span class="vault-type-badge" [style.background]="getTypeMeta(cred.type).bg" [style.color]="getTypeMeta(cred.type).color" [style.border-color]="getTypeMeta(cred.type).color + '40'">
                  {{ getTypeMeta(cred.type).label }}
                </span>
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
                <span class="vault-scope-badge">{{ cred.projectId }}</span>
              </td>
              <td class="vault-td-actions">
                <button class="vault-delete-btn" (click)="vaultStore.deleteCredential(cred.id)" title="Delete">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
            }
          </tbody>
        </table>
        } @else if (searchQuery()) {
        <div class="vault-empty">
          <span class="material-symbols-outlined vault-empty-icon">search_off</span>
          <p class="vault-empty-title">No results for "{{ searchQuery() }}"</p>
          <p class="vault-empty-sub">Try a different name or clear the search.</p>
        </div>
        } @else {
        <div class="vault-empty">
          <div class="vault-empty-icon-wrap">
            <span class="material-symbols-outlined vault-empty-icon">vpn_key</span>
          </div>
          <p class="vault-empty-title">Vault is empty</p>
          <p class="vault-empty-sub">Store API keys, passwords, SSH creds and secure notes in one place.</p>
          <button class="vault-add-btn" style="margin-top:16px;" (click)="showAddCredential.set(true)">
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
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 24px 28px 20px;
      gap: 16px;
      overflow: hidden;
    }

    /* Header */
    .vault-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .vault-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .vault-header-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: var(--accent-primary-dim);
      border: 1px solid rgba(255,215,0,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .vault-header-icon .material-symbols-outlined {
      font-size: 20px;
      color: var(--accent-primary);
    }
    .vault-title {
      font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.2px;
    }
    .vault-subtitle {
      font-size: 12px; color: var(--text-tertiary); margin: 2px 0 0;
    }
    .vault-count-pill {
      padding: 2px 8px;
      border-radius: 20px;
      background: var(--bg-active);
      border: 1px solid var(--border-highlight);
      font-size: 11px; font-weight: 700;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
    .vault-header-right {
      display: flex; align-items: center; gap: 10px;
    }
    .vault-search-wrap {
      position: relative; display: flex; align-items: center;
    }
    .vault-search-icon {
      position: absolute; left: 10px;
      font-size: 16px; color: var(--text-tertiary);
      pointer-events: none;
    }
    .vault-search-input {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 7px 12px 7px 32px;
      font-size: 13px;
      color: var(--text-primary);
      outline: none;
      width: 220px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .vault-search-input:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 2px var(--accent-primary-dim);
    }
    .vault-search-input::placeholder { color: var(--text-tertiary); }

    .vault-add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px;
      background: var(--accent-primary);
      color: var(--accent-primary-text);
      border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }
    .vault-add-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .vault-add-btn .material-symbols-outlined { font-size: 16px; }

    /* Stats Strip */
    .vault-stats-strip {
      display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0;
    }
    .vault-stat-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid;
      font-size: 11px;
    }
    .vault-stat-chip-label { font-weight: 500; }
    .vault-stat-chip-count { font-weight: 700; font-family: var(--font-mono); }

    /* Form Panel */
    .vault-form-panel {
      background: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      animation: slideDown 0.2s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .vault-form-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px;
      background: var(--bg-hover);
      border-bottom: 1px solid var(--border-subtle);
    }
    .vault-form-body {
      padding: 16px;
    }
    .vault-form-row {
      display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;
    }
    .vault-form-actions {
      display: flex; align-items: flex-end; padding-bottom: 0;
    }
    .vault-save-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      background: var(--accent-primary);
      color: var(--accent-primary-text);
      border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s;
      height: 36px; white-space: nowrap;
    }
    .vault-save-btn:hover:not(:disabled) { opacity: 0.9; }
    .vault-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .vault-save-btn .material-symbols-outlined { font-size: 15px; }

    /* Table Panel */
    .vault-table-panel {
      flex: 1;
      background: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 8px;
      overflow: hidden;
      display: flex; flex-direction: column;
      min-height: 0;
    }
    .vault-table {
      width: 100%; border-collapse: collapse; text-align: left;
    }
    .vault-table thead {
      position: sticky; top: 0; background: var(--bg-hover); z-index: 10;
    }
    .vault-table thead tr {
      border-bottom: 1px solid var(--border-main);
    }
    .vault-table th {
      padding: 10px 16px;
      font-size: 10px; font-weight: 700;
      color: var(--text-tertiary);
      text-transform: uppercase; letter-spacing: 0.6px;
    }
    .vault-table-panel .vault-table { display: block; overflow-y: auto; height: 100%; }
    .vault-table thead, .vault-table tbody { display: table; width: 100%; table-layout: fixed; }
    .vault-row {
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.15s;
    }
    .vault-row:last-child { border-bottom: none; }
    .vault-row:hover { background: var(--bg-hover); }
    .vault-table td { padding: 11px 16px; vertical-align: middle; }

    .vault-cred-name-cell {
      display: flex; align-items: center; gap: 10px;
    }
    .vault-cred-icon {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .vault-cred-name {
      font-size: 13px; font-weight: 600; color: var(--text-primary);
    }

    .vault-type-badge {
      display: inline-flex; align-items: center;
      padding: 3px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      border: 1px solid;
    }

    .vault-secret-cell {
      display: flex; align-items: center; gap: 8px;
    }
    .vault-secret-value {
      font-family: var(--font-mono); font-size: 12px;
      color: var(--text-secondary);
      letter-spacing: 0.5px;
      min-width: 160px;
    }
    .vault-secret-actions {
      display: flex; gap: 2px; margin-left: 4px;
    }
    .vault-icon-btn {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; color: var(--text-tertiary);
      cursor: pointer; transition: all 0.15s;
    }
    .vault-icon-btn .material-symbols-outlined { font-size: 15px; }
    .vault-icon-btn:hover {
      background: var(--bg-active); border-color: var(--border-highlight);
      color: var(--text-primary);
    }
    .vault-icon-btn.vault-copied {
      color: #4ade80; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.08);
    }

    .vault-scope-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-tertiary);
      font-family: var(--font-mono); font-size: 10px;
      text-transform: lowercase;
    }

    .vault-td-actions { text-align: right; width: 56px; }
    .vault-delete-btn {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; color: var(--text-tertiary);
      cursor: pointer; transition: all 0.15s;
      margin-left: auto;
    }
    .vault-delete-btn .material-symbols-outlined { font-size: 15px; }
    .vault-delete-btn:hover {
      background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3);
      color: var(--accent-red);
    }

    /* Empty State */
    .vault-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 64px 24px; text-align: center;
    }
    .vault-empty-icon-wrap {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--bg-hover); border: 1px solid var(--border-main);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .vault-empty-icon { font-size: 28px; color: var(--text-tertiary); opacity: 0.6; }
    .vault-empty-title {
      font-size: 15px; font-weight: 600; color: var(--text-primary);
      margin: 0 0 6px;
    }
    .vault-empty-sub {
      font-size: 13px; color: var(--text-tertiary); margin: 0; max-width: 320px; line-height: 1.6;
    }
  `]
})
export class VaultComponent {
    public vaultStore = inject(VaultStore);

    showAddCredential = signal(false);
    newCredName = signal('');
    newCredType = signal<'login'|'api_key'|'ssh'|'db'|'note'>('login');
    newCredValue = signal('');
    newProjectId = signal('global');
    visibleCreds = signal<Set<string>>(new Set());
    copiedId = signal<string | null>(null);
    searchQuery = signal('');

    filteredCredentials = computed(() => {
        const q = this.searchQuery().toLowerCase();
        if (!q) return this.vaultStore.credentials();
        return this.vaultStore.credentials().filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.type.toLowerCase().includes(q) ||
            c.projectId?.toLowerCase().includes(q)
        );
    });

    typeStats = computed(() => {
        const creds = this.vaultStore.credentials();
        return Object.entries(TYPE_META)
            .map(([type, meta]) => ({
                type, ...meta,
                count: creds.filter(c => c.type === type).length
            }))
            .filter(e => e.count > 0);
    });

    getTypeMeta(type: string) {
        return TYPE_META[type] ?? TYPE_META['login'];
    }

    toggleForm() {
        this.showAddCredential.update(v => !v);
    }

    toggleCredVisibility(id: string) {
        const set = new Set(this.visibleCreds());
        if (set.has(id)) set.delete(id); else set.add(id);
        this.visibleCreds.set(set);
    }

    decryptCred(cipher: string): string {
        return EncryptionUtil.decrypt(cipher);
    }

    copyCred(id: string, cipher: string) {
        navigator.clipboard.writeText(this.decryptCred(cipher));
        this.copiedId.set(id);
        setTimeout(() => this.copiedId.set(null), 1800);
    }

    addCredential() {
        if (!this.newCredName() || !this.newCredValue() || !this.newProjectId()) return;

        this.vaultStore.addCredential({
            id: crypto.randomUUID(),
            name: this.newCredName(),
            type: this.newCredType(),
            projectId: this.newProjectId(),
            createdAt: new Date().toISOString(),
            createdBy: 'admin',
            unencryptedValue: this.newCredValue()
        });

        this.newCredName.set('');
        this.newCredValue.set('');
        this.newProjectId.set('global');
        this.showAddCredential.set(false);
    }
}
