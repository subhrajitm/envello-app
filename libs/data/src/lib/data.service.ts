import { Credential, Subscription, CredentialSubscriptionLink } from '@envello/domain';

export abstract class DataService {
    abstract getAll<T>(collection: string): Promise<T[]>;
    abstract upsert<T>(collection: string, item: T): Promise<void>;
    abstract remove(collection: string, id: string): Promise<void>;

    // Optional: Bulk operations for migration/import
    abstract importData(data: any): Promise<void>;

    // Vault & Subscriptions
    abstract saveCredential(credential: Credential): Promise<void>;
    abstract getCredentials(): Promise<Credential[]>;
    abstract deleteCredential(id: string): Promise<void>;
    
    abstract saveSubscription(subscription: Subscription): Promise<void>;
    abstract getSubscriptions(): Promise<Subscription[]>;
    abstract deleteSubscription(id: string): Promise<void>;

    abstract saveLink(link: CredentialSubscriptionLink): Promise<void>;
    abstract getLinks(): Promise<CredentialSubscriptionLink[]>;
    abstract deleteLink(id: string): Promise<void>;
}
