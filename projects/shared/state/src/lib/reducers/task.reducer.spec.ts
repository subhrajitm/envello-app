import { TestBed } from '@angular/core/testing';
import { TaskReducer } from './task.reducer';
import { TaskStore } from '../stores/task.store';
import { EventBus } from '@envello/shared-core';
import { Task } from '@envello/shared-domain';

describe('TaskReducer', () => {
    let reducer: TaskReducer;
    let store: TaskStore;
    let eventBus: EventBus;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TaskReducer, TaskStore, EventBus]
        });

        reducer = TestBed.inject(TaskReducer);
        store = TestBed.inject(TaskStore);
        eventBus = TestBed.inject(EventBus);
    });

    it('should be created', () => {
        expect(reducer).toBeTruthy();
    });

    describe('TASK_CREATED Event', () => {
        it('should add task to store when TASK_CREATED event is dispatched', (done) => {
            const task: Task = {
                id: '1',
                title: 'New Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            // Wait a bit for the subscription to be set up
            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_CREATED',
                    payload: task
                });

                // Give the reducer time to process
                setTimeout(() => {
                    expect(store.tasks().length).toBe(1);
                    expect(store.getTaskById('1')).toEqual(task);
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('TASK_UPDATED Event', () => {
        it('should update task in store when TASK_UPDATED event is dispatched', (done) => {
            const task: Task = {
                id: '1',
                title: 'Original Title',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);

            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_UPDATED',
                    payload: {
                        id: '1',
                        updates: { title: 'Updated Title', priority: 'HIGH' }
                    }
                });

                setTimeout(() => {
                    const updatedTask = store.getTaskById('1');
                    expect(updatedTask?.title).toBe('Updated Title');
                    expect(updatedTask?.priority).toBe('HIGH');
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('TASK_DELETED Event', () => {
        it('should remove task from store when TASK_DELETED event is dispatched', (done) => {
            const task: Task = {
                id: '1',
                title: 'Task to Delete',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);
            expect(store.tasks().length).toBe(1);

            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_DELETED',
                    payload: { id: '1' }
                });

                setTimeout(() => {
                    expect(store.tasks().length).toBe(0);
                    expect(store.getTaskById('1')).toBeUndefined();
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('TASK_STATUS_CHANGED Event', () => {
        it('should update task status when TASK_STATUS_CHANGED event is dispatched', (done) => {
            const task: Task = {
                id: '1',
                title: 'Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            store.addTask(task);

            setTimeout(() => {
                eventBus.dispatch({
                    type: 'TASK_STATUS_CHANGED',
                    payload: {
                        id: '1',
                        status: 'COMPLETED'
                    }
                });

                setTimeout(() => {
                    const updatedTask = store.getTaskById('1');
                    expect(updatedTask?.status).toBe('COMPLETED');
                    done();
                }, 100);
            }, 100);
        });
    });

    describe('Multiple Events', () => {
        it('should handle multiple events in sequence', (done) => {
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
                    expect(store.tasks().length).toBe(2);

                    // Update first task
                    eventBus.dispatch({
                        type: 'TASK_UPDATED',
                        payload: { id: '1', updates: { title: 'Updated Task 1' } }
                    });

                    setTimeout(() => {
                        expect(store.getTaskById('1')?.title).toBe('Updated Task 1');

                        // Delete second task
                        eventBus.dispatch({ type: 'TASK_DELETED', payload: { id: '2' } });

                        setTimeout(() => {
                            expect(store.tasks().length).toBe(1);
                            expect(store.getTaskById('2')).toBeUndefined();
                            done();
                        }, 100);
                    }, 100);
                }, 100);
            }, 100);
        });
    });
});
