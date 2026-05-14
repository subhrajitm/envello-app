import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { CredentialSubscriptionLink } from '@envello/domain';

@Injectable({
    providedIn: 'root'
})
export class LinkStore {
    private db = inject(DataService);

    // State
    private linksSignal = signal<CredentialSubscriptionLink[]>([]);
    public links = this.linksSignal.asReadonly();

    constructor() {
        this.loadLinks();
    }

    private async loadLinks() {
        const links = await this.db.getLinks();
        this.linksSignal.set(links);
    }

    async linkCredentialToSubscription(credentialId: string, subscriptionId: string) {
        const id = crypto.randomUUID();
        const link: CredentialSubscriptionLink = { id, credentialId, subscriptionId };
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

    getLinksBySubscription(subscriptionId: string) {
        return computed(() => 
            this.links().filter(l => l.subscriptionId === subscriptionId)
        );
    }
}
