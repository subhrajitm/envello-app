import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@envello/shared-data';
import { SqliteService } from '../../core/services/sqlite.service';
import { Task } from '@envello/shared-domain';

/**
 * SQLite Persistence Adapter (Desktop)
 * Wraps existing SqliteService to implement PersistenceAdapter interface
 */
@Injectable()
export class SqlitePersistenceAdapter extends PersistenceAdapter {
    private sqlite = inject(SqliteService);

    async loadTasks(): Promise<Task[]> {
        return this.sqlite.getAllTasks();
    }

    async upsertTask(task: Task): Promise<void> {
        await this.sqlite.upsertTask(task);
    }

    async removeTask(id: string): Promise<void> {
        await this.sqlite.removeTask(id);
    }
}
