import { Injectable, signal } from '@angular/core';

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
  providedIn: 'root',
})
export class VersionHistoryService {
  // Store history for each content item
  private histories = new Map<string, VersionHistory>();

  // Maximum versions to keep per item
  private readonly MAX_VERSIONS = 50;

  // Debounce time for auto-snapshots (ms)
  private readonly SNAPSHOT_DEBOUNCE = 30000; // 30 seconds

  // Track debounce timers
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Create a snapshot of content
   */
  createSnapshot(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
    content: string,
    title?: string,
    wordCount: number = 0,
    description?: string,
  ): VersionSnapshot {
    return {
      id: `${contentId}-${Date.now()}`,
      timestamp: new Date(),
      contentId,
      contentType,
      content,
      title,
      wordCount,
      description: description || this.generateDescription(content, wordCount),
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
    immediate: boolean = false,
  ): void {
    const key = `${contentType}-${contentId}`;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const addSnapshot = () => {
      const history = this.getHistory(contentId, contentType);
      const snapshot = this.createSnapshot(
        contentId,
        contentType,
        content,
        title,
        wordCount,
      );

      // If we're not at the end of history, remove future versions (branching)
      if (history.currentIndex < history.versions.length - 1) {
        history.versions = history.versions.slice(0, history.currentIndex + 1);
      }

      // Add new version
      history.versions.push(snapshot);

      // Limit versions
      if (history.versions.length > this.MAX_VERSIONS) {
        history.versions.shift();
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
  getHistory(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): VersionHistory {
    const key = `${contentType}-${contentId}`;

    if (!this.histories.has(key)) {
      this.histories.set(key, {
        contentId,
        contentType,
        versions: [],
        currentIndex: -1,
      });
    }

    return this.histories.get(key)!;
  }

  /**
   * Get all versions for a content item
   */
  getVersions(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): VersionSnapshot[] {
    const history = this.getHistory(contentId, contentType);
    return [...history.versions];
  }

  /**
   * Get current version
   */
  getCurrentVersion(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): VersionSnapshot | null {
    const history = this.getHistory(contentId, contentType);
    if (
      history.currentIndex >= 0 &&
      history.currentIndex < history.versions.length
    ) {
      return history.versions[history.currentIndex];
    }
    return null;
  }

  /**
   * Check if undo is available
   */
  canUndo(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): boolean {
    const history = this.getHistory(contentId, contentType);
    return history.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): boolean {
    const history = this.getHistory(contentId, contentType);
    return history.currentIndex < history.versions.length - 1;
  }

  /**
   * Undo to previous version
   */
  undo(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): VersionSnapshot | null {
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
  redo(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): VersionSnapshot | null {
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
    versionId: string,
  ): VersionSnapshot | null {
    const history = this.getHistory(contentId, contentType);
    const versionIndex = history.versions.findIndex((v) => v.id === versionId);

    if (versionIndex >= 0) {
      // If restoring an old version, create a new branch
      if (versionIndex < history.currentIndex) {
        // Create a new snapshot from the restored version
        const restoredVersion = history.versions[versionIndex];
        const newSnapshot = this.createSnapshot(
          contentId,
          contentType,
          restoredVersion.content,
          restoredVersion.title,
          restoredVersion.wordCount,
          'Restored from version history',
        );

        // Remove future versions and add the restored one
        history.versions = history.versions.slice(0, versionIndex + 1);
        history.versions.push(newSnapshot);
        history.currentIndex = history.versions.length - 1;

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
  clearHistory(
    contentId: string,
    contentType: 'chapter' | 'frontMatter' | 'prologue',
  ): void {
    const key = `${contentType}-${contentId}`;
    this.histories.delete(key);

    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
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
