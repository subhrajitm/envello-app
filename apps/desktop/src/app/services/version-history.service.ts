import { Injectable, inject, signal } from '@angular/core';
import { RxdbService } from '../core/services/rxdb.service';

export interface VersionSnapshot {
    id: string;
    timestamp: Date;
    contentId: string; // chapter id, front matter id, or 'prologue'
    contentType: 'chapter' | 'frontMatter' | 'prologue';
    content: string;
    title?: string;
    wordCount: number;
    description?: string; // Auto-generated description of the change
}

export interface VersionHistory {
    contentId: string;
    contentType: 'chapter' | 'frontMatter' | 'prologue';
    versions: VersionSnapshot[];
    currentIndex: number; // Index of current version in versions array
}

@Injectable({
    providedIn: 'root'
})
export class VersionHistoryService {
    private rxdb = inject(RxdbService);

    // Store history for each content item
    private histories = new Map<string, VersionHistory>();

    // Maximum versions to keep per item
    private readonly MAX_VERSIONS = 50;

    // Debounce time for auto-snapshots (ms)
    private readonly SNAPSHOT_DEBOUNCE = 30000; // 30 seconds

    // Track debounce timers
    private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

    /**
     * Load history from RxDB
     */
    async loadVersions(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): Promise<void> {
        const key = `${contentType}-${contentId}`;
        const rawVersions = await this.rxdb.getAllVersions(contentId, contentType);

        const versions: VersionSnapshot[] = rawVersions.map(v => ({
            id: v.id,
            timestamp: new Date(v.timestamp),
            contentId: v.contentId,
            contentType: v.contentType as any,
            content: v.content,
            title: v.title,
            wordCount: v.wordCount,
            description: v.description
        }));

        this.histories.set(key, {
            contentId,
            contentType,
            versions: versions,
            currentIndex: versions.length - 1
        });
    }

    /**
     * Create a snapshot of content
     */
    createSnapshot(
        contentId: string,
        contentType: 'chapter' | 'frontMatter' | 'prologue',
        content: string,
        title?: string,
        wordCount: number = 0,
        description?: string
    ): VersionSnapshot {
        return {
            id: `${contentId}-${Date.now()}`,
            timestamp: new Date(),
            contentId,
            contentType,
            content,
            title,
            wordCount,
            description: description || this.generateDescription(content, wordCount)
        };
    }

    /**
     * Add a version to history (with debouncing for auto-saves)
     */
    addVersion(
        contentId: string,
        contentType: 'chapter' | 'frontMatter' | 'prologue',
        content: string,
        title?: string,
        wordCount: number = 0,
        immediate: boolean = false
    ): void {
        const key = `${contentType}-${contentId}`;

        // Clear existing debounce timer
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const addSnapshot = async () => {
            // Ensure history is initialized (might be empty if not loaded yet)
            let history = this.histories.get(key);
            if (!history) {
                await this.loadVersions(contentId, contentType);
                history = this.histories.get(key)!;
            }

            // Check if content has changed from current version to prevent duplicates on load
            if (history.currentIndex >= 0 && history.currentIndex < history.versions.length) {
                const current = history.versions[history.currentIndex];
                // Simple equality check. For large content, hash might be better but string compare is okay for now.
                if (current.content === content && current.title === title) {
                    return;
                }
            }

            const snapshot = this.createSnapshot(contentId, contentType, content, title, wordCount);

            // If we're not at the end of history, remove future versions (branching)
            if (history.currentIndex < history.versions.length - 1) {
                const removed = history.versions.slice(history.currentIndex + 1);
                // Remove form RxDB
                removed.forEach(v => this.rxdb.removeVersion(v.id));
                history.versions = history.versions.slice(0, history.currentIndex + 1);
            }

            // Add new version
            history.versions.push(snapshot);

            // Save to RxDB
            await this.rxdb.upsertVersion({
                ...snapshot,
                timestamp: snapshot.timestamp.toISOString()
            });

            // Limit versions
            if (history.versions.length > this.MAX_VERSIONS) {
                const removed = history.versions.shift();
                if (removed) this.rxdb.removeVersion(removed.id);
            } else {
                history.currentIndex = history.versions.length - 1;
            }
        };

        if (immediate) {
            addSnapshot();
        } else {
            // Debounce auto-saves
            const timer = setTimeout(() => {
                addSnapshot();
                this.debounceTimers.delete(key);
            }, this.SNAPSHOT_DEBOUNCE);
            this.debounceTimers.set(key, timer);
        }
    }

    /**
     * Get or create history for a content item
     */
    getHistory(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionHistory {
        const key = `${contentType}-${contentId}`;

        if (!this.histories.has(key)) {
            this.histories.set(key, {
                contentId,
                contentType,
                versions: [],
                currentIndex: -1
            });
            // Trigger load in background if empty
            this.loadVersions(contentId, contentType);
        }

        return this.histories.get(key)!;
    }

    /**
     * Get all versions for a content item
     */
    getVersions(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot[] {
        const history = this.getHistory(contentId, contentType);
        return [...history.versions];
    }

    /**
     * Get current version
     */
    getCurrentVersion(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null {
        const history = this.getHistory(contentId, contentType);
        if (history.currentIndex >= 0 && history.currentIndex < history.versions.length) {
            return history.versions[history.currentIndex];
        }
        return null;
    }

    /**
     * Check if undo is available
     */
    canUndo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): boolean {
        const history = this.getHistory(contentId, contentType);
        return history.currentIndex > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): boolean {
        const history = this.getHistory(contentId, contentType);
        return history.currentIndex < history.versions.length - 1;
    }

    /**
     * Undo to previous version
     */
    undo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null {
        const history = this.getHistory(contentId, contentType);

        if (history.currentIndex > 0) {
            history.currentIndex--;
            return history.versions[history.currentIndex];
        }

        return null;
    }

    /**
     * Redo to next version
     */
    redo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null {
        const history = this.getHistory(contentId, contentType);

        if (history.currentIndex < history.versions.length - 1) {
            history.currentIndex++;
            return history.versions[history.currentIndex];
        }

        return null;
    }

    /**
     * Restore a specific version
     */
    restoreVersion(
        contentId: string,
        contentType: 'chapter' | 'frontMatter' | 'prologue',
        versionId: string
    ): VersionSnapshot | null {
        const history = this.getHistory(contentId, contentType);
        const versionIndex = history.versions.findIndex(v => v.id === versionId);

        if (versionIndex >= 0) {
            // If restoring an old version, create a new branch
            if (versionIndex < history.currentIndex) {
                // Remove future versions from DB
                const removed = history.versions.slice(versionIndex + 1);
                removed.forEach(v => this.rxdb.removeVersion(v.id));

                // Create a new snapshot from the restored version
                const restoredVersion = history.versions[versionIndex];
                const newSnapshot = this.createSnapshot(
                    contentId,
                    contentType,
                    restoredVersion.content,
                    restoredVersion.title,
                    restoredVersion.wordCount,
                    'Restored from version history'
                );

                // Remove future versions and add the restored one
                history.versions = history.versions.slice(0, versionIndex + 1);
                history.versions.push(newSnapshot);
                history.currentIndex = history.versions.length - 1;

                // Save new snapshot to DB
                this.rxdb.upsertVersion({
                    ...newSnapshot,
                    timestamp: newSnapshot.timestamp.toISOString()
                });

                return newSnapshot;
            } else {
                history.currentIndex = versionIndex;
                return history.versions[versionIndex];
            }
        }

        return null;
    }

    /**
     * Clear history for a content item
     */
    async clearHistory(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): Promise<void> {
        const key = `${contentType}-${contentId}`;
        this.histories.delete(key);

        const timer = this.debounceTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(key);
        }

        await this.rxdb.clearVersions(contentId, contentType);
    }

    /**
     * Generate a description for a version
     */
    private generateDescription(content: string, wordCount: number): string {
        if (!content || content.trim().length === 0) {
            return 'Empty content';
        }

        const preview = content.replace(/<[^>]*>/g, '').substring(0, 50);
        return `${wordCount} words - ${preview}...`;
    }

    /**
     * Get formatted timestamp
     */
    formatTimestamp(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days < 7) {
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}
