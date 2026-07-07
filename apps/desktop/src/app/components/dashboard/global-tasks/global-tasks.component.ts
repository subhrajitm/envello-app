import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from '@envello/ui';

interface Task {
  id: string;
  title: string;
  priority: 'HIGH' | 'MED' | 'LOW';
  dueDate: string;
  type?: string;
}

@Component({
  selector: 'app-global-tasks',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './global-tasks.component.html',
  styleUrl: './global-tasks.component.css'
})
export class GlobalTasksComponent {
  tasks = signal<Task[]>([
    {
      id: '1',
      title: 'Review editor comments on Ch. 2',
      priority: 'HIGH',
      dueDate: 'Today',
    },
    {
      id: '2',
      title: 'Outline Part III research',
      priority: 'MED',
      dueDate: 'Tomorrow',
    },
    {
      id: '3',
      title: 'Sync with marketing team',
      priority: 'HIGH',
      dueDate: 'Thu, 10:00',
      type: 'PROJECT SYNC',
    },
  ]);

  highPriorityCount = computed(() => this.tasks().filter((t) => t.priority === 'HIGH').length);

  getPriorityVariant(priority: string): BadgeVariant {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MED':  return 'warning';
      case 'LOW':  return 'info';
      default:     return 'default';
    }
  }
}
