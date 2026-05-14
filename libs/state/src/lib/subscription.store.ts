import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { Subscription } from '@envello/domain';

@Injectable({
    providedIn: 'root'
})
export class SubscriptionStore {
    private db = inject(DataService);

    // State
    private subscriptionsSignal = signal<Subscription[]>([]);
    public subscriptions = this.subscriptionsSignal.asReadonly();

    // Computed globally
    public upcomingRenewals = computed(() => {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        return this.subscriptions().filter(sub => {
            const renewal = new Date(sub.renewalDate);
            return renewal >= now && renewal <= nextWeek;
        });
    });

    public totalMonthlyCost = computed(() => {
        return this.subscriptions().reduce((total, sub) => {
            if (sub.billingCycle === 'monthly') return total + sub.price;
            if (sub.billingCycle === 'yearly') return total + (sub.price / 12);
            return total;
        }, 0);
    });

    public totalYearlyCost = computed(() => {
        return this.subscriptions().reduce((total, sub) => {
            if (sub.billingCycle === 'yearly') return total + sub.price;
            if (sub.billingCycle === 'monthly') return total + (sub.price * 12);
            return total;
        }, 0);
    });

    constructor() {
        this.loadSubscriptions();
    }

    private async loadSubscriptions() {
        const subs = await this.db.getSubscriptions();
        this.subscriptionsSignal.set(subs);
    }

    async addSubscription(sub: Subscription) {
        await this.db.saveSubscription(sub);
        await this.loadSubscriptions();
    }

    getSubscriptionsByProject(projectId: string) {
        return computed(() => 
            this.subscriptions().filter(s => s.projectId === projectId)
        );
    }

    async updateSubscription(id: string, changes: Partial<Subscription>) {
        const existing = this.subscriptions().find(s => s.id === id);
        if (!existing) return;
        await this.db.saveSubscription({ ...existing, ...changes });
        await this.loadSubscriptions();
    }

    async deleteSubscription(id: string) {
        await this.db.deleteSubscription(id);
        await this.loadSubscriptions();
    }
}
