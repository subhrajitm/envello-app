import { Injectable, inject } from '@angular/core';
import { EventBus } from '@envello/shared-core';
import { TaskEvents } from './task.events';
import { Task } from './task.model';

/**
 * Task Commands
 * Facade service for dispatching task-related commands
 * Components should use this service instead of directly calling EventBus
 */
@Injectable({ providedIn: 'root' })
export class TaskCommands {
    private eventBus = inject(EventBus);

    /**
     * Create a new task
     */
    createTask(task: Task): void {
        this.eventBus.dispatch({
            type: TaskEvents.CREATED,
            payload: { task }
        });
    }

    /**
     * Update an existing task
     */
    updateTask(id: string, updates: Partial<Task>): void {
        this.eventBus.dispatch({
            type: TaskEvents.UPDATED,
            payload: { id, updates }
        });
    }

    /**
     * Delete a task
     */
    deleteTask(id: string): void {
        this.eventBus.dispatch({
            type: TaskEvents.DELETED,
            payload: { id }
        });
    }

    /**
     * Change task status
     */
    changeStatus(id: string, newStatus: Task['status']): void {
        this.eventBus.dispatch({
            type: TaskEvents.STATUS_CHANGED,
            payload: { id, newStatus, oldStatus: 'ACTIVE' } // oldStatus will be set by effect
        });
    }

    /**
     * Change task priority
     */
    changePriority(id: string, newPriority: Task['priority']): void {
        this.eventBus.dispatch({
            type: TaskEvents.PRIORITY_CHANGED,
            payload: { id, newPriority, oldPriority: 'MEDIUM' } // oldPriority will be set by effect
        });
    }

    /**
     * Mark task as completed
     */
    completeTask(id: string): void {
        this.eventBus.dispatch({
            type: TaskEvents.COMPLETED,
            payload: { id }
        });
    }

    /**
     * Mark task as uncompleted (reopen)
     */
    uncompleteTask(id: string): void {
        this.eventBus.dispatch({
            type: TaskEvents.UNCOMPLETED,
            payload: { id }
        });
    }
}
