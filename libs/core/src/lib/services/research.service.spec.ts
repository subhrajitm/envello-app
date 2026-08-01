import { TestBed } from '@angular/core/testing';
import { ResearchService } from './research.service';
import { NotificationService } from './notification.service';
import { DataService } from '@envello/data';

// ── Mock factories ────────────────────────────────────────────────────────────

function makeDb() {
  return {
    getAll:            jest.fn().mockResolvedValue([]),
    upsert:            jest.fn().mockResolvedValue(undefined),
    remove:            jest.fn().mockResolvedValue(undefined),
    importData:        jest.fn().mockResolvedValue(undefined),
    pullFromRemote:    jest.fn().mockResolvedValue(undefined),
    saveCredential:    jest.fn(),
    getCredentials:    jest.fn(),
    deleteCredential:  jest.fn(),
    saveTransaction:   jest.fn(),
    getTransactions:   jest.fn(),
    deleteTransaction: jest.fn(),
    saveLink:          jest.fn(),
    getLinks:          jest.fn(),
    deleteLink:        jest.fn(),
  };
}

function makeNotify() {
  return {
    add:     jest.fn(),
    info:    jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error:   jest.fn(),
    markAsRead:    jest.fn(),
    markAllAsRead: jest.fn(),
    delete:        jest.fn(),
    clearAll:      jest.fn(),
    clearRead:     jest.fn(),
    getById:       jest.fn(),
    getUnread:     jest.fn().mockReturnValue([]),
    allNotifications: { asReadonly: jest.fn() } as any,
    unreadCount: { set: jest.fn() } as any,
  };
}

// ── Test data builders ────────────────────────────────────────────────────────

const mkCol   = (n = 'AI Research') => ({ name: n, description: 'desc', color: '#red' });
const mkSrc   = (title = 'Source A', colId?: string) => ({
  title, collectionId: colId, sourceType: 'WEB' as const, tags: [], status: 'UNREAD' as const,
});
const mkSum   = (title = 'Summary A', colId = 'col-1') => ({
  collectionId: colId, title, content: 'Content', sourceIds: [], tags: [],
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ResearchService', () => {
  let service: ResearchService;
  let db: ReturnType<typeof makeDb>;
  let notify: ReturnType<typeof makeNotify>;

  /** Flush microtask queue so fire-and-forget upsert() promises settle. */
  const flush = () => new Promise<void>(r => setTimeout(r, 0));

  beforeEach(() => {
    // Spy on dispatchEvent so window event listeners don't trigger loadFromDb
    jest.spyOn(window, 'addEventListener').mockReturnValue();

    db = makeDb();
    notify = makeNotify();

    TestBed.configureTestingModule({
      providers: [
        ResearchService,
        { provide: DataService,         useValue: db     },
        { provide: NotificationService, useValue: notify },
      ],
    });
    service = TestBed.inject(ResearchService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── Collections ───────────────────────────────────────────────────────────────

  describe('Collections', () => {
    it('addCollection() prepends to collections signal', () => {
      service.addCollection(mkCol('AI'));
      expect(service.collections()).toHaveLength(1);
      expect(service.collections()[0].name).toBe('AI');
    });

    it('addCollection() generates id, createdDate, lastModified', () => {
      service.addCollection(mkCol());
      const col = service.collections()[0];
      expect(col.id).toBeTruthy();
      expect(col.createdDate).toBeTruthy();
      expect(col.lastModified).toBeTruthy();
    });

    it('addCollection() calls db.upsert with research_collections', () => {
      service.addCollection(mkCol('ML'));
      expect(db.upsert).toHaveBeenCalledWith(
        'research_collections',
        expect.objectContaining({ name: 'ML' })
      );
    });

    it('updateCollection() changes name and updates lastModified', () => {
      service.addCollection(mkCol('Old'));
      const id = service.collections()[0].id;

      service.updateCollection(id, { name: 'New Name' });

      expect(service.collections()[0].name).toBe('New Name');
      expect(service.collections()[0].lastModified).toBeTruthy();
    });

    it('updateCollection() calls db.upsert', () => {
      service.addCollection(mkCol());
      const id = service.collections()[0].id;
      db.upsert.mockClear();

      service.updateCollection(id, { name: 'Updated' });

      expect(db.upsert).toHaveBeenCalledWith(
        'research_collections',
        expect.objectContaining({ id, name: 'Updated' })
      );
    });

    it('deleteCollection() removes from collections signal', async () => {
      service.addCollection(mkCol());
      const id = service.collections()[0].id;

      await service.deleteCollection(id);
      expect(service.collections()).toHaveLength(0);
    });

    it('deleteCollection() calls db.remove for the collection', async () => {
      service.addCollection(mkCol());
      const id = service.collections()[0].id;
      db.remove.mockResolvedValue(undefined);

      await service.deleteCollection(id);
      expect(db.remove).toHaveBeenCalledWith('research_collections', id);
    });

    it('deleteCollection() also removes associated sources from signal', async () => {
      service.addCollection(mkCol());
      const colId = service.collections()[0].id;

      service.addSource(mkSrc('Source in col', colId));
      service.addSource(mkSrc('Source elsewhere', 'other-col'));

      await service.deleteCollection(colId);

      expect(service.sources()).toHaveLength(1);
      expect(service.sources()[0].title).toBe('Source elsewhere');
    });

    it('deleteCollection() also removes associated summaries from signal', async () => {
      service.addCollection(mkCol());
      const colId = service.collections()[0].id;

      service.addSummary(mkSum('Summary in col', colId));
      service.addSummary(mkSum('Summary elsewhere', 'other-col'));

      await service.deleteCollection(colId);

      expect(service.summaries()).toHaveLength(1);
      expect(service.summaries()[0].title).toBe('Summary elsewhere');
    });

    it('deleteCollection() calls notify.error when db.remove throws', async () => {
      service.addCollection(mkCol());
      const id = service.collections()[0].id;
      db.remove.mockRejectedValue(new Error('DB offline'));

      await service.deleteCollection(id);

      expect(notify.error).toHaveBeenCalledWith('Delete failed', expect.any(String));
    });
  });

  // ── Sources ───────────────────────────────────────────────────────────────────

  describe('Sources', () => {
    it('addSource() prepends to sources signal', () => {
      service.addSource(mkSrc('First'));
      service.addSource(mkSrc('Second'));
      expect(service.sources()).toHaveLength(2);
    });

    it('addSource() generates id and createdDate', () => {
      service.addSource(mkSrc());
      const src = service.sources()[0];
      expect(src.id).toBeTruthy();
      expect(src.createdDate).toBeTruthy();
    });

    it('addSource() calls db.upsert with research_sources', () => {
      service.addSource(mkSrc('My Source'));
      expect(db.upsert).toHaveBeenCalledWith(
        'research_sources',
        expect.objectContaining({ title: 'My Source' })
      );
    });

    it('updateSource() updates matching source', () => {
      service.addSource(mkSrc('Original'));
      const id = service.sources()[0].id;

      service.updateSource(id, { title: 'Renamed' });
      expect(service.sources()[0].title).toBe('Renamed');
    });

    it('updateSource() calls db.upsert', () => {
      service.addSource(mkSrc());
      const id = service.sources()[0].id;
      db.upsert.mockClear();

      service.updateSource(id, { title: 'X' });
      expect(db.upsert).toHaveBeenCalledWith('research_sources', expect.objectContaining({ id }));
    });

    it('deleteSource() removes from sources signal', () => {
      service.addSource(mkSrc('Keep'));
      service.addSource(mkSrc('Delete'));
      const idToDelete = service.sources()[0].id; // most recent is first

      service.deleteSource(idToDelete);
      expect(service.sources()).toHaveLength(1);
    });

    it('deleteSource() calls db.remove', () => {
      service.addSource(mkSrc());
      const id = service.sources()[0].id;

      service.deleteSource(id);
      expect(db.remove).toHaveBeenCalledWith('research_sources', id);
    });

    it('getSourcesByCollection() filters by collectionId', () => {
      service.addSource(mkSrc('In Col',   'col-A'));
      service.addSource(mkSrc('Other',    'col-B'));
      service.addSource(mkSrc('Also Col', 'col-A'));

      const result = service.getSourcesByCollection('col-A');
      expect(result).toHaveLength(2);
      expect(result.every(s => s.collectionId === 'col-A')).toBe(true);
    });
  });

  // ── Summaries ─────────────────────────────────────────────────────────────────

  describe('Summaries', () => {
    it('addSummary() prepends to summaries signal', () => {
      service.addSummary(mkSum());
      expect(service.summaries()).toHaveLength(1);
    });

    it('addSummary() generates id, createdDate, lastModified', () => {
      service.addSummary(mkSum());
      const s = service.summaries()[0];
      expect(s.id).toBeTruthy();
      expect(s.createdDate).toBeTruthy();
      expect(s.lastModified).toBeTruthy();
    });

    it('addSummary() calls db.upsert with research_summaries', () => {
      service.addSummary(mkSum('My Summary'));
      expect(db.upsert).toHaveBeenCalledWith(
        'research_summaries',
        expect.objectContaining({ title: 'My Summary' })
      );
    });

    it('updateSummary() updates matching summary', () => {
      service.addSummary(mkSum('Old Title'));
      const id = service.summaries()[0].id;

      service.updateSummary(id, { title: 'New Title' });
      expect(service.summaries()[0].title).toBe('New Title');
    });

    it('deleteSummary() removes from summaries signal', () => {
      service.addSummary(mkSum('A'));
      service.addSummary(mkSum('B'));
      const id = service.summaries()[0].id;

      service.deleteSummary(id);
      expect(service.summaries()).toHaveLength(1);
    });

    it('deleteSummary() calls db.remove', () => {
      service.addSummary(mkSum());
      const id = service.summaries()[0].id;

      service.deleteSummary(id);
      expect(db.remove).toHaveBeenCalledWith('research_summaries', id);
    });

    it('getSummariesByCollection() filters by collectionId', () => {
      service.addSummary(mkSum('S1', 'col-A'));
      service.addSummary(mkSum('S2', 'col-B'));

      const result = service.getSummariesByCollection('col-A');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('S1');
    });
  });

  // ── Error notifications (new behaviour added in Sprint 1-2) ───────────────────

  describe('Error notifications via NotificationService', () => {
    it('shows error toast when persistSource (upsert) fails', async () => {
      db.upsert.mockRejectedValue(new Error('Network error'));

      service.addSource(mkSrc('Failing Source'));
      await flush();

      expect(notify.error).toHaveBeenCalledWith('Save failed', expect.any(String));
    });

    it('shows error toast when persistSummary (upsert) fails', async () => {
      db.upsert.mockRejectedValue(new Error('Disk full'));

      service.addSummary(mkSum('Failing Summary'));
      await flush();

      expect(notify.error).toHaveBeenCalledWith('Save failed', expect.any(String));
    });

    it('shows error toast when persistCollection (upsert) fails', async () => {
      db.upsert.mockRejectedValue(new Error('Offline'));

      service.addCollection(mkCol('Failing Col'));
      await flush();

      expect(notify.error).toHaveBeenCalledWith('Save failed', expect.any(String));
    });
  });
});
