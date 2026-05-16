import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableComponent } from './table.component';

describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  const testColumns = [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
  ];
  const testRows = [
    { id: '1', title: 'First' },
    { id: '2', title: 'Second' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sensible default inputs', () => {
    expect(component.columns).toEqual([]);
    expect(component.rows).toEqual([]);
    expect(component.showSearch).toBeTrue();
    expect(component.showPagination).toBeTrue();
    expect(component.pageSize).toBe(10);
    expect(component.currentPage).toBe(1);
    expect(component.loading).toBeFalse();
  });

  it('should accept columns and rows inputs', () => {
    component.columns = testColumns;
    component.rows = testRows;
    expect(component.columns.length).toBe(2);
    expect(component.rows.length).toBe(2);
  });

  it('_page signal should default to 1', () => {
    expect(component._page()).toBe(1);
  });

  it('_pageSize signal should default to 10', () => {
    expect(component._pageSize()).toBe(10);
  });

  it('sortDir should default to asc', () => {
    expect(component.sortDir()).toBe('asc');
  });

  it('selectedIds should start empty', () => {
    expect(component.selectedIds().size).toBe(0);
  });
});
