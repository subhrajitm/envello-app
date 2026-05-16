import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.variant).toBe('default');
    expect(component.pill).toBeFalse();
  });

  it('should accept variant input', () => {
    component.variant = 'success';
    expect(component.variant).toBe('success');
  });

  it('should accept pill input', () => {
    component.pill = true;
    expect(component.pill).toBeTrue();
  });
});
