import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import { NovelContent } from '@envello/shared-domain';
import { NovelStore } from '../stores/novel.store';
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
    FrontMatterCreatedPayload,
    FrontMatterUpdatedPayload,
    FrontMatterDeletedPayload,
    PrologueUpdatedPayload,
    PrologueDeletedPayload,
    NovelNoteCreatedPayload,
    NovelNoteUpdatedPayload,
    NovelNoteDeletedPayload
} from '@envello/shared-domain';

/**
 * Novel Reducer
 * Handles all novel-related events and updates the NovelStore
 */
@Injectable({ providedIn: 'root' })
export class NovelReducer {
    private eventBus = inject(EventBus);
    private novelStore = inject(NovelStore);

    constructor() {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Novel Lifecycle
        this.eventBus.on<NovelCreatedPayload>(NovelEvents.CREATED)
            .subscribe(({ novel, content }) => {
                this.novelStore.addNovel(novel);
                if (content) {
                    this.novelStore.setActiveNovel(content);
                }
            });

        this.eventBus.on<NovelUpdatedPayload>(NovelEvents.UPDATED)
            .subscribe(({ id, updates }) => {
                this.novelStore.updateNovel(id, updates);
            });

        this.eventBus.on<NovelDeletedPayload>(NovelEvents.DELETED)
            .subscribe(({ id }) => {
                this.novelStore.removeNovel(id);
            });

        this.eventBus.on<NovelContentLoadedPayload>(NovelEvents.CONTENT_LOADED)
            .subscribe(({ content }) => {
                this.novelStore.setActiveNovel(content);
            });

        // Chapters
        this.eventBus.on<ChapterCreatedPayload>(NovelEvents.CHAPTER_CREATED)
            .subscribe(({ groupId, chapter }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    chapters: novel.chapters.map(g =>
                        g.id === groupId
                            ? { ...g, children: [...g.children, chapter] }
                            : g
                    )
                }));
            });

        this.eventBus.on<ChapterUpdatedPayload>(NovelEvents.CHAPTER_UPDATED)
            .subscribe(({ chapterId, updates }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    chapters: novel.chapters.map(g => ({
                        ...g,
                        children: g.children.map(c =>
                            c.id === chapterId ? { ...c, ...updates } : c
                        )
                    }))
                }));
            });

        this.eventBus.on<ChapterDeletedPayload>(NovelEvents.CHAPTER_DELETED)
            .subscribe(({ chapterId }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    chapters: novel.chapters.map(g => ({
                        ...g,
                        children: g.children.filter(c => c.id !== chapterId)
                    }))
                }));
            });

        // Groups
        this.eventBus.on<GroupCreatedPayload>(NovelEvents.GROUP_CREATED)
            .subscribe(({ group }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    chapters: [...novel.chapters, group]
                }));
            });

        this.eventBus.on<GroupUpdatedPayload>(NovelEvents.GROUP_UPDATED)
            .subscribe(({ groupId, updates }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    chapters: novel.chapters.map(g =>
                        g.id === groupId ? { ...g, ...updates } : g
                    )
                }));
            });

        this.eventBus.on<GroupDeletedPayload>(NovelEvents.GROUP_DELETED)
            .subscribe(({ groupId }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    chapters: novel.chapters.filter(g => g.id !== groupId)
                }));
            });

        // Entities - Characters
        this.eventBus.on<CharacterCreatedPayload>(NovelEvents.CHARACTER_CREATED)
            .subscribe(({ character }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    characters: [...novel.characters, character]
                }));
            });

        this.eventBus.on<CharacterUpdatedPayload>(NovelEvents.CHARACTER_UPDATED)
            .subscribe(({ characterId, updates }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    characters: novel.characters.map(c =>
                        c.id === characterId ? { ...c, ...updates } : c
                    )
                }));
            });

        this.eventBus.on<CharacterDeletedPayload>(NovelEvents.CHARACTER_DELETED)
            .subscribe(({ characterId }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    characters: novel.characters.filter(c => c.id !== characterId)
                }));
            });

        // Entities - Locations
        this.eventBus.on<LocationCreatedPayload>(NovelEvents.LOCATION_CREATED)
            .subscribe(({ location }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    locations: [...novel.locations, location]
                }));
            });

        this.eventBus.on<LocationUpdatedPayload>(NovelEvents.LOCATION_UPDATED)
            .subscribe(({ locationId, updates }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    locations: novel.locations.map(l =>
                        l.id === locationId ? { ...l, ...updates } : l
                    )
                }));
            });

        this.eventBus.on<LocationDeletedPayload>(NovelEvents.LOCATION_DELETED)
            .subscribe(({ locationId }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    locations: novel.locations.filter(l => l.id !== locationId)
                }));
            });

        // Front Matter
        this.eventBus.on<FrontMatterCreatedPayload>(NovelEvents.FRONT_MATTER_CREATED)
            .subscribe(({ item }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    frontMatter: [...novel.frontMatter, item]
                }));
            });

        this.eventBus.on<FrontMatterUpdatedPayload>(NovelEvents.FRONT_MATTER_UPDATED)
            .subscribe(({ itemId, updates }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    frontMatter: novel.frontMatter.map(item =>
                        item.id === itemId ? { ...item, ...updates } : item
                    )
                }));
            });

        this.eventBus.on<FrontMatterDeletedPayload>(NovelEvents.FRONT_MATTER_DELETED)
            .subscribe(({ itemId }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    frontMatter: novel.frontMatter.filter(item => item.id !== itemId)
                }));
            });

        // Prologue
        this.eventBus.on<PrologueUpdatedPayload>(NovelEvents.PROLOGUE_UPDATED)
            .subscribe(({ prologue }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    prologue: prologue
                }));
            });

        this.eventBus.on<PrologueDeletedPayload>(NovelEvents.PROLOGUE_DELETED)
            .subscribe(() => {
                this.novelStore.updateActiveNovelContent(novel => {
                    // Create a new object without the prologue key if possible, or set to undefined
                    const { prologue, ...rest } = novel;
                    return rest as NovelContent; // Cast needed as prologue is optional in interface
                });
            });

        // Notes
        this.eventBus.on<NovelNoteCreatedPayload>(NovelEvents.NOTE_CREATED)
            .subscribe(({ note }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    notes: [...novel.notes, note]
                }));
            });

        this.eventBus.on<NovelNoteUpdatedPayload>(NovelEvents.NOTE_UPDATED)
            .subscribe(({ noteId, updates }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    notes: novel.notes.map(n =>
                        n.id === noteId ? { ...n, ...updates } : n
                    )
                }));
            });

        this.eventBus.on<NovelNoteDeletedPayload>(NovelEvents.NOTE_DELETED)
            .subscribe(({ noteId }) => {
                this.novelStore.updateActiveNovelContent(novel => ({
                    ...novel,
                    notes: novel.notes.filter(n => n.id !== noteId)
                }));
            });
    }
}
