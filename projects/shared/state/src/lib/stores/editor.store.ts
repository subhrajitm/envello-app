import { Injectable, signal } from '@angular/core';

/**
 * Editor Store
 * Manages active editor state and statistics
 * Isolates editor-specific state from note data
 */
@Injectable({ providedIn: 'root' })
export class EditorStore {
    // Private state
    private _activeNoteId = signal<string | null>(null);
    private _isDirty = signal<boolean>(false);
    private _wordCount = signal<number>(0);
    private _characterCount = signal<number>(0);
    private _lastSaved = signal<Date | null>(null);

    // Public read-only state
    readonly activeNoteId = this._activeNoteId.asReadonly();
    readonly isDirty = this._isDirty.asReadonly();
    readonly wordCount = this._wordCount.asReadonly();
    readonly characterCount = this._characterCount.asReadonly();
    readonly lastSaved = this._lastSaved.asReadonly();

    // State mutations

    /**
     * Set the active note being edited
     */
    setActiveNote(id: string | null): void {
        this._activeNoteId.set(id);
        this._isDirty.set(false);
        this._wordCount.set(0);
        this._characterCount.set(0);
        this._lastSaved.set(null);
    }

    /**
     * Mark editor as dirty (unsaved changes)
     */
    setDirty(dirty: boolean): void {
        this._isDirty.set(dirty);
    }

    /**
     * Update word and character counts
     */
    updateStats(wordCount: number, characterCount: number): void {
        this._wordCount.set(wordCount);
        this._characterCount.set(characterCount);
    }

    /**
     * Mark content as saved
     */
    markSaved(): void {
        this._isDirty.set(false);
        this._lastSaved.set(new Date());
    }

    /**
     * Clear editor state
     */
    clearEditor(): void {
        this._activeNoteId.set(null);
        this._isDirty.set(false);
        this._wordCount.set(0);
        this._characterCount.set(0);
        this._lastSaved.set(null);
    }
}
