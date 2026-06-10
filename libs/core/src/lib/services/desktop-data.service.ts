import { Injectable, inject, effect } from '@angular/core';
import { DataService } from '@envello/data';
import { Credential, Subscription, CredentialSubscriptionLink } from '@envello/domain';
import { SqliteDataService } from './sqlite-data.service';
import { DesktopBackupService } from './desktop-backup.service';
import { DesktopSyncSettingsService } from './desktop-sync-settings.service';
import { AuthService } from './auth.service';
import { SyncService, SyncRecord } from './sync.service';

const NEVER_SYNC = new Set(['credentials', 'credential_subscription_links', 'bin_items']);

@Injectable({ providedIn: 'root' })
export class DesktopDataService extends DataService {
  private readonly sqlite = inject(SqliteDataService);
  private readonly backup = inject(DesktopBackupService);
  private readonly settings = inject(DesktopSyncSettingsService);
  private readonly auth = inject(AuthService);
  private readonly syncService = inject(SyncService);

  private realtimeUnsub: (() => void) | null = null;
  private readonly manualSyncListener = () => {
    this.syncService.pull().then(records => this.applyRemoteRecords(records));
  };

  constructor() {
    super();
    window.addEventListener('envello:manual-sync', this.manualSyncListener);

    effect(() => {
      const user = this.auth.currentUser();
      const isGuest = this.auth.isGuest();

      this.realtimeUnsub?.();
      this.realtimeUnsub = null;

      if (user && !isGuest) {
        this.syncService.pull().then(records => this.applyRemoteRecords(records));
        this.realtimeUnsub = this.syncService.subscribeRealtime(record =>
          this.applyRemoteRecords([record])
        );
      }
    });
  }

  private async applyRemoteRecords(records: SyncRecord[]): Promise<void> {
    if (records.length === 0) return;
    for (const record of records) {
      if (NEVER_SYNC.has(record.collection)) continue;
      if (record.deleted) {
        await this.sqlite.remove(record.collection, record.id);
      } else {
        await this.sqlite.upsert(record.collection, record.data);
      }
    }
    window.dispatchEvent(new CustomEvent('envello:sync-complete'));
  }

  private shouldSync(collection: string): boolean {
    if (NEVER_SYNC.has(collection)) return false;
    if (!this.auth.currentUser() || this.auth.isGuest()) return false;
    if (collection === 'user_preferences') return true;
    return this.settings.isEnabled(collection);
  }

  override async pullFromRemote(collection: string): Promise<void> {
    await this.restoreCollection(collection);
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

  async restoreCollection(collection: string): Promise<number> {
    const items = await this.backup.pullCollection<any>(collection);
    for (const item of items) {
      await this.sqlite.upsert(collection, item);
    }
    if (items.length > 0) {
      window.dispatchEvent(new CustomEvent('envello:sync-complete'));
    }
    return items.length;
  }

  // ─── Vault ───────────────────────────────────────────────────────────────────

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
