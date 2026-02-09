import { Injectable, signal, computed } from '@angular/core';
import { Novel, NovelContent, Chapter, Character, Location } from '@envello/shared-domain';

/**
 * Novel Store
 * Domain-specific store for novel state management
 * Uses Angular Signals for reactive state
 */
@Injectable({ providedIn: 'root' })
export class NovelStore {
    // Private state
    private _novels = signal<Novel[]>([]);
    private _activeNovel = signal<NovelContent | null>(null);

    // Public read-only state
    readonly novels = this._novels.asReadonly();
    readonly activeNovel = this._activeNovel.asReadonly();

    // Computed selectors

    // List selectors
    readonly totalWordCount = computed(() =>
        this._novels().reduce((acc, curr) => acc + curr.wordCount, 0)
    );

    readonly activeDraftCount = computed(() =>
        this._novels().filter(n => n.status !== 'PUBLISHED').length
    );

    // Active Novel selectors
    readonly activeNovelTitle = computed(() => this._activeNovel()?.title || '');

    readonly activeNovelCharacters = computed(() => this._activeNovel()?.characters || []);

    readonly activeNovelLocations = computed(() => this._activeNovel()?.locations || []);

    readonly activeNovelStats = computed(() => {
        const novel = this._activeNovel();
        if (!novel) return null;

        let chapterCount = 0;
        let wordCount = 0;

        novel.chapters.forEach(group => {
            chapterCount += group.children.length;
            group.children.forEach(c => wordCount += c.wordCount);
        });

        return { chapterCount, wordCount };
    });

    // State mutations (called by reducers only)

    setNovels(novels: Novel[]): void {
        this._novels.set(novels);
    }

    addNovel(novel: Novel): void {
        this._novels.update(novels => [novel, ...novels]);
    }

    updateNovel(id: string, updates: Partial<Novel>): void {
        this._novels.update(novels =>
            novels.map(n => n.id === id ? { ...n, ...updates } : n)
        );

        // Also update active novel if it matches
        const active = this._activeNovel();
        if (active && active.id === id) {
            this._activeNovel.update(current =>
                current ? { ...current, title: updates.title || current.title } : null
            );
        }
    }

    removeNovel(id: string): void {
        this._novels.update(novels => novels.filter(n => n.id !== id));

        if (this._activeNovel()?.id === id) {
            this._activeNovel.set(null);
        }
    }

    // Active Novel Mutations

    setActiveNovel(novel: NovelContent): void {
        this._activeNovel.set(novel);
    }

    // Since NovelContent is a large object, we'll provide finer-grained update methods
    // These will be called by the reducer to avoid replacing the entire object for small changes

    updateActiveNovelContent(updater: (novel: NovelContent) => NovelContent): void {
        this._activeNovel.update(current => current ? updater(current) : null);
    }

    clearActiveNovel(): void {
        this._activeNovel.set(null);
    }
}
