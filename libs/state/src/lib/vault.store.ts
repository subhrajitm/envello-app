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

    async deleteCredential(id: string) {
        await this.db.deleteCredential(id);
        await this.loadCredentials();
    }
}
