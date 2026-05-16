import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
  let component: IconButtonComponent;
  let fixture: ComponentFixture<IconButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.icon).toBe('add');
    expect(component.variant).toBe('ghost');
    expect(component.size).toBe(32);
    expect(component.disabled).toBeFalse();
    expect(component.type).toBe('button');
    expect(component.active).toBeFalse();
    expect(component.title).toBe('');
  });

  it('should emit clicked when onClick called and not disabled', () => {
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

  it('should accept size input', () => {
    component.size = 24;
    expect(component.size).toBe(24);
  });

  it('should accept variant input', () => {
    component.variant = 'danger';
    expect(component.variant).toBe('danger');
  });
});
