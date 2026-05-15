import { Injectable, inject } from '@angular/core';
import { WorkspaceProfileService } from './workspace-profile.service';
import { DataService } from '@envello/data';
import { Credential, Subscription, CredentialSubscriptionLink } from '@envello/domain';
import PouchDB from 'pouchdb';

@Injectable({
    providedIn: 'root'
})
export class PouchDbDataService implements DataService {
    private dbs: Record<string, PouchDB.Database> = {};
    private profileService = inject(WorkspaceProfileService);

    /**
     * Collections that always live in the default namespace so they are visible
     * from every workspace context (projects list, note folders, etc.).
     */
    private readonly GLOBAL_COLLECTIONS = new Set(['projects', 'note_folders']);

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

    /** All profile namespaces in order: default first, then user projects. */
    private getAllNamespaces(): string[] {
        return ['default', ...this.profileService.profiles()
            .filter(p => p.id !== 'default')
            .map(p => p.id)];
    }

    async getAll<T>(collection: string): Promise<T[]> {
        try {
            const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
            const activeId = this.profileService.activeProfileId() || 'default';

            // In "All Projects" mode, aggregate from every project namespace
            if (!isGlobal && activeId === 'default') {
                const results = await Promise.all(
                    this.getAllNamespaces().map(async (pid) => {
                        const db = this.getDbForProfile(collection, pid);
                        const result = await db.allDocs({ include_docs: true });
                        return result.rows.map(row => row.doc as unknown as T);
                    })
                );
                // Deduplicate by id in case the same doc appears in multiple namespaces
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
            console.error(`[PouchDbDataService] Failed to get all from ${collection}`, e);
            return [];
        }
    }

    async upsert<T>(collection: string, item: T): Promise<void> {
        try {
            const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
            const activeId = this.profileService.activeProfileId() || 'default';
            const docId = (item as any).id;

            if (!docId) {
                console.warn(`[PouchDbDataService] Item missing 'id' property. Upsert failed for ${collection}.`);
                return;
            }

            // In "All Projects" mode, find the namespace that owns this item and update there;
            // fall back to default namespace for new items.
            if (!isGlobal && activeId === 'default') {
                for (const pid of this.getAllNamespaces()) {
                    const db = this.getDbForProfile(collection, pid);
                    try {
                        const existing = await db.get(docId);
                        await db.put({ ...item, _id: docId, _rev: existing._rev });
                        return;
                    } catch (err: any) {
                        if (err.name !== 'not_found' && err.status !== 404) throw err;
                    }
                }
                // New item — write to default namespace
                const defaultDb = this.getDbForProfile(collection, 'default');
                await defaultDb.put({ ...item, _id: docId });
                return;
            }

            const db = this.getDb(collection);
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
        } catch (e) {
            console.error(`[PouchDbDataService] Failed to upsert to ${collection}`, e);
        }
    }

    async remove(collection: string, id: string): Promise<void> {
        const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
        const activeId = this.profileService.activeProfileId() || 'default';

        // In "All Projects" mode, search all namespaces to find and remove the item
        if (!isGlobal && activeId === 'default') {
            for (const pid of this.getAllNamespaces()) {
                try {
                    const db = this.getDbForProfile(collection, pid);
                    const existing = await db.get(id);
                    await db.remove(existing._id, existing._rev);
                    return;
                } catch (err: any) {
                    if (err.name !== 'not_found' && err.status !== 404) {
                        console.error(`[PouchDbDataService] Failed to remove ${id} from ${collection}`, err);
                    }
                }
            }
            return;
        }

        try {
            const db = this.getDb(collection);
            const existing = await db.get(id);
            await db.remove(existing._id, existing._rev);
        } catch (err: any) {
            if (err.name !== 'not_found' && err.status !== 404) {
                console.error(`[PouchDbDataService] Failed to remove ${id} from ${collection}`, err);
            }
        }
    }

    async importData(data: any): Promise<void> {
        // Reserved for bulk import implementation scaling.
        console.log('[PouchDbDataService] importData invoked.', data);
    }

    // Vault & Subscriptions
    async saveCredential(credential: Credential): Promise<void> {
        return this.upsert('credentials', credential);
    }
    async getCredentials(): Promise<Credential[]> {
        return this.getAll<Credential>('credentials');
    }
    async deleteCredential(id: string): Promise<void> {
        return this.remove('credentials', id);
    }

    async saveSubscription(subscription: Subscription): Promise<void> {
        return this.upsert('subscriptions', subscription);
    }
    async getSubscriptions(): Promise<Subscription[]> {
        return this.getAll<Subscription>('subscriptions');
    }
    async deleteSubscription(id: string): Promise<void> {
        return this.remove('subscriptions', id);
    }

    async saveLink(link: CredentialSubscriptionLink): Promise<void> {
        return this.upsert('credential_subscription_links', link);
    }
    async getLinks(): Promise<CredentialSubscriptionLink[]> {
        return this.getAll<CredentialSubscriptionLink>('credential_subscription_links');
    }
    async deleteLink(id: string): Promise<void> {
        return this.remove('credential_subscription_links', id);
    }
}
