import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ProfileEditorComponent } from './profile-editor.component';
import { UserService, NotificationService } from '@envello/core';

describe('ProfileEditorComponent', () => {
  let component: ProfileEditorComponent;
  let fixture: ComponentFixture<ProfileEditorComponent>;

  beforeEach(async () => {
    const userSpy = jasmine.createSpyObj('UserService',
      ['updateProfile', 'updateAvatar'],
      { user: signal(null) }
    );
    const notifSpy = jasmine.createSpyObj('NotificationService', ['add']);

    await TestBed.configureTestingModule({
      imports: [ProfileEditorComponent],
      providers: [
        { provide: UserService,          useValue: userSpy },
        { provide: NotificationService,  useValue: notifSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
