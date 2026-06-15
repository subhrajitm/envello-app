import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { LoggingService } from './logging.service';

export interface SyncRecord {
    id: string;
    user_id: string;
    profile_id: string;
    collection: string;
    data: any;
    deleted: boolean;
    updated_at: string;
}

export interface SyncActivity {
    timestamp: string;
    direction: 'upload' | 'download';
    count: number;
}

const MAX_LOG = 20;

@Injectable({ providedIn: 'root' })
export class SyncService {
    private readonly supabase = inject(SupabaseService);
    private readonly auth = inject(AuthService);
    private readonly logging = inject(LoggingService);

    private readonly TABLE = 'user_data';
    private readonly LAST_SYNC_PREFIX = 'envello_last_sync_';

    readonly isSyncing = signal(false);
    readonly lastSyncedAt = signal<string | null>(null);
    readonly syncActivity = signal<SyncActivity[]>([]);
    readonly syncError = signal<string | null>(null);

    private errorClearTimer: ReturnType<typeof setTimeout> | null = null;

    private get userId(): string | null {
        return this.auth.currentUser()?.id ?? null;
    }

    private get canSync(): boolean {
        return !!this.userId && !this.auth.isGuest();
    }

    reportError(message: string): void {
        this.syncError.set(message);
        if (this.errorClearTimer) clearTimeout(this.errorClearTimer);
        this.errorClearTimer = setTimeout(() => this.syncError.set(null), 6000);
    }

    private addActivity(entry: SyncActivity): void {
        this.syncActivity.update(log => [entry, ...log].slice(0, MAX_LOG));
    }

    /** Push a single item to Supabase. Safe to fire-and-forget. */
    async push(collection: string, profileId: string, item: any): Promise<void> {
        return this.pushBatch(collection, profileId, [item]);
    }

    /** Push multiple items in a single Supabase call. Avoids N+1 on bulk operations. */
    async pushBatch(collection: string, profileId: string, items: any[]): Promise<void> {
        if (!this.canSync || !items.length) return;

        const rows = items.map(item => ({
            id: item.id,
            user_id: this.userId,
            profile_id: profileId,
            collection,
            data: item,
            deleted: false,
            // updated_at intentionally omitted — set server-side via DB trigger
        }));

        const { error } = await this.supabase.client
            .from(this.TABLE)
            .upsert(rows, { onConflict: 'user_id,id,collection,profile_id' });

        if (error) {
            console.error('[SyncService] push failed', collection, error.message);
            this.reportError(`Upload failed: ${error.message}`);
        } else {
            this.addActivity({ timestamp: new Date().toISOString(), direction: 'upload', count: items.length });
        }
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
                // updated_at intentionally omitted — set server-side via DB trigger
            }, { onConflict: 'user_id,id,collection,profile_id' });

        if (error) {
            console.error('[SyncService] pushDelete failed', collection, error.message);
            this.reportError(`Upload failed: ${error.message}`);
        } else {
            this.addActivity({ timestamp: new Date().toISOString(), direction: 'upload', count: 1 });
        }
    }

    /**
     * Pull records from Supabase that are newer than the last sync timestamp.
     * On first pull (no timestamp saved), fetches the entire dataset for this user.
     * Uses cursor-based pagination to handle large datasets safely.
     */
    async pull(): Promise<SyncRecord[]> {
        if (!this.canSync) return [];

        const userId = this.userId!;
        const lastSyncKey = `${this.LAST_SYNC_PREFIX}${userId}`;
        const lastSync = localStorage.getItem(lastSyncKey);

        this.isSyncing.set(true);
        const PAGE_SIZE = 500;
        const all: SyncRecord[] = [];

        try {
            let cursor: string | null = lastSync;
            let page = 0;

            while (true) {
                let query = this.supabase.client
                    .from(this.TABLE)
                    .select('id, user_id, profile_id, collection, data, deleted, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: true })
                    .limit(PAGE_SIZE);

                if (cursor) {
                    query = (query as any).gt('updated_at', cursor);
                }

                const { data, error } = await query;

                if (error) {
                    console.error('[SyncService] pull failed (page', page, ')', error.message);
                    this.reportError(`Sync failed: ${error.message}`);
                    return all; // return whatever we got before the failure
                }

                const records = (data ?? []) as SyncRecord[];
                all.push(...records);

                if (records.length < PAGE_SIZE) break; // last page

                // Advance cursor to the latest updated_at in this page (server time, safe)
                cursor = records[records.length - 1].updated_at;
                page++;
            }

            if (all.length > 0) {
                // Use the server's updated_at from the last record as the new cursor.
                // This avoids the client-clock gap: the cursor is always a timestamp
                // that came from the server, so no records can fall between the cracks.
                const newCursor = all[all.length - 1].updated_at;
                localStorage.setItem(lastSyncKey, newCursor);
                this.lastSyncedAt.set(newCursor);
                this.addActivity({ timestamp: new Date().toISOString(), direction: 'download', count: all.length });
                this.logging.info(`[SyncService] pulled ${all.length} record(s)`);
            }
            return all;
        } finally {
            this.isSyncing.set(false);
        }
    }

    /** Clear the last-sync timestamp for the current user (forces a full re-pull next time). */
    resetLastSync(): void {
        const userId = this.userId;
        if (userId) localStorage.removeItem(`${this.LAST_SYNC_PREFIX}${userId}`);
    }

    /**
     * Subscribe to Supabase Realtime for live cross-device updates.
     * Calls `onRecord` for every INSERT or UPDATE on user_data belonging to this user.
     * On reconnect after a gap, triggers a pull to catch any missed events.
     * Returns an unsubscribe function — call it on destroy or logout.
     */
    subscribeRealtime(onRecord: (record: SyncRecord) => void, onReconnectPull?: () => void): () => void {
        if (!this.canSync) return () => {};

        const userId = this.userId!;
        const channel = this.supabase.client
            .channel(`user_data:${userId}`)
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: this.TABLE,
                    filter: `user_id=eq.${userId}`
                },
                (payload: any) => {
                    const record = (payload.new ?? payload.old) as SyncRecord;
                    if (record) {
                        this.addActivity({ timestamp: new Date().toISOString(), direction: 'download', count: 1 });
                        onRecord(record);
                    }
                }
            )
            .subscribe((status: string) => {
                // On reconnect after a gap, pull to catch events missed while disconnected.
                if (status === 'SUBSCRIBED' && onReconnectPull) {
                    onReconnectPull();
                }
            });

        return () => {
            this.supabase.client.removeChannel(channel);
        };
    }

    /** Clear the sync cursor for a specific user on logout to prevent cursor leaking to next user. */
    clearSyncCursor(userId: string): void {
        localStorage.removeItem(`${this.LAST_SYNC_PREFIX}${userId}`);
    }
}
