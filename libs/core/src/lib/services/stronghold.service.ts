import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

const CLIENT_NAME = 'envello_credentials';

/**
 * Wraps @tauri-apps/plugin-stronghold for desktop-only secure secret storage.
 * Stronghold is a memory-safe, Argon2-encrypted vault backed by IOTA Stronghold.
 *
 * The vault key is derived (server-side Rust, Argon2id) from the user's Supabase UID.
 * This service is a no-op when not running inside Tauri.
 */
@Injectable({ providedIn: 'root' })
export class StrongholdService {
    private readonly auth = inject(AuthService);

    private readonly isTauri =
        typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    private vaultInstance: any = null;
    private clientInstance: any = null;
    private initPromise: Promise<void> | null = null;

    private get userId(): string {
        return this.auth.currentUser()?.id ?? '';
    }

    /** True only on Tauri desktop. */
    get available(): boolean {
        return this.isTauri && !!this.userId;
    }

    async init(): Promise<void> {
        if (!this.available) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.doInit();
        return this.initPromise;
    }

    private async doInit(): Promise<void> {
        try {
            const { Stronghold } = await import('@tauri-apps/plugin-stronghold');
            const { appLocalDataDir } = await import('@tauri-apps/api/path');

            const dir = await appLocalDataDir();
            const vaultPath = `${dir}/envello_vault.hold`;

            // The "password" is the Supabase UID — Rust side derives the actual
            // 32-byte AES key from it using Argon2id (see main.rs registration).
            this.vaultInstance = await Stronghold.load(vaultPath, this.userId);

            try {
                this.clientInstance = await this.vaultInstance.loadClient(CLIENT_NAME);
            } catch {
                this.clientInstance = await this.vaultInstance.createClient(CLIENT_NAME);
            }
        } catch (e) {
            console.error('[StrongholdService] init failed', e);
            this.initPromise = null;
            throw e;
        }
    }

    /** Store raw bytes for a key. Saves the vault after writing. */
    async insert(key: string, value: string): Promise<void> {
        await this.init();
        if (!this.clientInstance) return;
        const store = this.clientInstance.getStore();
        const bytes = Array.from(new TextEncoder().encode(value));
        await store.insert(key, bytes);
        await this.vaultInstance.save();
    }

    /** Retrieve a stored value, or null if not found. */
    async get(key: string): Promise<string | null> {
        await this.init();
        if (!this.clientInstance) return null;
        try {
            const store = this.clientInstance.getStore();
            const bytes: number[] = await store.get(key);
            if (!bytes || bytes.length === 0) return null;
            return new TextDecoder().decode(new Uint8Array(bytes));
        } catch {
            return null;
        }
    }

    /** Remove a stored key. Saves the vault after removal. */
    async remove(key: string): Promise<void> {
        await this.init();
        if (!this.clientInstance) return;
        try {
            const store = this.clientInstance.getStore();
            await store.remove(key);
            await this.vaultInstance.save();
        } catch { /* key may not exist */ }
    }
}
