import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BinComponent } from './bin.component';
import { BinService } from '@envello/core';
import { signal } from '@angular/core';

describe('BinComponent', () => {
  let component: BinComponent;
  let fixture: ComponentFixture<BinComponent>;
  let binService: jasmine.SpyObj<BinService>;

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
    const binSpy = jasmine.createSpyObj('BinService', ['permanentlyDelete', 'emptyBin'], {
      items: mockItems,
    });

    await TestBed.configureTestingModule({
      imports: [BinComponent],
      providers: [{ provide: BinService, useValue: binSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BinComponent);
    component = fixture.componentInstance;
    binService = TestBed.inject(BinService) as jasmine.SpyObj<BinService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display items from BinService', () => {
    expect(component.items().length).toBe(2);
  });

  it('should sort items newest first in sortedItems', () => {
    const sorted = component.sortedItems();
    expect(sorted[0].id).toBe('bin-1');
    expect(sorted[1].id).toBe('bin-2');
  });

  it('should track by id', () => {
    const item = component.items()[0];
    expect(component.trackById(0, item)).toBe(item.id);
  });

  it('should format type labels', () => {
    expect(component.formatType('daily-note')).toBe('Daily Note');
    expect(component.formatType('novel-chapter')).toBe('Novel Chapter');
    expect(component.formatType('novel-character')).toBe('Character');
    expect(component.formatType('unknown')).toBe('unknown');
  });

  it('should call permanentlyDelete when user confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.permanentlyDelete('bin-1');
    expect(binService.permanentlyDelete).toHaveBeenCalledWith('bin-1');
  });

  it('should not call permanentlyDelete when user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.permanentlyDelete('bin-1');
    expect(binService.permanentlyDelete).not.toHaveBeenCalled();
  });

  it('should call emptyBin when user confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.emptyBin();
    expect(binService.emptyBin).toHaveBeenCalled();
  });

  it('should not call emptyBin when user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.emptyBin();
    expect(binService.emptyBin).not.toHaveBeenCalled();
  });

  it('should return early when emptyBin is called with no items', () => {
    const emptyItems = signal([]);
    (binService as unknown as { items: ReturnType<typeof signal> }).items = emptyItems;
    fixture = TestBed.createComponent(BinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.emptyBin();
    expect(binService.emptyBin).not.toHaveBeenCalled();
  });
});
