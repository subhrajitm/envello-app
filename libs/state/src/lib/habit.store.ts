import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { Habit, HabitLog } from '@envello/domain';

function localDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function computeStreak(habitId: string, logs: HabitLog[]): number {
    const completedDates = new Set(
        logs.filter(l => l.habitId === habitId).map(l => l.date)
    );
    if (completedDates.size === 0) return 0;

    const today = new Date();
    const todayStr = localDateStr(today);
    // Start from today if completed, otherwise from yesterday
    let cursor = new Date(today);
    if (!completedDates.has(todayStr)) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    for (let i = 0; i < 365; i++) {
        if (completedDates.has(localDateStr(cursor))) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

@Injectable({ providedIn: 'root' })
export class HabitStore {
    private db = inject(DataService);

    private habitsSignal = signal<Habit[]>([]);
    private logsSignal   = signal<HabitLog[]>([]);

    habits = this.habitsSignal.asReadonly();
    logs   = this.logsSignal.asReadonly();

    activeHabits   = computed(() => this.habitsSignal().filter(h => !h.archivedAt && !h.deleted_at));
    archivedHabits = computed(() => this.habitsSignal().filter(h => !!h.archivedAt && !h.deleted_at));

    todayStr = computed(() => localDateStr(new Date()));

    todayLogs = computed(() => {
        const today = this.todayStr();
        return this.logsSignal().filter(l => l.date === today);
    });

    constructor() {
        this.load();
        window.addEventListener('envello:db-ready',      () => this.load());
        window.addEventListener('envello:sync-complete', () => this.load());
    }

    private async load() {
        try {
            const [habits, logs] = await Promise.all([
                this.db.getAll<Habit>('habits'),
                this.db.getAll<HabitLog>('habit_logs'),
            ]);
            this.habitsSignal.set((habits || []).filter(h => !h.deleted_at));
            this.logsSignal.set(logs || []);
        } catch (e) {
            console.error('[HabitStore] load failed', e);
        }
    }

    isCompletedToday(habitId: string): boolean {
        return this.todayLogs().some(l => l.habitId === habitId);
    }

    streakFor(habitId: string): number {
        return computeStreak(habitId, this.logsSignal());
    }

    weekLogsFor(habitId: string): Set<string> {
        const today = new Date();
        const weekDates = new Set<string>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            weekDates.add(localDateStr(d));
        }
        const habitLogs = new Set(
            this.logsSignal()
                .filter(l => l.habitId === habitId && weekDates.has(l.date))
                .map(l => l.date)
        );
        return habitLogs;
    }

    async addHabit(habit: Habit) {
        this.habitsSignal.update(list => [...list, habit]);
        try {
            await this.db.upsert('habits', habit);
        } catch (e) {
            console.error('[HabitStore] addHabit failed', e);
            await this.load();
        }
    }

    async updateHabit(id: string, changes: Partial<Habit>) {
        this.habitsSignal.update(list =>
            list.map(h => h.id === id ? { ...h, ...changes } : h)
        );
        const habit = this.habitsSignal().find(h => h.id === id);
        if (habit) {
            try {
                await this.db.upsert('habits', habit);
            } catch (e) {
                console.error('[HabitStore] updateHabit failed', e);
            }
        }
    }

    async archiveHabit(id: string) {
        await this.updateHabit(id, { archivedAt: new Date().toISOString() });
    }

    async unarchiveHabit(id: string) {
        await this.updateHabit(id, { archivedAt: null });
    }

    async deleteHabit(id: string) {
        const habit = this.habitsSignal().find(h => h.id === id);
        if (!habit) return;
        this.habitsSignal.update(list => list.filter(h => h.id !== id));
        try {
            await this.db.upsert('habits', { ...habit, deleted_at: new Date().toISOString() });
        } catch (e) {
            console.error('[HabitStore] deleteHabit failed', e);
        }
    }

    async toggle(habitId: string) {
        const today = this.todayStr();
        const existing = this.logsSignal().find(l => l.habitId === habitId && l.date === today);

        if (existing) {
            // Uncheck: remove the log
            this.logsSignal.update(list => list.filter(l => !(l.habitId === habitId && l.date === today)));
            try {
                await this.db.remove('habit_logs', existing.id);
            } catch (e) {
                console.error('[HabitStore] toggle remove failed', e);
            }
        } else {
            // Check: add a log
            const log: HabitLog = {
                id:          crypto.randomUUID(),
                habitId,
                date:        today,
                completedAt: new Date().toISOString(),
            };
            this.logsSignal.update(list => [...list, log]);
            try {
                await this.db.upsert('habit_logs', log);
            } catch (e) {
                console.error('[HabitStore] toggle add failed', e);
            }
        }
    }
}
