import { Injectable } from '@angular/core';

interface CacheEntry {
  hash: string;
  vector: number[];
  provider: string;
}

@Injectable({ providedIn: 'root' })
export class SemanticCacheService {
  private readonly DB_NAME = 'envello-semantic';
  private readonly STORE   = 'embeddings';
  private readonly VERSION = 1;
  private db: IDBDatabase | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE))
          db.createObjectStore(this.STORE);
      };
      req.onsuccess  = (e) => { this.db = (e.target as IDBOpenDBRequest).result; resolve(this.db); };
      req.onerror    = () => reject(req.error);
    });
  }

  async getAll(): Promise<Map<string, CacheEntry>> {
    const db  = await this.open();
    const map = new Map<string, CacheEntry>();
    return new Promise((resolve, reject) => {
      const req = db.transaction(this.STORE, 'readonly').objectStore(this.STORE).openCursor();
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) { map.set(cursor.key as string, cursor.value); cursor.continue(); }
        else resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async setMany(entries: (CacheEntry & { key: string })[]) : Promise<void> {
    if (!entries.length) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(this.STORE, 'readwrite');
      const store = tx.objectStore(this.STORE);
      for (const { key, ...value } of entries) store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys.length) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(this.STORE, 'readwrite');
      const store = tx.objectStore(this.STORE);
      for (const key of keys) store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(this.STORE, 'readwrite').objectStore(this.STORE).clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }
}
