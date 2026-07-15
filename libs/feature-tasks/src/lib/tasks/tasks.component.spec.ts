import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TasksComponent } from './tasks.component';
import {
  StoreService, NotificationService, FileStorageService,
  AiService, ThemeService, UserPreferencesService, ContextService, RecentActivityService,
} from '@envello/core';
import { FILE_SYSTEM } from '@envello/state';
import { DataService } from '@envello/data';

// ── Minimal service stubs ─────────────────────────────────────────────────────

function makeStoreSpy() {
  return {
    tasks:          signal<any[]>([]),
    notes:          signal<any[]>([]),
    planningItems:  signal<any[]>([]),
    activities:     signal<any[]>([]),
    books:          signal<any[]>([]),
    noteFolders:    signal<any[]>([]),
    bookmarks:      signal<any[]>([]),
    bookmarkFolders:signal<any[]>([]),
    spaces:         signal<any[]>([]),
    people:         signal<any[]>([]),
    addTask:        jest.fn(),
    updateTask:     jest.fn(),
    deleteTask:     jest.fn(),
    addPlanningItem:jest.fn(),
    addActivity:    jest.fn(),
    loadNoteContent:jest.fn().mockResolvedValue(''),
  };
}

function makeAiSpy() {
  return {
    aiEnabled: signal(false),
    sendMessage: jest.fn().mockResolvedValue(''),
    streamMessage: jest.fn(),
    providers: signal([]),
    activeProvider: signal(null),
    generateTasksFromText: jest.fn().mockResolvedValue([]),
    suggestLabels: jest.fn().mockResolvedValue([]),
  };
}

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let storeSpy: ReturnType<typeof makeStoreSpy>;

  beforeEach(async () => {
    storeSpy = makeStoreSpy();

    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        { provide: StoreService,          useValue: storeSpy },
        { provide: NotificationService,   useValue: { add: jest.fn(), info: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn(), allNotifications: signal([]), unreadCount: signal(0) } },
        { provide: FileStorageService,    useValue: { uploadFile: jest.fn().mockResolvedValue(null), deleteFile: jest.fn(), getFileUrl: jest.fn() } },
        { provide: AiService,             useValue: makeAiSpy() },
        { provide: ThemeService,          useValue: { theme: signal('dark'), toggleTheme: jest.fn() } },
        { provide: UserPreferencesService,useValue: { save: jest.fn(), get: jest.fn().mockReturnValue({}) } },
        { provide: ContextService,        useValue: { appendContext: jest.fn(), context: signal('') } },
        { provide: RecentActivityService, useValue: { log: jest.fn() } },
        // DataService + FILE_SYSTEM needed transitively by StoreService if not mocked at the token level
        { provide: DataService, useValue: { getAll: jest.fn().mockResolvedValue([]), upsert: jest.fn().mockResolvedValue(undefined), remove: jest.fn().mockResolvedValue(undefined), importData: jest.fn(), pullFromRemote: jest.fn(), saveCredential: jest.fn(), getCredentials: jest.fn().mockResolvedValue([]), deleteCredential: jest.fn(), saveTransaction: jest.fn(), getTransactions: jest.fn().mockResolvedValue([]), deleteTransaction: jest.fn(), saveLink: jest.fn(), getLinks: jest.fn().mockResolvedValue([]), deleteLink: jest.fn() } },
        { provide: FILE_SYSTEM, useValue: { saveNote: jest.fn().mockResolvedValue(''), readNote: jest.fn().mockResolvedValue(null) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Signal computed: flatListItems ─────────────────────────────────────────────

  describe('flatListItems()', () => {
    it('returns empty array when no tasks', () => {
      expect(component.flatListItems()).toHaveLength(0);
    });

    it('wraps tasks as { kind: "task" } items in non-inbox view', () => {
      storeSpy.tasks.set([
        { id: 't-1', title: 'Task A', status: 'ACTIVE', priority: 'MEDIUM', due: null } as any,
        { id: 't-2', title: 'Task B', status: 'ACTIVE', priority: 'LOW',    due: null } as any,
      ]);
      component['selectedView'].set('today'); // non-inbox view → flat task list
      fixture.detectChanges();

      const items = component.flatListItems();
      expect(items.every(i => i.kind === 'task')).toBe(true);
    });

    it('inbox view inserts group headers between tasks', () => {
      const today = new Date().toISOString().slice(0, 10);
      storeSpy.tasks.set([
        { id: 't-1', title: 'Today task', status: 'ACTIVE', priority: 'MEDIUM', due: today } as any,
        { id: 't-2', title: 'No date',    status: 'ACTIVE', priority: 'LOW',    due: null  } as any,
      ]);
      component['selectedView'].set('inbox');
      fixture.detectChanges();

      const items = component.flatListItems();
      const headers = items.filter(i => i.kind === 'header');
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  // ── Signal computed: visibleFlatItems (windowing) ─────────────────────────────

  describe('visibleFlatItems()', () => {
    it('returns all items when count <= WINDOW_THRESHOLD', () => {
      const today = new Date().toISOString().slice(0, 10);
      storeSpy.tasks.set(
        Array.from({ length: 30 }, (_, i) =>
          ({ id: `t-${i}`, title: `Task ${i}`, status: 'ACTIVE', priority: 'LOW', due: today } as any))
      );
      component['selectedView'].set('today');
      fixture.detectChanges();

      // visibleFlatItems must equal flatListItems when below the windowing threshold
      const all = component.flatListItems();
      expect(component.visibleFlatItems()).toHaveLength(all.length);
      expect(all.length).toBeGreaterThan(0);
    });

    it('returns only windowed slice when count > WINDOW_THRESHOLD', () => {
      storeSpy.tasks.set(
        Array.from({ length: 200 }, (_, i) =>
          ({ id: `t-${i}`, title: `Task ${i}`, status: 'ACTIVE', priority: 'LOW', due: null } as any))
      );
      component['selectedView'].set('today');
      component['visibleTaskRange'].set({ start: 0, end: 75 });
      fixture.detectChanges();

      expect(component.visibleFlatItems().length).toBeLessThanOrEqual(75);
    });
  });

  // ── Signal computed: thumbnails ───────────────────────────────────────────────

  describe('visibleThumbnailTasks()', () => {
    it('returns at most thumbnailsLimit tasks', () => {
      storeSpy.tasks.set(
        Array.from({ length: 100 }, (_, i) =>
          ({ id: `t-${i}`, title: `Task ${i}`, status: 'ACTIVE', priority: 'LOW', due: null } as any))
      );
      fixture.detectChanges();

      const limit = component.thumbnailsLimit();
      expect(component.visibleThumbnailTasks().length).toBeLessThanOrEqual(limit);
    });

    it('loadMoreThumbnails() increases the limit', () => {
      const before = component.thumbnailsLimit();
      component.loadMoreThumbnails();
      expect(component.thumbnailsLimit()).toBeGreaterThan(before);
    });
  });

  // ── Spacer heights ────────────────────────────────────────────────────────────

  describe('spacer height computeds', () => {
    it('topSpacerHeight() is 0 when list fits within threshold', () => {
      storeSpy.tasks.set([]);
      fixture.detectChanges();
      expect(component.topSpacerHeight()).toBe(0);
    });

    it('bottomSpacerHeight() is 0 when list fits within threshold', () => {
      storeSpy.tasks.set([]);
      fixture.detectChanges();
      expect(component.bottomSpacerHeight()).toBe(0);
    });
  });
});
