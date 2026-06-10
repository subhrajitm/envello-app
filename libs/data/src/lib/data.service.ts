import { Credential, Transaction, CredentialTransactionLink } from '@envello/domain';

export abstract class DataService {
    abstract getAll<T>(collection: string): Promise<T[]>;
    abstract upsert<T>(collection: string, item: T): Promise<void>;
    abstract remove(collection: string, id: string): Promise<void>;

    abstract importData(data: any): Promise<void>;

    /**
     * Pull the latest remote copy of a collection into local storage.
     * PowerSync/PouchDB handle sync automatically so this is a no-op for them.
     * DesktopDataService overrides this to fetch from Supabase via REST.
     */
    pullFromRemote(_collection: string): Promise<void> { return Promise.resolve(); }

    // Vault & Transactions
    abstract saveCredential(credential: Credential): Promise<void>;
    abstract getCredentials(): Promise<Credential[]>;
    abstract deleteCredential(id: string): Promise<void>;

    abstract saveTransaction(transaction: Transaction): Promise<void>;
    abstract getTransactions(): Promise<Transaction[]>;
    abstract deleteTransaction(id: string): Promise<void>;

    abstract saveLink(link: CredentialTransactionLink): Promise<void>;
    abstract getLinks(): Promise<CredentialTransactionLink[]>;
    abstract deleteLink(id: string): Promise<void>;
}
