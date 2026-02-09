import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import { Novel, Chapter, Character, Location, ChapterGroup, NovelContent, FrontMatterItem, Prologue, EditorNote } from './novel.model';
import { NovelEvents } from './novel.events';

@Injectable({ providedIn: 'root' })
export class NovelCommands {
    private eventBus = inject(EventBus);

    // Novel Lifecycle
    createNovel(novel: Novel, content?: NovelContent): void {
        this.eventBus.dispatch({
            type: NovelEvents.CREATED,
            payload: { novel, content }
        });
    }

    updateNovel(id: string, updates: Partial<Novel>): void {
        this.eventBus.dispatch({
            type: NovelEvents.UPDATED,
            payload: { id, updates }
        });
    }

    deleteNovel(id: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.DELETED,
            payload: { id }
        });
    }

    // Chapters
    createChapter(novelId: string, groupId: string, chapter: Chapter): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHAPTER_CREATED,
            payload: { novelId, groupId, chapter }
        });
    }

    updateChapter(novelId: string, chapterId: string, updates: Partial<Chapter>): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHAPTER_UPDATED,
            payload: { novelId, chapterId, updates }
        });
    }

    deleteChapter(novelId: string, chapterId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHAPTER_DELETED,
            payload: { novelId, chapterId }
        });
    }


    moveChapter(novelId: string, chapterId: string, fromGroupId: string, toGroupId: string, newIndex: number): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHAPTER_MOVED,
            payload: { novelId, chapterId, fromGroupId, toGroupId, newIndex }
        });
    }

    // Groups
    createGroup(novelId: string, group: ChapterGroup): void {
        this.eventBus.dispatch({
            type: NovelEvents.GROUP_CREATED,
            payload: { novelId, group }
        });
    }

    updateGroup(novelId: string, groupId: string, updates: Partial<ChapterGroup>): void {
        this.eventBus.dispatch({
            type: NovelEvents.GROUP_UPDATED,
            payload: { novelId, groupId, updates }
        });
    }

    deleteGroup(novelId: string, groupId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.GROUP_DELETED,
            payload: { novelId, groupId }
        });
    }

    reorderGroup(novelId: string, fromIndex: number, toIndex: number): void {
        this.eventBus.dispatch({
            type: NovelEvents.GROUP_MOVED,
            payload: { novelId, fromIndex, toIndex }
        });
    }

    // Entities
    createCharacter(novelId: string, character: Character): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHARACTER_CREATED,
            payload: { novelId, character }
        });
    }

    updateCharacter(novelId: string, characterId: string, updates: Partial<Character>): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHARACTER_UPDATED,
            payload: { novelId, characterId, updates }
        });
    }

    deleteCharacter(novelId: string, characterId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.CHARACTER_DELETED,
            payload: { novelId, characterId }
        });
    }

    createLocation(novelId: string, location: Location): void {
        this.eventBus.dispatch({
            type: NovelEvents.LOCATION_CREATED,
            payload: { novelId, location }
        });
    }

    updateLocation(novelId: string, locationId: string, updates: Partial<Location>): void {
        this.eventBus.dispatch({
            type: NovelEvents.LOCATION_UPDATED,
            payload: { novelId, locationId, updates }
        });
    }

    deleteLocation(novelId: string, locationId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.LOCATION_DELETED,
            payload: { novelId, locationId }
        });
    }

    // Front Matter
    createFrontMatter(novelId: string, item: FrontMatterItem): void {
        this.eventBus.dispatch({
            type: NovelEvents.FRONT_MATTER_CREATED,
            payload: { novelId, item }
        });
    }

    updateFrontMatter(novelId: string, itemId: string, updates: Partial<FrontMatterItem>): void {
        this.eventBus.dispatch({
            type: NovelEvents.FRONT_MATTER_UPDATED,
            payload: { novelId, itemId, updates }
        });
    }

    deleteFrontMatter(novelId: string, itemId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.FRONT_MATTER_DELETED,
            payload: { novelId, itemId }
        });
    }

    // Prologue
    createPrologue(novelId: string, prologue: Prologue): void {
        this.eventBus.dispatch({
            type: NovelEvents.PROLOGUE_CREATED,
            payload: { novelId, prologue }
        });
    }

    updatePrologue(novelId: string, prologue: Prologue): void {
        this.eventBus.dispatch({
            type: NovelEvents.PROLOGUE_UPDATED,
            payload: { novelId, prologue }
        });
    }

    deletePrologue(novelId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.PROLOGUE_DELETED,
            payload: { novelId }
        });
    }

    // Notes
    createNote(novelId: string, note: EditorNote): void {
        this.eventBus.dispatch({
            type: NovelEvents.NOTE_CREATED,
            payload: { novelId, note }
        });
    }

    updateNote(novelId: string, noteId: string, updates: Partial<EditorNote>): void {
        this.eventBus.dispatch({
            type: NovelEvents.NOTE_UPDATED,
            payload: { novelId, noteId, updates }
        });
    }

    deleteNote(novelId: string, noteId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.NOTE_DELETED,
            payload: { novelId, noteId }
        });
    }

    // Content Loading
    loadNovelContent(novelId: string): void {
        this.eventBus.dispatch({
            type: NovelEvents.LOAD_CONTENT,
            payload: { novelId }
        });
    }
}
