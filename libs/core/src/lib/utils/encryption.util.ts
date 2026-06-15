export class EncryptionUtil {
    private static readonly KEY_STORAGE_PREFIX = 'envello_vault_key_';
    private static readonly IDB_NAME = 'envello_vault_keys';
    private static readonly IDB_STORE = 'keys';
    private static readonly V2_PREFIX = 'v2:';

    // ── Key management ────────────────────────────────────────────────────────

    /**
     * Retrieve or generate the AES-256-GCM vault key for this user.
     *
     * Keys are stored as non-extractable CryptoKey objects in IndexedDB —
     * they cannot be read back as raw bytes, even by JS running on the same
     * origin. This eliminates the localStorage raw-key-exfiltration risk.
     *
     * Falls back to localStorage only for environments where IndexedDB is
     * unavailable (e.g. some private-browsing modes).
     */
    static async getOrCreateKey(userId: string): Promise<CryptoKey> {
        try {
            return await this.getOrCreateKeyIDB(userId);
        } catch {
            return this.getOrCreateKeyLocalStorage(userId);
        }
    }

    private static openKeyStore(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.IDB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(this.IDB_STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    private static async getOrCreateKeyIDB(userId: string): Promise<CryptoKey> {
        const db = await this.openKeyStore();
        const storageKey = `${this.KEY_STORAGE_PREFIX}${userId}`;

        // Try to retrieve existing non-extractable key
        const existing = await new Promise<CryptoKey | undefined>((res, rej) => {
            const tx = db.transaction(this.IDB_STORE, 'readonly');
            const req = tx.objectStore(this.IDB_STORE).get(storageKey);
            req.onsuccess = () => res(req.result as CryptoKey | undefined);
            req.onerror = () => rej(req.error);
        });
        if (existing) { db.close(); return existing; }

        // Generate a new non-extractable key and persist it in IndexedDB
        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,  // non-extractable — raw bytes never leave the crypto engine
            ['encrypt', 'decrypt']
        );
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(this.IDB_STORE, 'readwrite');
            const req = tx.objectStore(this.IDB_STORE).put(key, storageKey);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
        });
        db.close();
        return key;
    }

    private static async getOrCreateKeyLocalStorage(userId: string): Promise<CryptoKey> {
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
        return this.encryptWithKey(text, key);
    }

    static async encryptWithKey(text: string, key: CryptoKey): Promise<string> {
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
            return this.legacyDecrypt(cipher);
        }
        const key = await this.getOrCreateKey(userId);
        return this.decryptWithKey(cipher, key);
    }

    static async decryptWithKey(cipher: string, key: CryptoKey): Promise<string> {
        if (!cipher.startsWith(this.V2_PREFIX)) {
            return this.legacyDecrypt(cipher);
        }
        try {
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
