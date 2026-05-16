import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationService } from '@envello/core';

describe('NotificationCenterComponent', () => {
  let component: NotificationCenterComponent;
  let fixture: ComponentFixture<NotificationCenterComponent>;

  beforeEach(async () => {
    const notifSpy = jasmine.createSpyObj('NotificationService',
      ['markRead', 'markAllRead', 'delete', 'clear'],
      {
        notifications: signal([]),
        unreadCount: signal(0),
      }
    );

    await TestBed.configureTestingModule({
      imports: [NotificationCenterComponent, NoopAnimationsModule],
      providers: [{ provide: NotificationService, useValue: notifSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
