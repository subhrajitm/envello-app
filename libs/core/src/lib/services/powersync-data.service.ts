import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { Credential, Subscription, CredentialSubscriptionLink } from '@envello/domain';
import { PowerSyncService } from './powersync.service';
import { WorkspaceProfileService } from './workspace-profile.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PowerSyncDataService implements DataService {
  private readonly ps = inject(PowerSyncService);
  private readonly profileService = inject(WorkspaceProfileService);
  private readonly auth = inject(AuthService);

  /**
   * Always live in the 'default' profile namespace so they are accessible
   * regardless of which workspace is active.
   */
  private readonly GLOBAL_COLLECTIONS = new Set([
    'projects',
    'note_folders',
    'subscriptions',
    'user_preferences',
  ]);

  /** Never synced — stored in the local-only `local_vault` table. */
  private readonly VAULT_COLLECTIONS = new Set([
    'credentials',
    'credential_subscription_links',
  ]);

  private get userId(): string {
    return this.auth.currentUser()?.id ?? 'guest';
  }

  // ─── Public DataService API ──────────────────────────────────────────────────

  async getAll<T>(collection: string): Promise<T[]> {
    if (this.VAULT_COLLECTIONS.has(collection)) {
      return this.getVaultAll<T>(collection);
    }

    try {
      const activeId = this.profileService.activeProfileId() || 'default';
      const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);

      let rows: Array<{ data: string }>;

      if (!isGlobal && activeId === 'default') {
        // "All Projects" mode — aggregate across every profile
        rows = await this.ps.db.getAll<{ data: string }>(
          'SELECT data FROM user_data WHERE collection = ? AND deleted = 0',
          [collection]
        );
      } else {
        const profileId = isGlobal ? 'default' : activeId;
        rows = await this.ps.db.getAll<{ data: string }>(
          'SELECT data FROM user_data WHERE collection = ? AND profile_id = ? AND deleted = 0',
          [collection, profileId]
        );
      }

      const seen = new Set<string>();
      const result: T[] = [];
      for (const row of rows) {
        try {
          const item = JSON.parse(row.data) as T;
          const id = (item as any).id;
          if (id && !seen.has(id)) {
            seen.add(id);
            result.push(item);
          }
        } catch { /* skip malformed row */ }
      }
      return result;
    } catch (e) {
      console.error(`[PowerSyncDataService] getAll failed for ${collection}`, e);
      return [];
    }
  }

  async upsert<T>(collection: string, item: T): Promise<void> {
    if (this.VAULT_COLLECTIONS.has(collection)) {
      return this.upsertVault(collection, item);
    }

    try {
      const id = (item as any).id as string;
      if (!id) return;

      const activeId = this.profileService.activeProfileId() || 'default';
      const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);

      let profileId: string;

      if (!isGlobal && activeId === 'default') {
        // Preserve the owning profile of an existing record; new items go to default
        const existing = await this.ps.db.getOptional<{ profile_id: string }>(
          'SELECT profile_id FROM user_data WHERE id = ? AND collection = ? LIMIT 1',
          [id, collection]
        );
        profileId = existing?.profile_id ?? 'default';
      } else {
        profileId = isGlobal ? 'default' : activeId;
      }

      await this.ps.db.execute(
        `INSERT OR REPLACE INTO user_data
           (id, user_id, profile_id, collection, data, deleted, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [id, this.userId, profileId, collection, JSON.stringify(item), new Date().toISOString()]
      );
    } catch (e) {
      console.error(`[PowerSyncDataService] upsert failed for ${collection}`, e);
    }
  }

  async remove(collection: string, id: string): Promise<void> {
    if (this.VAULT_COLLECTIONS.has(collection)) {
      return this.removeVault(collection, id);
    }

    try {
      await this.ps.db.execute(
        'DELETE FROM user_data WHERE id = ? AND collection = ?',
        [id, collection]
      );
    } catch (e) {
      console.error(`[PowerSyncDataService] remove failed for ${collection}`, e);
    }
  }

  async importData(data: any): Promise<void> {
    console.log('[PowerSyncDataService] importData', data);
  }

  async pullFromRemote(_: string): Promise<void> {}

  // ─── Local Vault helpers (credentials — never leave the device) ──────────────

  private async getVaultAll<T>(type: string): Promise<T[]> {
    try {
      const rows = await this.ps.db.getAll<{ data: string }>(
        'SELECT data FROM local_vault WHERE type = ?',
        [type]
      );
      return rows
        .map(r => { try { return JSON.parse(r.data) as T; } catch { return null as any; } })
        .filter(Boolean);
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
      await this.ps.db.execute(
        'DELETE FROM local_vault WHERE id = ? AND type = ?',
        [id, type]
      );
    } catch (e) {
      console.error(`[PowerSyncDataService] removeVault failed for ${type}`, e);
    }
  }

  // ─── Vault & Subscriptions ───────────────────────────────────────────────────

  async saveCredential(c: Credential): Promise<void>              { return this.upsert('credentials', c); }
  async getCredentials(): Promise<Credential[]>                   { return this.getAll<Credential>('credentials'); }
  async deleteCredential(id: string): Promise<void>               { return this.remove('credentials', id); }

  async saveSubscription(s: Subscription): Promise<void>          { return this.upsert('subscriptions', s); }
  async getSubscriptions(): Promise<Subscription[]>               { return this.getAll<Subscription>('subscriptions'); }
  async deleteSubscription(id: string): Promise<void>             { return this.remove('subscriptions', id); }

  async saveLink(l: CredentialSubscriptionLink): Promise<void>    { return this.upsert('credential_subscription_links', l); }
  async getLinks(): Promise<CredentialSubscriptionLink[]>         { return this.getAll<CredentialSubscriptionLink>('credential_subscription_links'); }
  async deleteLink(id: string): Promise<void>                     { return this.remove('credential_subscription_links', id); }
}
