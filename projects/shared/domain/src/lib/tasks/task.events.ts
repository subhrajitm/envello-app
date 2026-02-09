import { Task } from './task.model';

/**
 * Task Event Types
 * All task-related events that can be dispatched through the EventBus
 */
export const TaskEvents = {
    CREATED: 'task.created',
    UPDATED: 'task.updated',
    DELETED: 'task.deleted',
    STATUS_CHANGED: 'task.status_changed',
    PRIORITY_CHANGED: 'task.priority_changed',
    COMPLETED: 'task.completed',
    UNCOMPLETED: 'task.uncompleted',
} as const;

/**
 * Task Created Event Payload
 */
export interface TaskCreatedPayload {
    task: Task;
}

/**
 * Task Updated Event Payload
 */
export interface TaskUpdatedPayload {
    id: string;
    updates: Partial<Task>;
    previousState?: Partial<Task>; // For undo/redo
}

/**
 * Task Deleted Event Payload
 */
export interface TaskDeletedPayload {
    id: string;
    task?: Task; // For undo/redo
}

/**
 * Task Status Changed Event Payload
 */
export interface TaskStatusChangedPayload {
    id: string;
    oldStatus: Task['status'];
    newStatus: Task['status'];
}

/**
 * Task Priority Changed Event Payload
 */
export interface TaskPriorityChangedPayload {
    id: string;
    oldPriority: Task['priority'];
    newPriority: Task['priority'];
}
