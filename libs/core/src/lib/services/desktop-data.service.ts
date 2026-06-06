import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { Credential, Subscription, CredentialSubscriptionLink } from '@envello/domain';
import { SqliteDataService } from './sqlite-data.service';
import { DesktopBackupService } from './desktop-backup.service';
import { DesktopSyncSettingsService } from './desktop-sync-settings.service';
import { AuthService } from './auth.service';

const NEVER_SYNC = new Set(['credentials', 'credential_subscription_links', 'bin_items']);

@Injectable({ providedIn: 'root' })
export class DesktopDataService extends DataService {
  private readonly sqlite = inject(SqliteDataService);
  private readonly backup = inject(DesktopBackupService);
  private readonly settings = inject(DesktopSyncSettingsService);
  private readonly auth = inject(AuthService);

  private shouldSync(collection: string): boolean {
    return (
      !NEVER_SYNC.has(collection) &&
      !!this.auth.currentUser() &&
      !this.auth.isGuest() &&
      this.settings.isEnabled(collection)
    );
  }

  async getAll<T>(collection: string): Promise<T[]> {
    return this.sqlite.getAll<T>(collection);
  }

  async upsert<T>(collection: string, item: T): Promise<void> {
    await this.sqlite.upsert(collection, item);
    if (this.shouldSync(collection)) {
      this.backup.push(collection, item).catch(() => {});
    }
  }

  async remove(collection: string, id: string): Promise<void> {
    await this.sqlite.remove(collection, id);
    if (this.shouldSync(collection)) {
      this.backup.softDelete(collection, id).catch(() => {});
    }
  }

  async importData(data: any): Promise<void> {
    return this.sqlite.importData(data);
  }

  /**
   * Pull one collection from Supabase and upsert every item into local SQLite.
   * Used for the "Restore from backup" action. Returns the count of restored items.
   */
  async restoreCollection(collection: string): Promise<number> {
    const items = await this.backup.pullCollection<any>(collection);
    for (const item of items) {
      await this.sqlite.upsert(collection, item);
    }
    return items.length;
  }

  // ─── Vault ───────────────────────────────────────────────────────────────────
  // Credentials and links are never synced — always local-only.

  async saveCredential(c: Credential): Promise<void>              { return this.sqlite.saveCredential(c); }
  async getCredentials(): Promise<Credential[]>                   { return this.sqlite.getCredentials(); }
  async deleteCredential(id: string): Promise<void>               { return this.sqlite.deleteCredential(id); }

  async saveSubscription(s: Subscription): Promise<void>          { return this.upsert('subscriptions', s as any); }
  async getSubscriptions(): Promise<Subscription[]>               { return this.sqlite.getSubscriptions(); }
  async deleteSubscription(id: string): Promise<void>             { return this.remove('subscriptions', id); }

  async saveLink(l: CredentialSubscriptionLink): Promise<void>    { return this.sqlite.saveLink(l); }
  async getLinks(): Promise<CredentialSubscriptionLink[]>         { return this.sqlite.getLinks(); }
  async deleteLink(id: string): Promise<void>                     { return this.sqlite.deleteLink(id); }
}
