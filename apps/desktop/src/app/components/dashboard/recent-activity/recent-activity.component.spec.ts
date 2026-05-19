import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { RecentActivityComponent } from './recent-activity.component';
import { StoreService } from '@envello/core';

describe('RecentActivityComponent', () => {
  let component: RecentActivityComponent;
  let fixture: ComponentFixture<RecentActivityComponent>;

  beforeEach(async () => {
    const storeSpy = { activities: signal([]) };

    await TestBed.configureTestingModule({
      imports: [RecentActivityComponent],
      providers: [
        provideRouter([]),
        { provide: StoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
