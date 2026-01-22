import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  userService = inject(UserService);

  user = this.userService.user;

  // Stats
  wordCount = computed(() => this.formatNumber(this.user()?.stats.totalWords || 0));
  streak = computed(() => (this.user()?.stats.daysActive || 0) + 'd');

  currentDate = new Date();
  viewMode = signal<'MONTH' | '2 WEEKS'>('MONTH');
  currentMonth = signal('');
  days = signal<any[]>([]);

  planningItems = this.store.planningItems;
  activities = this.store.activities;

  /* Fill empty cells for illustration */
  calendarPlaceholders = new Array(3).fill(null);
  weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  constructor() {
    this.generateCalendar();
  }

  get globalTasks() {
    return this.store.tasks().slice(0, 5);
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
          prevMonth: true
        });
      }

      // Add current month's days
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const isToday = i === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        const events = [];

        if (i === 1) events.push({ title: 'DRAFT 2 SESSION', time: '09:00 - 11:30', type: 'fiction' });
        if (isToday) {
          events.push({ title: 'CHARACTER ARC DUE', type: 'deadline' });
          events.push({ title: 'EMERALD EDIT', type: 'fiction' });
        }
        if (i === 14) events.push({ title: 'KYOTO RELEASE', type: 'deadline' });

        daysArray.push({
          date: i,
          today: isToday,
          events: events,
          hasAdd: i === now.getDate() + 1 && month === now.getMonth() && year === now.getFullYear()
        });
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

        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        const events = [];

        if (d.getDate() === 1) events.push({ title: 'DRAFT 2 SESSION', time: '09:00 - 11:30', type: 'fiction' });
        if (isToday) {
          events.push({ title: 'CHARACTER ARC DUE', type: 'deadline' });
        }

        daysArray.push({
          date: d.getDate(),
          today: isToday,
          events: events,
          hasAdd: false
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
}
