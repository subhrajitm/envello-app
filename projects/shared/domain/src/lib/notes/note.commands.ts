import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import { NoteEvents } from './note.events';
import { Note } from './note.model';

/**
 * Note Commands
 * Facade service for dispatching note-related commands
 * Components should use this service instead of directly calling EventBus
 */
@Injectable({ providedIn: 'root' })
export class NoteCommands {
    private eventBus = inject(EventBus);

    /**
     * Create a new note
     */
    createNote(note: Note): void {
        this.eventBus.dispatch({
            type: NoteEvents.CREATED,
            payload: { note }
        });
    }

    /**
     * Update an existing note
     */
    updateNote(id: string, updates: Partial<Note>): void {
        this.eventBus.dispatch({
            type: NoteEvents.UPDATED,
            payload: { id, updates }
        });
    }

    /**
     * Delete a note
     */
    deleteNote(id: string): void {
        this.eventBus.dispatch({
            type: NoteEvents.DELETED,
            payload: { id }
        });
    }

    /**
     * Load note content from file system
     */
    loadNoteContent(id: string): void {
        this.eventBus.dispatch({
            type: NoteEvents.CONTENT_LOADED,
            payload: { id, content: '' } // Content will be loaded by effect
        });
    }

    /**
     * Add a tag to a note
     */
    addTag(id: string, tag: string): void {
        this.eventBus.dispatch({
            type: NoteEvents.TAG_ADDED,
            payload: { id, tag }
        });
    }

    /**
     * Remove a tag from a note
     */
    removeTag(id: string, tag: string): void {
        this.eventBus.dispatch({
            type: NoteEvents.TAG_REMOVED,
            payload: { id, tag }
        });
    }
}
