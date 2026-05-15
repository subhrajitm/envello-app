import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface SyncRecord {
    id: string;
    user_id: string;
    profile_id: string;
    collection: string;
    data: any;
    deleted: boolean;
    updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class SyncService {
    private readonly supabase = inject(SupabaseService);
    private readonly auth = inject(AuthService);

    private readonly TABLE = 'user_data';
    private readonly LAST_SYNC_PREFIX = 'envello_last_sync_';

    readonly isSyncing = signal(false);
    readonly lastSyncedAt = signal<string | null>(null);

    private get userId(): string | null {
        return this.auth.currentUser()?.id ?? null;
    }

    private get canSync(): boolean {
        return !!this.userId && !this.auth.isGuest();
    }

    /** Push a single item to Supabase. Safe to fire-and-forget. */
    async push(collection: string, profileId: string, item: any): Promise<void> {
        if (!this.canSync) return;

        const { error } = await this.supabase.client
            .from(this.TABLE)
            .upsert({
                id: item.id,
                user_id: this.userId,
                profile_id: profileId,
                collection,
                data: item,
                deleted: false,
                updated_at: new Date().toISOString()
            });

        if (error) console.error('[SyncService] push failed', collection, error.message);
    }

    /** Mark an item as deleted in Supabase. Safe to fire-and-forget. */
    async pushDelete(collection: string, profileId: string, id: string): Promise<void> {
        if (!this.canSync) return;

        const { error } = await this.supabase.client
            .from(this.TABLE)
            .upsert({
                id,
                user_id: this.userId,
                profile_id: profileId,
                collection,
                data: {},
                deleted: true,
                updated_at: new Date().toISOString()
            });

        if (error) console.error('[SyncService] pushDelete failed', collection, error.message);
    }

    /**
     * Pull records from Supabase that are newer than the last sync timestamp.
     * On first pull (no timestamp saved), fetches the entire dataset for this user.
     */
    async pull(): Promise<SyncRecord[]> {
        if (!this.canSync) return [];

        const userId = this.userId!;
        const lastSyncKey = `${this.LAST_SYNC_PREFIX}${userId}`;
        const lastSync = localStorage.getItem(lastSyncKey);
        const pullTime = new Date().toISOString();

        this.isSyncing.set(true);
        try {
            let query = this.supabase.client
                .from(this.TABLE)
                .select('id, user_id, profile_id, collection, data, deleted, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: true });

            if (lastSync) {
                query = (query as any).gt('updated_at', lastSync);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[SyncService] pull failed', error.message);
                return [];
            }

            const records = (data ?? []) as SyncRecord[];
            if (records.length > 0) {
                localStorage.setItem(lastSyncKey, pullTime);
                this.lastSyncedAt.set(pullTime);
                console.log(`[SyncService] pulled ${records.length} record(s)`);
            }
            return records;
        } finally {
            this.isSyncing.set(false);
        }
    }

    /** Clear the last-sync timestamp for the current user (forces a full re-pull next time). */
    resetLastSync(): void {
        const userId = this.userId;
        if (userId) localStorage.removeItem(`${this.LAST_SYNC_PREFIX}${userId}`);
    }
}
