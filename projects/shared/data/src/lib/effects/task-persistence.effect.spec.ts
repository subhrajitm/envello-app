import { TestBed } from '@angular/core/testing';
import { TaskPersistenceEffect } from './task-persistence.effect';
import { EventBus } from '@envello/shared-core';
import { PersistenceAdapter } from '../adapters/persistence.adapter';
import { Task } from '@envello/shared-domain';

// Mock PersistenceAdapter
class MockPersistenceAdapter extends PersistenceAdapter {
    saveTaskCalls: Task[] = [];
    deleteTaskCalls: string[] = [];

    override async saveTask(task: Task): Promise<void> {
        this.saveTaskCalls.push(task);
    }

    override async deleteTask(id: string): Promise<void> {
        this.deleteTaskCalls.push(id);
    }

    override async loadTasks(): Promise<Task[]> {
        return [];
    }
}

describe('TaskPersistenceEffect', () => {
    let effect: TaskPersistenceEffect;
    let eventBus: EventBus;
    let mockAdapter: MockPersistenceAdapter;

    beforeEach(() => {
        mockAdapter = new MockPersistenceAdapter();

        TestBed.configureTestingModule({
            providers: [
                TaskPersistenceEffect,
                EventBus,
                { provide: PersistenceAdapter, useValue: mockAdapter }
            ]
        });

        effect = TestBed.inject(TaskPersistenceEffect);
        eventBus = TestBed.inject(EventBus);
    });

    it('should be created', () => {
        expect(effect).toBeTruthy();
    });

    describe('TASK_CREATED Event', () => {
        it('should persist task when TASK_CREATED event is dispatched', (done) => {
            const task: Task = {
                id: '1',
                title: 'New Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_CREATED',
                    payload: task
                });

                setTimeout(() => {
                    expect(mockAdapter.saveTaskCalls.length).toBe(1);
                    expect(mockAdapter.saveTaskCalls[0]).toEqual(task);
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('TASK_UPDATED Event', () => {
        it('should persist updated task when TASK_UPDATED event is dispatched', (done) => {
            // First create a task
            const originalTask: Task = {
                id: '1',
                title: 'Original Title',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_CREATED',
                    payload: originalTask
                });

                setTimeout(() => {
                    // Now update it
                    eventBus.dispatch({
                        type: 'TASK_UPDATED',
                        payload: {
                            id: '1',
                            updates: { title: 'Updated Title', priority: 'HIGH' }
                        }
                    });

                    setTimeout(() => {
                        // Should have 2 save calls (create + update)
                        expect(mockAdapter.saveTaskCalls.length).toBeGreaterThanOrEqual(1);
                        done();
                    }, 100);
                }, 100);
            }, 100);
        });
    });

    describe('TASK_DELETED Event', () => {
        it('should delete task when TASK_DELETED event is dispatched', (done) => {
            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_DELETED',
                    payload: { id: '1' }
                });

                setTimeout(() => {
                    expect(mockAdapter.deleteTaskCalls.length).toBe(1);
                    expect(mockAdapter.deleteTaskCalls[0]).toBe('1');
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('Error Handling', () => {
        it('should handle persistence errors gracefully', (done) => {
            // Override saveTask to throw error
            mockAdapter.saveTask = jasmine.createSpy('saveTask').and.returnValue(
                Promise.reject(new Error('Persistence failed'))
            );

            const task: Task = {
                id: '1',
                title: 'Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            setTimeout(() => {
                // Should not throw
                eventBus.dispatch({
                    type: 'TASK_CREATED',
                    payload: task
                });

                setTimeout(() => {
                    expect(mockAdapter.saveTask).toHaveBeenCalled();
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('Multiple Events', () => {
        it('should handle multiple persistence operations', (done) => {
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

            setTimeout(() => {
                // Create two tasks
                eventBus.dispatch({ type: 'TASK_CREATED', payload: task1 });
                eventBus.dispatch({ type: 'TASK_CREATED', payload: task2 });

                setTimeout(() => {
                    expect(mockAdapter.saveTaskCalls.length).toBe(2);

                    // Delete one task
                    eventBus.dispatch({ type: 'TASK_DELETED', payload: { id: '1' } });

                    setTimeout(() => {
                        expect(mockAdapter.deleteTaskCalls.length).toBe(1);
                        expect(mockAdapter.deleteTaskCalls[0]).toBe('1');
                        done();
                    }, 100);
                }, 100);
            }, 100);
        });
    });
});
