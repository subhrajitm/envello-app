import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import {
    TaskEvents,
    TaskCreatedPayload,
    TaskUpdatedPayload,
    TaskDeletedPayload
} from '@envello/shared-domain';
import { TaskStore } from '@envello/shared-state';
import { PersistenceAdapter } from '../adapters/persistence.adapter';

/**
 * Task Persistence Effect
 * Listens to task events and persists changes to database
 * Also handles initial data loading
 */
@Injectable({ providedIn: 'root' })
export class TaskPersistenceEffect {
    private eventBus = inject(EventBus);
    private taskStore = inject(TaskStore);
    private persistence = inject(PersistenceAdapter);

    constructor() {
        this.loadInitialData();
        this.registerEffects();
    }

    /**
     * Load tasks from database on initialization
     */
    private async loadInitialData(): Promise<void> {
        try {
            const tasks = await this.persistence.loadTasks();
            this.taskStore.setTasks(tasks);
            console.log(`[TaskPersistenceEffect] Loaded ${tasks.length} tasks from database`);
        } catch (error) {
            console.error('[TaskPersistenceEffect] Failed to load tasks:', error);
        }
    }

    /**
     * Register persistence effects for task events
     */
    private registerEffects(): void {
        // Persist on create
        this.eventBus.on<TaskCreatedPayload>(TaskEvents.CREATED)
            .subscribe(async ({ task }) => {
                try {
                    await this.persistence.upsertTask(task);
                    console.log(`[TaskPersistenceEffect] Persisted new task: ${task.id}`);
                } catch (error) {
                    console.error('[TaskPersistenceEffect] Failed to persist task:', error);
                }
            });

        // Persist on update
        this.eventBus.on<TaskUpdatedPayload>(TaskEvents.UPDATED)
            .subscribe(async ({ id, updates }) => {
                try {
                    const task = this.taskStore.taskById(id)();
                    if (task) {
                        await this.persistence.upsertTask({ ...task, ...updates });
                        console.log(`[TaskPersistenceEffect] Persisted task update: ${id}`);
                    }
                } catch (error) {
                    console.error('[TaskPersistenceEffect] Failed to persist task update:', error);
                }
            });

        // Persist on delete
        this.eventBus.on<TaskDeletedPayload>(TaskEvents.DELETED)
            .subscribe(async ({ id }) => {
                try {
                    await this.persistence.removeTask(id);
                    console.log(`[TaskPersistenceEffect] Deleted task from database: ${id}`);
                } catch (error) {
                    console.error('[TaskPersistenceEffect] Failed to delete task:', error);
                }
            });
    }
}
