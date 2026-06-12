import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { Transaction, TransactionEvent } from '@envello/domain';
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
        const now = new Date().toISOString();
        const normalised: Transaction = {
            ...t,
            type: t.type ?? 'recurring' as const,
            createdAt: now,
            history: [{ date: now, kind: 'created', label: `${t.name} added` }],
        };
        this.transactionsSignal.update(list => [...list, normalised]);
        try {
            await this.db.saveTransaction(normalised);
        } catch (e) {
            console.error('[TransactionStore] add failed', e);
            await this.load();
        }
    }

    byProject(projectId: string) {
        return computed(() => this.transactions().filter(t => t.projectId === projectId));
    }

    async update(id: string, changes: Partial<Transaction>) {
        const existing = this.transactions().find(t => t.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const newEvents: TransactionEvent[] = [];

        if (changes.name !== undefined && changes.name !== existing.name)
            newEvents.push({ date: now, kind: 'name_changed', label: `Renamed to "${changes.name}"`, detail: existing.name });

        if (changes.amount !== undefined && changes.amount !== existing.amount) {
            const cur = existing.currency ?? 'USD';
            newEvents.push({ date: now, kind: 'amount_changed', label: 'Price updated',
                detail: `${existing.amount} ${cur} → ${changes.amount} ${changes.currency ?? cur}` });
        }

        if (changes.status !== undefined && changes.status !== (existing.status ?? 'active'))
            newEvents.push({ date: now, kind: 'status_changed', label: 'Status changed',
                detail: `${existing.status ?? 'active'} → ${changes.status}` });

        if (changes.date !== undefined && changes.date !== existing.date)
            newEvents.push({ date: now, kind: 'date_changed', label: 'Due date updated',
                detail: `${existing.date} → ${changes.date}` });

        if (changes.billingCycle !== undefined && changes.billingCycle !== existing.billingCycle)
            newEvents.push({ date: now, kind: 'cycle_changed', label: 'Billing cycle changed',
                detail: `${existing.billingCycle} → ${changes.billingCycle}` });

        const updated: Transaction = {
            ...existing, ...changes,
            history: [...(existing.history ?? []), ...newEvents],
        };
        this.transactionsSignal.update(list => list.map(t => t.id === id ? updated : t));
        try {
            await this.db.saveTransaction(updated);
        } catch (e) {
            console.error('[TransactionStore] update failed', e);
            await this.load();
        }
    }

    async delete(id: string) {
        const t = this.transactions().find(t => t.id === id);
        if (!t) return;
        this.bin.addToBin({ type: 'transaction', originalId: id, title: t.name, payload: t });
        this.transactionsSignal.update(list => list.filter(x => x.id !== id));
        try {
            await this.db.deleteTransaction(id);
        } catch (e) {
            console.error('[TransactionStore] delete failed', e);
            await this.load();
        }
    }
}
