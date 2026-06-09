import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SpacesComponent } from './spaces.component';
import { WorkspaceProfileService, StoreService } from '@envello/core';

describe('SpacesComponent', () => {
  let component: SpacesComponent;
  let fixture: ComponentFixture<SpacesComponent>;
  let workspaceSpy: { switchProfile: jest.Mock; updateProfile: jest.Mock; addProfileWithId: jest.Mock; removeProfile: jest.Mock; profiles: ReturnType<typeof signal>; activeProfile: ReturnType<typeof signal> };
  let storeSpy: { addSpace: jest.Mock; updateSpace: jest.Mock; deleteSpace: jest.Mock; spaces: ReturnType<typeof signal> };

  const mockProfiles = signal([
    { id: 'default', name: 'All Spaces', color: '#3b82f6', icon: 'folder', lastAccessed: new Date(), createdAt: new Date() },
    { id: 'ws-1',    name: 'Work',       color: '#10b981', icon: 'laptop', lastAccessed: new Date(), createdAt: new Date() },
  ]);
  const mockActiveProfile = signal(mockProfiles()[0]);
  const mockSpaces = signal<unknown[]>([]);

  beforeEach(async () => {
    workspaceSpy = {
      switchProfile: jest.fn(),
      updateProfile: jest.fn(),
      addProfileWithId: jest.fn(),
      removeProfile: jest.fn(),
      profiles: mockProfiles,
      activeProfile: mockActiveProfile,
    };
    storeSpy = {
      addSpace: jest.fn(),
      updateSpace: jest.fn(),
      deleteSpace: jest.fn(),
      spaces: mockSpaces,
    };

    await TestBed.configureTestingModule({
      imports: [SpacesComponent],
      providers: [
        { provide: WorkspaceProfileService, useValue: workspaceSpy },
        { provide: StoreService,            useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose profiles from workspaceService', () => {
    expect(component.profiles().length).toBe(2);
  });

  it('isActive should return true for the active profile id', () => {
    expect(component.isActive('default')).toBe(true);
    expect(component.isActive('ws-1')).toBe(false);
  });

  it('isDeletable should return false for default profile', () => {
    expect(component.isDeletable('default')).toBe(false);
  });

  it('isDeletable should return true for non-default, non-active profile', () => {
    expect(component.isDeletable('ws-1')).toBe(true);
  });

  it('getInitials should derive two-char initials', () => {
    expect(component.getInitials('Work Space')).toBe('WS');
    expect(component.getInitials('Solo')).toBe('SO');
    expect(component.getInitials('')).toBe('?');
  });

  it('toggleMenu should open and close the menu', () => {
    component.toggleMenu('ws-1');
    expect(component.menuOpenId()).toBe('ws-1');
    component.toggleMenu('ws-1');
    expect(component.menuOpenId()).toBeNull();
  });

  it('openNewModal should reset form and open modal', () => {
    component.openNewModal();
    expect(component.showModal()).toBe(true);
    expect(component.editMode()).toBe(false);
    expect(component.formName()).toBe('');
  });

  it('closeModal should hide modal', () => {
    component.openNewModal();
    component.closeModal();
    expect(component.showModal()).toBe(false);
  });

  it('confirmDelete should call store.deleteSpace and workspaceService.removeProfile', () => {
    const profile = mockProfiles()[1];
    component.openDeleteConfirm(profile);
    component.confirmDelete();
    expect(storeSpy.deleteSpace).toHaveBeenCalledWith('ws-1');
    expect(workspaceSpy.removeProfile).toHaveBeenCalledWith('ws-1');
  });
});
