import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@envello/shared-data';
import { SqliteService } from '../../core/services/sqlite.service';
import { FileSystemService } from '../../core/services/file-system.service';
import { Task, Note } from '@envello/shared-domain';

/**
 * SQLite Persistence Adapter (Desktop)
 * Wraps existing SqliteService to implement PersistenceAdapter interface
 */
@Injectable()
export class SqlitePersistenceAdapter extends PersistenceAdapter {
    private sqlite = inject(SqliteService);
    private fs = inject(FileSystemService);

    async loadTasks(): Promise<Task[]> {
        return this.sqlite.getAllTasks();
    }

    async upsertTask(task: Task): Promise<void> {
        await this.sqlite.upsertTask(task);
    }

    async removeTask(id: string): Promise<void> {
        await this.sqlite.removeTask(id);
    }

    // ─── Notes ─────────────────────────────────────────────────────────────────

    async loadNotes(): Promise<Note[]> {
        return this.sqlite.getAllNotes();
    }

    async upsertNote(note: Note): Promise<void> {
        await this.sqlite.upsertNote(note);
    }

    async removeNote(id: string): Promise<void> {
        await this.sqlite.removeNote(id);
    }

    async loadNoteContent(id: string): Promise<string> {
        // Use FileSystemService for content
        // We'll need to inject it. Since I cannot update constructor easily here without full rewrite,
        // and I am adding property injection? No, Angular supports property injection with `inject()`.
        const content = await this.fs.readNote(id);
        return content || '';
    }

    async saveNoteContent(id: string, content: string): Promise<string> {
        return this.fs.saveNote(id, content);
    }

    async removeNoteContent(id: string): Promise<void> {
        await this.fs.deleteNote(id);
    }
}
