import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.icon).toBe('inbox');
    expect(component.title).toBe('');
    expect(component.description).toBe('');
    expect(component.compact).toBeFalse();
    expect(component.ctaLabel).toBe('');
    expect(component.ctaIcon).toBe('');
  });

  it('should accept title input', () => {
    component.title = 'No items found';
    expect(component.title).toBe('No items found');
  });

  it('should accept compact input', () => {
    component.compact = true;
    expect(component.compact).toBeTrue();
  });

  it('should emit ctaClicked when EventEmitter fires', () => {
    const spy = jasmine.createSpy('ctaClickedSpy');
    component.ctaClicked.subscribe(spy);
    component.ctaClicked.emit();
    expect(spy).toHaveBeenCalled();
  });
});
