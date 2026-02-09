import { TestBed } from '@angular/core/testing';
import { EventBus } from './event-bus.service';

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [EventBus]
        });
        eventBus = TestBed.inject(EventBus);
    });

    it('should be created', () => {
        expect(eventBus).toBeTruthy();
    });

    describe('Event Dispatch and Subscription', () => {
        it('should dispatch and receive events', (done) => {
            const testEvent = { type: 'TEST_EVENT', payload: { data: 'test' } };

            eventBus.on('TEST_EVENT').subscribe(event => {
                expect(event).toEqual(testEvent);
                done();
            });

            eventBus.dispatch(testEvent);
        });

        it('should support multiple subscribers to the same event', () => {
            const testEvent = { type: 'TEST_EVENT', payload: { count: 1 } };
            let subscriber1Called = false;
            let subscriber2Called = false;

            eventBus.on('TEST_EVENT').subscribe(() => {
                subscriber1Called = true;
            });

            eventBus.on('TEST_EVENT').subscribe(() => {
                subscriber2Called = true;
            });

            eventBus.dispatch(testEvent);

            expect(subscriber1Called).toBe(true);
            expect(subscriber2Called).toBe(true);
        });

        it('should only notify subscribers of matching event types', () => {
            let testEventCalled = false;
            let otherEventCalled = false;

            eventBus.on('TEST_EVENT').subscribe(() => {
                testEventCalled = true;
            });

            eventBus.on('OTHER_EVENT').subscribe(() => {
                otherEventCalled = true;
            });

            eventBus.dispatch({ type: 'TEST_EVENT', payload: {} });

            expect(testEventCalled).toBe(true);
            expect(otherEventCalled).toBe(false);
        });
    });

    describe('Event Log', () => {
        it('should maintain event log', () => {
            const event1 = { type: 'EVENT_1', payload: { id: 1 } };
            const event2 = { type: 'EVENT_2', payload: { id: 2 } };

            eventBus.dispatch(event1);
            eventBus.dispatch(event2);

            const log = eventBus.getEventLog();
            expect(log.length).toBeGreaterThanOrEqual(2);
            expect(log).toContainEqual(jasmine.objectContaining(event1));
            expect(log).toContainEqual(jasmine.objectContaining(event2));
        });

        it('should limit event log to 100 events', () => {
            // Dispatch 150 events
            for (let i = 0; i < 150; i++) {
                eventBus.dispatch({ type: 'TEST_EVENT', payload: { index: i } });
            }

            const log = eventBus.getEventLog();
            expect(log.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Unsubscribe', () => {
        it('should stop receiving events after unsubscribe', () => {
            let callCount = 0;

            const subscription = eventBus.on('TEST_EVENT').subscribe(() => {
                callCount++;
            });

            eventBus.dispatch({ type: 'TEST_EVENT', payload: {} });
            expect(callCount).toBe(1);

            subscription.unsubscribe();

            eventBus.dispatch({ type: 'TEST_EVENT', payload: {} });
            expect(callCount).toBe(1); // Should still be 1
        });
    });

    describe('Error Handling', () => {
        it('should handle errors in subscribers without affecting other subscribers', () => {
            let subscriber1Called = false;
            let subscriber2Called = false;

            eventBus.on('TEST_EVENT').subscribe(() => {
                subscriber1Called = true;
                throw new Error('Subscriber 1 error');
            });

            eventBus.on('TEST_EVENT').subscribe(() => {
                subscriber2Called = true;
            });

            eventBus.dispatch({ type: 'TEST_EVENT', payload: {} });

            expect(subscriber1Called).toBe(true);
            expect(subscriber2Called).toBe(true);
        });
    });
});
