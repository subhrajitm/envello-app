import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import {
    NovelEvents,
    NovelCreatedPayload,
    NovelUpdatedPayload,
    NovelDeletedPayload,
    NovelContentLoadedPayload,
    ChapterCreatedPayload,
    ChapterUpdatedPayload,
    ChapterDeletedPayload,
    ChapterMovedPayload,
    GroupCreatedPayload,
    GroupUpdatedPayload,
    GroupDeletedPayload,
    CharacterCreatedPayload,
    CharacterUpdatedPayload,
    CharacterDeletedPayload,
    LocationCreatedPayload,
    LocationUpdatedPayload,
    LocationDeletedPayload,
    LoadContentPayload
} from '@envello/shared-domain';
import { NovelStore } from '@envello/shared-state';
import { PersistenceAdapter } from '../adapters/persistence.adapter';

@Injectable({ providedIn: 'root' })
export class NovelPersistenceEffect {
    private eventBus = inject(EventBus);
    private novelStore = inject(NovelStore);
    private persistence = inject(PersistenceAdapter);

    private saveTimeout: any;
    private readonly SAVE_DEBOUNCE_MS = 2000;

    constructor() {
        this.loadInitialData();
        this.registerEffects();
    }

    private async loadInitialData(): Promise<void> {
        try {
            const novels = await this.persistence.loadNovels();
            this.novelStore.setNovels(novels);
            console.log(`[NovelPersistenceEffect] Loaded ${novels.length} novels`);
        } catch (error) {
            console.error('[NovelPersistenceEffect] Failed to load novels:', error);
        }
    }

    private registerEffects(): void {
        // Novel Lifecycle
        this.eventBus.on<NovelCreatedPayload>(NovelEvents.CREATED)
            .subscribe(async ({ novel, content }) => {
                try {
                    await this.persistence.upsertNovel(novel);
                    if (content) {
                        await this.persistence.saveNovelContent(novel.id, content);
                    }
                    console.log(`[NovelPersistenceEffect] Created novel: ${novel.id}`);
                } catch (error) {
                    console.error('[NovelPersistenceEffect] Failed to create novel:', error);
                }
            });

        this.eventBus.on<NovelUpdatedPayload>(NovelEvents.UPDATED)
            .subscribe(async ({ id, updates }) => {
                try {
                    const novel = this.novelStore.novels().find(n => n.id === id);
                    if (novel) {
                        const updated = { ...novel, ...updates };
                        await this.persistence.upsertNovel(updated);
                        console.log(`[NovelPersistenceEffect] Updated novel: ${id}`);
                    }
                } catch (error) {
                    console.error('[NovelPersistenceEffect] Failed to update novel:', error);
                }
            });

        this.eventBus.on<NovelDeletedPayload>(NovelEvents.DELETED)
            .subscribe(async ({ id }) => {
                try {
                    await this.persistence.removeNovel(id);
                    await this.persistence.removeNovelContent(id);
                    console.log(`[NovelPersistenceEffect] Deleted novel: ${id}`);
                } catch (error) {
                    console.error('[NovelPersistenceEffect] Failed to delete novel:', error);
                }
            });

        // Content Loading
        this.eventBus.on<LoadContentPayload>(NovelEvents.LOAD_CONTENT)
            .subscribe(async ({ novelId }) => {
                try {
                    let content = await this.persistence.loadNovelContent(novelId);
                    if (!content) {
                        console.log(`[NovelPersistenceEffect] Content not found for ${novelId}, creating empty.`);
                        const novelTitle = this.novelStore.novels().find(n => n.id === novelId)?.title || 'Untitled Novel';
                        content = this.createEmptyNovel(novelId, novelTitle);
                        await this.persistence.saveNovelContent(novelId, content);
                    }

                    this.eventBus.dispatch({
                        type: NovelEvents.CONTENT_LOADED,
                        payload: { id: novelId, content }
                    });
                } catch (e) {
                    console.error(`[NovelPersistenceEffect] Failed to load content for ${novelId}`, e);
                }
            });

        // Listen for ANY content change to trigger debounced save
        const contentEvents = [
            NovelEvents.CHAPTER_CREATED, NovelEvents.CHAPTER_UPDATED, NovelEvents.CHAPTER_DELETED, NovelEvents.CHAPTER_MOVED,
            NovelEvents.GROUP_CREATED, NovelEvents.GROUP_UPDATED, NovelEvents.GROUP_DELETED,
            NovelEvents.GROUP_MOVED,
            NovelEvents.CHARACTER_CREATED, NovelEvents.CHARACTER_UPDATED, NovelEvents.CHARACTER_DELETED,
            NovelEvents.LOCATION_CREATED, NovelEvents.LOCATION_UPDATED, NovelEvents.LOCATION_DELETED,
            NovelEvents.FRONT_MATTER_CREATED, NovelEvents.FRONT_MATTER_UPDATED, NovelEvents.FRONT_MATTER_DELETED,
            NovelEvents.PROLOGUE_UPDATED, NovelEvents.PROLOGUE_DELETED,
            NovelEvents.NOTE_CREATED, NovelEvents.NOTE_UPDATED, NovelEvents.NOTE_DELETED
        ];

        contentEvents.forEach(eventType => {
            this.eventBus.on(eventType).subscribe(() => {
                this.scheduleSave();
            });
        });
    }

    private scheduleSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            const activeNovel = this.novelStore.activeNovel();
            if (activeNovel) {
                try {
                    await this.persistence.saveNovelContent(activeNovel.id, activeNovel);
                    // Also update the novel metadata (e.g. word count, last updated)
                    const novelMetadata = this.novelStore.novels().find(n => n.id === activeNovel.id);
                    if (novelMetadata) {
                        // Recalculate word count from content
                        let totalWords = 0;
                        activeNovel.chapters.forEach(g => g.children.forEach(c => totalWords += c.wordCount));

                        const updatedMeta = {
                            ...novelMetadata,
                            wordCount: totalWords,
                            lastUpdated: new Date().toISOString(),
                            isRecentlyUpdated: true
                        };
                        await this.persistence.upsertNovel(updatedMeta);
                        // Update store logic for metadata is complicated here because we are in an effect.
                        // Ideally we dispatch `NovelEvents.UPDATED` but that might cause a loop if we are not careful.
                        // But `NovelEvents.UPDATED` updates the store and persists.
                        // If we just persist here, the store might be out of sync regarding 'lastUpdated'.
                        // Let's dispatch a quiet update or just persist. 
                        // For now, just persist metadata directly to DB.
                    }
                    console.log(`[NovelPersistenceEffect] Auto-saved content for ${activeNovel.id}`);
                } catch (error) {
                    console.error('[NovelPersistenceEffect] Failed to auto-save novel content:', error);
                }
            }
        }, this.SAVE_DEBOUNCE_MS);
    }

    private createEmptyNovel(id: string, title: string = 'Untitled Novel'): any { // Cast to avoid circular dep if needed, but preferably NovelContent
        return {
            id,
            title,
            synopsis: { logline: '', theme: '' },
            frontMatter: [],
            chapters: [
                { id: 'g1', title: 'Part 1', expanded: true, children: [] }
            ],
            characters: [],
            locations: [],
            notes: []
        };
    }

    // Helper to trigger loading content
    async loadNovelContent(id: string): Promise<void> {
        try {
            const content = await this.persistence.loadNovelContent(id);
            this.eventBus.dispatch({
                type: NovelEvents.CONTENT_LOADED,
                payload: { id, content }
            });
        } catch (e) {
            console.error(`[NovelPersistenceEffect] Failed to load content for ${id}`, e);
        }
    }
}
