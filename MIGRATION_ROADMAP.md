# Envello Architecture Migration Roadmap

## Executive Summary

This document outlines the migration from the current service-based architecture to an elite event-driven, local-first architecture that supports:
- Real-time collaboration
- Offline sync with CRDT
- Undo/redo
- AI streaming updates
- Zero-lag editor performance
- Local vector memory

**Timeline**: 12-16 weeks
**Approach**: Incremental, non-breaking migration with adapter layers

---

## Current Architecture Problems

### 1. Database-Driven Reactivity ❌
```typescript
// Current: Database drives UI
SqliteService.tasks$().subscribe(tasks => {
  this.tasks.set(tasks);
});
```

**Problems**:
- Tight coupling between persistence and UI
- Can't replay state
- No event log for debugging
- Impossible to implement undo/redo
- Can't support offline sync

### 2. Monolithic StoreService ❌
```typescript
// Current: God service anti-pattern
class StoreService {
  tasks = signal<Task[]>([]);
  notes = signal<Note[]>([]);
  novels = signal<Novel[]>([]);
  activities = signal<Activity[]>([]);
  planningItems = signal<PlanningItem[]>([]);
  // ... 15+ more concerns
}
```

**Problems**:
- Violates Single Responsibility Principle
- Hard to test
- Hard to optimize
- Can't lazy load
- Difficult to reason about

### 3. Direct Mutations ❌
```typescript
// Current: Imperative updates
updateTask(id: string, updates: Partial<Task>) {
  const updated = this.tasks().map(t => t.id === id ? {...t, ...updates} : t);
  this.tasks.set(updated);
  this.db.upsertTask(task); // Side effect
}
```

**Problems**:
- No event log
- Can't undo
- Can't debug state changes
- Can't sync across devices
- No audit trail

### 4. Editor Performance ❌
```typescript
// Current: Every keystroke triggers Angular change detection
<tiptap-editor 
  [content]="note.content" 
  (update)="updateNote($event)">
</tiptap-editor>
```

**Problems**:
- Change detection on every keystroke
- Lag on large documents
- Poor UX for fast typing

---

## Target Architecture

### Layered Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI LAYER                             │
│  Components (read-only subscriptions to stores)             │
└─────────────────┬───────────────────────────────────────────┘
                  │ dispatch(events)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      EVENT BUS                               │
│  Central event dispatcher (publish/subscribe)               │
└─────────────────┬───────────────────────────────────────────┘
                  │ events
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   DOMAIN REDUCERS                            │
│  TaskReducer, NoteReducer, EditorReducer, etc.             │
│  (pure functions: (state, event) => newState)              │
└─────────────────┬───────────────────────────────────────────┘
                  │ state updates
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   DOMAIN STORES                              │
│  TaskStore, NoteStore, EditorStore, ActivityStore, etc.    │
│  (Angular Signals - single source of truth)                │
└─────────────────┬───────────────────────────────────────────┘
                  │ state snapshots
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    EVENT LOG                                 │
│  Append-only log of all events (CRDT foundation)           │
└─────────────────┬───────────────────────────────────────────┘
                  │ persist events
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                PERSISTENCE ADAPTER                           │
│  SQLite (desktop) / RxDB (web) - storage only              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Event Bus + Command Pattern (Weeks 1-3)

### Goal
Introduce event-driven architecture without breaking existing APIs.

### Deliverables
1. Event Bus service
2. Event types and interfaces
3. Adapter layer for backward compatibility
4. Migration of 1-2 features (Tasks, Notes)

### Implementation

#### Step 1.1: Create Event Infrastructure

**File**: `apps/shared/core/events/event-bus.service.ts`
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
  
  // For debugging
  private eventLog = signal<DomainEvent[]>([]);
  
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
  
  on<T = any>(eventType: string) {
    return this.events$.pipe(
      filter(event => event.type === eventType),
      map(event => event.payload as T)
    );
  }
  
  // For debugging
  getEventLog() {
    return this.eventLog.asReadonly();
  }
}
```

#### Step 1.2: Define Event Types

**File**: `apps/shared/domain/tasks/task.events.ts`
```typescript
export const TaskEvents = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_PRIORITY_CHANGED: 'task.priority_changed',
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

export interface TaskStatusChangedPayload {
  id: string;
  oldStatus: Task['status'];
  newStatus: Task['status'];
}
```

#### Step 1.3: Create Domain Store

**File**: `apps/shared/state/stores/task.store.ts`
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Task } from '../../domain/tasks/task.model';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  // Private state
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
  
  readonly taskById = (id: string) => computed(() => 
    this._tasks().find(t => t.id === id)
  );
  
  // State mutations (called by reducers only)
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

#### Step 1.4: Create Reducer

**File**: `apps/shared/state/reducers/task.reducer.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { EventBus } from '../../core/events/event-bus.service';
import { TaskStore } from '../stores/task.store';
import { TaskEvents, TaskCreatedPayload, TaskUpdatedPayload, TaskDeletedPayload } from '../../domain/tasks/task.events';
import { ActivityStore } from '../stores/activity.store';

@Injectable({ providedIn: 'root' })
export class TaskReducer {
  private eventBus = inject(EventBus);
  private taskStore = inject(TaskStore);
  private activityStore = inject(ActivityStore);
  
  constructor() {
    this.registerHandlers();
  }
  
  private registerHandlers(): void {
    // Task Created
    this.eventBus.on<TaskCreatedPayload>(TaskEvents.TASK_CREATED)
      .subscribe(({ task }) => {
        this.taskStore.addTask(task);
        this.activityStore.addActivity({
          id: Date.now().toString(),
          text: `Task created: ${task.title}`,
          time: 'Just now',
          type: 'system'
        });
      });
    
    // Task Updated
    this.eventBus.on<TaskUpdatedPayload>(TaskEvents.TASK_UPDATED)
      .subscribe(({ id, updates }) => {
        this.taskStore.updateTask(id, updates);
        this.activityStore.addActivity({
          id: Date.now().toString(),
          text: 'Task updated',
          time: 'Just now',
          type: 'system'
        });
      });
    
    // Task Deleted
    this.eventBus.on<TaskDeletedPayload>(TaskEvents.TASK_DELETED)
      .subscribe(({ id }) => {
        this.taskStore.removeTask(id);
        this.activityStore.addActivity({
          id: Date.now().toString(),
          text: 'Task deleted',
          time: 'Just now',
          type: 'system'
        });
      });
  }
}
```

#### Step 1.5: Create Command Service (Facade)

**File**: `apps/shared/domain/tasks/task.commands.ts`
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
      type: TaskEvents.TASK_CREATED,
      payload: { task }
    });
  }
  
  updateTask(id: string, updates: Partial<Task>): void {
    this.eventBus.dispatch({
      type: TaskEvents.TASK_UPDATED,
      payload: { id, updates }
    });
  }
  
  deleteTask(id: string): void {
    this.eventBus.dispatch({
      type: TaskEvents.TASK_DELETED,
      payload: { id }
    });
  }
  
  changeStatus(id: string, newStatus: Task['status']): void {
    this.eventBus.dispatch({
      type: TaskEvents.TASK_STATUS_CHANGED,
      payload: { id, newStatus }
    });
  }
}
```

#### Step 1.6: Create Persistence Effect

**File**: `apps/shared/data/effects/task-persistence.effect.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { EventBus } from '../../core/events/event-bus.service';
import { TaskEvents, TaskCreatedPayload, TaskUpdatedPayload, TaskDeletedPayload } from '../../domain/tasks/task.events';
import { TaskStore } from '../../state/stores/task.store';

// Platform-specific persistence adapter
export abstract class PersistenceAdapter {
  abstract upsertTask(task: Task): Promise<void>;
  abstract removeTask(id: string): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class TaskPersistenceEffect {
  private eventBus = inject(EventBus);
  private taskStore = inject(TaskStore);
  private persistence = inject(PersistenceAdapter);
  
  constructor() {
    this.registerEffects();
  }
  
  private registerEffects(): void {
    // Persist on create
    this.eventBus.on<TaskCreatedPayload>(TaskEvents.TASK_CREATED)
      .subscribe(async ({ task }) => {
        await this.persistence.upsertTask(task);
      });
    
    // Persist on update
    this.eventBus.on<TaskUpdatedPayload>(TaskEvents.TASK_UPDATED)
      .subscribe(async ({ id, updates }) => {
        const task = this.taskStore.taskById(id)();
        if (task) {
          await this.persistence.upsertTask({ ...task, ...updates });
        }
      });
    
    // Persist on delete
    this.eventBus.on<TaskDeletedPayload>(TaskEvents.TASK_DELETED)
      .subscribe(async ({ id }) => {
        await this.persistence.removeTask(id);
      });
  }
}
```

#### Step 1.7: Create Desktop Persistence Adapter

**File**: `apps/desktop/src/app/data/adapters/sqlite-persistence.adapter.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@shared/data/effects/task-persistence.effect';
import { SqliteService } from '../../core/services/sqlite.service';
import { Task } from '@shared/domain/tasks/task.model';

@Injectable({ providedIn: 'root' })
export class SqlitePersistenceAdapter extends PersistenceAdapter {
  private sqlite = inject(SqliteService);
  
  async upsertTask(task: Task): Promise<void> {
    await this.sqlite.upsertTask(task);
  }
  
  async removeTask(id: string): Promise<void> {
    await this.sqlite.removeTask(id);
  }
}

// In desktop app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: PersistenceAdapter, useClass: SqlitePersistenceAdapter },
    // ... other providers
  ]
};
```

#### Step 1.8: Create Web Persistence Adapter

**File**: `apps/web/src/app/data/adapters/rxdb-persistence.adapter.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { PersistenceAdapter } from '@shared/data/effects/task-persistence.effect';
import { RxdbService } from '../../core/services/rxdb.service';
import { Task } from '@shared/domain/tasks/task.model';

@Injectable({ providedIn: 'root' })
export class RxdbPersistenceAdapter extends PersistenceAdapter {
  private rxdb = inject(RxdbService);
  
  async upsertTask(task: Task): Promise<void> {
    await this.rxdb.upsert('tasks', task);
  }
  
  async removeTask(id: string): Promise<void> {
    await this.rxdb.remove('tasks', id);
  }
}

// In web app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: PersistenceAdapter, useClass: RxdbPersistenceAdapter },
    // ... other providers
  ]
};
```

#### Step 1.9: Backward Compatibility Adapter

**File**: `apps/shared/services/store.service.ts` (modified)
```typescript
import { Injectable, inject } from '@angular/core';
import { TaskStore } from '../state/stores/task.store';
import { TaskCommands } from '../domain/tasks/task.commands';
import { Task } from '../domain/tasks/task.model';

/**
 * LEGACY ADAPTER - Provides backward compatibility
 * Components can continue using StoreService while we migrate
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private taskStore = inject(TaskStore);
  private taskCommands = inject(TaskCommands);
  
  // Expose store state (read-only)
  tasks = this.taskStore.tasks;
  
  // Delegate to commands (write)
  addTask(task: Task): void {
    this.taskCommands.createTask(task);
  }
  
  updateTask(id: string, updates: Partial<Task>): void {
    this.taskCommands.updateTask(id, updates);
  }
  
  deleteTask(id: string): void {
    this.taskCommands.deleteTask(id);
  }
  
  // ... other methods remain unchanged for now
}
```

#### Step 1.10: Component Usage (No Breaking Changes!)

**File**: `apps/desktop/src/app/components/tasks/tasks.component.ts`
```typescript
import { Component, inject } from '@angular/core';
import { StoreService } from '../../services/store.service';
// OR use new architecture directly:
// import { TaskStore } from '@shared/state/stores/task.store';
// import { TaskCommands } from '@shared/domain/tasks/task.commands';

@Component({
  selector: 'app-tasks',
  template: `
    <div class="tasks">
      @for (task of tasks(); track task.id) {
        <div class="task">{{ task.title }}</div>
      }
    </div>
  `
})
export class TasksComponent {
  private store = inject(StoreService);
  
  // Still works! No breaking changes
  tasks = this.store.tasks;
  
  createTask(title: string): void {
    this.store.addTask({
      id: crypto.randomUUID(),
      title,
      priority: 'MEDIUM',
      status: 'ACTIVE',
      hours: '0'
    });
  }
}
```

### Phase 1 Benefits ✅

1. **Event-driven foundation** - All state changes go through events
2. **Backward compatible** - Existing code continues to work
3. **Debuggable** - Event log shows all state changes
4. **Testable** - Reducers are pure functions
5. **Scalable** - Easy to add new features
6. **Foundation for sync** - Events can be replayed/synced

---

## Phase 2: Domain Stores (Weeks 4-7)

### Goal
Break monolithic StoreService into domain-specific stores.

### Migration Strategy

```typescript
// Before: Monolithic
class StoreService {
  tasks = signal<Task[]>([]);
  notes = signal<Note[]>([]);
  novels = signal<Novel[]>([]);
  activities = signal<Activity[]>([]);
  // ... 10+ more
}

// After: Domain-specific
class TaskStore { tasks = signal<Task[]>([]); }
class NoteStore { notes = signal<Note[]>([]); }
class NovelStore { novels = signal<Novel[]>([]); }
class EditorStore { activeDocument = signal<Document | null>(null); }
class ActivityStore { activities = signal<Activity[]>([]); }
class SyncStore { syncStatus = signal<SyncStatus>('idle'); }
```

### Stores to Create

1. **TaskStore** - Task management
2. **NoteStore** - Daily notes
3. **NovelStore** - Novel metadata
4. **EditorStore** - Active editor state (content, cursor, selection)
5. **ActivityStore** - Activity log
6. **JournalStore** - Journal projects and entries
7. **ResearchStore** - Research libraries and sources
8. **ArticleStore** - Article pipeline
9. **MeetingStore** - Meeting management
10. **BookStore** - Book library
11. **SnippetStore** - Code snippets
12. **BinStore** - Recycle bin
13. **SyncStore** - Sync status and conflicts
14. **UIStore** - UI state (sidebar, modals, theme)

### Implementation Pattern

Each store follows this pattern:

```typescript
@Injectable({ providedIn: 'root' })
export class [Domain]Store {
  // Private state
  private _items = signal<Item[]>([]);
  
  // Public read-only
  readonly items = this._items.asReadonly();
  
  // Computed selectors
  readonly activeItems = computed(() => 
    this._items().filter(i => i.active)
  );
  
  readonly itemById = (id: string) => computed(() =>
    this._items().find(i => i.id === id)
  );
  
  // Mutations (called by reducers only)
  setItems(items: Item[]): void {
    this._items.set(items);
  }
  
  addItem(item: Item): void {
    this._items.update(items => [...items, item]);
  }
  
  updateItem(id: string, updates: Partial<Item>): void {
    this._items.update(items =>
      items.map(i => i.id === id ? { ...i, ...updates } : i)
    );
  }
  
  removeItem(id: string): void {
    this._items.update(items => items.filter(i => i.id !== id));
  }
}
```

---

## Phase 3: Event Log + CRDT Foundation (Weeks 8-13)

### Goal
Enable offline sync, undo/redo, collaboration, and debugging.

### Event Log Architecture

```typescript
@Injectable({ providedIn: 'root' })
export class EventLog {
  private events = signal<StoredEvent[]>([]);
  
  append(event: DomainEvent): void {
    const storedEvent: StoredEvent = {
      ...event,
      id: crypto.randomUUID(),
      sequence: this.events().length,
      timestamp: Date.now(),
    };
    
    this.events.update(events => [...events, storedEvent]);
    
    // Persist to database
    this.persistEvent(storedEvent);
  }
  
  getEvents(fromSequence: number = 0): StoredEvent[] {
    return this.events().filter(e => e.sequence >= fromSequence);
  }
  
  replay(fromSequence: number = 0): void {
    const events = this.getEvents(fromSequence);
    events.forEach(event => {
      this.eventBus.dispatch(event);
    });
  }
  
  // For undo/redo
  undo(): void {
    // Implementation depends on event types
  }
  
  redo(): void {
    // Implementation depends on event types
  }
}
```

### CRDT Integration

For collaboration, we'll use Yjs or Automerge:

```typescript
import * as Y from 'yjs';

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private ydoc = new Y.Doc();
  
  // Shared types
  private tasks = this.ydoc.getArray<Task>('tasks');
  private notes = this.ydoc.getArray<Note>('notes');
  
  // Sync with event log
  constructor() {
    this.tasks.observe(event => {
      event.changes.added.forEach(item => {
        this.eventBus.dispatch({
          type: 'task.synced',
          payload: { task: item.content.getJSON() }
        });
      });
    });
  }
}
```

---

## Phase 4: Editor Performance Optimization (Weeks 14-16)

### Goal
Zero-lag typing, minimal re-renders.

### Current Problem

```typescript
// ❌ Every keystroke triggers Angular change detection
<tiptap-editor 
  [content]="note.content()" 
  (update)="updateNote($event)">
</tiptap-editor>

updateNote(content: string) {
  this.noteStore.updateNote(this.noteId, { content });
  // Triggers change detection → re-render → lag
}
```

### Solution: Editor Store + Debounced Persistence

```typescript
@Injectable({ providedIn: 'root' })
export class EditorStore {
  // Active document
  private _activeDocument = signal<{
    id: string;
    type: 'note' | 'novel';
    content: string;
  } | null>(null);
  
  readonly activeDocument = this._activeDocument.asReadonly();
  
  // Editor maintains its own state
  // Only persist on blur or after 1s debounce
  private persistQueue = new Subject<{ id: string; content: string }>();
  
  constructor() {
    this.persistQueue.pipe(
      debounceTime(1000),
      distinctUntilChanged((a, b) => a.id === b.id && a.content === b.content)
    ).subscribe(({ id, content }) => {
      this.eventBus.dispatch({
        type: 'editor.content_saved',
        payload: { id, content }
      });
    });
  }
  
  updateContent(id: string, content: string): void {
    // Update local state immediately (no re-render)
    this._activeDocument.update(doc => 
      doc?.id === id ? { ...doc, content } : doc
    );
    
    // Queue for persistence
    this.persistQueue.next({ id, content });
  }
}
```

### Editor Component

```typescript
@Component({
  selector: 'app-editor',
  template: `
    <tiptap-editor 
      [content]="initialContent"
      (update)="onUpdate($event)"
      [ngZone]="'noop'">
    </tiptap-editor>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorComponent {
  private editorStore = inject(EditorStore);
  
  @Input() documentId!: string;
  
  initialContent = '';
  
  ngOnInit() {
    // Load initial content once
    const doc = this.editorStore.activeDocument();
    if (doc?.id === this.documentId) {
      this.initialContent = doc.content;
    }
  }
  
  onUpdate(content: string) {
    // Update store without triggering change detection
    this.editorStore.updateContent(this.documentId, content);
  }
}
```

---

## File Structure (Target)

```
envello-app/
├── apps/
│   ├── desktop/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── components/
│   │       │   └── data/
│   │       │       └── adapters/
│   │       │           └── sqlite-persistence.adapter.ts
│   │       └── main.ts
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── components/
│           │   └── data/
│           │       └── adapters/
│           │           └── rxdb-persistence.adapter.ts
│           └── main.ts
├── libs/                           # NEW: Shared libraries
│   ├── core/
│   │   ├── events/
│   │   │   ├── event-bus.service.ts
│   │   │   └── event-log.service.ts
│   │   └── utils/
│   ├── state/
│   │   ├── stores/
│   │   │   ├── task.store.ts
│   │   │   ├── note.store.ts
│   │   │   ├── novel.store.ts
│   │   │   ├── editor.store.ts
│   │   │   ├── activity.store.ts
│   │   │   └── sync.store.ts
│   │   └── reducers/
│   │       ├── task.reducer.ts
│   │       ├── note.reducer.ts
│   │       └── ...
│   ├── domain/
│   │   ├── tasks/
│   │   │   ├── task.model.ts
│   │   │   ├── task.events.ts
│   │   │   └── task.commands.ts
│   │   ├── notes/
│   │   └── novels/
│   ├── data/
│   │   ├── adapters/
│   │   │   └── persistence.adapter.ts (abstract)
│   │   └── effects/
│   │       ├── task-persistence.effect.ts
│   │       └── note-persistence.effect.ts
│   ├── ai/
│   │   ├── ai.service.ts
│   │   └── vector-memory.service.ts
│   └── editor/
│       ├── editor.store.ts
│       └── editor.service.ts
└── ...
```

---

## Migration Checklist

### Phase 1: Event Bus (Weeks 1-3)
- [ ] Create event bus infrastructure
- [ ] Define event types for Tasks
- [ ] Create TaskStore
- [ ] Create TaskReducer
- [ ] Create TaskCommands
- [ ] Create persistence effects
- [ ] Create platform adapters (SQLite, RxDB)
- [ ] Add backward compatibility layer
- [ ] Migrate Tasks feature
- [ ] Migrate Notes feature
- [ ] Write tests
- [ ] Update documentation

### Phase 2: Domain Stores (Weeks 4-7)
- [ ] Create remaining stores (Novel, Journal, Research, etc.)
- [ ] Create reducers for each domain
- [ ] Create command services
- [ ] Migrate all features to new architecture
- [ ] Remove StoreService (legacy adapter)
- [ ] Update all components
- [ ] Write tests
- [ ] Performance benchmarks

### Phase 3: Event Log + CRDT (Weeks 8-13)
- [ ] Implement EventLog service
- [ ] Persist events to database
- [ ] Implement replay functionality
- [ ] Add undo/redo support
- [ ] Integrate Yjs for CRDT
- [ ] Implement sync protocol
- [ ] Add conflict resolution
- [ ] Write tests
- [ ] Load testing

### Phase 4: Editor Optimization (Weeks 14-16)
- [ ] Create EditorStore
- [ ] Implement debounced persistence
- [ ] Optimize change detection
- [ ] Add Web Worker for large documents
- [ ] Implement incremental updates
- [ ] Performance testing
- [ ] User testing

---

## Success Metrics

### Performance
- [ ] Editor typing latency < 16ms (60fps)
- [ ] Initial load time < 2s
- [ ] State update latency < 50ms
- [ ] Memory usage < 200MB for 10k items

### Architecture
- [ ] Zero direct database calls from components
- [ ] All state changes go through events
- [ ] Event log captures 100% of mutations
- [ ] Stores are domain-specific (< 500 LOC each)

### Features
- [ ] Undo/redo works for all operations
- [ ] Offline sync works reliably
- [ ] Real-time collaboration (basic)
- [ ] Event replay for debugging

---

## Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Adapter layer maintains backward compatibility during migration

### Risk 2: Performance Regression
**Mitigation**: Benchmark before/after each phase, rollback if needed

### Risk 3: Team Learning Curve
**Mitigation**: Incremental migration, pair programming, documentation

### Risk 4: Database Migration
**Mitigation**: Event log can reconstruct state, dual-write during transition

---

## Next Steps

1. **Review this roadmap** with the team
2. **Create Phase 1 tasks** in your project management tool
3. **Set up benchmarks** for current performance
4. **Start with Tasks feature** as proof of concept
5. **Iterate and refine** based on learnings

---

## Conclusion

This migration transforms Envello from a service-based architecture to an elite event-driven, local-first system that supports:
- ✅ Real-time collaboration
- ✅ Offline sync
- ✅ Undo/redo
- ✅ Zero-lag editor
- ✅ Debuggable state
- ✅ Scalable architecture

The incremental approach ensures no breaking changes while building toward the target architecture.

**Estimated Timeline**: 12-16 weeks
**Estimated Effort**: 1-2 senior engineers full-time

Ready to start Phase 1?
