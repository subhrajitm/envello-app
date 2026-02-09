import { TestBed } from '@angular/core/testing';
import { TaskCommands } from '@envello/shared-domain';
import { TaskStore } from '@envello/shared-state';
import { TaskReducer } from '@envello/shared-state';
import { TaskPersistenceEffect } from '@envello/shared-data';
import { EventBus } from '@envello/shared-core';
import { PersistenceAdapter } from '@envello/shared-data';
import { Task } from '@envello/shared-domain';

// Mock PersistenceAdapter for testing
class MockPersistenceAdapter extends PersistenceAdapter {
    private tasks: Map<string, Task> = new Map();

    override async saveTask(task: Task): Promise<void> {
        this.tasks.set(task.id, task);
    }

    override async deleteTask(id: string): Promise<void> {
        this.tasks.delete(id);
    }

    override async loadTasks(): Promise<Task[]> {
        return Array.from(this.tasks.values());
    }

    // Test helper
    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getAllTasks(): Task[] {
        return Array.from(this.tasks.values());
    }
}

describe('Task Flow Integration Tests', () => {
    let taskCommands: TaskCommands;
    let taskStore: TaskStore;
    let mockAdapter: MockPersistenceAdapter;

    beforeEach(() => {
        mockAdapter = new MockPersistenceAdapter();

        TestBed.configureTestingModule({
            providers: [
                EventBus,
                TaskCommands,
                TaskStore,
                TaskReducer,
                TaskPersistenceEffect,
                { provide: PersistenceAdapter, useValue: mockAdapter }
            ]
        });

        taskCommands = TestBed.inject(TaskCommands);
        taskStore = TestBed.inject(TaskStore);

        // Initialize reducer and effect
        TestBed.inject(TaskReducer);
        TestBed.inject(TaskPersistenceEffect);
    });

    describe('End-to-End Task Creation Flow', () => {
        it('should create task through complete flow: command → event → reducer → store → persistence', (done) => {
            const task: Task = {
                id: '1',
                title: 'Integration Test Task',
                priority: 'HIGH',
                hours: '2.0H',
                status: 'ACTIVE'
            };

            // Execute command
            taskCommands.createTask(task);

            // Wait for async operations to complete
            setTimeout(() => {
                // Verify task is in store
                const storeTask = taskStore.getTaskById('1');
                expect(storeTask).toBeTruthy();
                expect(storeTask?.title).toBe('Integration Test Task');
                expect(storeTask?.priority).toBe('HIGH');

                // Verify task was persisted
                const persistedTask = mockAdapter.getTask('1');
                expect(persistedTask).toBeTruthy();
                expect(persistedTask?.title).toBe('Integration Test Task');

                done();
            }, 200);
        });
    });

    describe('End-to-End Task Update Flow', () => {
        it('should update task through complete flow', (done) => {
            const task: Task = {
                id: '1',
                title: 'Original Title',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            // Create task first
            taskCommands.createTask(task);

            setTimeout(() => {
                // Update task
                taskCommands.updateTask('1', {
                    title: 'Updated Title',
                    priority: 'HIGH'
                });

                setTimeout(() => {
                    // Verify store has updated task
                    const storeTask = taskStore.getTaskById('1');
                    expect(storeTask?.title).toBe('Updated Title');
                    expect(storeTask?.priority).toBe('HIGH');
                    expect(storeTask?.status).toBe('ACTIVE'); // Unchanged

                    // Verify persistence has updated task
                    const persistedTask = mockAdapter.getTask('1');
                    expect(persistedTask?.title).toBe('Updated Title');
                    expect(persistedTask?.priority).toBe('HIGH');

                    done();
                }, 200);
            }, 200);
        });
    });

    describe('End-to-End Task Deletion Flow', () => {
        it('should delete task through complete flow', (done) => {
            const task: Task = {
                id: '1',
                title: 'Task to Delete',
                priority: 'LOW',
                hours: '0.5H',
                status: 'ACTIVE'
            };

            // Create task first
            taskCommands.createTask(task);

            setTimeout(() => {
                expect(taskStore.tasks().length).toBe(1);

                // Delete task
                taskCommands.deleteTask('1');

                setTimeout(() => {
                    // Verify task removed from store
                    expect(taskStore.tasks().length).toBe(0);
                    expect(taskStore.getTaskById('1')).toBeUndefined();

                    // Verify task removed from persistence
                    expect(mockAdapter.getTask('1')).toBeUndefined();

                    done();
                }, 200);
            }, 200);
        });
    });

    describe('Multiple Operations', () => {
        it('should handle multiple tasks through complete flow', (done) => {
            const task1: Task = {
                id: '1',
                title: 'Task 1',
                priority: 'HIGH',
                hours: '2.0H',
                status: 'ACTIVE'
            };

            const task2: Task = {
                id: '2',
                title: 'Task 2',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            const task3: Task = {
                id: '3',
                title: 'Task 3',
                priority: 'LOW',
                hours: '0.5H',
                status: 'ACTIVE'
            };

            // Create three tasks
            taskCommands.createTask(task1);
            taskCommands.createTask(task2);
            taskCommands.createTask(task3);

            setTimeout(() => {
                // Verify all in store
                expect(taskStore.tasks().length).toBe(3);

                // Verify all persisted
                expect(mockAdapter.getAllTasks().length).toBe(3);

                // Update one
                taskCommands.updateTask('2', { status: 'COMPLETED' });

                setTimeout(() => {
                    expect(taskStore.getTaskById('2')?.status).toBe('COMPLETED');

                    // Delete one
                    taskCommands.deleteTask('3');

                    setTimeout(() => {
                        expect(taskStore.tasks().length).toBe(2);
                        expect(mockAdapter.getAllTasks().length).toBe(2);

                        done();
                    }, 200);
                }, 200);
            }, 200);
        });
    });

    describe('Computed Selectors', () => {
        it('should update computed selectors correctly', (done) => {
            const activeTasks: Task[] = [
                { id: '1', title: 'Active 1', priority: 'HIGH', hours: '1H', status: 'ACTIVE' },
                { id: '2', title: 'Active 2', priority: 'MEDIUM', hours: '1H', status: 'ACTIVE' }
            ];

            const completedTask: Task = {
                id: '3',
                title: 'Completed',
                priority: 'LOW',
                hours: '1H',
                status: 'COMPLETED'
            };

            taskCommands.createTask(activeTasks[0]);
            taskCommands.createTask(activeTasks[1]);
            taskCommands.createTask(completedTask);

            setTimeout(() => {
                // Test active tasks selector
                expect(taskStore.activeTasks().length).toBe(2);

                // Test completed tasks selector
                expect(taskStore.completedTasks().length).toBe(1);

                // Test high priority selector
                expect(taskStore.highPriorityTasks().length).toBe(1);

                done();
            }, 200);
        });
    });
});
