import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@envello/shared-data';
import { RxdbService } from '../../core/services/rxdb.service';
import { FileSystemService } from '../../core/services/file-system.service';
import { Task, Note, Novel, NovelContent } from '@envello/shared-domain';

/**
 * RxDB Persistence Adapter (Web)
 * Wraps existing RxdbService to implement PersistenceAdapter interface
 */
@Injectable()
export class RxdbPersistenceAdapter extends PersistenceAdapter {
    private rxdb = inject(RxdbService);
    private fs = inject(FileSystemService);

    async loadTasks(): Promise<Task[]> {
        return this.rxdb.getAll<Task>('tasks');
    }

    async upsertTask(task: Task): Promise<void> {
        await this.rxdb.upsert('tasks', task);
    }

    async removeTask(id: string): Promise<void> {
        await this.rxdb.remove('tasks', id);
    }

    // ─── Notes ─────────────────────────────────────────────────────────────────

    async loadNotes(): Promise<Note[]> {
        return this.rxdb.getAll<Note>('notes');
    }

    async upsertNote(note: Note): Promise<void> {
        await this.rxdb.upsert('notes', note);
    }

    async removeNote(id: string): Promise<void> {
        await this.rxdb.remove('notes', id);
    }

    async loadNoteContent(id: string): Promise<string> {
        // In web, we might use OPFS via FileSystemService
        const content = await this.fs.readNote(id);
        return content || '';
    }

    async saveNoteContent(id: string, content: string): Promise<string> {
        return this.fs.saveNote(id, content);
    }

    async removeNoteContent(id: string): Promise<void> {
        await this.fs.deleteNote(id);
    }

    // ─── Novels ────────────────────────────────────────────────────────────────

    async loadNovels(): Promise<Novel[]> {
        return this.rxdb.getAllNovels();
    }

    async upsertNovel(novel: Novel): Promise<void> {
        await this.rxdb.upsertNovel(novel);
    }

    async removeNovel(id: string): Promise<void> {
        await this.rxdb.removeNovel(id);
    }

    async loadNovelContent(id: string): Promise<NovelContent> {
        const content = await this.rxdb.getNovelContent(id);
        if (!content) throw new Error(`Novel content not found for id: ${id}`);
        try {
            return JSON.parse(content) as NovelContent;
        } catch (e) {
            console.error('Failed to parse novel content', e);
            throw e;
        }
    }

    async saveNovelContent(id: string, content: NovelContent): Promise<void> {
        const data = JSON.stringify(content);
        await this.rxdb.setNovelContent(id, data);
    }

    async removeNovelContent(id: string): Promise<void> {
        await this.rxdb.removeNovelContent(id);
    }
}
