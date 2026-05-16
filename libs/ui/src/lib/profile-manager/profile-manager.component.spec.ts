import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ProfileManagerComponent } from './profile-manager.component';
import { WorkspaceProfileService, UserService, StoreService } from '@envello/core';

describe('ProfileManagerComponent', () => {
  let component: ProfileManagerComponent;
  let fixture: ComponentFixture<ProfileManagerComponent>;

  beforeEach(async () => {
    const workspaceSpy = jasmine.createSpyObj('WorkspaceProfileService',
      ['switchProfile', 'addProfile', 'removeProfile', 'updateProfile'],
      { profiles: signal([]), activeProfile: signal(null) }
    );
    const userSpy = jasmine.createSpyObj('UserService', [], { user: signal(null) });
    const storeSpy = jasmine.createSpyObj('StoreService', ['addSpace', 'deleteSpace'], {
      spaces: signal([]),
    });

    await TestBed.configureTestingModule({
      imports: [ProfileManagerComponent],
      providers: [
        { provide: WorkspaceProfileService, useValue: workspaceSpy },
        { provide: UserService,             useValue: userSpy },
        { provide: StoreService,            useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
