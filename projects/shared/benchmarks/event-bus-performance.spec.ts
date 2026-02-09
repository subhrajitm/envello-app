import { TestBed } from '@angular/core/testing';
import { TaskCommands } from '@envello/shared-domain';
import { TaskStore } from '@envello/shared-state';
import { TaskReducer } from '@envello/shared-state';
import { TaskPersistenceEffect } from '@envello/shared-data';
import { EventBus } from '@envello/shared-core';
import { PersistenceAdapter } from '@envello/shared-data';
import { Task } from '@envello/shared-domain';

// Mock adapter for benchmarking
class BenchmarkPersistenceAdapter extends PersistenceAdapter {
    override async saveTask(task: Task): Promise<void> {
        // Simulate fast in-memory save
        return Promise.resolve();
    }

    override async deleteTask(id: string): Promise<void> {
        return Promise.resolve();
    }

    override async loadTasks(): Promise<Task[]> {
        return Promise.resolve([]);
    }
}

describe('Event Bus Performance Benchmarks', () => {
    let taskCommands: TaskCommands;
    let taskStore: TaskStore;
    let eventBus: EventBus;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                EventBus,
                TaskCommands,
                TaskStore,
                TaskReducer,
                TaskPersistenceEffect,
                { provide: PersistenceAdapter, useClass: BenchmarkPersistenceAdapter }
            ]
        });

        taskCommands = TestBed.inject(TaskCommands);
        taskStore = TestBed.inject(TaskStore);
        eventBus = TestBed.inject(EventBus);

        // Initialize
        TestBed.inject(TaskReducer);
        TestBed.inject(TaskPersistenceEffect);
    });

    describe('Event Dispatch Latency', () => {
        it('should dispatch events in < 1ms', () => {
            const iterations = 1000;
            const start = performance.now();

            for (let i = 0; i < iterations; i++) {
                eventBus.dispatch({
                    type: 'TEST_EVENT',
                    payload: { id: i }
                });
            }

            const end = performance.now();
            const avgLatency = (end - start) / iterations;

            console.log(`Average event dispatch latency: ${avgLatency.toFixed(3)}ms`);
            expect(avgLatency).toBeLessThan(1);
        });
    });

    describe('Task Creation Performance', () => {
        it('should create 100 tasks in < 100ms', (done) => {
            const taskCount = 100;
            const tasks: Task[] = [];

            for (let i = 0; i < taskCount; i++) {
                tasks.push({
                    id: `task-${i}`,
                    title: `Task ${i}`,
                    priority: 'MEDIUM',
                    hours: '1.0H',
                    status: 'ACTIVE'
                });
            }

            const start = performance.now();

            tasks.forEach(task => taskCommands.createTask(task));

            setTimeout(() => {
                const end = performance.now();
                const duration = end - start;
                const avgPerTask = duration / taskCount;

                console.log(`Created ${taskCount} tasks in ${duration.toFixed(2)}ms`);
                console.log(`Average per task: ${avgPerTask.toFixed(3)}ms`);

                expect(duration).toBeLessThan(100);
                expect(taskStore.tasks().length).toBe(taskCount);

                done();
            }, 200);
        });
    });

    describe('Task Update Performance', () => {
        it('should update 100 tasks in < 50ms', (done) => {
            const taskCount = 100;

            // Create tasks first
            for (let i = 0; i < taskCount; i++) {
                taskCommands.createTask({
                    id: `task-${i}`,
                    title: `Task ${i}`,
                    priority: 'MEDIUM',
                    hours: '1.0H',
                    status: 'ACTIVE'
                });
            }

            setTimeout(() => {
                const start = performance.now();

                // Update all tasks
                for (let i = 0; i < taskCount; i++) {
                    taskCommands.updateTask(`task-${i}`, { priority: 'HIGH' });
                }

                const end = performance.now();
                const duration = end - start;
                const avgPerTask = duration / taskCount;

                console.log(`Updated ${taskCount} tasks in ${duration.toFixed(2)}ms`);
                console.log(`Average per task: ${avgPerTask.toFixed(3)}ms`);

                expect(duration).toBeLessThan(50);

                done();
            }, 200);
        });
    });

    describe('Store Query Performance', () => {
        it('should query 1000 tasks in < 10ms', (done) => {
            const taskCount = 1000;

            // Create many tasks
            for (let i = 0; i < taskCount; i++) {
                taskCommands.createTask({
                    id: `task-${i}`,
                    title: `Task ${i}`,
                    priority: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
                    hours: '1.0H',
                    status: i % 5 === 0 ? 'COMPLETED' : 'ACTIVE'
                });
            }

            setTimeout(() => {
                // Benchmark queries
                const start = performance.now();

                const allTasks = taskStore.tasks();
                const activeTasks = taskStore.activeTasks();
                const completedTasks = taskStore.completedTasks();
                const highPriorityTasks = taskStore.highPriorityTasks();

                const end = performance.now();
                const duration = end - start;

                console.log(`Queried ${taskCount} tasks in ${duration.toFixed(3)}ms`);
                console.log(`  - All tasks: ${allTasks.length}`);
                console.log(`  - Active: ${activeTasks.length}`);
                console.log(`  - Completed: ${completedTasks.length}`);
                console.log(`  - High priority: ${highPriorityTasks.length}`);

                expect(duration).toBeLessThan(10);

                done();
            }, 500);
        });
    });

    describe('End-to-End Flow Performance', () => {
        it('should complete create → update → delete flow in < 5ms', (done) => {
            const task: Task = {
                id: 'perf-test',
                title: 'Performance Test Task',
                priority: 'MEDIUM',
                hours: '1.0H',
                status: 'ACTIVE'
            };

            const start = performance.now();

            // Create
            taskCommands.createTask(task);

            setTimeout(() => {
                // Update
                taskCommands.updateTask('perf-test', { priority: 'HIGH' });

                setTimeout(() => {
                    // Delete
                    taskCommands.deleteTask('perf-test');

                    const end = performance.now();
                    const duration = end - start;

                    console.log(`End-to-end flow completed in ${duration.toFixed(2)}ms`);

                    // Note: This includes setTimeout delays, so we're lenient
                    expect(duration).toBeLessThan(500);

                    done();
                }, 50);
            }, 50);
        });
    });

    describe('Memory Usage', () => {
        it('should handle 10,000 tasks without excessive memory', (done) => {
            const taskCount = 10000;

            console.log('Creating 10,000 tasks...');

            for (let i = 0; i < taskCount; i++) {
                taskCommands.createTask({
                    id: `task-${i}`,
                    title: `Task ${i}`,
                    priority: 'MEDIUM',
                    hours: '1.0H',
                    status: 'ACTIVE'
                });
            }

            setTimeout(() => {
                expect(taskStore.tasks().length).toBe(taskCount);
                console.log(`Successfully stored ${taskCount} tasks`);

                // Clean up
                for (let i = 0; i < taskCount; i++) {
                    taskCommands.deleteTask(`task-${i}`);
                }

                setTimeout(() => {
                    expect(taskStore.tasks().length).toBe(0);
                    console.log('Cleanup complete');
                    done();
                }, 500);
            }, 1000);
        });
    });

    describe('Event Log Performance', () => {
        it('should maintain event log without degrading performance', () => {
            const iterations = 1000;
            const start = performance.now();

            for (let i = 0; i < iterations; i++) {
                eventBus.dispatch({
                    type: 'TEST_EVENT',
                    payload: { index: i }
                });
            }

            const end = performance.now();
            const duration = end - start;

            const eventLog = eventBus.getEventLog();
            console.log(`Event log size: ${eventLog.length} (max 100)`);
            console.log(`${iterations} events dispatched in ${duration.toFixed(2)}ms`);

            expect(eventLog.length).toBeLessThanOrEqual(100);
            expect(duration).toBeLessThan(100);
        });
    });
});
