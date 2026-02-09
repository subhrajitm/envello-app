import { Injectable, signal, computed } from '@angular/core';
import { Note } from '@envello/shared-domain';

/**
 * Note Store
 * Domain-specific store for note state management
 * Uses Angular Signals for reactive state
 */
@Injectable({ providedIn: 'root' })
export class NoteStore {
    // Private state (mutable only by this store)
    private _notes = signal<Note[]>([]);

    // Public read-only state
    readonly notes = this._notes.asReadonly();

    // Computed selectors
    readonly noteById = (id: string) => computed(() =>
        this._notes().find(n => n.id === id)
    );

    readonly notesByTag = (tag: string) => computed(() =>
        this._notes().filter(n => n.tags?.includes(tag))
    );

    readonly pinnedNotes = computed(() =>
        this._notes().filter(n => n.tags?.includes('pinned'))
    );

    readonly recentNotes = computed(() =>
        this._notes().slice(0, 10)
    );

    readonly noteCount = computed(() => this._notes().length);

    readonly taggedNoteCount = computed(() =>
        this._notes().filter(n => n.tags && n.tags.length > 0).length
    );

    // State mutations (called by reducers only - not exported for component use)

    /**
     * Set all notes (used for initial load)
     */
    setNotes(notes: Note[]): void {
        this._notes.set(notes);
    }

    /**
     * Add a new note
     */
    addNote(note: Note): void {
        this._notes.update(notes => [note, ...notes]);
    }

    /**
     * Update an existing note
     */
    updateNote(id: string, updates: Partial<Note>): void {
        this._notes.update(notes =>
            notes.map(n => n.id === id ? { ...n, ...updates } : n)
        );
    }

    /**
     * Remove a note
     */
    removeNote(id: string): void {
        this._notes.update(notes => notes.filter(n => n.id !== id));
    }

    /**
     * Clear all notes (for testing/reset)
     */
    clearNotes(): void {
        this._notes.set([]);
    }
}
