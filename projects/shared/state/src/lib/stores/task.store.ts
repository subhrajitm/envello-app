import { Injectable, signal, computed } from '@angular/core';
import { Task } from '@envello/shared-domain';

/**
 * Task Store
 * Domain-specific store for task state management
 * Uses Angular Signals for reactive state
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
    // Private state (mutable only by this store)
    private _tasks = signal<Task[]>([]);

    // Public read-only state
    readonly tasks = this._tasks.asReadonly();

    // Computed selectors
    readonly activeTasks = computed(() =>
        this._tasks().filter(t => t.status === 'ACTIVE')
    );

    readonly completedTasks = computed(() =>
        this._tasks().filter(t => t.status === 'COMPLETED')
    );

    readonly pendingTasks = computed(() =>
        this._tasks().filter(t => t.status === 'PENDING')
    );

    readonly highPriorityTasks = computed(() =>
        this._tasks().filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED')
    );

    readonly tasksByProject = (projectId: string) => computed(() =>
        this._tasks().filter(t => t.project === projectId)
    );

    readonly taskById = (id: string) => computed(() =>
        this._tasks().find(t => t.id === id)
    );

    readonly taskCount = computed(() => this._tasks().length);

    readonly activeTaskCount = computed(() => this.activeTasks().length);

    readonly completedTaskCount = computed(() => this.completedTasks().length);

    // State mutations (called by reducers only - not exported for component use)

    /**
     * Set all tasks (used for initial load)
     */
    setTasks(tasks: Task[]): void {
        this._tasks.set(tasks);
    }

    /**
     * Add a new task
     */
    addTask(task: Task): void {
        this._tasks.update(tasks => [...tasks, task]);
    }

    /**
     * Update an existing task
     */
    updateTask(id: string, updates: Partial<Task>): void {
        this._tasks.update(tasks =>
            tasks.map(t => t.id === id ? { ...t, ...updates } : t)
        );
    }

    /**
     * Remove a task
     */
    removeTask(id: string): void {
        this._tasks.update(tasks => tasks.filter(t => t.id !== id));
    }

    /**
     * Clear all tasks (for testing/reset)
     */
    clearTasks(): void {
        this._tasks.set([]);
    }
}
