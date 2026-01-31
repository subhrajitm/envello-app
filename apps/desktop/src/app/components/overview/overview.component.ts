import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '../../services/store.service';
import { UserService } from '../../services/user.service';
import { RecentActivityComponent } from '../dashboard/recent-activity/recent-activity.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RecentActivityComponent],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  userService = inject(UserService);
  private router = inject(Router);

  user = this.userService.user;

  // Stats
  wordCount = computed(() => this.formatNumber(this.user()?.stats.totalWords || 0));
  streak = computed(() => (this.user()?.stats.daysActive || 0) + 'd');

  // Real stats from Store
  activeTasksCount = computed(() => this.store.tasks().filter(t => t.status !== 'COMPLETED').length);
  dueTodayCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.store.tasks().filter(t => t.due && t.due.startsWith(today) && t.status !== 'COMPLETED').length;
  });
  completedTasksCount = computed(() => this.store.tasks().filter(t => t.status === 'COMPLETED').length);

  streakClass = computed(() => {
    const days = this.user()?.stats.daysActive || 0;
    if (days >= 365) return 'streak-diamond';
    if (days >= 100) return 'streak-fire';
    if (days >= 30) return 'streak-gold';
    if (days >= 7) return 'streak-active';
    return 'streak-neutral';
  });

  currentDate = new Date();
  viewMode = signal<'MONTH' | '2 WEEKS'>('MONTH');
  currentMonth = signal('');
  days = signal<any[]>([]);

  planningItems = this.store.planningItems;

  // Combine tasks and novels for global view if needed, but for now just tasks
  globalTasks = computed(() => this.store.tasks().filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED').slice(0, 5));

  /* Fill empty cells for illustration */
  calendarPlaceholders = new Array(0).fill(null); // Dynamic now
  weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  constructor() {
    // Effect to regenerate calendar when tasks change
    effect(() => {
      this.store.tasks(); // dependency
      this.generateCalendar();
    });
  }

  toggleAutoSchedule() {
    const current = this.user()?.preferences.autoSchedule;
    this.userService.updatePreferences({ autoSchedule: !current });
  }

  setViewMode(mode: 'MONTH' | '2 WEEKS') {
    this.viewMode.set(mode);
    this.generateCalendar();
  }

  changeMonth(delta: number) {
    const newDate = new Date(this.currentDate);
    if (this.viewMode() === 'MONTH') {
      newDate.setMonth(newDate.getMonth() + delta);
    } else {
      // Move by 2 weeks
      newDate.setDate(newDate.getDate() + (delta * 14));
    }
    this.currentDate = newDate;
    this.generateCalendar();
  }

  generateCalendar() {
    const viewDate = this.currentDate;
    const now = new Date(); // Real 'now' for today check
    const tasks = this.store.tasks();

    // Set header display
    if (this.viewMode() === 'MONTH') {
      this.currentMonth.set(viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase());
    } else {
      const endDate = new Date(viewDate);
      endDate.setDate(viewDate.getDate() + 13);
      const startStr = viewDate.toLocaleString('default', { month: 'short', day: 'numeric' });
      const endStr = endDate.toLocaleString('default', { month: 'short', day: 'numeric' });
      this.currentMonth.set(`${startStr} - ${endStr}`.toUpperCase());
    }

    const daysArray = [];

    if (this.viewMode() === 'MONTH') {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // 0 is Sunday, 1 is Monday. We want Monday to be 0 for array index
      let startDayOfWeek = firstDay.getDay() - 1;
      if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

      // Add previous month's days
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        daysArray.push({
          date: prevMonthLastDay - i,
          prevMonth: true,
          events: []
        });
      }

      // Add current month's days
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const dateObj = new Date(year, month, i);
        const dateStr = dateObj.toISOString().split('T')[0];
        const isToday = i === now.getDate() && month === now.getMonth() && year === now.getFullYear();

        // Find events for this day
        const dayTasks = tasks.filter(t => t.due && t.due.startsWith(dateStr));

        const events = dayTasks.map(t => ({
          title: t.title,
          type: t.priority === 'HIGH' ? 'deadline' : 'fiction' // Simplified mapping
        }));

        daysArray.push({
          date: i,
          today: isToday,
          events: events,
          hasAdd: isToday // Allow adding on today
        });
      }

      // Fill remaining slots to keep grid consitent if needed, 
      // but simplistic grid is fine for now
      const totalCells = daysArray.length;
      const remaining = 35 - totalCells; // 5 rows * 7 cols
      if (remaining > 0) {
        for (let j = 1; j <= remaining; j++) {
          daysArray.push({ date: j, nextMonth: true, events: [] });
        }
      }

    } else {
      // 2 WEEKS MODE
      // Align to start of the week (Monday)
      const currentDayOfWeek = viewDate.getDay() || 7; // 1 (Mon) - 7 (Sun)
      const startDate = new Date(viewDate);
      startDate.setDate(viewDate.getDate() - (currentDayOfWeek - 1));

      for (let i = 0; i < 14; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

        const dayTasks = tasks.filter(t => t.due && t.due.startsWith(dateStr));
        const events = dayTasks.map(t => ({
          title: t.title,
          type: t.priority === 'HIGH' ? 'deadline' : 'fiction'
        }));

        daysArray.push({
          date: d.getDate(),
          today: isToday,
          events: events,
          hasAdd: isToday
        });
      }
    }

    this.days.set(daysArray);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
