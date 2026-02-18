import { TestBed } from '@angular/core/testing';
import { BinService } from './bin.service';

describe('BinService', () => {
  let service: BinService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty items', () => {
    expect(service.items().length).toBe(0);
  });

  it('should add item to bin', () => {
    service.addToBin({
      type: 'daily-note',
      originalId: 'n1',
      payload: { title: 'Test' },
    });
    expect(service.items().length).toBe(1);
    expect(service.items()[0].type).toBe('daily-note');
    expect(service.items()[0].originalId).toBe('n1');
    expect(service.items()[0].deletedAt).toBeDefined();
    expect(service.items()[0].id).toMatch(/^bin-/);
  });

  it('should permanently delete item by id', () => {
    service.addToBin({
      type: 'daily-note',
      originalId: 'n1',
      payload: {},
    });
    const id = service.items()[0].id;
    service.permanentlyDelete(id);
    expect(service.items().length).toBe(0);
  });

  it('should empty bin', () => {
    service.addToBin({
      type: 'daily-note',
      originalId: 'n1',
      payload: {},
    });
    service.addToBin({
      type: 'novel-chapter',
      originalId: 'c1',
      payload: {},
    });
    service.emptyBin();
    expect(service.items().length).toBe(0);
  });
});
