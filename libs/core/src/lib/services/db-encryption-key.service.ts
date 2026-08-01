import { Injectable, inject } from '@angular/core';
import { StrongholdService } from './stronghold.service';

const STRONGHOLD_KEY = 'envello-db-encryption-key';

/**
 * Manages the per-installation SQLite encryption key.
 *
 * The key is a 32-byte (256-bit) value stored in Stronghold, which itself is
 * Argon2id-encrypted using the user's Supabase UID. The key is generated once
 * on first use and reused for all subsequent database opens.
 *
 * Desktop-only: returns null in non-Tauri environments.
 */
@Injectable({ providedIn: 'root' })
export class DbEncryptionKeyService {
  private readonly stronghold = inject(StrongholdService);

  private cachedKey: string | null = null;

  get isAvailable(): boolean {
    return this.stronghold.available;
  }

  /**
   * Returns the hex-encoded 256-bit database encryption key.
   * Generates and persists a new key if one doesn't exist yet.
   * Returns null if Stronghold is unavailable (non-Tauri / user not logged in).
   */
  async getOrCreateKey(): Promise<string | null> {
    if (!this.isAvailable) return null;
    if (this.cachedKey) return this.cachedKey;

    try {
      await this.stronghold.init();

      const existing = await this.stronghold.get(STRONGHOLD_KEY);
      if (existing) {
        this.cachedKey = existing;
        return existing;
      }

      const key = this.generateHexKey();
      await this.stronghold.insert(STRONGHOLD_KEY, key);
      this.cachedKey = key;
      return key;
    } catch (e) {
      console.error('[DbEncryptionKeyService] Failed to get/create key:', e);
      return null;
    }
  }

  /** Clear the cached key (e.g. on logout). */
  clearCache(): void {
    this.cachedKey = null;
  }

  private generateHexKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
