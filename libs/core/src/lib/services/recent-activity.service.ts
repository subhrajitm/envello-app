import { Injectable } from '@angular/core';

export type ActivityItemType = 'note' | 'task' | 'book' | 'bookmark' | 'meeting';

interface AccessRecord {
  id: string;
  type: ActivityItemType;
  ts: number; // Unix ms
}

const STORAGE_KEY = 'envello-recent-activity';
const MAX_RECORDS = 200;

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS  = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7  * ONE_DAY_MS;

@Injectable({ providedIn: 'root' })
export class RecentActivityService {
  private records: AccessRecord[] = this.load();

  /** Record that the user opened/viewed an item. */
  track(id: string, type: ActivityItemType): void {
    // Move to front if already present, otherwise prepend
    this.records = this.records.filter(r => !(r.id === id && r.type === type));
    this.records.unshift({ id, type, ts: Date.now() });
    if (this.records.length > MAX_RECORDS) this.records.length = MAX_RECORDS;
    this.save();
  }

  /**
   * Returns a 0–1 activity boost for an item based on how recently it was accessed.
   *   < 1 hour  → 1.0
   *   < 1 day   → 0.6
   *   < 1 week  → 0.3
   *   older     → 0.0
   */
  getBoost(id: string): number {
    const record = this.records.find(r => r.id === id);
    if (!record) return 0;
    const age = Date.now() - record.ts;
    if (age < ONE_HOUR_MS)  return 1.0;
    if (age < ONE_DAY_MS)   return 0.6;
    if (age < ONE_WEEK_MS)  return 0.3;
    return 0;
  }

  private load(): AccessRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AccessRecord[]) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records)); } catch { /* quota exceeded */ }
  }
}
