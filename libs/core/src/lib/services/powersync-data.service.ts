import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { Credential, Transaction, CredentialTransactionLink } from '@envello/domain';
import { PowerSyncService } from './powersync.service';
import { WorkspaceProfileService } from './workspace-profile.service';
import { AuthService } from './auth.service';
import { LoggingService } from './logging.service';
import { JSON_FIELDS, BOOL_FIELDS, TYPED_TABLES } from '../config/powersync.schema';

@Injectable({ providedIn: 'root' })
export class PowerSyncDataService implements DataService {
  private readonly ps = inject(PowerSyncService);
  private readonly profileService = inject(WorkspaceProfileService);
  private readonly auth = inject(AuthService);
  private readonly logging = inject(LoggingService);

  private readonly GLOBAL_COLLECTIONS = new Set([
    'projects', 'note_folders', 'transactions', 'user_preferences',
  ]);

  private readonly VAULT_COLLECTIONS = new Set([
    'credentials', 'credential_transaction_links',
  ]);

  /** Collections declared localOnly:true in the PowerSync schema — never written to user_data. */
  private readonly LOCAL_ONLY_COLLECTIONS = new Set([
    'note_history', 'chapter_history',
  ]);

  private get userId(): string {
    return this.auth.currentUser()?.id ?? 'guest';
  }

  // ─── Collection name guard ───────────────────────────────────────────────────

  /** Validates collection name against known table whitelist to prevent SQL injection. */
  private assertSafeCollection(collection: string): void {
    if (!TYPED_TABLES.has(collection) && !this.VAULT_COLLECTIONS.has(collection)) {
      throw new Error(`[PowerSyncDataService] Unknown collection: "${collection}"`);
    }
  }

  // ─── Row parsing ─────────────────────────────────────────────────────────────

  private parseRow<T>(collection: string, row: any): T {
    const result: any = { ...row };
    for (const f of JSON_FIELDS[collection] ?? []) {
      if (typeof result[f] === 'string' && result[f]) {
        try { result[f] = JSON.parse(result[f]); } catch { result[f] = null; }
      }
    }
    for (const f of BOOL_FIELDS[collection] ?? []) {
      if (result[f] !== undefined && result[f] !== null) {
        result[f] = result[f] === 1 || result[f] === true;
      }
    }
    return result as T;
  }

  /** Serialize a domain item to typed column values for INSERT OR REPLACE. */
  private itemToColumns(collection: string, profileId: string, item: any): { cols: string[]; vals: any[] } {
    const jsonFields = new Set(JSON_FIELDS[collection] ?? []);
    const boolFields = new Set(BOOL_FIELDS[collection] ?? []);
    const cols: string[] = ['profile_id'];
    const vals: any[] = [profileId];

    for (const [key, val] of Object.entries(item)) {
      if (key === 'id') continue;
      cols.push(key);
      if (val === null || val === undefined) {
        vals.push(null);
      } else if (jsonFields.has(key) || (Array.isArray(val)) || (typeof val === 'object')) {
        vals.push(JSON.stringify(val));
      } else if (boolFields.has(key)) {
        vals.push(val ? 1 : 0);
      } else {
        vals.push(val);
      }
    }
    return { cols, vals };
  }

  // ─── Public DataService API ──────────────────────────────────────────────────

  async getAll<T>(collection: string): Promise<T[]> {
    this.assertSafeCollection(collection);
    if (this.VAULT_COLLECTIONS.has(collection)) return this.getVaultAll<T>(collection);

    try {
      const activeId = this.profileService.activeProfileId() || 'default';
      const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);

      // Notes need a stable ORDER BY so loadFromDb always returns the same
      // sequence after SQLite B-tree reorganisation from UPSERTs. Without ORDER BY,
      // notes jump between loadFromDb calls, breaking the manual-sort "rest" pool.
      // Tasks use `due` not `date`, so they get their own clause.
      const orderClause = collection === 'notes'
        ? ' ORDER BY date DESC, id DESC'
        : collection === 'tasks'
          ? ' ORDER BY id DESC'
          : '';

      let rows: any[];
      if (!isGlobal && activeId === 'default') {
        rows = await this.ps.db.getAll(`SELECT * FROM ${collection}${orderClause}`, []);
      } else {
        const profileId = isGlobal ? 'default' : activeId;
        rows = await this.ps.db.getAll(
          `SELECT * FROM ${collection} WHERE profile_id = ? OR profile_id IS NULL${orderClause}`,
          [profileId]
        );
      }

      const seen = new Set<string>();
      return rows
        .filter(r => { const id = r.id; if (!id || seen.has(id)) return false; seen.add(id); return true; })
        .map(r => this.parseRow<T>(collection, r));
    } catch (e) {
      console.error(`[PowerSyncDataService] getAll failed for ${collection}`, e);
      return [];
    }
  }

  async upsert<T>(collection: string, item: T): Promise<void> {
    this.assertSafeCollection(collection);
    if (this.VAULT_COLLECTIONS.has(collection)) return this.upsertVault(collection, item);

    try {
      const id = (item as any).id as string;
      if (!id) return;

      const activeId = this.profileService.activeProfileId() || 'default';
      const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
      let profileId: string;

      if (!isGlobal && activeId === 'default') {
        const existing = await this.ps.db.getOptional<{ profile_id: string }>(
          `SELECT profile_id FROM ${collection} WHERE id = ? LIMIT 1`, [id]
        );
        profileId = existing?.profile_id ?? 'default';
      } else {
        profileId = isGlobal ? 'default' : activeId;
      }

      // 1. Write to user_data for PowerSync sync upload (skip localOnly collections)
      if (!this.LOCAL_ONLY_COLLECTIONS.has(collection)) {
        await this.ps.db.execute(
          `INSERT OR REPLACE INTO user_data (id, user_id, profile_id, collection, data, deleted, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, ?)`,
          [id, this.userId, profileId, collection, JSON.stringify(item), new Date().toISOString()]
        );
      }

      // 2. Write to typed table for fast local reads
      await this.upsertToTypedTable(collection, profileId, item);
    } catch (e) {
      console.error(`[PowerSyncDataService] upsert failed for ${collection}`, e);
    }
  }

  async remove(collection: string, id: string): Promise<void> {
    this.assertSafeCollection(collection);
    if (this.VAULT_COLLECTIONS.has(collection)) return this.removeVault(collection, id);

    try {
      // Mark deleted in user_data for sync (skip localOnly collections)
      if (!this.LOCAL_ONLY_COLLECTIONS.has(collection)) {
        const activeId = this.profileService.activeProfileId() || 'default';
        const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
        const profileId = isGlobal ? 'default' : activeId;
        await this.ps.db.execute(
          `INSERT OR REPLACE INTO user_data (id, user_id, profile_id, collection, data, deleted, updated_at)
           VALUES (?, ?, ?, ?, '{}', 1, ?)`,
          [id, this.userId, profileId, collection, new Date().toISOString()]
        );
      }
      // Remove from typed table
      await this.ps.db.execute(`DELETE FROM ${collection} WHERE id = ?`, [id]);
    } catch (e) {
      console.error(`[PowerSyncDataService] remove failed for ${collection}`, e);
    }
  }

  async importData(data: any): Promise<void> {
    this.logging.info('[PowerSyncDataService] importData');
  }

  async pullFromRemote(_: string): Promise<void> {}

  // ─── Typed table helpers ─────────────────────────────────────────────────────

  /** Write a single item into its typed local table. */
  async upsertToTypedTable(collection: string, profileId: string, item: any): Promise<void> {
    if (!TYPED_TABLES.has(collection)) return; // guard: skip vault and unknown collections
    const id = item?.id;
    if (!id) return;
    const { cols, vals } = this.itemToColumns(collection, profileId, item);
    const placeholders = cols.map(() => '?').join(', ');
    await this.ps.db.execute(
      `INSERT OR REPLACE INTO ${collection} (id, ${cols.join(', ')}) VALUES (?, ${placeholders})`,
      [id, ...vals]
    );
  }

  /**
   * Repopulate all typed tables from the current user_data contents.
   * Called once on first sync and after PowerSync delivers a batch.
   */
  async rebuildTypedTablesFromUserData(): Promise<void> {
    try {
      const rows = await this.ps.db.getAll<{ id: string; profile_id: string; collection: string; data: string; deleted: number }>(
        'SELECT id, profile_id, collection, data, deleted FROM user_data', []
      );
      for (const row of rows) {
        if (!TYPED_TABLES.has(row.collection)) continue; // skip vault + unknown collections
        if (row.deleted) {
          await this.ps.db.execute(`DELETE FROM ${row.collection} WHERE id = ?`, [row.id]).catch(() => {});
          continue;
        }
        try {
          const item = JSON.parse(row.data);
          await this.upsertToTypedTable(row.collection, row.profile_id, item).catch(() => {});
        } catch { /* skip malformed */ }
      }
    } catch (e) {
      console.error('[PowerSyncDataService] rebuildTypedTables failed', e);
    }
  }

  // ─── Local Vault helpers ─────────────────────────────────────────────────────

  private async getVaultAll<T>(type: string): Promise<T[]> {
    try {
      const rows = await this.ps.db.getAll<{ data: string }>(
        'SELECT data FROM local_vault WHERE type = ?', [type]
      );
      return rows.map(r => { try { return JSON.parse(r.data) as T; } catch { return null as any; } }).filter(Boolean);
    } catch (e) {
      console.error(`[PowerSyncDataService] getVaultAll failed for ${type}`, e);
      return [];
    }
  }

  private async upsertVault<T>(type: string, item: T): Promise<void> {
    const id = (item as any).id as string;
    if (!id) return;
    try {
      await this.ps.db.execute(
        'INSERT OR REPLACE INTO local_vault (id, type, data) VALUES (?, ?, ?)',
        [id, type, JSON.stringify(item)]
      );
    } catch (e) {
      console.error(`[PowerSyncDataService] upsertVault failed for ${type}`, e);
    }
  }

  private async removeVault(type: string, id: string): Promise<void> {
    try {
      await this.ps.db.execute('DELETE FROM local_vault WHERE id = ? AND type = ?', [id, type]);
    } catch (e) {
      console.error(`[PowerSyncDataService] removeVault failed for ${type}`, e);
    }
  }

  // ─── Vault & Transactions ────────────────────────────────────────────────────

  async saveCredential(c: Credential): Promise<void>          { return this.upsert('credentials', c); }
  async getCredentials(): Promise<Credential[]>               { return this.getAll<Credential>('credentials'); }
  async deleteCredential(id: string): Promise<void>           { return this.remove('credentials', id); }

  async saveTransaction(t: Transaction): Promise<void>        { return this.upsert('transactions', t); }
  async getTransactions(): Promise<Transaction[]>             { return this.getAll<Transaction>('transactions'); }
  async deleteTransaction(id: string): Promise<void>          { return this.remove('transactions', id); }

  async saveLink(l: CredentialTransactionLink): Promise<void> { return this.upsert('credential_transaction_links', l); }
  async getLinks(): Promise<CredentialTransactionLink[]>      { return this.getAll<CredentialTransactionLink>('credential_transaction_links'); }
  async deleteLink(id: string): Promise<void>                 { return this.remove('credential_transaction_links', id); }
}
