import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ProfileMenuComponent } from './profile-menu.component';
import { UserService, WorkspaceProfileService } from '@envello/core';
import { KeyboardShortcutsService } from '../keyboard-shortcuts/keyboard-shortcuts.service';

describe('ProfileMenuComponent', () => {
  let component: ProfileMenuComponent;
  let fixture: ComponentFixture<ProfileMenuComponent>;

  beforeEach(async () => {
    const userSpy = jasmine.createSpyObj('UserService', ['logout'], {
      user: signal(null),
      userInitials: signal(''),
    });
    const workspaceSpy = jasmine.createSpyObj('WorkspaceProfileService', ['switchProfile'], {
      profiles: signal([]),
      activeProfile: signal(null),
    });
    const kbSpy = jasmine.createSpyObj('KeyboardShortcutsService', ['toggle', 'open', 'close'], {
      isOpen: signal(false),
    });

    await TestBed.configureTestingModule({
      imports: [ProfileMenuComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: UserService,              useValue: userSpy },
        { provide: WorkspaceProfileService,  useValue: workspaceSpy },
        { provide: KeyboardShortcutsService, useValue: kbSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
