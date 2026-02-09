import { TestBed } from '@angular/core/testing';
import { TaskStore } from './task.store';
import { Task } from '@envello/shared-domain';

describe('TaskStore', () => {
    let store: TaskStore;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TaskStore]
        });
        store = TestBed.inject(TaskStore);
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
    });

    describe('Initial State', () => {
        it('should start with empty tasks', () => {
            expect(store.tasks()).toEqual([]);
        });
    });

    describe('Add Task', () => {
        it('should add a task to the store', () => {
            const task: Task = {
                id: '1',
                title: 'Test Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);

            expect(store.tasks()).toContain(task);
            expect(store.tasks().length).toBe(1);
        });

        it('should add multiple tasks', () => {
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
                priority: 'LOW',
                hours: '0.5H',
                status: 'ACTIVE'
            };

            store.addTask(task1);
            store.addTask(task2);

            expect(store.tasks().length).toBe(2);
            expect(store.tasks()).toContain(task1);
            expect(store.tasks()).toContain(task2);
        });
    });

    describe('Update Task', () => {
        it('should update an existing task', () => {
            const task: Task = {
                id: '1',
                title: 'Original Title',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);
            store.updateTask('1', { title: 'Updated Title', priority: 'HIGH' });

            const updatedTask = store.getTaskById('1');
            expect(updatedTask?.title).toBe('Updated Title');
            expect(updatedTask?.priority).toBe('HIGH');
            expect(updatedTask?.status).toBe('ACTIVE'); // Unchanged
        });

        it('should not affect other tasks when updating', () => {
            const task1: Task = {
                id: '1',
                title: 'Task 1',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            const task2: Task = {
                id: '2',
                title: 'Task 2',
                priority: 'LOW',
                hours: '0.5H',
                status: 'ACTIVE'
            };

            store.addTask(task1);
            store.addTask(task2);
            store.updateTask('1', { title: 'Updated Task 1' });

            expect(store.getTaskById('1')?.title).toBe('Updated Task 1');
            expect(store.getTaskById('2')?.title).toBe('Task 2');
        });

        it('should handle updating non-existent task gracefully', () => {
            store.updateTask('non-existent', { title: 'Updated' });
            expect(store.tasks().length).toBe(0);
        });
    });

    describe('Remove Task', () => {
        it('should remove a task from the store', () => {
            const task: Task = {
                id: '1',
                title: 'Test Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);
            expect(store.tasks().length).toBe(1);

            store.removeTask('1');
            expect(store.tasks().length).toBe(0);
            expect(store.getTaskById('1')).toBeUndefined();
        });

        it('should only remove the specified task', () => {
            const task1: Task = {
                id: '1',
                title: 'Task 1',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            const task2: Task = {
                id: '2',
                title: 'Task 2',
                priority: 'LOW',
                hours: '0.5H',
                status: 'ACTIVE'
            };

            store.addTask(task1);
            store.addTask(task2);
            store.removeTask('1');

            expect(store.tasks().length).toBe(1);
            expect(store.getTaskById('2')).toBeTruthy();
        });
    });

    describe('Get Task By ID', () => {
        it('should return task by ID', () => {
            const task: Task = {
                id: '1',
                title: 'Test Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);
            const retrieved = store.getTaskById('1');

            expect(retrieved).toEqual(task);
        });

        it('should return undefined for non-existent ID', () => {
            expect(store.getTaskById('non-existent')).toBeUndefined();
        });
    });

    describe('Computed Selectors', () => {
        beforeEach(() => {
            const tasks: Task[] = [
                {
                    id: '1',
                    title: 'Active Task 1',
                    priority: 'HIGH',
                    hours: '2.0H',
                    status: 'ACTIVE'
                },
                {
                    id: '2',
                    title: 'Completed Task',
                    priority: 'MEDIUM',
                    hours: '1.0H',
                    status: 'COMPLETED'
                },
                {
                    id: '3',
                    title: 'Active Task 2',
                    priority: 'LOW',
                    hours: '0.5H',
                    status: 'ACTIVE'
                },
                {
                    id: '4',
                    title: 'High Priority Task',
                    priority: 'HIGH',
                    hours: '3.0H',
                    status: 'ACTIVE'
                }
            ];

            tasks.forEach(task => store.addTask(task));
        });

        it('should filter active tasks', () => {
            const activeTasks = store.activeTasks();
            expect(activeTasks.length).toBe(3);
            expect(activeTasks.every(t => t.status === 'ACTIVE')).toBe(true);
        });

        it('should filter completed tasks', () => {
            const completedTasks = store.completedTasks();
            expect(completedTasks.length).toBe(1);
            expect(completedTasks[0].status).toBe('COMPLETED');
        });

        it('should filter high priority tasks', () => {
            const highPriorityTasks = store.highPriorityTasks();
            expect(highPriorityTasks.length).toBe(2);
            expect(highPriorityTasks.every(t => t.priority === 'HIGH')).toBe(true);
        });
    });

    describe('Signal Reactivity', () => {
        it('should trigger signal updates when tasks change', () => {
            let callCount = 0;

            // Subscribe to tasks signal
            TestBed.runInInjectionContext(() => {
                const unsubscribe = store.tasks.subscribe(() => {
                    callCount++;
                });
            });

            const initialCount = callCount;

            const task: Task = {
                id: '1',
                title: 'Test Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);
            expect(callCount).toBeGreaterThan(initialCount);
        });
    });
});
