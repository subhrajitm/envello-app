import { Task, Note } from '@envello/shared-domain';

/**
 * Persistence Adapter Interface
 * Abstract interface for platform-specific persistence implementations
 * Desktop uses SQLite, Web uses RxDB
 */
export abstract class PersistenceAdapter {
    // Task operations
    abstract loadTasks(): Promise<Task[]>;
    abstract upsertTask(task: Task): Promise<void>;
    abstract removeTask(id: string): Promise<void>;

    // Note operations
    abstract loadNotes(): Promise<Note[]>;
    abstract upsertNote(note: Note): Promise<void>;
    abstract removeNote(id: string): Promise<void>;
    abstract loadNoteContent(id: string): Promise<string>;
    abstract saveNoteContent(id: string, content: string): Promise<string>; // Returns filePath
    abstract removeNoteContent(id: string): Promise<void>;

    // Future: Add methods for other domains
    // abstract loadJournals(): Promise<Journal[]>;
    // etc.
}
