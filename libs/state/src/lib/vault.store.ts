import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { Credential } from '@envello/domain';
import { EncryptionUtil } from '@envello/core';

@Injectable({
    providedIn: 'root'
})
export class VaultStore {
    private db = inject(DataService);
    
    // State
    private credentialsSignal = signal<Credential[]>([]);
    public credentials = this.credentialsSignal.asReadonly();

    constructor() {
        this.loadCredentials();
    }

    private async loadCredentials() {
        const creds = await this.db.getCredentials();
        this.credentialsSignal.set(creds);
    }

    async addCredential(cred: Omit<Credential, 'value'> & { unencryptedValue: string }) {
        const encryptedValue = EncryptionUtil.encrypt(cred.unencryptedValue);
        const newCred: Credential = {
            ...cred,
            value: encryptedValue
        };
        await this.db.saveCredential(newCred);
        await this.loadCredentials();
    }

    getCredentialsByProject(projectId: string) {
        return computed(() => 
            this.credentials().filter(c => c.projectId === projectId)
        );
    }

    async updateCredential(id: string, changes: Partial<Credential> & { newUnencryptedValue?: string }) {
        const existing = this.credentials().find(c => c.id === id);
        if (!existing) return;
        const { newUnencryptedValue, ...rest } = changes;
        const updated: Credential = {
            ...existing,
            ...rest,
            updatedAt: new Date().toISOString(),
        };
        if (newUnencryptedValue) {
            updated.value = EncryptionUtil.encrypt(newUnencryptedValue);
        }
        await this.db.saveCredential(updated);
        await this.loadCredentials();
    }

    async touchCredential(id: string) {
        const existing = this.credentials().find(c => c.id === id);
        if (!existing) return;
        await this.db.saveCredential({ ...existing, lastAccessedAt: new Date().toISOString() });
        await this.loadCredentials();
    }

    async deleteCredential(id: string) {
        await this.db.deleteCredential(id);
        await this.loadCredentials();
    }
}
