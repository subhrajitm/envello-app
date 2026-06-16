import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { Credential } from '@envello/domain';
import { AuthService, StrongholdService, SupabaseVaultService, EncryptionUtil, VaultKeyService } from '@envello/core';

const STRONGHOLD_KEY_PREFIX = 'cred_';
const STRONGHOLD_PLACEHOLDER = '[stronghold]';

@Injectable({
    providedIn: 'root'
})
export class VaultStore {
    private db = inject(DataService);
    private auth = inject(AuthService);
    private stronghold = inject(StrongholdService);
    private supabaseVault = inject(SupabaseVaultService);
    private vaultKey = inject(VaultKeyService);

    private credentialsSignal = signal<Credential[]>([]);
    public credentials = this.credentialsSignal.asReadonly();

    private readonly isTauri =
        typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    private get userId(): string {
        return this.auth.currentUser()?.id ?? 'guest';
    }

    constructor() {
        this.loadCredentials();
        window.addEventListener('envello:db-ready',      () => this.loadCredentials());
        window.addEventListener('envello:sync-complete', () => this.loadCredentials());
    }

    reload() { this.loadCredentials(); }

    private async loadCredentials() {
        try {
            let creds: Credential[];
            if (this.isTauri) {
                // Desktop: metadata from SQLite, values from Stronghold
                creds = await this.db.getCredentials();
            } else {
                // Web: full credentials from Supabase Vault
                creds = await this.supabaseVault.getAll();
            }
            this.credentialsSignal.set(creds.filter(c => !c.deleted_at));
        } catch (e) {
            console.error('[VaultStore] loadCredentials failed', e);
        }
    }

    async addCredential(cred: Omit<Credential, 'value'> & { unencryptedValue: string }) {
        if (this.isTauri) {
            const value = await this.encryptForDesktop(cred.id, cred.unencryptedValue);
            await this.db.saveCredential({ ...cred, value });
        } else {
            await this.supabaseVault.save({ ...cred, value: cred.unencryptedValue });
        }
        await this.loadCredentials();
    }

    getCredentialsByProject(projectId: string) {
        return computed(() => this.credentials().filter(c => c.projectId === projectId));
    }

    async updateCredential(id: string, changes: Partial<Credential> & { newUnencryptedValue?: string }) {
        const existing = this.credentials().find(c => c.id === id);
        if (!existing) return;
        const { newUnencryptedValue, ...rest } = changes;
        const updated: Credential = { ...existing, ...rest, updatedAt: new Date().toISOString() };

        if (this.isTauri) {
            let value = updated.value;
            if (newUnencryptedValue) {
                value = await this.encryptForDesktop(id, newUnencryptedValue);
            }
            await this.db.saveCredential({ ...updated, value });
        } else {
            if (newUnencryptedValue) updated.value = newUnencryptedValue;
            await this.supabaseVault.save(updated);
        }
        await this.loadCredentials();
    }

    async touchCredential(id: string) {
        const existing = this.credentials().find(c => c.id === id);
        if (!existing) return;
        const touched = { ...existing, lastAccessedAt: new Date().toISOString() };
        if (this.isTauri) {
            await this.db.saveCredential({ ...touched, value: STRONGHOLD_PLACEHOLDER });
        } else {
            await this.supabaseVault.save(touched);
        }
        await this.loadCredentials();
    }

    async deleteCredential(id: string) {
        const cred = this.credentials().find(c => c.id === id);
        if (!cred) return;
        this.credentialsSignal.set(this.credentials().filter(c => c.id !== id));
        if (this.isTauri) {
            await this.db.saveCredential({ ...cred, value: STRONGHOLD_PLACEHOLDER, deleted_at: new Date().toISOString() });
        } else {
            await this.supabaseVault.softDelete(id);
        }
    }

    /**
     * Encrypt a secret for desktop storage.
     * Tries Stronghold first (Argon2id-backed, most secure).
     * Falls back to AES-256-GCM (VaultKeyService) if Stronghold is unavailable —
     * e.g., during first launch before capabilities are rebuilt, or on non-Tauri dev builds.
     * decryptValue() handles both formats transparently.
     */
    private async encryptForDesktop(credentialId: string, plaintext: string): Promise<string> {
        try {
            await this.stronghold.insert(`${STRONGHOLD_KEY_PREFIX}${credentialId}`, plaintext);
            return STRONGHOLD_PLACEHOLDER;
        } catch {
            const key = await this.vaultKey.getOrCreateKey(this.userId);
            return EncryptionUtil.encryptWithKey(plaintext, key);
        }
    }

    /**
     * Decrypt a stored credential value.
     * - Desktop + Stronghold: retrieves raw value from Stronghold by credential id
     * - Desktop + legacy AES (v2:): decrypts using EncryptionUtil
     * - Web: value is already plaintext (decrypted by Supabase Vault server-side)
     */
    async decryptValue(cipher: string, credentialId?: string): Promise<string> {
        if (!this.isTauri) {
            // Web: Supabase Vault returns already-decrypted values
            return cipher;
        }
        if (cipher === STRONGHOLD_PLACEHOLDER && credentialId) {
            const raw = await this.stronghold.get(`${STRONGHOLD_KEY_PREFIX}${credentialId}`);
            return raw ?? '';
        }
        // Legacy: AES-GCM encrypted values from before Stronghold migration
        if (cipher.startsWith('v2:')) {
            const key = await this.vaultKey.getOrCreateKey(this.userId);
            return EncryptionUtil.decryptWithKey(cipher, key);
        }
        return EncryptionUtil.legacyDecrypt(cipher);
    }
}
