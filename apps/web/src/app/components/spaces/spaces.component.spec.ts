import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SpacesComponent } from './spaces.component';
import { WorkspaceProfileService, StoreService } from '@envello/core';

describe('SpacesComponent', () => {
  let component: SpacesComponent;
  let fixture: ComponentFixture<SpacesComponent>;
  let workspaceSpy: jasmine.SpyObj<WorkspaceProfileService>;
  let storeSpy: jasmine.SpyObj<StoreService>;

  const mockProfiles = signal([
    { id: 'default', name: 'All Spaces', color: '#3b82f6', icon: 'folder', lastAccessed: new Date(), createdAt: new Date() },
    { id: 'ws-1',    name: 'Work',       color: '#10b981', icon: 'laptop', lastAccessed: new Date(), createdAt: new Date() },
  ]);
  const mockActiveProfile = signal(mockProfiles()[0]);
  const mockSpaces = signal<unknown[]>([]);

  beforeEach(async () => {
    workspaceSpy = jasmine.createSpyObj('WorkspaceProfileService',
      ['switchProfile', 'updateProfile', 'addProfileWithId', 'removeProfile'],
      { profiles: mockProfiles, activeProfile: mockActiveProfile }
    );
    storeSpy = jasmine.createSpyObj('StoreService',
      ['addSpace', 'updateSpace', 'deleteSpace'],
      { spaces: mockSpaces }
    );

    await TestBed.configureTestingModule({
      imports: [SpacesComponent],
      providers: [
        { provide: WorkspaceProfileService, useValue: workspaceSpy },
        { provide: StoreService, useValue: storeSpy },
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

  it('isActive should return true for the active profile', () => {
    expect(component.isActive('default')).toBeTrue();
    expect(component.isActive('ws-1')).toBeFalse();
  });

  it('isDeletable should return false for default profile', () => {
    expect(component.isDeletable('default')).toBeFalse();
  });

  it('isDeletable should return false for active profile', () => {
    expect(component.isDeletable('default')).toBeFalse();
  });

  it('isDeletable should return true for non-default, non-active profile', () => {
    mockActiveProfile.set(mockProfiles()[0]);
    expect(component.isDeletable('ws-1')).toBeTrue();
  });

  it('getInitials should return two-char initials', () => {
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

  it('closeMenu should set menuOpenId to null', () => {
    component.toggleMenu('ws-1');
    component.closeMenu();
    expect(component.menuOpenId()).toBeNull();
  });

  it('openNewModal should reset form and set showModal to true', () => {
    component.openNewModal();
    expect(component.showModal()).toBeTrue();
    expect(component.editMode()).toBeFalse();
    expect(component.formName()).toBe('');
  });

  it('closeModal should hide the modal', () => {
    component.openNewModal();
    component.closeModal();
    expect(component.showModal()).toBeFalse();
  });

  it('openEditModal should pre-fill form and set editMode', () => {
    const profile = mockProfiles()[1];
    component.openEditModal(profile);
    expect(component.showModal()).toBeTrue();
    expect(component.editMode()).toBeTrue();
    expect(component.formName()).toBe(profile.name);
  });

  it('saveProfile should not save when formName is empty', () => {
    component.formName.set('');
    component.saveProfile();
    expect(storeSpy.addSpace).not.toHaveBeenCalled();
  });

  it('openDetailsModal should set detailsProfile and showDetails', () => {
    const profile = mockProfiles()[0];
    component.openDetailsModal(profile);
    expect(component.showDetails()).toBeTrue();
    expect(component.detailsProfile()).toEqual(profile);
  });

  it('closeDetails should reset showDetails and detailsProfile', () => {
    component.openDetailsModal(mockProfiles()[0]);
    component.closeDetails();
    expect(component.showDetails()).toBeFalse();
    expect(component.detailsProfile()).toBeNull();
  });

  it('openDeleteConfirm should set profileToDelete and showDeleteConfirm', () => {
    const profile = mockProfiles()[1];
    component.openDeleteConfirm(profile);
    expect(component.showDeleteConfirm()).toBeTrue();
    expect(component.profileToDelete()).toEqual(profile);
  });

  it('cancelDelete should reset delete state', () => {
    component.openDeleteConfirm(mockProfiles()[1]);
    component.cancelDelete();
    expect(component.showDeleteConfirm()).toBeFalse();
    expect(component.profileToDelete()).toBeNull();
  });

  it('confirmDelete should call store.deleteSpace and workspaceService.removeProfile', () => {
    const profile = mockProfiles()[1];
    component.openDeleteConfirm(profile);
    component.confirmDelete();
    expect(storeSpy.deleteSpace).toHaveBeenCalledWith('ws-1');
    expect(workspaceSpy.removeProfile).toHaveBeenCalledWith('ws-1');
  });
});
