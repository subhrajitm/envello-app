import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureSidebarComponent } from './feature-sidebar.component';

describe('FeatureSidebarComponent', () => {
  let component: FeatureSidebarComponent;
  let fixture: ComponentFixture<FeatureSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.title).toBe('');
    expect(component.subtitle).toBe('');
    expect(component.navItems).toEqual([]);
    expect(component.activeNavId).toBe('');
  });

  it('should emit navItemClick when triggered', () => {
    const spy = jasmine.createSpy('navItemClickSpy');
    component.navItemClick.subscribe(spy);
    component.navItemClick.emit('tasks');
    expect(spy).toHaveBeenCalledWith('tasks');
  });
});
