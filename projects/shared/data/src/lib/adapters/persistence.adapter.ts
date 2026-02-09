import { Task } from '@envello/shared-domain';

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

    // Future: Add methods for other domains
    // abstract loadNotes(): Promise<Note[]>;
    // abstract upsertNote(note: Note): Promise<void>;
    // etc.
}
