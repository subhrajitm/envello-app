import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VaultComponent } from './vault.component';
import { VaultStore } from '@envello/state';
import { EncryptionUtil } from '@envello/core';

describe('VaultComponent', () => {
  let component: VaultComponent;
  let fixture: ComponentFixture<VaultComponent>;
  let vaultStoreSpy: jasmine.SpyObj<VaultStore>;

  const mockCredentials = signal<unknown[]>([]);

  beforeEach(async () => {
    vaultStoreSpy = jasmine.createSpyObj('VaultStore', ['addCredential', 'updateCredential', 'deleteCredential'], {
      credentials: mockCredentials,
    });

    await TestBed.configureTestingModule({
      imports: [VaultComponent],
      providers: [
        { provide: VaultStore, useValue: vaultStoreSpy },
        { provide: EncryptionUtil, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default searchQuery to empty string', () => {
    expect(component.searchQuery()).toBe('');
  });

  it('should default sortDir to desc', () => {
    expect(component.sortDir()).toBe('desc');
  });

  it('should default formMode to null', () => {
    expect(component.formMode()).toBeNull();
  });

  it('should expose typeOptions', () => {
    expect(component.typeOptions.length).toBeGreaterThan(0);
  });
});
