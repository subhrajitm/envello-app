import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Credential } from '@envello/domain';

/**
 * Manages vault credentials in Supabase Vault (pgsodium) for the web platform.
 *
 * Credentials are stored as encrypted secrets using Supabase's server-side
 * pgsodium encryption. The encryption key is managed by Supabase separately
 * from the data — a database breach does not expose plaintext credentials.
 *
 * Requires the Supabase migration `20260615_supabase_vault.sql` to be run.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseVaultService {
    private readonly supabase = inject(SupabaseService);
    private readonly auth = inject(AuthService);

    private get userId(): string | null {
        return this.auth.currentUser()?.id ?? null;
    }

    /** Save (insert or update) a credential in Supabase Vault. */
    async save(credential: Credential): Promise<void> {
        const userId = this.userId;
        if (!userId) return;
        const { error } = await this.supabase.client.rpc('vault_upsert_credential', {
            p_user_id: userId,
            p_credential_id: credential.id,
            p_data: JSON.stringify(credential),
        });
        if (error) console.error('[SupabaseVaultService] save failed', error.message);
    }

    /** Retrieve all active (non-deleted) credentials for the current user. */
    async getAll(): Promise<Credential[]> {
        const userId = this.userId;
        if (!userId) return [];
        const { data, error } = await this.supabase.client.rpc('vault_get_credentials', {
            p_user_id: userId,
        });
        if (error) {
            console.error('[SupabaseVaultService] getAll failed', error.message);
            return [];
        }
        return (data ?? []).map((row: any) => {
            try { return JSON.parse(row.decrypted_data) as Credential; } catch { return null; }
        }).filter(Boolean);
    }

    /** Soft-delete a credential (marks deleted_at, keeps tombstone for 90 days). */
    async softDelete(credentialId: string): Promise<void> {
        const userId = this.userId;
        if (!userId) return;
        const { error } = await this.supabase.client.rpc('vault_soft_delete_credential', {
            p_user_id: userId,
            p_credential_id: credentialId,
        });
        if (error) console.error('[SupabaseVaultService] softDelete failed', error.message);
    }

    /** Permanently remove a credential from Supabase Vault. */
    async permanentlyDelete(credentialId: string): Promise<void> {
        const userId = this.userId;
        if (!userId) return;
        const { error } = await this.supabase.client.rpc('vault_delete_credential', {
            p_user_id: userId,
            p_credential_id: credentialId,
        });
        if (error) console.error('[SupabaseVaultService] permanentlyDelete failed', error.message);
    }
}
