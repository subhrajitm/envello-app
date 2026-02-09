import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import {
    NoteEvents,
    NoteCreatedPayload,
    NoteUpdatedPayload,
    NoteDeletedPayload,
    NoteLoadContentPayload,
    NoteContentLoadedPayload
} from '@envello/shared-domain';
import { NoteStore } from '@envello/shared-state';
import { PersistenceAdapter } from '../adapters/persistence.adapter';

/**
 * Note Persistence Effect
 * Listens to note events and persists changes to database and file system
 * Also handles initial data loading
 */
@Injectable({ providedIn: 'root' })
export class NotePersistenceEffect {
    private eventBus = inject(EventBus);
    private noteStore = inject(NoteStore);
    private persistence = inject(PersistenceAdapter);

    // Debounce timers for file saves
    private saveTimeouts: { [id: string]: any } = {};

    constructor() {
        this.loadInitialData();
        this.registerEffects();
    }

    /**
     * Load notes from database on initialization
     */
    private async loadInitialData(): Promise<void> {
        try {
            const notes = await this.persistence.loadNotes();
            this.noteStore.setNotes(notes);
            console.log(`[NotePersistenceEffect] Loaded ${notes.length} notes from database`);
        } catch (error) {
            console.error('[NotePersistenceEffect] Failed to load notes:', error as Error);
        }
    }

    /**
     * Register persistence effects for note events
     */
    private registerEffects(): void {
        // Persist on create
        this.eventBus.on<NoteCreatedPayload>(NoteEvents.CREATED)
            .subscribe(async ({ note }) => {
                try {
                    await this.persistence.upsertNote(note);
                    // Also save initial content if present
                    if (note.content) {
                        await this.persistence.saveNoteContent(note.id, note.content);
                    }
                    console.log(`[NotePersistenceEffect] Persisted new note: ${note.id}`);
                } catch (error) {
                    console.error('[NotePersistenceEffect] Failed to persist note:', error as Error);
                }
            });

        // Persist on update
        this.eventBus.on<NoteUpdatedPayload>(NoteEvents.UPDATED)
            .subscribe(async ({ id, updates }) => {
                try {
                    const note = this.noteStore.noteById(id)();
                    if (note) {
                        const updatedNote = { ...note, ...updates };

                        // Always persist metadata to DB
                        await this.persistence.upsertNote(updatedNote);

                        // Check if content needs saving
                        if (updates.content !== undefined) {
                            this.debounceSaveContent(id, updates.content);
                        }

                        console.log(`[NotePersistenceEffect] Persisted note update: ${id}`);
                    }
                } catch (error) {
                    console.error('[NotePersistenceEffect] Failed to persist note update:', error as Error);
                }
            });

        // Persist on delete
        this.eventBus.on<NoteDeletedPayload>(NoteEvents.DELETED)
            .subscribe(async ({ id }) => {
                try {
                    await this.persistence.removeNote(id);
                    await this.persistence.removeNoteContent(id);
                    console.log(`[NotePersistenceEffect] Deleted note from database: ${id}`);
                } catch (error) {
                    console.error('[NotePersistenceEffect] Failed to delete note:', error as Error);
                }
            });

        // Load content
        this.eventBus.on<NoteLoadContentPayload>(NoteEvents.LOAD_CONTENT)
            .subscribe(async ({ id }) => {
                try {
                    const content = await this.persistence.loadNoteContent(id);
                    this.eventBus.dispatch({
                        type: NoteEvents.CONTENT_LOADED,
                        payload: { id, content }
                    });
                    console.log(`[NotePersistenceEffect] Loaded content for note: ${id}`);
                } catch (error) {
                    console.error('[NotePersistenceEffect] Failed to load note content:', error);
                }
            });
    }

    private debounceSaveContent(id: string, content: string): void {
        if (this.saveTimeouts[id]) {
            clearTimeout(this.saveTimeouts[id]);
        }

        this.saveTimeouts[id] = setTimeout(async () => {
            try {
                const filePath = await this.persistence.saveNoteContent(id, content);
                this.eventBus.dispatch({
                    type: NoteEvents.CONTENT_SAVED,
                    payload: { id, filePath }
                });
                console.log(`[NotePersistenceEffect] Saved note content to file: ${id}`);
            } catch (error) {
                console.error('[NotePersistenceEffect] Failed to save note content:', error);
            }
        }, 1000); // 1s debounce
    }
}
