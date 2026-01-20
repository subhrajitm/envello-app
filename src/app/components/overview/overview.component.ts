import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  currentMonth = 'November 2024';

  planningItems = [
    { id: '1', title: 'Emerald Protocol', tag: 'Fiction', stage: 'Draft 2 • 4d left', active: true },
    { id: '2', title: 'Midnight Kyoto', tag: 'Mystery', stage: 'Planning • 12d left', active: false },
  ];

  days = [
    { date: 28, prevMonth: true }, { date: 29, prevMonth: true }, { date: 30, prevMonth: true }, { date: 31, prevMonth: true },
    { date: 1, events: [{ title: 'DRAFT 2 SESSION', time: '09:00 - 11:30', type: 'fiction' }] },
    { date: 2 }, { date: 3 },
    { date: 4 },
    { date: 5, today: true, events: [{ title: 'CHARACTER ARC DUE', type: 'deadline' }, { title: 'EMERALD EDIT', type: 'fiction' }, { title: 'KYOTO BEATS', type: 'mystery' }] },
    { date: 6, hasAdd: true },
    { date: 7 },
    { date: 8, events: [{ title: 'DEEP FOCUS', type: 'fiction' }] },
    { date: 9 }, { date: 10 },
    { date: 11 }, { date: 12 }, { date: 13 },
    { date: 14, events: [{ title: 'KYOTO RELEASE', type: 'deadline' }] },
  ];

  /* Fill empty cells for illustration */
  calendarPlaceholders = new Array(3).fill(null);
  weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  activities = [
    { id: '1', text: "Entry added to 'Morning Pages'", time: '10 MINS AGO', type: 'entry' },
    { id: '2', text: "Sync complete on 3 devices", time: '1 HOUR AGO', type: 'sync' },
    { id: '3', text: "AI Analysis ready for Chapter 1", time: '4 HOURS AGO', type: 'ai' },
  ];

  get globalTasks() {
    return this.store.tasks().slice(0, 5);
  }
}
