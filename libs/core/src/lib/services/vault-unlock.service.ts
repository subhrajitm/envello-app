import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Web-only vault master-password gate.
 *
 * The master password is never stored or sent to the server. Only a
 * PBKDF2-SHA-256 hash (200k iterations, random 16-byte salt) is persisted in
 * Supabase. The unlocked state lives in memory for the current session only.
 *
 * Desktop (Tauri) does not use this service — Stronghold handles the lock there.
 */
@Injectable({ providedIn: 'root' })
export class VaultUnlockService {
    private readonly supabase = inject(SupabaseService);
    private readonly auth = inject(AuthService);

    private readonly _isUnlocked = signal(false);
    readonly isUnlocked = this._isUnlocked.asReadonly();

    private get userId(): string | null {
        return this.auth.currentUser()?.id ?? null;
    }

    /** True if the user has already configured a master password. */
    async hasPassword(): Promise<boolean> {
        const userId = this.userId;
        if (!userId) return false;
        const { data } = await this.supabase.client.rpc('vault_lock_get', { p_user_id: userId });
        return Array.isArray(data) && data.length > 0;
    }

    /**
     * First-time setup: derive a hash from the chosen password, persist it,
     * and mark the vault as unlocked for this session.
     */
    async setup(password: string): Promise<void> {
        const userId = this.userId;
        if (!userId) return;
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await this.deriveHash(password, salt);
        const { error } = await this.supabase.client.rpc('vault_lock_set', {
            p_user_id: userId,
            p_salt: btoa(String.fromCharCode(...salt)),
            p_password_hash: hash,
        });
        if (error) throw new Error(error.message);
        this._isUnlocked.set(true);
    }

    /**
     * Verify the entered password against the stored hash.
     * Returns true and marks unlocked on success, false on wrong password.
     */
    async unlock(password: string): Promise<boolean> {
        const userId = this.userId;
        if (!userId) return false;
        const { data, error } = await this.supabase.client.rpc('vault_lock_get', { p_user_id: userId });
        if (error || !Array.isArray(data) || data.length === 0) return false;

        const { salt: saltB64, password_hash: storedHash } = data[0] as { salt: string; password_hash: string };
        const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
        const hash = await this.deriveHash(password, salt);

        const ok = hash === storedHash;
        if (ok) this._isUnlocked.set(true);
        return ok;
    }

    /** Lock the vault for this session. */
    lock(): void {
        this._isUnlocked.set(false);
    }

    private async deriveHash(password: string, salt: Uint8Array): Promise<string> {
        const keyMaterial = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
            keyMaterial, 256
        );
        return btoa(String.fromCharCode(...new Uint8Array(bits)));
    }
}
