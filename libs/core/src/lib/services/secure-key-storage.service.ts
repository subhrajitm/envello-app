import { Injectable, inject } from '@angular/core';
import { StrongholdService } from './stronghold.service';

/**
 * Secure storage for sensitive secrets (AI API keys, etc.).
 *
 * Desktop (Tauri + Stronghold):
 *   Keys are stored in Stronghold — an Argon2id-encrypted vault that is
 *   device-bound and never written to disk in plaintext.
 *
 * Web (browser):
 *   Keys are stored in sessionStorage — scoped to the tab, cleared on close,
 *   and never persisted to disk. Users re-enter keys each session.
 *
 * Migration:
 *   On first desktop run after this change, `migrateFromLocalStorage` moves any
 *   key previously stored in localStorage into Stronghold and removes the
 *   plaintext copy.
 */
@Injectable({ providedIn: 'root' })
export class SecureKeyStorageService {
  private readonly stronghold = inject(StrongholdService);

  private get useStronghold(): boolean {
    return this.stronghold.available;
  }

  async get(key: string): Promise<string | null> {
    if (this.useStronghold) {
      return this.stronghold.get(key);
    }
    return sessionStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (!value) {
      await this.remove(key);
      return;
    }
    if (this.useStronghold) {
      await this.stronghold.insert(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  }

  async remove(key: string): Promise<void> {
    if (this.useStronghold) {
      await this.stronghold.remove(key);
    } else {
      sessionStorage.removeItem(key);
    }
  }

  /**
   * One-time migration: move a key from plaintext localStorage into Stronghold.
   * No-op if Stronghold is unavailable or the key is already in Stronghold.
   */
  async migrateFromLocalStorage(key: string): Promise<void> {
    if (!this.useStronghold) return;
    try {
      await this.stronghold.init();
      const existing = await this.stronghold.get(key);
      if (existing !== null) {
        // Already in Stronghold — just ensure localStorage copy is gone.
        localStorage.removeItem(key);
        return;
      }
      const localValue = localStorage.getItem(key);
      if (localValue) {
        await this.stronghold.insert(key, localValue);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('[SecureKeyStorageService] Migration failed for key', key, e);
    }
  }
}
