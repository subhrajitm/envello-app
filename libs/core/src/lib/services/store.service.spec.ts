import { TestBed } from '@angular/core/testing';
import { StoreService, FILE_SYSTEM } from '@envello/state';
import { DataService } from '@envello/data';

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeDb(): jest.Mocked<Pick<DataService,
  'getAll' | 'upsert' | 'remove' | 'importData' | 'pullFromRemote' |
  'saveCredential' | 'getCredentials' | 'deleteCredential' |
  'saveTransaction' | 'getTransactions' | 'deleteTransaction' |
  'saveLink' | 'getLinks' | 'deleteLink'
>> {
  return {
    getAll:            jest.fn().mockResolvedValue([]),
    upsert:            jest.fn().mockResolvedValue(undefined),
    remove:            jest.fn().mockResolvedValue(undefined),
    importData:        jest.fn().mockResolvedValue(undefined),
    pullFromRemote:    jest.fn().mockResolvedValue(undefined),
    saveCredential:    jest.fn().mockResolvedValue(undefined),
    getCredentials:    jest.fn().mockResolvedValue([]),
    deleteCredential:  jest.fn().mockResolvedValue(undefined),
    saveTransaction:   jest.fn().mockResolvedValue(undefined),
    getTransactions:   jest.fn().mockResolvedValue([]),
    deleteTransaction: jest.fn().mockResolvedValue(undefined),
    saveLink:          jest.fn().mockResolvedValue(undefined),
    getLinks:          jest.fn().mockResolvedValue([]),
    deleteLink:        jest.fn().mockResolvedValue(undefined),
  };
}

function makeFs() {
  return {
    saveNote: jest.fn().mockResolvedValue('/notes/note.md'),
    readNote: jest.fn().mockResolvedValue(null),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const task   = (id = 'task-1', overrides: object = {}) =>
  ({ id, title: 'Test Task', status: 'ACTIVE', priority: 'MEDIUM', ...overrides } as any);
const bm     = (id = 'bm-1', overrides: object = {}) =>
  ({ id, title: 'Bookmark', url: 'https://example.com', ...overrides } as any);
const space  = (id = 'sp-1', overrides: object = {}) =>
  ({ id, title: 'Work Space', ...overrides } as any);
const folder = (id = 'f-1')  => ({ id, name: 'Personal', icon: 'folder' });

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('StoreService', () => {
  let service: StoreService;
  let db: ReturnType<typeof makeDb>;
  let fs: ReturnType<typeof makeFs>;

  function setup(dbOverride?: Partial<ReturnType<typeof makeDb>>) {
    db = { ...makeDb(), ...dbOverride };
    fs = makeFs();

    TestBed.configureTestingModule({
      providers: [
        StoreService,
        { provide: DataService, useValue: db },
        { provide: FILE_SYSTEM, useValue: fs },
      ],
    });
    service = TestBed.inject(StoreService);
  }

  beforeEach(() => setup());

  /** Flush the microtask queue so constructor loadFromDb() Promises resolve. */
  const flush = () => new Promise<void>(r => setTimeout(r, 0));

  afterEach(() => TestBed.resetTestingModule());

  // ── Creation ─────────────────────────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('calls DataService.getAll for all collections on construction', async () => {
    await flush();
    expect(db.getAll).toHaveBeenCalledWith('tasks');
    expect(db.getAll).toHaveBeenCalledWith('notes');
    expect(db.getAll).toHaveBeenCalledWith('bookmarks');
    expect(db.getAll).toHaveBeenCalledWith('projects');
    expect(db.getAll).toHaveBeenCalledWith('people');
  });

  // ── Tasks ─────────────────────────────────────────────────────────────────────

  describe('Tasks', () => {
    it('addTask() prepends to the tasks signal', () => {
      service.addTask(task());
      expect(service.tasks()[0].id).toBe('task-1');
    });

    it('addTask() calls db.upsert with the task', () => {
      const t = task();
      service.addTask(t);
      expect(db.upsert).toHaveBeenCalledWith('tasks', expect.objectContaining({ id: 'task-1' }));
    });

    it('addTask() with two tasks keeps both in signal', () => {
      service.addTask(task('t-1'));
      service.addTask(task('t-2'));
      expect(service.tasks()).toHaveLength(2);
    });

    it('updateTask() mutates the correct task by id', () => {
      service.tasks.set([task()]);
      service.updateTask('task-1', { title: 'Renamed' });
      expect(service.tasks()[0].title).toBe('Renamed');
    });

    it('updateTask() merges fields without replacing the whole object', () => {
      service.tasks.set([task('t-1', { priority: 'HIGH', status: 'ACTIVE' })]);
      service.updateTask('t-1', { priority: 'LOW' });
      expect(service.tasks()[0].status).toBe('ACTIVE'); // unchanged
      expect(service.tasks()[0].priority).toBe('LOW');  // updated
    });

    it('updateTask() calls db.upsert with the merged task', () => {
      db.upsert.mockClear();
      service.tasks.set([task()]);
      service.updateTask('task-1', { title: 'Updated' });
      expect(db.upsert).toHaveBeenCalledWith('tasks', expect.objectContaining({ title: 'Updated' }));
    });

    it('updateTask() does nothing for unknown id', () => {
      service.tasks.set([task()]);
      service.updateTask('does-not-exist', { title: 'Ghost' });
      expect(service.tasks()[0].title).toBe('Test Task');
    });

    it('deleteTask() removes task from signal', () => {
      service.tasks.set([task('t-1'), task('t-2')]);
      service.deleteTask('t-1');
      expect(service.tasks()).toHaveLength(1);
      expect(service.tasks()[0].id).toBe('t-2');
    });

    it('deleteTask() soft-deletes via db.upsert with deleted_at', () => {
      db.upsert.mockClear();
      service.tasks.set([task()]);
      service.deleteTask('task-1');
      expect(db.upsert).toHaveBeenCalledWith('tasks',
        expect.objectContaining({ id: 'task-1', deleted_at: expect.any(String) }));
    });

    it('deleteTask() does nothing for unknown id', () => {
      service.tasks.set([task()]);
      db.upsert.mockClear();
      service.deleteTask('ghost');
      expect(service.tasks()).toHaveLength(1);
      expect(db.upsert).not.toHaveBeenCalled();
    });
  });

  // ── Bookmarks ─────────────────────────────────────────────────────────────────

  describe('Bookmarks', () => {
    it('addBookmark() prepends to bookmarks signal', () => {
      service.addBookmark(bm());
      expect(service.bookmarks()[0].id).toBe('bm-1');
    });

    it('addBookmark() calls db.upsert', () => {
      service.addBookmark(bm());
      expect(db.upsert).toHaveBeenCalledWith('bookmarks', expect.objectContaining({ id: 'bm-1' }));
    });

    it('updateBookmark() updates the correct bookmark', () => {
      service.bookmarks.set([bm()]);
      service.updateBookmark('bm-1', { title: 'Updated Bookmark' });
      expect(service.bookmarks()[0].title).toBe('Updated Bookmark');
    });

    it('deleteBookmark() removes from signal', () => {
      service.bookmarks.set([bm('bm-1'), bm('bm-2')]);
      service.deleteBookmark('bm-1');
      expect(service.bookmarks()).toHaveLength(1);
      expect(service.bookmarks()[0].id).toBe('bm-2');
    });

    it('deleteBookmark() soft-deletes via db.upsert with deleted_at', () => {
      db.upsert.mockClear();
      service.bookmarks.set([bm()]);
      service.deleteBookmark('bm-1');
      expect(db.upsert).toHaveBeenCalledWith('bookmarks',
        expect.objectContaining({ id: 'bm-1', deleted_at: expect.any(String) }));
    });

    it('batchUpdateBookmarks() applies patch to each matching id', () => {
      service.bookmarks.set([bm('bm-1', { title: 'A' }), bm('bm-2', { title: 'B' })]);
      service.batchUpdateBookmarks([
        { id: 'bm-1', data: { title: 'A Prime' } },
        { id: 'bm-2', data: { title: 'B Prime' } },
      ]);
      expect(service.bookmarks()[0].title).toBe('A Prime');
      expect(service.bookmarks()[1].title).toBe('B Prime');
    });

    it('batchUpdateBookmarks() is a no-op for empty array', () => {
      service.bookmarks.set([bm()]);
      db.upsert.mockClear();
      service.batchUpdateBookmarks([]);
      expect(db.upsert).not.toHaveBeenCalled();
    });

    it('batchUpdateBookmarks() does not mutate unmatched items', () => {
      service.bookmarks.set([bm('bm-1', { title: 'Keep' }), bm('bm-2', { title: 'Change' })]);
      service.batchUpdateBookmarks([{ id: 'bm-2', data: { title: 'Changed' } }]);
      expect(service.bookmarks()[0].title).toBe('Keep');
    });
  });

  // ── Bookmark Folders ──────────────────────────────────────────────────────────

  describe('BookmarkFolders', () => {
    const bf = (id = 'bf-1') => ({ id, name: 'Coding', parentId: null, color: '' } as any);

    it('addBookmarkFolder() appends to bookmarkFolders', () => {
      service.addBookmarkFolder(bf());
      expect(service.bookmarkFolders()).toHaveLength(1);
    });

    it('updateBookmarkFolder() updates the correct folder', () => {
      service.bookmarkFolders.set([bf()]);
      service.updateBookmarkFolder('bf-1', { name: 'Dev' });
      expect(service.bookmarkFolders()[0].name).toBe('Dev');
    });
  });

  // ── Spaces ────────────────────────────────────────────────────────────────────

  describe('Spaces', () => {
    it('addSpace() appends to spaces signal', () => {
      service.addSpace(space());
      expect(service.spaces()[0].id).toBe('sp-1');
    });

    it('addSpace() calls db.upsert', () => {
      service.addSpace(space());
      expect(db.upsert).toHaveBeenCalledWith('projects', expect.objectContaining({ id: 'sp-1' }));
    });

    it('updateSpace() updates the correct space', () => {
      service.spaces.set([space()]);
      service.updateSpace('sp-1', { title: 'Personal' });
      expect(service.spaces()[0].title).toBe('Personal');
    });

    it('deleteSpace() removes from signal', () => {
      service.spaces.set([space('sp-1'), space('sp-2')]);
      service.deleteSpace('sp-1');
      expect(service.spaces()).toHaveLength(1);
      expect(service.spaces()[0].id).toBe('sp-2');
    });

    it('deleteSpace() calls db.remove', () => {
      service.spaces.set([space()]);
      service.deleteSpace('sp-1');
      expect(db.remove).toHaveBeenCalledWith('projects', 'sp-1');
    });
  });

  // ── Note Folders ──────────────────────────────────────────────────────────────

  describe('Note Folders', () => {
    it('addNoteFolder() appends to noteFolders', () => {
      const before = service.noteFolders().length;
      service.addNoteFolder(folder());
      expect(service.noteFolders()).toHaveLength(before + 1);
    });

    it('removeNoteFolder() removes the folder by id', () => {
      service.noteFolders.set([folder('f-1'), folder('f-2')]);
      service.removeNoteFolder('f-1');
      expect(service.noteFolders()).toHaveLength(1);
      expect(service.noteFolders()[0].id).toBe('f-2');
    });

    it('updateNoteFolder() updates name and icon', () => {
      service.noteFolders.set([folder('f-1')]);
      service.updateNoteFolder('f-1', { name: 'Work', icon: 'work' });
      expect(service.noteFolders()[0].name).toBe('Work');
      expect(service.noteFolders()[0].icon).toBe('work');
    });
  });

  // ── People ────────────────────────────────────────────────────────────────────

  describe('People', () => {
    const person = (id = 'p-1') => ({ id, name: 'Alice', email: 'alice@example.com' } as any);

    it('addPerson() appends to people signal', () => {
      service.addPerson(person());
      expect(service.people()[0].id).toBe('p-1');
    });

    it('updatePerson() updates the correct person', () => {
      service.people.set([person()]);
      service.updatePerson('p-1', { name: 'Alice B.' });
      expect(service.people()[0].name).toBe('Alice B.');
    });

    it('deletePerson() removes from signal', () => {
      service.people.set([person()]);
      service.deletePerson('p-1');
      expect(service.people()).toHaveLength(0);
    });

    it('deletePerson() soft-deletes via db.upsert with deleted_at', () => {
      db.upsert.mockClear();
      service.people.set([person()]);
      service.deletePerson('p-1');
      expect(db.upsert).toHaveBeenCalledWith('people',
        expect.objectContaining({ id: 'p-1', deleted_at: expect.any(String) }));
    });
  });

  // ── loadFromDb() — data population ────────────────────────────────────────────
  // Each test here configures its own TestBed so the mock data is in place
  // before the StoreService constructor calls loadFromDb().

  describe('loadFromDb() data population', () => {
    let svc: StoreService;

    function setupWith(dbGetAll: jest.Mock) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          StoreService,
          { provide: DataService, useValue: { ...makeDb(), getAll: dbGetAll } },
          { provide: FILE_SYSTEM, useValue: makeFs() },
        ],
      });
      svc = TestBed.inject(StoreService);
    }

    afterEach(() => TestBed.resetTestingModule());

    it('populates tasks signal from DataService', async () => {
      const tasks = [{ id: 't-1', title: 'Loaded', status: 'ACTIVE', deleted_at: null }];
      setupWith(jest.fn().mockImplementation((coll: string) =>
        coll === 'tasks' ? Promise.resolve(tasks) : Promise.resolve([])
      ));
      await flush();
      expect(svc.tasks()[0].id).toBe('t-1');
    });

    it('excludes soft-deleted tasks (deleted_at set)', async () => {
      const tasks = [
        { id: 't-active',  title: 'Active',  status: 'ACTIVE', deleted_at: null },
        { id: 't-deleted', title: 'Deleted', status: 'ACTIVE', deleted_at: '2024-01-01T00:00:00.000Z' },
      ];
      setupWith(jest.fn().mockImplementation((coll: string) =>
        coll === 'tasks' ? Promise.resolve(tasks) : Promise.resolve([])
      ));
      await flush();
      expect(svc.tasks()).toHaveLength(1);
      expect(svc.tasks()[0].id).toBe('t-active');
    });

    it('populates bookmarks signal from DataService', async () => {
      const bookmarks = [{ id: 'bm-1', title: 'Test', url: 'http://x.com', deleted_at: null }];
      setupWith(jest.fn().mockImplementation((coll: string) =>
        coll === 'bookmarks' ? Promise.resolve(bookmarks) : Promise.resolve([])
      ));
      await flush();
      expect(svc.bookmarks()[0].id).toBe('bm-1');
    });

    it('excludes soft-deleted bookmarks', async () => {
      const bookmarks = [
        { id: 'bm-live',    title: 'Live',    deleted_at: null },
        { id: 'bm-deleted', title: 'Deleted', deleted_at: '2024-01-01T00:00:00.000Z' },
      ];
      setupWith(jest.fn().mockImplementation((coll: string) =>
        coll === 'bookmarks' ? Promise.resolve(bookmarks) : Promise.resolve([])
      ));
      await flush();
      expect(svc.bookmarks()).toHaveLength(1);
      expect(svc.bookmarks()[0].id).toBe('bm-live');
    });

    it('sets default note folder when DB returns none', async () => {
      setupWith(jest.fn().mockResolvedValue([]));
      await flush();
      expect(svc.noteFolders()).toHaveLength(1);
      expect(svc.noteFolders()[0].id).toBe('personal');
    });

    it('uses loaded note folders when DB returns them', async () => {
      const folders = [{ id: 'custom-f', name: 'Custom', icon: 'star' }];
      setupWith(jest.fn().mockImplementation((coll: string) =>
        coll === 'note_folders' ? Promise.resolve(folders) : Promise.resolve([])
      ));
      await flush();
      expect(svc.noteFolders()[0].id).toBe('custom-f');
    });
  });
});
