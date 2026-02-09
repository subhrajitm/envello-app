import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@envello/shared-data';
import { RxdbService } from '../../core/services/rxdb.service';
import { Task } from '@envello/shared-domain';

/**
 * RxDB Persistence Adapter (Web)
 * Wraps existing RxdbService to implement PersistenceAdapter interface
 */
@Injectable()
export class RxdbPersistenceAdapter extends PersistenceAdapter {
    private rxdb = inject(RxdbService);

    async loadTasks(): Promise<Task[]> {
        return this.rxdb.getAll<Task>('tasks');
    }

    async upsertTask(task: Task): Promise<void> {
        await this.rxdb.upsert('tasks', task);
    }

    async removeTask(id: string): Promise<void> {
        await this.rxdb.remove('tasks', id);
    }
}
