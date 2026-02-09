import { Note } from './note.model';

/**
 * Note Event Types
 * All note-related events that can be dispatched through the EventBus
 */
export const NoteEvents = {
    CREATED: 'note.created',
    UPDATED: 'note.updated',
    DELETED: 'note.deleted',
    LOAD_CONTENT: 'note.load_content',
    CONTENT_LOADED: 'note.content_loaded',
    CONTENT_SAVED: 'note.content_saved',
    TAG_ADDED: 'note.tag_added',
    TAG_REMOVED: 'note.tag_removed',
} as const;

/**
 * Note Created Event Payload
 */
export interface NoteCreatedPayload {
    note: Note;
}

/**
 * Note Updated Event Payload
 */
export interface NoteUpdatedPayload {
    id: string;
    updates: Partial<Note>;
    previousState?: Partial<Note>; // For undo/redo
}

/**
 * Note Deleted Event Payload
 */
export interface NoteDeletedPayload {
    id: string;
    note?: Note; // For undo/redo
}

/**
 * Note Load Content Event Payload (Request)
 */
export interface NoteLoadContentPayload {
    id: string;
}

/**
 * Note Content Loaded Event Payload (Response)
 */
export interface NoteContentLoadedPayload {
    id: string;
    content: string;
}

/**
 * Note Content Saved Event Payload
 */
export interface NoteContentSavedPayload {
    id: string;
    filePath: string;
}

/**
 * Note Tag Added Event Payload
 */
export interface NoteTagAddedPayload {
    id: string;
    tag: string;
}

/**
 * Note Tag Removed Event Payload
 */
export interface NoteTagRemovedPayload {
    id: string;
    tag: string;
}
