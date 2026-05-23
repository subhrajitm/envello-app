import { Injectable, inject } from '@angular/core';
import { SqliteService } from './sqlite.service';
import { EncryptionUtil } from '../utils/encryption.util';

const SQLITE_KEY_PREFIX = 'vault_key_';

/**
 * Platform-aware vault encryption key storage.
 *
 * Desktop (Tauri): key is stored in the SQLite `app_meta` table, which lives
 * in the OS app-data directory and is inaccessible from the webview JS sandbox.
 *
 * Web (fallback): key falls back to localStorage — only reached if somehow
 * the vault route is accessed on web, which should not happen in normal usage.
 */
@Injectable({ providedIn: 'root' })
export class VaultKeyService {
    private sqlite = inject(SqliteService);

    private readonly isTauri =
        typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    async getOrCreateKey(userId: string): Promise<CryptoKey> {
        return this.isTauri
            ? this.getOrCreateSqliteKey(userId)
            : EncryptionUtil.getOrCreateKey(userId);
    }

    private async getOrCreateSqliteKey(userId: string): Promise<CryptoKey> {
        const metaKey = `${SQLITE_KEY_PREFIX}${userId}`;
        try {
            const stored = await this.sqlite.getAppMeta(metaKey);
            if (stored) {
                const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
                return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
            }
            // Generate and persist a new key
            const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
            const exported = await crypto.subtle.exportKey('raw', key);
            await this.sqlite.setAppMeta(metaKey, btoa(String.fromCharCode(...new Uint8Array(exported))));
            return key;
        } catch (e) {
            console.error('[VaultKeyService] SQLite key storage failed, falling back to localStorage', e);
            return EncryptionUtil.getOrCreateKey(userId);
        }
    }
}
