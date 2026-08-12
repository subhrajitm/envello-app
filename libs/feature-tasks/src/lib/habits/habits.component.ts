import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Task } from '@envello/core';
import { ConfirmDialogComponent } from '@envello/ui';

@Component({
  selector: 'lib-habits',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './habits.component.html',
  styleUrl: './habits.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitsComponent {
  store = inject(StoreService);

  searchQuery = signal('');

  allHabits = computed(() => this.store.tasks().filter(t => t.isHabit && !t.deleted_at));

  filteredHabits = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.allHabits();
    return q ? all.filter(t => t.title.toLowerCase().includes(q)) : all;
  });

  pendingToday = computed(() => this.filteredHabits().filter(t => !this.isLoggedToday(t)));
  completedToday = computed(() => this.filteredHabits().filter(t => this.isLoggedToday(t)));

  // New habit form state
  showForm = signal(false);
  formTitle = signal('');
  formFrequency = signal<'daily' | 'weekly'>('daily');

  openForm() {
    this.formTitle.set('');
    this.formFrequency.set('daily');
    this.showForm.set(true);
  }

  saveHabit() {
    const title = this.formTitle().trim();
    if (!title) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      priority: 'MEDIUM',
      hours: '0',
      status: 'ACTIVE',
      isHabit: true,
      streak: 0,
      completionLog: [],
      recurring: { pattern: this.formFrequency(), interval: 1 },
      createdAt: new Date().toISOString(),
    };
    this.store.addTask(task);
    this.showForm.set(false);
  }

  // Delete confirmation
  habitPendingDelete = signal<Task | null>(null);

  requestDelete(task: Task, event: Event) {
    event.stopPropagation();
    this.habitPendingDelete.set(task);
  }

  confirmDelete() {
    const task = this.habitPendingDelete();
    if (!task) return;
    this.store.deleteTask(task.id);
    this.habitPendingDelete.set(null);
  }

  logToday(task: Task, event: Event) {
    event.stopPropagation();
    this.store.logHabitCompletion(task.id);
  }

  isLoggedToday(task: Task): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return task.completionLog?.includes(today) ?? false;
  }

  habit7DayDots(task: Task): { label: string; done: boolean; today: boolean }[] {
    const log = new Set(task.completionLog ?? []);
    const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayStr = new Date().toISOString().slice(0, 10);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const key = d.toISOString().slice(0, 10);
      return {
        label: dayLetters[d.getDay() === 0 ? 6 : d.getDay() - 1],
        done: log.has(key),
        today: key === todayStr
      };
    });
  }
}
