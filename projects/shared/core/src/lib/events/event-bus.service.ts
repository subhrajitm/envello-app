import { Injectable, signal } from '@angular/core';
import { Subject, filter, map } from 'rxjs';

/**
 * Domain Event Interface
 * All events dispatched through the EventBus must conform to this interface
 */
export interface DomainEvent {
    type: string;
    payload: any;
    timestamp: number;
    userId?: string;
    metadata?: Record<string, any>;
}

/**
 * Event Bus Service
 * Central event dispatcher using publish/subscribe pattern
 * 
 * Usage:
 * - Dispatch events: eventBus.dispatch({ type: 'task.created', payload: { task } })
 * - Subscribe to events: eventBus.on<TaskCreatedPayload>('task.created').subscribe(...)
 */
@Injectable({ providedIn: 'root' })
export class EventBus {
    private events$ = new Subject<DomainEvent>();

    // For debugging - keeps last 100 events
    private eventLog = signal<DomainEvent[]>([]);

    /**
     * Dispatch an event to all subscribers
     */
    dispatch(event: Omit<DomainEvent, 'timestamp'>): void {
        const fullEvent: DomainEvent = {
            ...event,
            timestamp: Date.now(),
        };

        // Add to debug log (keep last 100)
        this.eventLog.update(log => [...log.slice(-99), fullEvent]);

        // Emit to subscribers
        this.events$.next(fullEvent);
    }

    /**
     * Subscribe to events of a specific type
     */
    on<T = any>(eventType: string) {
        return this.events$.pipe(
            filter(event => event.type === eventType),
            map(event => event.payload as T)
        );
    }

    /**
     * Get event log for debugging (read-only)
     */
    getEventLog() {
        return this.eventLog.asReadonly();
    }

    /**
     * Log events to console (development helper)
     */
    logEvents(): void {
        console.table(this.eventLog().map(e => ({
            type: e.type,
            timestamp: new Date(e.timestamp).toISOString(),
            payload: JSON.stringify(e.payload).slice(0, 50) + '...'
        })));
    }

    /**
     * Clear event log (development helper)
     */
    clearLog(): void {
        this.eventLog.set([]);
    }
}
