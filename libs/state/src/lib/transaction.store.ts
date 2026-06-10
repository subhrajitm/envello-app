import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { Transaction } from '@envello/domain';
import { BinService } from './bin.service';

@Injectable({
    providedIn: 'root'
})
export class TransactionStore {
    private db = inject(DataService);
    private bin = inject(BinService);

    private transactionsSignal = signal<Transaction[]>([]);
    public transactions = this.transactionsSignal.asReadonly();

    /** Transactions with a future due date within the next 7 days (recurring/bills). */
    public upcoming = computed(() => {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        return this.transactions().filter(t => {
            if (t.type !== 'recurring' && t.type !== 'bill') return false;
            const d = new Date(t.date);
            return d >= now && d <= nextWeek;
        });
    });

    public totalMonthlyCost = computed(() =>
        this.transactions()
            .filter(t => t.type === 'recurring' && t.status !== 'cancelled' && t.status !== 'paused')
            .reduce((sum, t) => {
                if (t.billingCycle === 'monthly') return sum + t.amount;
                if (t.billingCycle === 'yearly')  return sum + (t.amount / 12);
                if (t.billingCycle === 'weekly')  return sum + (t.amount * 4.33);
                return sum;
            }, 0)
    );

    public totalYearlyCost = computed(() =>
        this.transactions()
            .filter(t => t.type === 'recurring' && t.status !== 'cancelled' && t.status !== 'paused')
            .reduce((sum, t) => {
                if (t.billingCycle === 'yearly')  return sum + t.amount;
                if (t.billingCycle === 'monthly') return sum + (t.amount * 12);
                if (t.billingCycle === 'weekly')  return sum + (t.amount * 52);
                return sum;
            }, 0)
    );

    constructor() {
        this.load();
        window.addEventListener('envello:db-ready',      () => this.load());
        window.addEventListener('envello:sync-complete', () => this.load());
    }

    private async load() {
        try {
            const items = await this.db.getTransactions();
            // Normalise legacy Subscription records that lack a `type` field.
            this.transactionsSignal.set(items.map(t => ({ ...t, type: t.type ?? 'recurring' as const })));
        } catch (e) {
            console.error('[TransactionStore] load failed', e);
        }
    }

    async add(t: Transaction) {
        await this.db.saveTransaction(t);
        await this.load();
    }

    byProject(projectId: string) {
        return computed(() => this.transactions().filter(t => t.projectId === projectId));
    }

    async update(id: string, changes: Partial<Transaction>) {
        const existing = this.transactions().find(t => t.id === id);
        if (!existing) return;
        await this.db.saveTransaction({ ...existing, ...changes });
        await this.load();
    }

    async delete(id: string) {
        const t = this.transactions().find(t => t.id === id);
        if (t) {
            this.bin.addToBin({ type: 'transaction', originalId: id, title: t.name, payload: t });
        }
        await this.db.deleteTransaction(id);
        await this.load();
    }
}
