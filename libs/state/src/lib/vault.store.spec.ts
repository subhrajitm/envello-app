import { TestBed } from '@angular/core/testing';
import { VaultStore } from './vault.store';
import { DataService } from '@envello/data';
import { AuthService, VaultKeyService, EncryptionUtil } from '@envello/core';
import { BinService } from './bin.service';
import { signal } from '@angular/core';

describe('VaultStore', () => {
  let store: VaultStore;
  let dataSpy: jasmine.SpyObj<DataService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let vaultKeySpy: jasmine.SpyObj<VaultKeyService>;
  let binSpy: jasmine.SpyObj<BinService>;

  const mockKey = {} as CryptoKey;

  beforeEach(async () => {
    dataSpy     = jasmine.createSpyObj('DataService',    ['getCredentials', 'upsertCredential', 'removeCredential']);
    authSpy     = jasmine.createSpyObj('AuthService',    [], { currentUser: signal({ id: 'user-1', email: 'test@test.com' }) });
    vaultKeySpy = jasmine.createSpyObj('VaultKeyService',['getOrCreateKey']);
    binSpy      = jasmine.createSpyObj('BinService',     ['addToBin']);

    dataSpy.getCredentials.and.returnValue(Promise.resolve([]));
    vaultKeySpy.getOrCreateKey.and.returnValue(Promise.resolve(mockKey));

    spyOn(EncryptionUtil, 'encryptWithKey').and.returnValue(Promise.resolve('enc-value'));
    spyOn(EncryptionUtil, 'decryptWithKey').and.returnValue(Promise.resolve('plain-value'));

    TestBed.configureTestingModule({
      providers: [
        VaultStore,
        { provide: DataService,    useValue: dataSpy     },
        { provide: AuthService,    useValue: authSpy     },
        { provide: VaultKeyService,useValue: vaultKeySpy },
        { provide: BinService,     useValue: binSpy      },
      ],
    });
    store = TestBed.inject(VaultStore);
    await new Promise(r => setTimeout(r, 0)); // flush async loadCredentials
  });

  it('should create', () => {
    expect(store).toBeTruthy();
  });

  it('should start with empty credentials', () => {
    expect(store.credentials()).toEqual([]);
  });

  it('should load credentials from DataService on init', () => {
    expect(dataSpy.getCredentials).toHaveBeenCalled();
  });

  it('addCredential should encrypt value and persist', async () => {
    dataSpy.upsertCredential.and.returnValue(Promise.resolve());
    dataSpy.getCredentials.and.returnValue(Promise.resolve([
      { id: 'c1', name: 'GitHub', type: 'password', value: 'enc-value', projectId: 'p1', createdAt: '', createdBy: 'user-1' }
    ]));

    await store.addCredential({
      id: 'c1', name: 'GitHub', type: 'password', projectId: 'p1',
      createdAt: '', createdBy: 'user-1', unencryptedValue: 'my-token',
    });

    expect(EncryptionUtil.encryptWithKey).toHaveBeenCalledWith('my-token', mockKey);
    expect(dataSpy.upsertCredential).toHaveBeenCalled();
  });

  it('deleteCredential should add to bin and call removeCredential', async () => {
    const cred = { id: 'c2', name: 'AWS', type: 'api-key' as const, value: 'enc', projectId: 'p1', createdAt: '', createdBy: 'user-1' };
    (store as any).credentialsSignal.set([cred]);
    dataSpy.removeCredential.and.returnValue(Promise.resolve());
    dataSpy.getCredentials.and.returnValue(Promise.resolve([]));

    await store.deleteCredential('c2');

    expect(binSpy.addToBin).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'credential', originalId: 'c2' }));
    expect(dataSpy.removeCredential).toHaveBeenCalledWith('c2');
  });

  it('should reload on envello:db-ready event', () => {
    dataSpy.getCredentials.calls.reset();
    window.dispatchEvent(new CustomEvent('envello:db-ready'));
    expect(dataSpy.getCredentials).toHaveBeenCalled();
  });

  it('should reload on envello:sync-complete event', () => {
    dataSpy.getCredentials.calls.reset();
    window.dispatchEvent(new CustomEvent('envello:sync-complete'));
    expect(dataSpy.getCredentials).toHaveBeenCalled();
  });
});
