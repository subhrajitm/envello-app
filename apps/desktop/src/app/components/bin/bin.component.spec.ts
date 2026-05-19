import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BinComponent } from './bin.component';
import { BinService } from '@envello/core';
import { signal } from '@angular/core';

describe('BinComponent', () => {
  let component: BinComponent;
  let fixture: ComponentFixture<BinComponent>;
  let binService: {
    permanentlyDelete: jest.Mock;
    emptyBin: jest.Mock;
    restore: jest.Mock;
    canRestore: jest.Mock;
    items: ReturnType<typeof signal>;
  };

  const mockItems = signal([
    {
      id: 'bin-1',
      type: 'daily-note' as const,
      originalId: 'n1',
      deletedAt: '2026-01-28T12:00:00Z',
      payload: {},
    },
    {
      id: 'bin-2',
      type: 'novel-chapter' as const,
      originalId: 'c1',
      deletedAt: '2026-01-27T10:00:00Z',
      payload: {},
    },
  ]);

  beforeEach(async () => {
    binService = {
      permanentlyDelete: jest.fn(),
      emptyBin: jest.fn(),
      restore: jest.fn().mockResolvedValue(true),
      canRestore: jest.fn().mockReturnValue(true),
      items: mockItems,
    };

    await TestBed.configureTestingModule({
      imports: [BinComponent],
      providers: [{ provide: BinService, useValue: binService }],
    }).compileComponents();

    fixture = TestBed.createComponent(BinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose all items sorted newest first', () => {
    const all = component.allItems();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('bin-1');
    expect(all[1].id).toBe('bin-2');
  });

  it('should format type labels', () => {
    expect(component.formatType('daily-note')).toBe('Daily Note');
    expect(component.formatType('novel-character')).toBe('Character');
    expect(component.formatType('unknown')).toBe('Unknown');
  });

  it('should open delete confirm dialog', () => {
    component.openDeleteConfirm('bin-1', 'Note Title');
    expect(component.confirmDialog()?.mode).toBe('delete');
    expect(component.confirmDialog()?.itemId).toBe('bin-1');
  });

  it('should call permanentlyDelete on confirmAction with delete mode', async () => {
    component.openDeleteConfirm('bin-1', 'Note Title');
    await component.confirmAction();
    expect(binService.permanentlyDelete).toHaveBeenCalledWith('bin-1');
  });

  it('should open empty confirm when items exist', () => {
    component.emptyBin();
    expect(component.confirmDialog()?.mode).toBe('empty');
  });

  it('should call emptyBin on confirmAction with empty mode', async () => {
    component.emptyBin();
    await component.confirmAction();
    expect(binService.emptyBin).toHaveBeenCalled();
  });

  it('should not open empty confirm when no items', () => {
    const emptyItems = signal([]);
    (binService as unknown as { items: ReturnType<typeof signal> }).items = emptyItems;
    fixture = TestBed.createComponent(BinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.emptyBin();
    expect(component.confirmDialog()).toBeNull();
  });

  it('should cancel confirm dialog', () => {
    component.openDeleteConfirm('bin-1', 'Note');
    component.cancelConfirm();
    expect(component.confirmDialog()).toBeNull();
  });
});
