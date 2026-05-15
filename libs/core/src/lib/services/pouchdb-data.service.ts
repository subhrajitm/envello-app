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

    private getDb(collection: string): PouchDB.Database {
        const isGlobal = this.GLOBAL_COLLECTIONS.has(collection);
        const profileId = isGlobal ? 'default' : (this.profileService.activeProfileId() || 'default');
        const profilePrefix = profileId === 'default' ? 'envello_' : `envello_${profileId}_`;
        const cacheKey = `${profileId}:${collection}`;
        if (!this.dbs[cacheKey]) {
            this.dbs[cacheKey] = new PouchDB(`${profilePrefix}${collection}`);
        }
        return this.dbs[cacheKey];
    }

    async getAll<T>(collection: string): Promise<T[]> {
        try {
            const db = this.getDb(collection);
            const result = await db.allDocs({ include_docs: true });
            // The document inside PouchDB has _id and _rev, plus our item fields. 
            // We map out the pure doc object.
            return result.rows.map(row => row.doc as unknown as T);
        } catch (e) {
            console.error(`[PouchDbDataService] Failed to get all from ${collection}`, e);
            return [];
        }
    }

    async upsert<T>(collection: string, item: T): Promise<void> {
        try {
            const db = this.getDb(collection);
            const docId = (item as any).id;

            if (!docId) {
                console.warn(`[PouchDbDataService] Item missing 'id' property. PouchDB requires _id. Upsert failed for ${collection}.`);
                return;
            }

            try {
                const existing = await db.get(docId);
                // Put updating the properties and ensuring we send the current _rev
                await db.put({
                    ...item,
                    _id: docId,
                    _rev: existing._rev
                });
            } catch (err: any) {
                if (err.name === 'not_found' || err.status === 404) {
                    // Item doesn't exist, create it anew
                    await db.put({
                        ...item,
                        _id: docId
                    });
                } else {
                    throw err; // Propagate real errors
                }
            }
        } catch (e) {
            console.error(`[PouchDbDataService] Failed to upsert to ${collection}`, e);
        }
    }

    async remove(collection: string, id: string): Promise<void> {
        try {
            const db = this.getDb(collection);
            const existing = await db.get(id);
            await db.remove(existing._id, existing._rev);
        } catch (err: any) {
            // If it's not found, it's already 'removed' essentially. Ignore 404s.
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
