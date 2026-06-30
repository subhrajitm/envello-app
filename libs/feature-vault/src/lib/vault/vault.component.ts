import { Component, inject, signal, computed, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VaultStore } from '@envello/state';
import { AiService, VaultUnlockService, ContextService } from '@envello/core';
import { Credential } from '@envello/domain';
import { VaultUnlockComponent } from '../vault-unlock/vault-unlock.component';
import { AiAssistantPanelComponent, AiPanelMessage, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, SliderPanelComponent } from '@envello/ui';
import type { EnvTableColumn, EnvTableAction, EnvTableSortEvent, EnvTableActionEvent } from '@envello/ui';

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
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent, TableComponent, ConfirmDialogComponent, FeatureSidebarComponent, SliderPanelComponent, VaultUnlockComponent],
  templateUrl: './vault.component.html',
  styleUrl: './vault.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VaultComponent {
  public vaultStore = inject(VaultStore);
  private aiService = inject(AiService);
  private contextService = inject(ContextService);
  readonly vaultUnlock = inject(VaultUnlockService);

  readonly isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  readonly showUnlock = computed(() => !this.isTauri && !this.vaultUnlock.isUnlocked());

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
  visibleCreds      = signal<Set<string>>(new Set());
  decryptedSecrets  = signal<Map<string, string>>(new Map());
  decryptingId      = signal<string | null>(null);
  decryptErrors     = signal<Set<string>>(new Set());
  copiedId          = signal<string | null>(null);
  clipboardCleared  = signal(false);
  deleteConfirmId   = signal<string | null>(null);
  bulkDeleteConfirm = signal<string[] | null>(null);
  saveError         = signal<string | null>(null);
  saving            = signal(false);
  private hideTimers      = new Map<string, ReturnType<typeof setTimeout>>();
  private clipboardTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

  readonly sidebarNavItems = computed(() => [
    { id: '', icon: 'lock', label: 'All Credentials', count: this.vaultStore.credentials().length },
    ...this.allTypeStats().map(e => ({ id: e.type, icon: e.icon, iconColor: e.color, label: e.label, count: e.count }))
  ]);

  onNavItemClick(id: string) {
    this.selectedType.set(id);
  }

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

  // ── Table config ─────────────────────────────────────────────────────────
  readonly tableColumns: EnvTableColumn[] = [
    { key: 'name',     header: 'Credential', sortable: true },
    { key: 'type',     header: 'Type',       type: 'badge', sortable: true,
      badgeMap: {
        login:   { label: 'Login',       dotColor: '#22c55e', bgColor: 'rgba(22,163,74,0.1)',   textColor: '#16a34a'  },
        api_key: { label: 'API Key',     dotColor: '#60a5fa', bgColor: 'rgba(37,99,235,0.1)',   textColor: '#2563eb'  },
        ssh:     { label: 'SSH',         dotColor: '#a855f7', bgColor: 'rgba(109,40,217,0.1)',  textColor: '#7c3aed'  },
        db:      { label: 'Database',    dotColor: '#fb923c', bgColor: 'rgba(194,65,12,0.1)',   textColor: '#c2410c'  },
        note:    { label: 'Secure Note', dotColor: '#f59e0b', bgColor: 'rgba(180,83,9,0.1)',    textColor: '#b45309'  },
      }
    },
    { key: 'username', header: 'Username' },
    { key: 'secret',   header: 'Secret' },
    { key: 'scope',    header: 'Scope' },
    { key: 'date',     header: 'Date', sortable: true },
  ];

  readonly tableActions: EnvTableAction[] = [
    { key: 'toggleVisibility', label: 'Show / Hide',  icon: 'visibility'    },
    { key: 'copy',             label: 'Copy Secret',  icon: 'content_copy', bulk: false },
    { key: 'edit',             label: 'Edit',         icon: 'edit',         bulk: false },
    { key: 'delete',           label: 'Delete',       icon: 'delete', danger: true },
  ];

  tableRows = computed(() => {
    const visible  = this.visibleCreds();
    const secrets  = this.decryptedSecrets();
    const loading  = this.decryptingId();
    const errors   = this.decryptErrors();
    const copied   = this.copiedId();
    return this.filteredCredentials().map(cred => {
      let secret: string;
      if (loading === cred.id) {
        secret = 'Decrypting…';
      } else if (errors.has(cred.id)) {
        secret = '⚠ Decryption error';
      } else if (visible.has(cred.id)) {
        secret = secrets.get(cred.id) ?? '…';
      } else if (copied === cred.id) {
        secret = '✓ Copied!';
      } else {
        secret = '•  •  •  •  •  •  •  •';
      }
      return {
        id:       cred.id,
        name:     cred.name,
        type:     cred.type,
        username: cred.username || '—',
        secret,
        scope:    cred.projectId || 'global',
        date:     this.formatDate(cred.lastAccessedAt || cred.createdAt),
        _cred:    cred,
      };
    });
  });

  handleTableAction(event: EnvTableActionEvent) {
    const cred = event.row['_cred'] as Credential | undefined;
    if (!cred) return;
    switch (event.actionKey) {
      case 'toggleVisibility': this.toggleCredVisibility(cred.id); break;
      case 'copy':             this.copyCred(cred.id, cred.value); break;
      case 'edit':             this.openEditForm(cred); break;
      case 'delete':           this.deleteConfirmId.set(cred.id); break;
    }
  }

  handleBulkAction(event: { selectedIds: Set<unknown>; actionKey: string }) {
    const { selectedIds, actionKey } = event;
    const affected = this.filteredCredentials().filter(c => selectedIds.has(c.id));
    switch (actionKey) {
      case 'toggleVisibility':
        affected.forEach(c => this.toggleCredVisibility(c.id));
        break;
      case 'delete':
        this.bulkDeleteConfirm.set(affected.map(c => c.id));
        break;
    }
  }

  handleTableSort(event: EnvTableSortEvent) {
    const colMap: Record<string, 'name' | 'type' | 'createdAt'> = {
      name: 'name', type: 'type', date: 'createdAt',
    };
    const col = colMap[event.key];
    if (col) {
      this.sortCol.set(col);
      this.sortDir.set(event.direction);
    }
  }

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

  async addCredential() {
    if (!this.newCredName() || !this.newCredValue() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.vaultStore.addCredential({
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
    } catch (e: any) {
      this.saveError.set(e?.message ?? 'Failed to save credential.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id || !this.editName() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.vaultStore.updateCredential(id, {
        name: this.editName(),
        type: this.editType(),
        username: this.editUsername() || undefined,
        url: this.editUrl() || undefined,
        notes: this.editNotes() || undefined,
        projectId: this.editProjectId() || 'global',
        ...(this.editValue() ? { newUnencryptedValue: this.editValue() } : {}),
      });
      this.closeForm();
    } catch (e: any) {
      this.saveError.set(e?.message ?? 'Failed to save credential.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  confirmDelete(id: string) {
    this.vaultStore.deleteCredential(id);
    this.deleteConfirmId.set(null);
    if (this.editingId() === id) this.closeForm();
  }

  confirmBulkDelete() {
    const ids = this.bulkDeleteConfirm();
    if (ids) ids.forEach(id => this.vaultStore.deleteCredential(id));
    this.bulkDeleteConfirm.set(null);
  }

  // ── Visibility & copy ────────────────────────────────────────────────────
  async toggleCredVisibility(id: string) {
    const set = new Set(this.visibleCreds());
    if (set.has(id)) {
      set.delete(id);
      clearTimeout(this.hideTimers.get(id));
      this.hideTimers.delete(id);
      const secrets = new Map(this.decryptedSecrets());
      secrets.delete(id);
      this.decryptedSecrets.set(secrets);
      this.visibleCreds.set(set);
    } else {
      this.decryptingId.set(id);
      this.vaultStore.touchCredential(id);
      const cred = this.vaultStore.credentials().find(c => c.id === id);
      if (cred) {
        try {
          const plain = await this.vaultStore.decryptValue(cred.value);
          const secrets = new Map(this.decryptedSecrets());
          secrets.set(id, plain);
          this.decryptedSecrets.set(secrets);
          const errSet = new Set(this.decryptErrors());
          errSet.delete(id);
          this.decryptErrors.set(errSet);
          set.add(id);
          const timer = setTimeout(() => {
            const next = new Set(this.visibleCreds());
            next.delete(id);
            this.visibleCreds.set(next);
            this.hideTimers.delete(id);
            const s = new Map(this.decryptedSecrets());
            s.delete(id);
            this.decryptedSecrets.set(s);
          }, 30_000);
          this.hideTimers.set(id, timer);
        } catch {
          const errSet = new Set(this.decryptErrors());
          errSet.add(id);
          this.decryptErrors.set(errSet);
          setTimeout(() => {
            const e = new Set(this.decryptErrors());
            e.delete(id);
            this.decryptErrors.set(e);
          }, 3_000);
        }
      }
      this.decryptingId.set(null);
      this.visibleCreds.set(set);
    }
  }

  async copyCred(id: string, cipher: string) {
    const plain = await this.vaultStore.decryptValue(cipher);
    await navigator.clipboard.writeText(plain);
    this.copiedId.set(id);
    this.vaultStore.touchCredential(id);
    setTimeout(() => this.copiedId.set(null), 1800);
    // Auto-clear clipboard after 30s and show brief notification
    clearTimeout(this.clipboardTimers.get(id));
    const t = setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {});
      this.clipboardTimers.delete(id);
      this.clipboardCleared.set(true);
      setTimeout(() => this.clipboardCleared.set(false), 2500);
    }, 30_000);
    this.clipboardTimers.set(id, t);
  }

  // ── AI Assistant ─────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    try {
      const creds = this.vaultStore.credentials();
      // Never send secret values — metadata only
      const credList = creds.map(c =>
        `- [${TYPE_META[c.type]?.label ?? c.type}] ${c.name}${c.url ? ` (${c.url})` : ''}${c.lastAccessedAt ? ` | last accessed: ${this.formatDate(c.lastAccessedAt)}` : ' | never accessed'}${c.notes ? ' | has notes' : ''}`
      ).join('\n');
      const byType = Object.entries(TYPE_META).map(([type, m]) => {
        const n = creds.filter(c => c.type === type).length;
        return `${m.label}: ${n}`;
      }).join(', ');
      const context = [
        'You are a vault assistant for the Envello productivity app. You help users manage their stored credentials.',
        'IMPORTANT: You only have access to credential metadata (name, type, URL, last accessed). You do NOT have access to passwords, keys, or secret values — never generate or suggest actual secret values.',
        `The user has ${creds.length} credential${creds.length !== 1 ? 's' : ''} stored. Breakdown: ${byType}.`,
        creds.length ? `Credential metadata:\n${credList}` : 'No credentials stored yet.',
        'You can help identify stale/unaccessed credentials, find missing URLs, summarize coverage by type, or give security hygiene advice. Be concise, use markdown lists.',
      ].join('\n');
      const crossCtx = await this.contextService.buildContext(text);
      const fullContext = crossCtx.blocks.length ? `${context}\n\n--- Cross-module context ---\n${crossCtx.formatted}` : context;
      const aiResponse = await this.aiService.sendMessage(text, fullContext);
      const response = aiResponse || this.vaultFallback(text, creds);
      this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    } catch {
      const creds = this.vaultStore.credentials();
      this.aiMessages.update(m => [...m, { role: 'assistant', text: this.vaultFallback(text, creds) }]);
    } finally {
      this.aiLoading.set(false);
    }
  }

  private vaultFallback(text: string, creds: Credential[]): string {
    const q = text.toLowerCase();
    if (q.includes('how many') || q.includes('count') || q.includes('stored')) {
      const byType = Object.entries(TYPE_META).map(([type, m]) => {
        const n = creds.filter(c => c.type === type).length;
        return n > 0 ? `${m.label}: ${n}` : null;
      }).filter(Boolean);
      return `You have **${creds.length}** credential${creds.length !== 1 ? 's' : ''} stored.\n${byType.join('\n')}`;
    }
    if (q.includes('recent') || q.includes('accessed')) {
      const recent = [...creds]
        .filter(c => c.lastAccessedAt)
        .sort((a, b) => (b.lastAccessedAt ?? '').localeCompare(a.lastAccessedAt ?? ''))
        .slice(0, 5);
      return recent.length
        ? `Recently accessed:\n${recent.map((c, i) => `${i + 1}. ${c.name} — ${this.formatDate(c.lastAccessedAt!)}`).join('\n')}`
        : `No credentials accessed yet.`;
    }
    if (q.includes('api key') || q.includes('api_key')) {
      const keys = creds.filter(c => c.type === 'api_key');
      return keys.length
        ? `You have ${keys.length} API key${keys.length !== 1 ? 's' : ''}: ${keys.map(c => c.name).join(', ')}.`
        : `No API keys stored yet.`;
    }
    if (q.includes('no url') || q.includes('without url') || q.includes('missing url')) {
      const noUrl = creds.filter(c => !c.url);
      return noUrl.length
        ? `${noUrl.length} credential${noUrl.length !== 1 ? 's have' : ' has'} no URL: ${noUrl.slice(0, 5).map(c => c.name).join(', ')}${noUrl.length > 5 ? ` and ${noUrl.length - 5} more` : ''}.`
        : `All credentials have a URL set.`;
    }
    if (q.includes('breakdown') || q.includes('type')) {
      const lines = Object.entries(TYPE_META).map(([type, m]) => `${m.label}: ${creds.filter(c => c.type === type).length}`);
      return `Credentials by type:\n${lines.join('\n')}`;
    }
    return `You have ${creds.length} credential${creds.length !== 1 ? 's' : ''} in the vault. AI is unavailable — check Settings to configure a provider.`;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.formMode() === null) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeForm();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        event.preventDefault();
        if (this.formMode() === 'edit') this.saveEdit();
        else this.addCredential();
      }
    }
  }

  // ── Dynamic scope sidebar ─────────────────────────────────────────────────
  scopeOptions = computed(() =>
    Object.entries(this.countByScope()).map(([scope, count]) => ({ scope, count }))
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTypeMeta(type: string) { return TYPE_META[type] ?? TYPE_META['login']; }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
