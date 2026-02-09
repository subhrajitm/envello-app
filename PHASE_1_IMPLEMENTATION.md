# Phase 1 Implementation Guide - Quick Start

## 🎯 Goal
Implement event-driven architecture for Tasks feature in 1 week as proof of concept.

---

## Day 1: Event Bus Infrastructure

### Step 1: Create Shared Library Structure
```bash
mkdir -p libs/core/events
mkdir -p libs/state/stores
mkdir -p libs/state/reducers
mkdir -p libs/domain/tasks
mkdir -p libs/data/adapters
mkdir -p libs/data/effects
```

### Step 2: Create Event Bus
**File**: `libs/core/events/event-bus.service.ts`
```typescript
import { Injectable, signal } from '@angular/core';
import { Subject, filter, map } from 'rxjs';

export interface DomainEvent {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class EventBus {
  private events$ = new Subject<DomainEvent>();
  private eventLog = signal<DomainEvent[]>([]);
  
  dispatch(event: Omit<DomainEvent, 'timestamp'>): void {
    const fullEvent: DomainEvent = {
      ...event,
      timestamp: Date.now(),
    };
    
    this.eventLog.update(log => [...log.slice(-99), fullEvent]);
    this.events$.next(fullEvent);
  }
  
  on<T = any>(eventType: string) {
    return this.events$.pipe(
      filter(event => event.type === eventType),
      map(event => event.payload as T)
    );
  }
  
  getEventLog() {
    return this.eventLog.asReadonly();
  }
  
  // Debug helper
  logEvents(): void {
    console.table(this.eventLog().map(e => ({
      type: e.type,
      timestamp: new Date(e.timestamp).toISOString(),
      payload: JSON.stringify(e.payload).slice(0, 50)
    })));
  }
}
```

---

## Day 2: Task Domain

### Step 1: Define Events
**File**: `libs/domain/tasks/task.events.ts`
```typescript
export const TaskEvents = {
  CREATED: 'task.created',
  UPDATED: 'task.updated',
  DELETED: 'task.deleted',
  STATUS_CHANGED: 'task.status_changed',
  PRIORITY_CHANGED: 'task.priority_changed',
} as const;

export interface TaskCreatedPayload {
  task: Task;
}

export interface TaskUpdatedPayload {
  id: string;
  updates: Partial<Task>;
}

export interface TaskDeletedPayload {
  id: string;
}
```

### Step 2: Create Task Store
**File**: `libs/state/stores/task.store.ts`
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Task } from '../../domain/tasks/task.model';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private _tasks = signal<Task[]>([]);
  
  readonly tasks = this._tasks.asReadonly();
  
  readonly activeTasks = computed(() => 
    this._tasks().filter(t => t.status === 'ACTIVE')
  );
  
  readonly completedTasks = computed(() => 
    this._tasks().filter(t => t.status === 'COMPLETED')
  );
  
  readonly taskById = (id: string) => computed(() => 
    this._tasks().find(t => t.id === id)
  );
  
  // Mutations (called by reducers only)
  setTasks(tasks: Task[]): void {
    this._tasks.set(tasks);
  }
  
  addTask(task: Task): void {
    this._tasks.update(tasks => [...tasks, task]);
  }
  
  updateTask(id: string, updates: Partial<Task>): void {
    this._tasks.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  }
  
  removeTask(id: string): void {
    this._tasks.update(tasks => tasks.filter(t => t.id !== id));
  }
}
```

---

## Day 3: Reducers & Commands

### Step 1: Create Reducer
**File**: `libs/state/reducers/task.reducer.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { EventBus } from '../../core/events/event-bus.service';
import { TaskStore } from '../stores/task.store';
import { TaskEvents, TaskCreatedPayload, TaskUpdatedPayload, TaskDeletedPayload } from '../../domain/tasks/task.events';

@Injectable({ providedIn: 'root' })
export class TaskReducer {
  private eventBus = inject(EventBus);
  private taskStore = inject(TaskStore);
  
  constructor() {
    this.registerHandlers();
  }
  
  private registerHandlers(): void {
    this.eventBus.on<TaskCreatedPayload>(TaskEvents.CREATED)
      .subscribe(({ task }) => {
        this.taskStore.addTask(task);
      });
    
    this.eventBus.on<TaskUpdatedPayload>(TaskEvents.UPDATED)
      .subscribe(({ id, updates }) => {
        this.taskStore.updateTask(id, updates);
      });
    
    this.eventBus.on<TaskDeletedPayload>(TaskEvents.DELETED)
      .subscribe(({ id }) => {
        this.taskStore.removeTask(id);
      });
  }
}
```

### Step 2: Create Commands
**File**: `libs/domain/tasks/task.commands.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { EventBus } from '../../core/events/event-bus.service';
import { TaskEvents } from './task.events';
import { Task } from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskCommands {
  private eventBus = inject(EventBus);
  
  createTask(task: Task): void {
    this.eventBus.dispatch({
      type: TaskEvents.CREATED,
      payload: { task }
    });
  }
  
  updateTask(id: string, updates: Partial<Task>): void {
    this.eventBus.dispatch({
      type: TaskEvents.UPDATED,
      payload: { id, updates }
    });
  }
  
  deleteTask(id: string): void {
    this.eventBus.dispatch({
      type: TaskEvents.DELETED,
      payload: { id }
    });
  }
}
```

---

## Day 4: Persistence Layer

### Step 1: Abstract Adapter
**File**: `libs/data/adapters/persistence.adapter.ts`
```typescript
import { Task } from '../../domain/tasks/task.model';

export abstract class PersistenceAdapter {
  abstract loadTasks(): Promise<Task[]>;
  abstract upsertTask(task: Task): Promise<void>;
  abstract removeTask(id: string): Promise<void>;
}
```

### Step 2: Desktop Adapter
**File**: `apps/desktop/src/app/data/adapters/sqlite-persistence.adapter.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@libs/data/adapters/persistence.adapter';
import { SqliteService } from '../../core/services/sqlite.service';
import { Task } from '@libs/domain/tasks/task.model';

@Injectable()
export class SqlitePersistenceAdapter extends PersistenceAdapter {
  private sqlite = inject(SqliteService);
  
  async loadTasks(): Promise<Task[]> {
    return this.sqlite.getAllTasks();
  }
  
  async upsertTask(task: Task): Promise<void> {
    await this.sqlite.upsertTask(task);
  }
  
  async removeTask(id: string): Promise<void> {
    await this.sqlite.removeTask(id);
  }
}
```

### Step 3: Web Adapter
**File**: `apps/web/src/app/data/adapters/rxdb-persistence.adapter.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@libs/data/adapters/persistence.adapter';
import { RxdbService } from '../../core/services/rxdb.service';
import { Task } from '@libs/domain/tasks/task.model';

@Injectable()
export class RxdbPersistenceAdapter extends PersistenceAdapter {
  private rxdb = inject(RxdbService);
  
  async loadTasks(): Promise<Task[]> {
    return this.rxdb.getAllTasks();
  }
  
  async upsertTask(task: Task): Promise<void> {
    await this.rxdb.upsertTask(task);
  }
  
  async removeTask(id: string): Promise<void> {
    await this.rxdb.removeTask(id);
  }
}
```

### Step 4: Persistence Effect
**File**: `libs/data/effects/task-persistence.effect.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { EventBus } from '../../core/events/event-bus.service';
import { TaskEvents, TaskCreatedPayload, TaskUpdatedPayload, TaskDeletedPayload } from '../../domain/tasks/task.events';
import { TaskStore } from '../../state/stores/task.store';
import { PersistenceAdapter } from '../adapters/persistence.adapter';

@Injectable({ providedIn: 'root' })
export class TaskPersistenceEffect {
  private eventBus = inject(EventBus);
  private taskStore = inject(TaskStore);
  private persistence = inject(PersistenceAdapter);
  
  constructor() {
    this.registerEffects();
    this.loadInitialData();
  }
  
  private async loadInitialData(): Promise<void> {
    const tasks = await this.persistence.loadTasks();
    this.taskStore.setTasks(tasks);
  }
  
  private registerEffects(): void {
    this.eventBus.on<TaskCreatedPayload>(TaskEvents.CREATED)
      .subscribe(async ({ task }) => {
        await this.persistence.upsertTask(task);
      });
    
    this.eventBus.on<TaskUpdatedPayload>(TaskEvents.UPDATED)
      .subscribe(async ({ id, updates }) => {
        const task = this.taskStore.taskById(id)();
        if (task) {
          await this.persistence.upsertTask({ ...task, ...updates });
        }
      });
    
    this.eventBus.on<TaskDeletedPayload>(TaskEvents.DELETED)
      .subscribe(async ({ id }) => {
        await this.persistence.removeTask(id);
      });
  }
}
```

---

## Day 5: App Configuration

### Desktop App Config
**File**: `apps/desktop/src/app/app.config.ts`
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PersistenceAdapter } from '@libs/data/adapters/persistence.adapter';
import { SqlitePersistenceAdapter } from './data/adapters/sqlite-persistence.adapter';
import { TaskReducer } from '@libs/state/reducers/task.reducer';
import { TaskPersistenceEffect } from '@libs/data/effects/task-persistence.effect';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: PersistenceAdapter, useClass: SqlitePersistenceAdapter },
    TaskReducer, // Initialize reducer
    TaskPersistenceEffect, // Initialize effect
  ]
};
```

### Web App Config
**File**: `apps/web/src/app/app.config.ts`
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PersistenceAdapter } from '@libs/data/adapters/persistence.adapter';
import { RxdbPersistenceAdapter } from './data/adapters/rxdb-persistence.adapter';
import { TaskReducer } from '@libs/state/reducers/task.reducer';
import { TaskPersistenceEffect } from '@libs/data/effects/task-persistence.effect';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: PersistenceAdapter, useClass: RxdbPersistenceAdapter },
    TaskReducer, // Initialize reducer
    TaskPersistenceEffect, // Initialize effect
  ]
};
```

---

## Day 6: Component Migration

### Updated Tasks Component
**File**: `apps/desktop/src/app/components/tasks/tasks.component.ts`
```typescript
import { Component, inject } from '@angular/core';
import { TaskStore } from '@libs/state/stores/task.store';
import { TaskCommands } from '@libs/domain/tasks/task.commands';
import { Task } from '@libs/domain/tasks/task.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  template: `
    <div class="tasks-container">
      <h2>Active Tasks ({{ activeTasks().length }})</h2>
      
      <div class="task-list">
        @for (task of activeTasks(); track task.id) {
          <div class="task-item">
            <input 
              type="checkbox"
              [checked]="task.status === 'COMPLETED'"
              (change)="toggleTask(task.id, task.status)">
            <span>{{ task.title }}</span>
            <button (click)="deleteTask(task.id)">Delete</button>
          </div>
        }
      </div>
      
      <div class="add-task">
        <input 
          #taskInput
          type="text" 
          placeholder="New task..."
          (keyup.enter)="addTask(taskInput.value); taskInput.value = ''">
        <button (click)="addTask(taskInput.value); taskInput.value = ''">
          Add Task
        </button>
      </div>
    </div>
  `
})
export class TasksComponent {
  private taskStore = inject(TaskStore);
  private taskCommands = inject(TaskCommands);
  
  // Read from store
  activeTasks = this.taskStore.activeTasks;
  
  // Write via commands
  addTask(title: string): void {
    if (!title.trim()) return;
    
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      priority: 'MEDIUM',
      status: 'ACTIVE',
      hours: '0'
    };
    
    this.taskCommands.createTask(task);
  }
  
  toggleTask(id: string, currentStatus: Task['status']): void {
    const newStatus = currentStatus === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    this.taskCommands.updateTask(id, { status: newStatus });
  }
  
  deleteTask(id: string): void {
    this.taskCommands.deleteTask(id);
  }
}
```

---

## Day 7: Testing & Debug Tools

### Debug Component
**File**: `apps/desktop/src/app/components/debug/event-log.component.ts`
```typescript
import { Component, inject } from '@angular/core';
import { EventBus } from '@libs/core/events/event-bus.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-event-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-log">
      <h3>Event Log (Last 20)</h3>
      <button (click)="clear()">Clear</button>
      <button (click)="logToConsole()">Log to Console</button>
      
      <div class="events">
        @for (event of events().slice(-20).reverse(); track event.timestamp) {
          <div class="event">
            <span class="type">{{ event.type }}</span>
            <span class="time">{{ formatTime(event.timestamp) }}</span>
            <pre>{{ event.payload | json }}</pre>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .event-log {
      position: fixed;
      bottom: 0;
      right: 0;
      width: 400px;
      height: 300px;
      background: #1e1e1e;
      color: #fff;
      padding: 1rem;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
    }
    
    .event {
      border-bottom: 1px solid #333;
      padding: 0.5rem 0;
    }
    
    .type {
      color: #4ec9b0;
      font-weight: bold;
    }
    
    .time {
      color: #888;
      margin-left: 1rem;
    }
    
    pre {
      margin: 0.25rem 0 0 0;
      color: #ce9178;
    }
  `]
})
export class EventLogComponent {
  private eventBus = inject(EventBus);
  
  events = this.eventBus.getEventLog();
  
  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }
  
  clear(): void {
    // Implementation depends on EventBus API
  }
  
  logToConsole(): void {
    this.eventBus.logEvents();
  }
}
```

### Add to App Component (Development Only)
**File**: `apps/desktop/src/app/app.component.ts`
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EventLogComponent } from './components/debug/event-log.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, EventLogComponent],
  template: `
    <router-outlet />
    @if (!environment.production) {
      <app-event-log />
    }
  `
})
export class AppComponent {
  environment = environment;
}
```

---

## Testing Checklist

### Unit Tests
- [ ] EventBus dispatches events correctly
- [ ] TaskStore mutations work
- [ ] TaskReducer handles events
- [ ] TaskCommands dispatch correct events
- [ ] Persistence adapters save/load correctly

### Integration Tests
- [ ] Create task → Event → Store → Persistence → DB
- [ ] Update task → Event → Store → Persistence → DB
- [ ] Delete task → Event → Store → Persistence → DB
- [ ] Load tasks on app start

### Performance Tests
- [ ] 1000 tasks load in < 500ms
- [ ] Task creation latency < 50ms
- [ ] Event dispatch latency < 10ms

---

## Success Criteria

✅ **Architecture**
- All task operations go through events
- No direct database calls from components
- Store is single source of truth
- Persistence is async and decoupled

✅ **Functionality**
- Tasks can be created, updated, deleted
- State persists across app restarts
- Both desktop and web work identically

✅ **Developer Experience**
- Event log shows all state changes
- Easy to debug
- Easy to test
- Easy to extend

---

## Next Steps After Phase 1

1. **Migrate Notes** using same pattern
2. **Add Activity Log** reducer
3. **Implement Undo/Redo** using event log
4. **Add Event Persistence** to database
5. **Start Phase 2** - Domain stores for all features

---

## Common Pitfalls to Avoid

❌ **Don't**: Call store mutations directly from components
✅ **Do**: Always dispatch events via commands

❌ **Don't**: Put business logic in reducers
✅ **Do**: Keep reducers pure (state, event) => newState

❌ **Don't**: Make persistence synchronous
✅ **Do**: Use effects for async persistence

❌ **Don't**: Subscribe to database in components
✅ **Do**: Subscribe to store signals only

---

## Questions?

If you encounter issues:
1. Check EventLog component for event flow
2. Verify reducer is registered in app.config
3. Ensure persistence adapter is provided
4. Check browser/Tauri console for errors

Ready to start? Begin with Day 1!
