export class EncryptionUtil {
    private static readonly KEY_STORAGE_PREFIX = 'envello_vault_key_';
    private static readonly V2_PREFIX = 'v2:';

    // ── Key management ────────────────────────────────────────────────────────

    static async getOrCreateKey(userId: string): Promise<CryptoKey> {
        const storageKey = `${this.KEY_STORAGE_PREFIX}${userId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
            return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
        }
        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const exported = await crypto.subtle.exportKey('raw', key);
        localStorage.setItem(storageKey, btoa(String.fromCharCode(...new Uint8Array(exported))));
        return key;
    }

    // ── AES-256-GCM encrypt ───────────────────────────────────────────────────

    static async encrypt(text: string, userId: string): Promise<string> {
        const key = await this.getOrCreateKey(userId);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);
        const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        const combined = new Uint8Array(12 + cipherBuf.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(cipherBuf), 12);
        return this.V2_PREFIX + btoa(String.fromCharCode(...combined));
    }

    // ── AES-256-GCM decrypt ───────────────────────────────────────────────────

    static async decrypt(cipher: string, userId: string): Promise<string> {
        if (!cipher.startsWith(this.V2_PREFIX)) {
            // Transparent migration: legacy credentials are readable but will be
            // re-encrypted with AES next time the user saves them.
            return this.legacyDecrypt(cipher);
        }
        try {
            const key = await this.getOrCreateKey(userId);
            const combined = Uint8Array.from(atob(cipher.slice(this.V2_PREFIX.length)), c => c.charCodeAt(0));
            const iv = combined.slice(0, 12);
            const cipherBuf = combined.slice(12);
            const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
            return new TextDecoder().decode(plainBuf);
        } catch {
            return '[decryption failed]';
        }
    }

    // ── Legacy read-only (backward compat) ───────────────────────────────────

    static legacyDecrypt(cipher: string): string {
        try {
            const raw = atob(cipher);
            return raw.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');
        } catch {
            return cipher;
        }
    }
}
