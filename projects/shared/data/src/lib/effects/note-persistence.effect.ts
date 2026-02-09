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

                    // If we load content, we probably don't want to save it back unless it changed.
                    // The persistence.loadNoteContent returns what's on disk.
                    // So saving it back to disk is redundant but harmless (except for perf).

                    // Ideally, we explicitly update the store.
                    // Let's use a specific action or just update via store directly if we had access?
                    // But we want to go through events.

                    // Let's dispatch UPDATED. The debouncer will save it back, which is fine for now.
                    // Improvement: Add 'skipPersist' flag to UPDATED payload?

                    // Actually, the NoteReducer listens to CONTENT_LOADED and updates the store!
                    // See: 
                    // this.eventBus.on<NoteContentLoadedPayload>(NoteEvents.CONTENT_LOADED)
                    //   .subscribe(({ id, content }) => {
                    //       this.noteStore.updateNote(id, { content });
                    //   });

                    // So we don't need to do anything here!
                    // The reducer updates the store.
                    // Does reducer dispatch UPDATED event? NO.
                    // Reducer updates the store signal directly.

                    // Wait, does `NotePersistenceEffect` listen to store changes?
                    // No, it listens to `NoteEvents.UPDATED`.

                    // When Reducer updates the store for CONTENT_LOADED, valid.
                    // BUT `NotePersistenceEffect` listens to `NoteEvents.UPDATED`.
                    // Does Reducer emit `NoteEvents.UPDATED`?
                    // No, Reducer just updates the signal.

                    // So... if Reducer updates the signal, the store changes.
                    // The UI updates.
                    // But `NotePersistenceEffect` won't know about it if it only listens to event bus.
                    // Which is GOOD! We don't want to persist back to DB/File when we just loaded it.

                    // EXCEPT: The `NotePersistenceEffect` needs to actually PERFORM the load when it sees `CONTENT_LOADED`?
                    // Wait, `NoteCommands.loadNoteContent` dispatches `CONTENT_LOADED` with empty content.
                    // Then `NoteReducer` updates store with empty content?
                    // That seems wrong.

                    // `NoteCommands.loadNoteContent` should dispatch `LOAD_NOTE_CONTENT_REQUEST`?
                    // And Effect listens to it, loads content, and then dispatches `NOTE_CONTENT_LOADED` with actual content?

                    // Let's trace `NoteCommands.loadNoteContent`:
                    // loadNoteContent(id: string): void {
                    //   this.eventBus.dispatch({
                    //       type: NoteEvents.CONTENT_LOADED,
                    //       payload: { id, content: '' }
                    //   });
                    // }

                    // And Reducer:
                    // this.eventBus.on<NoteContentLoadedPayload>(NoteEvents.CONTENT_LOADED)
                    //   .subscribe(({ id, content }) => {
                    //       this.noteStore.updateNote(id, { content });
                    //   });

                    // This sets content to empty string!
                    // This is broken in my design.

                    // CORRECT DESIGN:
                    // 1. `NoteCommands.loadNoteContent(id)` -> dispatches `NoteEvents.LOAD_CONTENT` (new event)
                    // 2. `NotePersistenceEffect` listens to `LOAD_CONTENT`.
                    // 3. Effect calls `persistence.loadNoteContent(id)`.
                    // 4. Effect dispatches `NoteEvents.CONTENT_LOADED` with content.
                    // 5. `NoteReducer` listens to `CONTENT_LOADED` and updates store.

                    // I need to fix `NoteEvents` and `NoteCommands` first.
                    // Or I can modify `NotePersistenceEffect` to handle the LOAD request.
                    // But `NoteEvents.CONTENT_LOADED` currently implies it IS loaded.

                    // I will rename `CONTENT_LOADED` to `CONTENT_LOAD_SUCCESS` or similar?
                    // Or add `LOAD_CONTENT` event.

                    // Let's look at `NoteEvents` again.
                    // It has `CONTENT_LOADED`.

                    // I'll add `LOAD_CONTENT` to `NoteEvents`.
                    // And update `NoteCommands` to dispatch `LOAD_CONTENT`.
                    // And update `NoteReducer` to ignore `LOAD_CONTENT` (or set loading state).
                    // And update `NotePersistenceEffect` to listen to `LOAD_CONTENT` and dispatch `CONTENT_LOADED`.

                    // This requires modifying 3 files I just created.

                    // Alternatively, I can use the existing `CONTENT_LOADED` as the specific event for "Data is ready to be put in store".
                    // And `NoteCommands` should dispatch a different event, or call the effect directly (bad).

                    // Let's add `commands.loadNoteContent` -> `LOAD_NOTE_CONTENT` event.
                    // Effect -> `NOTE_CONTENT_LOADED` event.

                    // I'll start by modifying `note.events.ts`.

                    // For now, let's just finish the effect file assuming I'll fix the events.
                    // I will implement `loadContent` handler here.
                    const loadedContent = await this.persistence.loadNoteContent(id);
                    this.eventBus.dispatch({
                        type: NoteEvents.CONTENT_LOADED,
                        payload: { id, content: loadedContent }
                    });
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
