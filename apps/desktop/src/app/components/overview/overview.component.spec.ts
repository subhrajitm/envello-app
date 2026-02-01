import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewComponent } from './overview.component';
import { StoreService } from '../../services/store.service';

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;

  // Mock StoreService
  const storeServiceMock = {
    tasks: () => [],
    planningItems: () => []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        { provide: StoreService, useValue: storeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render voice protocol container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.voice-protocol-container')).toBeTruthy();
  });
});
