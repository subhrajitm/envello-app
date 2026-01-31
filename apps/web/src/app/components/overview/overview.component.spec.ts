import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewComponent } from './overview.component';

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render overview layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.overview-layout')).toBeTruthy();
  });

  it('should have view mode and calendar', () => {
    expect(component.viewMode()).toBe('MONTH');
    component.setViewMode('2 WEEKS');
    expect(component.viewMode()).toBe('2 WEEKS');
  });
});
