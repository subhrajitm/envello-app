import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import { NoteStore } from '../stores/note.store';
import {
    NoteEvents,
    NoteCreatedPayload,
    NoteUpdatedPayload,
    NoteDeletedPayload,
    NoteContentLoadedPayload,
    NoteTagAddedPayload,
    NoteTagRemovedPayload
} from '@envello/shared-domain';

/**
 * Note Reducer
 * Handles all note-related events and updates the NoteStore
 * Pure functions: (state, event) => newState
 */
@Injectable({ providedIn: 'root' })
export class NoteReducer {
    private eventBus = inject(EventBus);
    private noteStore = inject(NoteStore);

    constructor() {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Note Created
        this.eventBus.on<NoteCreatedPayload>(NoteEvents.CREATED)
            .subscribe(({ note }) => {
                this.noteStore.addNote(note);
            });

        // Note Updated
        this.eventBus.on<NoteUpdatedPayload>(NoteEvents.UPDATED)
            .subscribe(({ id, updates }) => {
                this.noteStore.updateNote(id, updates);
            });

        // Note Deleted
        this.eventBus.on<NoteDeletedPayload>(NoteEvents.DELETED)
            .subscribe(({ id }) => {
                this.noteStore.removeNote(id);
            });

        // Note Content Loaded
        this.eventBus.on<NoteContentLoadedPayload>(NoteEvents.CONTENT_LOADED)
            .subscribe(({ id, content }) => {
                this.noteStore.updateNote(id, { content });
            });

        // Tag Added
        this.eventBus.on<NoteTagAddedPayload>(NoteEvents.TAG_ADDED)
            .subscribe(({ id, tag }) => {
                const note = this.noteStore.noteById(id)();
                if (note) {
                    const currentTags = note.tags || [];
                    if (!currentTags.includes(tag)) {
                        this.noteStore.updateNote(id, { tags: [...currentTags, tag] });
                    }
                }
            });

        // Tag Removed
        this.eventBus.on<NoteTagRemovedPayload>(NoteEvents.TAG_REMOVED)
            .subscribe(({ id, tag }) => {
                const note = this.noteStore.noteById(id)();
                if (note && note.tags) {
                    this.noteStore.updateNote(id, { tags: note.tags.filter((t: string) => t !== tag) });
                }
            });
    }
}
