import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { CredentialTransactionLink } from '@envello/domain';

@Injectable({
    providedIn: 'root'
})
export class LinkStore {
    private db = inject(DataService);

    // State
    private linksSignal = signal<CredentialTransactionLink[]>([]);
    public links = this.linksSignal.asReadonly();

    constructor() {
        this.loadLinks();
    }

    private async loadLinks() {
        const links = await this.db.getLinks();
        this.linksSignal.set(links);
    }

    async linkCredentialToTransaction(credentialId: string, transactionId: string) {
        const id = crypto.randomUUID();
        const link: CredentialTransactionLink = { id, credentialId, transactionId };
        await this.db.saveLink(link);
        await this.loadLinks();
    }

    async unlink(id: string) {
        await this.db.deleteLink(id);
        await this.loadLinks();
    }

    getLinksByCredential(credentialId: string) {
        return computed(() =>
            this.links().filter(l => l.credentialId === credentialId)
        );
    }

    getLinksByTransaction(transactionId: string) {
        return computed(() =>
            this.links().filter(l => l.transactionId === transactionId)
        );
    }
}
