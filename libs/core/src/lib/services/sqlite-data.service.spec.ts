import { TestBed } from '@angular/core/testing';
import { SqliteDataService } from './sqlite-data.service';
import { SqliteService } from './sqlite.service';

/**
 * Tests cover only the localStorage fallback path (non-Tauri environment).
 * In the jest/jsdom environment, window.__TAURI_INTERNALS__ is undefined,
 * so SqliteService is never called.
 */
/** Build a jest mock for SqliteService — none of these methods are called in the non-Tauri path. */
function makeSqliteSpy(): Partial<SqliteService> {
  const fn = () => jest.fn().mockResolvedValue(undefined);
  return {
    getDb:                    fn(),
    getAllTasks:               jest.fn().mockResolvedValue([]),
    upsertTask:               fn(),   removeTask:               fn(),
    getAllNotes:               jest.fn().mockResolvedValue([]),
    upsertNote:               fn(),   removeNote:               fn(),
    getAllBookmarks:           jest.fn().mockResolvedValue([]),
    upsertBookmark:           fn(),   removeBookmark:           fn(),
    getAllProjects:            jest.fn().mockResolvedValue([]),
    upsertProject:            fn(),   removeProject:            fn(),
    getAllCredentials:         jest.fn().mockResolvedValue([]),
    upsertCredential:         fn(),   removeCredential:         fn(),
    getAllTransactions:        jest.fn().mockResolvedValue([]),
    upsertTransaction:        fn(),   removeTransaction:        fn(),
    getAllLinks:               jest.fn().mockResolvedValue([]),
    upsertLink:               fn(),   removeLink:               fn(),
    getAllResearchCollections: jest.fn().mockResolvedValue([]),
    upsertResearchCollection: fn(),   removeResearchCollection: fn(),
    getAllResearchSources:     jest.fn().mockResolvedValue([]),
    upsertResearchSource:     fn(),   removeResearchSource:     fn(),
    getAllResearchSummaries:   jest.fn().mockResolvedValue([]),
    upsertResearchSummary:    fn(),   removeResearchSummary:    fn(),
    getAllNoteHistory:         jest.fn().mockResolvedValue([]),
    upsertNoteHistory:        fn(),   removeNoteHistory:        fn(),
    getAllChapterHistory:      jest.fn().mockResolvedValue([]),
    upsertChapterHistory:     fn(),   removeChapterHistory:     fn(),
    getAllPeople:              jest.fn().mockResolvedValue([]),
    upsertPerson:             fn(),   removePerson:             fn(),
    getAllNoteFolders:         jest.fn().mockResolvedValue([]),
    upsertNoteFolder:         fn(),   removeNoteFolder:         fn(),
    getAllBookmarkFolders:     jest.fn().mockResolvedValue([]),
    upsertBookmarkFolder:     fn(),   removeBookmarkFolder:     fn(),
  };
}

describe('SqliteDataService — localStorage fallback', () => {
  let service: SqliteDataService;
  let sqliteSpy: Partial<SqliteService>;

  const key = (coll: string) => `envello_local_${coll}`;

  beforeEach(() => {
    localStorage.clear();
    sqliteSpy = makeSqliteSpy();

    TestBed.configureTestingModule({
      providers: [
        SqliteDataService,
        { provide: SqliteService, useValue: sqliteSpy },
      ],
    });

    service = TestBed.inject(SqliteDataService);
  });

  afterEach(() => localStorage.clear());

  // ── getAll() ────────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('returns empty array when collection absent from localStorage', async () => {
      const result = await service.getAll('tasks');
      expect(result).toEqual([]);
    });

    it('returns parsed items from localStorage', async () => {
      const items = [{ id: '1', title: 'Task One' }, { id: '2', title: 'Task Two' }];
      localStorage.setItem(key('tasks'), JSON.stringify(items));

      const result = await service.getAll<typeof items[0]>('tasks');
      expect(result).toEqual(items);
    });

    it('returns empty array and does not throw on malformed JSON', async () => {
      localStorage.setItem(key('notes'), '{invalid json');
      const result = await service.getAll('notes');
      expect(result).toEqual([]);
    });

    it('returns empty array for unknown collection', async () => {
      const result = await service.getAll('does_not_exist');
      expect(result).toEqual([]);
    });

    it('does not call SqliteService methods in non-Tauri env', async () => {
      await service.getAll('tasks');
      expect(sqliteSpy.getAllTasks as jest.Mock).not.toHaveBeenCalled();
    });
  });

  // ── upsert() ────────────────────────────────────────────────────────────────

  describe('upsert()', () => {
    it('adds a new item to an empty collection', async () => {
      const item = { id: 'task-1', title: 'New Task' };
      await service.upsert('tasks', item);

      const stored = JSON.parse(localStorage.getItem(key('tasks'))!);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toEqual(item);
    });

    it('updates an existing item matched by id', async () => {
      const original = { id: 'task-1', title: 'Original' };
      localStorage.setItem(key('tasks'), JSON.stringify([original]));

      await service.upsert('tasks', { id: 'task-1', title: 'Updated' });

      const stored = JSON.parse(localStorage.getItem(key('tasks'))!);
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('Updated');
    });

    it('appends without removing other items', async () => {
      localStorage.setItem(key('tasks'), JSON.stringify([{ id: 'task-1' }]));
      await service.upsert('tasks', { id: 'task-2' });

      const stored = JSON.parse(localStorage.getItem(key('tasks'))!);
      expect(stored).toHaveLength(2);
    });

    it('does not call SqliteService methods in non-Tauri env', async () => {
      await service.upsert('tasks', { id: 'x' });
      expect(sqliteSpy.upsertTask as jest.Mock).not.toHaveBeenCalled();
    });
  });

  // ── remove() ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('removes the item with matching id', async () => {
      localStorage.setItem(key('tasks'), JSON.stringify([{ id: 'task-1' }, { id: 'task-2' }]));

      await service.remove('tasks', 'task-1');

      const stored = JSON.parse(localStorage.getItem(key('tasks'))!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('task-2');
    });

    it('is a no-op when id is not found', async () => {
      localStorage.setItem(key('tasks'), JSON.stringify([{ id: 'task-1' }]));
      await service.remove('tasks', 'nonexistent');

      const stored = JSON.parse(localStorage.getItem(key('tasks'))!);
      expect(stored).toHaveLength(1);
    });

    it('removes from empty collection without throwing', async () => {
      await expect(service.remove('tasks', 'any-id')).resolves.toBeUndefined();
    });
  });

  // ── Vault convenience methods ───────────────────────────────────────────────

  describe('Credentials (saveCredential / getCredentials / deleteCredential)', () => {
    it('saves and retrieves a credential', async () => {
      const cred = { id: 'cred-1', title: 'Gmail', username: 'user@example.com' } as any;
      await service.saveCredential(cred);

      const results = await service.getCredentials();
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('cred-1');
    });

    it('deleteCredential() removes the credential by id', async () => {
      await service.saveCredential({ id: 'cred-1' } as any);
      await service.saveCredential({ id: 'cred-2' } as any);

      await service.deleteCredential('cred-1');

      const results = await service.getCredentials();
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('cred-2');
    });
  });

  describe('Transactions (saveTransaction / getTransactions / deleteTransaction)', () => {
    it('saves and retrieves a transaction', async () => {
      const tx = { id: 'tx-1', amount: 99, currency: 'USD' } as any;
      await service.saveTransaction(tx);

      const results = await service.getTransactions();
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('tx-1');
    });

    it('deleteTransaction() removes the transaction by id', async () => {
      await service.saveTransaction({ id: 'tx-1' } as any);
      await service.deleteTransaction('tx-1');

      expect(await service.getTransactions()).toHaveLength(0);
    });
  });

  describe('Links (saveLink / getLinks / deleteLink)', () => {
    it('saves and retrieves a link', async () => {
      const link = { id: 'link-1', credentialId: 'c-1', transactionId: 'tx-1' } as any;
      await service.saveLink(link);

      const results = await service.getLinks();
      expect(results).toHaveLength(1);
    });

    it('deleteLink() removes the link by id', async () => {
      await service.saveLink({ id: 'link-1' } as any);
      await service.deleteLink('link-1');

      expect(await service.getLinks()).toHaveLength(0);
    });
  });

  // ── Round-trip: upsert → getAll → remove ───────────────────────────────────

  describe('round-trip', () => {
    it('bookmarks: add 3, update 1, remove 1 → 2 remaining', async () => {
      await service.upsert('bookmarks', { id: 'bm-1', title: 'Google' });
      await service.upsert('bookmarks', { id: 'bm-2', title: 'GitHub' });
      await service.upsert('bookmarks', { id: 'bm-3', title: 'MDN' });

      await service.upsert('bookmarks', { id: 'bm-2', title: 'GitHub (updated)' });
      await service.remove('bookmarks', 'bm-1');

      const result = await service.getAll<{ id: string; title: string }>('bookmarks');
      expect(result).toHaveLength(2);
      expect(result.find(b => b.id === 'bm-2')?.title).toBe('GitHub (updated)');
      expect(result.find(b => b.id === 'bm-1')).toBeUndefined();
    });
  });
});
