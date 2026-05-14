import { TestBed } from '@angular/core/testing';
import { StoreService } from './store.service';
import { BinService } from './bin.service';
import { SqliteService } from './sqlite.service';
import { FileSystemService } from './file-system.service';

describe('StoreService', () => {
  let service: StoreService;
  let binServiceSpy: jasmine.SpyObj<BinService>;
  let sqliteServiceSpy: jasmine.SpyObj<SqliteService>;
  let fileSystemServiceSpy: jasmine.SpyObj<FileSystemService>;

  beforeEach(() => {
    const binSpy = jasmine.createSpyObj('BinService', ['addToBin']);
    const dbSpy = jasmine.createSpyObj('SqliteService', [
      'getAllTasks', 'upsertTask', 'removeTask',
      'getAllNotes', 'upsertNote', 'removeNote', 'getAllPlanningItems', 'upsertPlanningItem',
      'getAllActivities', 'upsertActivity',
      'getAllNovels', 'upsertNovel'
    ]);

    // Setup returns for loadFromDb (called in constructor)
    dbSpy.getAllTasks.and.returnValue(Promise.resolve([]));
    dbSpy.getAllNotes.and.returnValue(Promise.resolve([]));
    dbSpy.getAllPlanningItems.and.returnValue(Promise.resolve([]));
    dbSpy.getAllActivities.and.returnValue(Promise.resolve([]));
    dbSpy.getAllNovels.and.returnValue(Promise.resolve([]));

    // Default success for upserts
    dbSpy.upsertTask.and.returnValue(Promise.resolve());
    dbSpy.upsertActivity.and.returnValue(Promise.resolve());

    const fsSpy = jasmine.createSpyObj('FileSystemService', ['readNote', 'saveNote', 'deleteNote']);

    TestBed.configureTestingModule({
      providers: [
        StoreService,
        { provide: BinService, useValue: binSpy },
        { provide: SqliteService, useValue: dbSpy },
        { provide: FileSystemService, useValue: fsSpy }
      ]
    });
    service = TestBed.inject(StoreService);
    binServiceSpy = TestBed.inject(BinService) as jasmine.SpyObj<BinService>;
    sqliteServiceSpy = TestBed.inject(SqliteService) as jasmine.SpyObj<SqliteService>;
    fileSystemServiceSpy = TestBed.inject(FileSystemService) as jasmine.SpyObj<FileSystemService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load data on initialization', async () => {
    expect(sqliteServiceSpy.getAllTasks).toHaveBeenCalled();
    expect(sqliteServiceSpy.getAllNotes).toHaveBeenCalled();
  });

  describe('Task Management', () => {
    it('should add a task', () => {
      const task = { id: '1', title: 'Test Task', priority: 'HIGH', status: 'ACTIVE' } as any;
      service.addTask(task);
      expect(service.tasks().length).toBe(1);
      expect(service.tasks()[0]).toBe(task);
      expect(sqliteServiceSpy.upsertTask).toHaveBeenCalledWith(task);
    });

    it('should update a task', () => {
      const task = { id: '1', title: 'Test Task', priority: 'HIGH', status: 'ACTIVE' } as any;
      service.tasks.set([task]);

      service.updateTask('1', { title: 'Updated' });

      expect(service.tasks()[0].title).toBe('Updated');
      // Verify upsert is called with the updated object
      expect(sqliteServiceSpy.upsertTask).toHaveBeenCalled();
      const args = sqliteServiceSpy.upsertTask.calls.mostRecent().args[0];
      expect(args.title).toBe('Updated');
    });

    it('should delete a task and move to bin', () => {
      const task = { id: '1', title: 'Test Task' } as any;
      service.tasks.set([task]);

      service.deleteTask('1');

      expect(service.tasks().length).toBe(0);
      expect(binServiceSpy.addToBin).toHaveBeenCalled();
      expect(sqliteServiceSpy.removeTask).toHaveBeenCalledWith('1');
    });
  });
});
