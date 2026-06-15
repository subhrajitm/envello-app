import { Injectable, inject, effect } from '@angular/core';
import { WorkspaceProfileService } from './workspace-profile.service';
import { AuthService } from './auth.service';
import { SyncService } from './sync.service';
import { LoggingService } from './logging.service';
import { DataService } from '@envello/data';
import { Credential, Transaction, CredentialTransactionLink } from '@envello/domain';
import PouchDB from 'pouchdb';

@Injectable({
    providedIn: 'root'
})
export class PouchDbDataService implements DataService {
    private dbs: Record<string, PouchDB.Database> = {};
    private profileService = inject(WorkspaceProfileService);
    private authService = inject(AuthService);
    private syncService = inject(SyncService);
    private logging = inject(LoggingService);

    /**
     * Collections that always live in the default namespace so they are visible
     * from every workspace context. Vault collections are also global so
     * credentials/transactions are accessible regardless of active project.
     */
    private readonly GLOBAL_COLLECTIONS = new Set([
        'projects',
        'note_folders',
        'credentials',
        'transactions',
        'credential_transaction_links',
        'user_preferences',
    ]);

    /**
     * Collections that must never be pushed to or pulled from Supabase.
     * Vault credentials are encrypted locally with a per-device key that does
     * not travel to the server, so syncing them would expose unusable ciphertext
     * and break decryption on other devices.
     */
    private readonly SYNC_EXCLUDED_COLLECTIONS = new Set([
        'credentials',
        'credential_transaction_links',
    ]);

    /** Set to true while applying pulled records to prevent re-triggering sync push. */
    private applyingSync = false;
    /** Only pull once per app session. */
    private hasPulled = false;
    /** Cleanup function returned by subscribeRealtime. */
    private unsubscribeRealtime?: () => void;

    constructor() {
        // Trigger a pull + realtime subscription the first time a user is authenticated.
        effect(() => {
            const user = this.authService.currentUser();
            if (user && !this.hasPulled) {
                this.hasPulled = true;
                this.migrateResearchCollections().then(() => this.pullAndApply()).then(() => {
                    this.unsubscribeRealtime = this.syncService.subscribeRealtime(
                        async (record) => {
                            this.applyingSync = true;
                            try {
                                if (this.SYNC_EXCLUDED_COLLECTIONS.has(record.collection)) return;
                                if (record.deleted) {
                                    await this.removeFromProfile(record.collection, record.profile_id, record.id);
                                } else if (record.data?.id) {
                                    await this.upsertToProfile(record.collection, record.profile_id, record.data);
                                }
                                window.dispatchEvent(new CustomEvent('envello:sync-complete'));
                            } finally {
                                this.applyingSync = false;
                            }
                        },
                        // On WebSocket reconnect: pull to catch events missed while disconnected
                        () => this.pullAndApply()
                    );
                });
            }
            // Unsubscribe on logout and clear the sync cursor so a different
            // user logging in on this device starts with a clean pull.
            if (!user && this.unsubscribeRealtime) {
                this.unsubscribeRealtime();
                this.unsubscribeRealtime = undefined;
                this.hasPulled = false;
                this.syncService.clearSyncCursor(this.authService.currentUser()?.id ?? '');
            }
        });
    }

    // ─── One-Time Migrations ─────────────────────────────────────────────────────

    /** Copies data from the old research_libraries IndexedDB to research_collections, then destroys the old DB. */
    private async migrateResearchCollections(): Promise<void> {
        const namespaces = this.getAllNamespaces();
        for (const ns of namespaces) {
            const prefix = ns === 'default' ? 'envello_' : `envello_${ns}_`;
            const oldDbName = `${prefix}research_libraries`;
            const newDbName = `${prefix}research_collections`;
            try {
                const oldDb = new PouchDB(oldDbName);
                const { rows } = await oldDb.allDocs({ include_docs: true });
                if (rows.length === 0) {
                    await oldDb.destroy();
                    continue;
                }
                const newDb = new PouchDB(newDbName);
                const docs = rows
                    .filter(r => r.doc)
                    .map(r => {
                        const { _rev, ...rest } = r.doc as any;
                        return rest;
                    });
                await newDb.bulkDocs(docs);
                await oldDb.destroy();
                this.logging.info(`[PouchDbDataService] Migrated ${docs.length} collections from ${oldDbName}`);
            } catch {
                // Old DB doesn't exist or migration already ran — skip silently
            }
        }
    }

    // ─── Sync Pull ──────────────────────────────────────────────────────────────

    private async pullAndApply(): Promise<void> {
        this.applyingSync = true;
        try {
            const records = await this.syncService.pull();
            for (const record of records) {
                if (this.SYNC_EXCLUDED_COLLECTIONS.has(record.collection)) continue;
                if (record.deleted) {
                    await this.removeFromProfile(record.collection, record.profile_id, record.id);
                } else if (record.data?.id) {
                    await this.upsertToProfile(record.collection, record.profile_id, record.data);
                }
            }
            if (records.length > 0) {
                // Signal StoreService to reload signals from the updated PouchDB state.
                window.dispatchEvent(new CustomEvent('envello:sync-complete'));
            }
        } catch (e) {
            console.error('[PouchDbDataService] pullAndApply failed', e);
        } finally {
            this.applyingSync = false;
        }
    }

    // ─── DB Helpers ─────────────────────────────────────────────────────────────

    private getDbForProfile(collection: string, profileId: string): PouchDB.Database {
        const profilePrefix = profileId === 'default' ? 'envello_' : `envello_${profileId}_`;
        const cacheKey = `${profileId}:${collection}`;
        if (!this.dbs[cacheKey]) {
            this.dbs[cacheKey] = new PouchDB(`${profilePrefix}${collection}`);
        }
        return this.dbs[cacheKey];
    }

    private getDb(collection: string): PouchDB.Database {
        const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
        const profileId = isGlobal ? 'default' : (this.profileService.activeProfileId() || 'default');
        return this.getDbForProfile(collection, profileId);
    }

    /** All profile namespaces: default first, then every user project. */
    private getAllNamespaces(): string[] {
        return ['default', ...this.profileService.profiles()
            .filter(p => p.id !== 'default')
            .map(p => p.id)];
    }

    /** Write to a specific namespace without triggering sync. Used by pullAndApply. */
    private async upsertToProfile<T>(collection: string, profileId: string, item: T): Promise<void> {
        const db = this.getDbForProfile(collection, profileId);
        const docId = (item as any).id;
        if (!docId) return;
        try {
            const existing = await db.get(docId);
            await db.put({ ...item, _id: docId, _rev: existing._rev });
        } catch (err: any) {
            if (err.name === 'not_found' || err.status === 404) {
                await db.put({ ...item, _id: docId });
            } else {
                throw err;
            }
        }
    }

    /** Remove from a specific namespace without triggering sync. Used by pullAndApply. */
    private async removeFromProfile(collection: string, profileId: string, id: string): Promise<void> {
        try {
            const db = this.getDbForProfile(collection, profileId);
            const existing = await db.get(id);
            await db.remove(existing._id, existing._rev);
        } catch (err: any) {
            if (err.name !== 'not_found' && err.status !== 404) {
                console.error(`[PouchDbDataService] removeFromProfile failed ${id}`, err);
            }
        }
    }

    // ─── Public DataService API ──────────────────────────────────────────────────

    async getAll<T>(collection: string): Promise<T[]> {
        try {
            const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
            const activeId = this.profileService.activeProfileId() || 'default';

            // In "All Projects" mode, aggregate from every project namespace.
            if (!isGlobal && activeId === 'default') {
                const results = await Promise.all(
                    this.getAllNamespaces().map(async (pid) => {
                        const db = this.getDbForProfile(collection, pid);
                        const result = await db.allDocs({ include_docs: true });
                        return result.rows.map(row => row.doc as unknown as T);
                    })
                );
                const seen = new Set<string>();
                const merged: T[] = [];
                for (const docs of results) {
                    for (const doc of docs) {
                        const id = (doc as any).id;
                        if (id && !seen.has(id)) {
                            seen.add(id);
                            merged.push(doc);
                        }
                    }
                }
                return merged;
            }

            const db = this.getDb(collection);
            const result = await db.allDocs({ include_docs: true });
            return result.rows.map(row => row.doc as unknown as T);
        } catch (e) {
            console.error(`[PouchDbDataService] getAll failed for ${collection}`, e);
            return [];
        }
    }

    async upsert<T>(collection: string, item: T): Promise<void> {
        try {
            const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
            const activeId = this.profileService.activeProfileId() || 'default';
            const docId = (item as any).id;

            if (!docId) {
                console.warn(`[PouchDbDataService] Item missing 'id'. Upsert failed for ${collection}.`);
                return;
            }

            let resolvedProfileId: string;

            if (!isGlobal && activeId === 'default') {
                // Search all namespaces for an existing record; new items go to default.
                resolvedProfileId = 'default';
                for (const pid of this.getAllNamespaces()) {
                    try {
                        await this.getDbForProfile(collection, pid).get(docId);
                        resolvedProfileId = pid;
                        break;
                    } catch (err: any) {
                        if (err.name !== 'not_found' && err.status !== 404) throw err;
                    }
                }
            } else {
                resolvedProfileId = isGlobal ? 'default' : activeId;
            }

            await this.upsertToProfile(collection, resolvedProfileId, item);

            if (!this.applyingSync && !this.SYNC_EXCLUDED_COLLECTIONS.has(collection)) {
                this.syncService.push(collection, resolvedProfileId, item).catch(() => {});
            }
        } catch (e) {
            console.error(`[PouchDbDataService] upsert failed for ${collection}`, e);
        }
    }

    async remove(collection: string, id: string): Promise<void> {
        const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
        const activeId = this.profileService.activeProfileId() || 'default';

        // In "All Projects" mode, search all namespaces to find the owning DB.
        if (!isGlobal && activeId === 'default') {
            for (const pid of this.getAllNamespaces()) {
                try {
                    const db = this.getDbForProfile(collection, pid);
                    const existing = await db.get(id);
                    await db.remove(existing._id, existing._rev);
                    if (!this.applyingSync && !this.SYNC_EXCLUDED_COLLECTIONS.has(collection)) {
                        this.syncService.pushDelete(collection, pid, id).catch(() => {});
                    }
                    return;
                } catch (err: any) {
                    if (err.name !== 'not_found' && err.status !== 404) {
                        console.error(`[PouchDbDataService] Failed to remove ${id}`, err);
                    }
                }
            }
            return;
        }

        const profileId = isGlobal ? 'default' : activeId;
        await this.removeFromProfile(collection, profileId, id);
        if (!this.applyingSync && !this.SYNC_EXCLUDED_COLLECTIONS.has(collection)) {
            this.syncService.pushDelete(collection, profileId, id).catch(() => {});
        }
    }

    async importData(data: any): Promise<void> {
        this.logging.info('[PouchDbDataService] importData invoked.');
    }

    async pullFromRemote(_: string): Promise<void> {}

    // ─── Vault & Transactions ────────────────────────────────────────────────────

    async saveCredential(credential: Credential): Promise<void> {
        return this.upsert('credentials', credential);
    }
    async getCredentials(): Promise<Credential[]> {
        return this.getAll<Credential>('credentials');
    }
    async deleteCredential(id: string): Promise<void> {
        return this.remove('credentials', id);
    }

    async saveTransaction(transaction: Transaction): Promise<void> {
        return this.upsert('transactions', transaction);
    }
    async getTransactions(): Promise<Transaction[]> {
        // Migrate any legacy 'subscriptions' docs on first read.
        const legacy = await this.getAll<Transaction>('subscriptions');
        if (legacy.length > 0) {
            for (const item of legacy) {
                await this.upsert('transactions', { ...item, type: item.type ?? 'recurring' as const });
                await this.remove('subscriptions', item.id);
            }
        }
        return this.getAll<Transaction>('transactions');
    }
    async deleteTransaction(id: string): Promise<void> {
        return this.remove('transactions', id);
    }

    async saveLink(link: CredentialTransactionLink): Promise<void> {
        return this.upsert('credential_transaction_links', link);
    }
    async getLinks(): Promise<CredentialTransactionLink[]> {
        // Migrate legacy credential_subscription_links on first read.
        const legacy = await this.getAll<any>('credential_subscription_links');
        if (legacy.length > 0) {
            for (const item of legacy) {
                const migrated: CredentialTransactionLink = { id: item.id, credentialId: item.credentialId, transactionId: item.subscriptionId ?? item.transactionId };
                await this.upsert('credential_transaction_links', migrated);
                await this.remove('credential_subscription_links', item.id);
            }
        }
        return this.getAll<CredentialTransactionLink>('credential_transaction_links');
    }
    async deleteLink(id: string): Promise<void> {
        return this.remove('credential_transaction_links', id);
    }
}
