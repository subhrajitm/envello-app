import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';

export interface VersionSnapshot {
    id: string;
    timestamp: Date;
    timestampIso: string; // persisted form
    contentId: string;
    contentType: 'chapter' | 'frontMatter' | 'prologue';
    content: string;
    title?: string;
    wordCount: number;
    description?: string;
}

export interface VersionHistory {
    contentId: string;
    contentType: 'chapter' | 'frontMatter' | 'prologue';
    versions: VersionSnapshot[];
    currentIndex: number;
}

@Injectable({ providedIn: 'root' })
export class VersionHistoryService {
    private db = inject(DataService);

    private histories  = new Map<string, VersionHistory>();
    private loadedKeys = new Set<string>(); // keys that have been fetched from DB

    private get MAX_VERSIONS(): number {
        try {
            const saved = localStorage.getItem('envello-settings');
            return saved ? (JSON.parse(saved).versionHistoryLimit || 50) : 50;
        } catch { return 50; }
    }

    private readonly SNAPSHOT_DEBOUNCE = 30_000; // 30 s
    private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

    // ── Public API ─────────────────────────────────────────────────────────────

    createSnapshot(
        contentId: string,
        contentType: 'chapter' | 'frontMatter' | 'prologue',
        content: string,
        title?: string,
        wordCount = 0,
        description?: string,
    ): VersionSnapshot {
        const now = new Date();
        return {
            id: `${contentId}-${now.getTime()}`,
            timestamp: now,
            timestampIso: now.toISOString(),
            contentId,
            contentType,
            content,
            title,
            wordCount,
            description: description || this.generateDescription(content, wordCount),
        };
    }

    addVersion(
        contentId: string,
        contentType: 'chapter' | 'frontMatter' | 'prologue',
        content: string,
        title?: string,
        wordCount = 0,
        immediate = false,
    ): void {
        const key = `${contentType}-${contentId}`;

        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);

        const addSnapshot = () => {
            const history  = this.getHistory(contentId, contentType);
            const snapshot = this.createSnapshot(contentId, contentType, content, title, wordCount);

            if (history.currentIndex < history.versions.length - 1) {
                // Truncate future branch
                const removed = history.versions.splice(history.currentIndex + 1);
                removed.forEach(v => this.db.remove('chapter_history', v.id).catch(() => {}));
            }

            history.versions.push(snapshot);

            if (history.versions.length > this.MAX_VERSIONS) {
                const oldest = history.versions.shift()!;
                this.db.remove('chapter_history', oldest.id).catch(() => {});
            } else {
                history.currentIndex = history.versions.length - 1;
            }

            this.db.upsert('chapter_history', this.toDbRecord(snapshot)).catch(() => {});
        };

        if (immediate) {
            addSnapshot();
        } else {
            const timer = setTimeout(() => {
                addSnapshot();
                this.debounceTimers.delete(key);
            }, this.SNAPSHOT_DEBOUNCE);
            this.debounceTimers.set(key, timer);
        }
    }

    /**
     * Loads persisted snapshots for a content item from the DB into in-memory cache.
     * Must be awaited before calling getVersions() to show history across sessions.
     */
    async loadFromDb(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): Promise<void> {
        const key = `${contentType}-${contentId}`;
        if (this.loadedKeys.has(key)) return;
        this.loadedKeys.add(key);

        try {
            const all = await this.db.getAll<any>('chapter_history');
            const rows = all
                .filter((r: any) => r.contentId === contentId && r.contentType === contentType)
                .sort((a: any, b: any) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''));

            const history = this.getHistory(contentId, contentType);
            // Merge DB rows that aren't already in memory
            for (const row of rows) {
                if (!history.versions.find(v => v.id === row.id)) {
                    history.versions.push(this.fromDbRecord(row));
                }
            }
            history.currentIndex = history.versions.length - 1;
        } catch (e) {
            console.warn('[VersionHistoryService] loadFromDb failed', e);
        }
    }

    getHistory(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionHistory {
        const key = `${contentType}-${contentId}`;
        if (!this.histories.has(key)) {
            this.histories.set(key, { contentId, contentType, versions: [], currentIndex: -1 });
        }
        return this.histories.get(key)!;
    }

    getVersions(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot[] {
        return [...this.getHistory(contentId, contentType).versions];
    }

    getCurrentVersion(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null {
        const h = this.getHistory(contentId, contentType);
        return h.currentIndex >= 0 ? h.versions[h.currentIndex] ?? null : null;
    }

    canUndo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): boolean {
        return this.getHistory(contentId, contentType).currentIndex > 0;
    }

    canRedo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): boolean {
        const h = this.getHistory(contentId, contentType);
        return h.currentIndex < h.versions.length - 1;
    }

    undo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null {
        const h = this.getHistory(contentId, contentType);
        if (h.currentIndex > 0) { h.currentIndex--; return h.versions[h.currentIndex]; }
        return null;
    }

    redo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null {
        const h = this.getHistory(contentId, contentType);
        if (h.currentIndex < h.versions.length - 1) { h.currentIndex++; return h.versions[h.currentIndex]; }
        return null;
    }

    restoreVersion(
        contentId: string,
        contentType: 'chapter' | 'frontMatter' | 'prologue',
        versionId: string,
    ): VersionSnapshot | null {
        const h = this.getHistory(contentId, contentType);
        const idx = h.versions.findIndex(v => v.id === versionId);
        if (idx < 0) return null;

        if (idx < h.currentIndex) {
            const restored = h.versions[idx];
            const newSnap  = this.createSnapshot(contentId, contentType, restored.content, restored.title, restored.wordCount, 'Restored from version history');
            const removed  = h.versions.splice(idx + 1);
            removed.forEach(v => this.db.remove('chapter_history', v.id).catch(() => {}));
            h.versions.push(newSnap);
            h.currentIndex = h.versions.length - 1;
            this.db.upsert('chapter_history', this.toDbRecord(newSnap)).catch(() => {});
            return newSnap;
        }

        h.currentIndex = idx;
        return h.versions[idx];
    }

    async deleteSnapshot(id: string, contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): Promise<void> {
        const h = this.getHistory(contentId, contentType);
        h.versions = h.versions.filter(v => v.id !== id);
        h.currentIndex = Math.min(h.currentIndex, h.versions.length - 1);
        await this.db.remove('chapter_history', id);
    }

    clearHistory(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): void {
        const key = `${contentType}-${contentId}`;
        const h = this.histories.get(key);
        if (h) {
            h.versions.forEach(v => this.db.remove('chapter_history', v.id).catch(() => {}));
        }
        this.histories.delete(key);
        this.loadedKeys.delete(key);
        const timer = this.debounceTimers.get(key);
        if (timer) { clearTimeout(timer); this.debounceTimers.delete(key); }
    }

    formatTimestamp(date: Date): string {
        const now  = new Date();
        const diff = now.getTime() - date.getTime();
        const secs = Math.floor(diff / 1000);
        const mins = Math.floor(secs / 60);
        const hrs  = Math.floor(mins / 60);
        const days = Math.floor(hrs / 24);
        if (secs < 60)  return 'Just now';
        if (mins < 60)  return `${mins}m ago`;
        if (hrs  < 24)  return `${hrs}h ago`;
        if (days < 7)   return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatFull(date: Date): string {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            + ' · '
            + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private toDbRecord(s: VersionSnapshot): any {
        return {
            id: s.id, contentId: s.contentId, contentType: s.contentType,
            title: s.title, content: s.content, wordCount: s.wordCount,
            description: s.description, timestamp: s.timestampIso,
        };
    }

    private fromDbRecord(r: any): VersionSnapshot {
        const ts = r.timestamp ? new Date(r.timestamp) : new Date();
        return {
            id: r.id, contentId: r.contentId, contentType: r.contentType,
            title: r.title, content: r.content ?? '', wordCount: r.wordCount ?? 0,
            description: r.description, timestamp: ts, timestampIso: r.timestamp ?? ts.toISOString(),
        };
    }

    private generateDescription(content: string, wordCount: number): string {
        if (!content?.trim()) return 'Empty content';
        const preview = content.replace(/<[^>]*>/g, '').substring(0, 50);
        return `${wordCount} words · ${preview}…`;
    }
}
