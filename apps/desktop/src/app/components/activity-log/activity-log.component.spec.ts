import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivityLogComponent } from './activity-log.component';
import { StoreService } from '@envello/core';

describe('ActivityLogComponent', () => {
  let component: ActivityLogComponent;
  let fixture: ComponentFixture<ActivityLogComponent>;

  beforeEach(async () => {
    const storeSpy = {
      activities: jest.fn().mockReturnValue([
        { id: '1', text: 'Entry added', time: '10 MINS AGO', type: 'entry' },
        { id: '2', text: 'Sync complete', time: '1 HOUR AGO', type: 'sync' },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [ActivityLogComponent],
      providers: [
        provideRouter([]),
        { provide: StoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default filter ALL', () => {
    expect(component.activeFilter()).toBe('ALL');
  });

  it('should set filter and close expanded row', () => {
    component.expandedRowId.set('1');
    component.setFilter('ENTRY');
    expect(component.activeFilter()).toBe('ENTRY');
    expect(component.expandedRowId()).toBeNull();
  });

  it('should update search from event', () => {
    const input = document.createElement('input');
    input.value = 'test query';
    component.updateSearch({ target: input } as unknown as Event);
    expect(component.searchQuery()).toBe('test query');
  });

  it('should toggle row expansion', () => {
    component.toggleRow('1');
    expect(component.expandedRowId()).toBe('1');
    component.toggleRow('1');
    expect(component.expandedRowId()).toBeNull();
    component.toggleRow('2');
    expect(component.expandedRowId()).toBe('2');
  });

  it('should have filtered activities computed from store', () => {
    expect(component.allActivities().length).toBe(2);
    expect(component.totalCount()).toBe(2);
  });
});
