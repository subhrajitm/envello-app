import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.variant).toBe('primary');
    expect(component.size).toBe('md');
    expect(component.disabled).toBeFalse();
    expect(component.loading).toBeFalse();
    expect(component.type).toBe('button');
  });

  it('should emit clicked when onClick is called and not disabled', () => {
    const spy = jasmine.createSpy('clickedSpy');
    component.clicked.subscribe(spy);
    component.onClick();
    expect(spy).toHaveBeenCalled();
  });

  it('should NOT emit clicked when disabled', () => {
    component.disabled = true;
    const spy = jasmine.createSpy('clickedSpy');
    component.clicked.subscribe(spy);
    component.onClick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should accept variant input', () => {
    component.variant = 'danger';
    expect(component.variant).toBe('danger');
  });

  it('should accept size input', () => {
    component.size = 'lg';
    expect(component.size).toBe('lg');
  });

  it('should accept icon and iconPos inputs', () => {
    component.icon = 'add';
    component.iconPos = 'right';
    expect(component.icon).toBe('add');
    expect(component.iconPos).toBe('right');
  });
});
