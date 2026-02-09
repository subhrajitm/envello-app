import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import { TaskStore } from '../stores/task.store';
import {
    TaskEvents,
    TaskCreatedPayload,
    TaskUpdatedPayload,
    TaskDeletedPayload,
    TaskStatusChangedPayload
} from '@envello/shared-domain';

/**
 * Task Reducer
 * Handles all task-related events and updates the TaskStore
 * Pure functions: (state, event) => newState
 */
@Injectable({ providedIn: 'root' })
export class TaskReducer {
    private eventBus = inject(EventBus);
    private taskStore = inject(TaskStore);

    constructor() {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Task Created
        this.eventBus.on<TaskCreatedPayload>(TaskEvents.CREATED)
            .subscribe(({ task }) => {
                this.taskStore.addTask(task);
            });

        // Task Updated
        this.eventBus.on<TaskUpdatedPayload>(TaskEvents.UPDATED)
            .subscribe(({ id, updates }) => {
                this.taskStore.updateTask(id, updates);
            });

        // Task Deleted
        this.eventBus.on<TaskDeletedPayload>(TaskEvents.DELETED)
            .subscribe(({ id }) => {
                this.taskStore.removeTask(id);
            });

        // Task Status Changed (specific handler for status changes)
        this.eventBus.on<TaskStatusChangedPayload>(TaskEvents.STATUS_CHANGED)
            .subscribe(({ id, newStatus }) => {
                this.taskStore.updateTask(id, { status: newStatus });
            });

        // Task Completed (convenience event)
        this.eventBus.on<{ id: string }>(TaskEvents.COMPLETED)
            .subscribe(({ id }) => {
                this.taskStore.updateTask(id, { status: 'COMPLETED' });
            });

        // Task Uncompleted (convenience event)
        this.eventBus.on<{ id: string }>(TaskEvents.UNCOMPLETED)
            .subscribe(({ id }) => {
                this.taskStore.updateTask(id, { status: 'ACTIVE' });
            });
    }
}
