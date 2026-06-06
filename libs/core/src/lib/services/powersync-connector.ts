import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from '@powersync/web';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * PowerSync backend connector.
 *
 * fetchCredentials  — provides the Supabase JWT to PowerSync so it can
 *                     authenticate the WebSocket sync stream.
 * uploadData        — flushes locally-queued writes back to the Supabase
 *                     `user_data` table whenever connectivity is available.
 */
export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService,
    private readonly powerSyncUrl: string
  ) {}

  async fetchCredentials() {
    const { data: { session } } = await this.supabase.getSession();
    if (!session) return null;

    return {
      endpoint:  this.powerSyncUrl,
      token:     session.access_token,
      expiresAt: new Date(session.expires_at! * 1000),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const userId = this.auth.currentUser()?.id;
    if (!userId) {
      // Do NOT complete — let PowerSync retry once auth is available.
      // Calling complete() without uploading would permanently drop the CRUD entry.
      return;
    }

    try {
      for (const op of transaction.crud) {
        // local_vault is local-only — never upload to server
        if (op.table === 'local_vault') continue;

        const id         = op.id;
        const profileId  = op.opData?.['profile_id'] ?? 'default';
        const collection = op.opData?.['collection'] ?? op.table;
        const now        = new Date().toISOString();

        if (op.op === UpdateType.DELETE) {
          await this.supabase.client
            .from('user_data')
            .upsert(
              { id, user_id: userId, profile_id: profileId, collection, data: {}, deleted: true, updated_at: now },
              { onConflict: 'id,collection,profile_id' }
            );
        } else {
          let data: any = {};
          try { data = JSON.parse(op.opData?.['data'] ?? '{}'); } catch { /* keep empty */ }

          await this.supabase.client
            .from('user_data')
            .upsert(
              { id, user_id: userId, profile_id: profileId, collection, data, deleted: false, updated_at: now },
              { onConflict: 'id,collection,profile_id' }
            );
        }
      }

      await transaction.complete();
    } catch (err) {
      console.error('[PowerSyncConnector] uploadData failed', err);
      throw err;
    }
  }
}
