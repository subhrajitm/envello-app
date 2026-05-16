import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

describe('SkeletonLoaderComponent', () => {
  let component: SkeletonLoaderComponent;
  let fixture: ComponentFixture<SkeletonLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonLoaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.variant).toBe('list');
    expect(component.rows).toBe(4);
  });

  it('should return correct rowsArray length', () => {
    component.rows = 6;
    expect(component.rowsArray.length).toBe(6);
  });

  it('should return sequential indices in rowsArray', () => {
    component.rows = 3;
    expect(component.rowsArray).toEqual([0, 1, 2]);
  });

  it('should accept card variant', () => {
    component.variant = 'card';
    expect(component.variant).toBe('card');
  });

  it('should return empty array when rows is 0', () => {
    component.rows = 0;
    expect(component.rowsArray).toEqual([]);
  });
});
