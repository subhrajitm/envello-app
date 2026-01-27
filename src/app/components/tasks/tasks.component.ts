import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Task } from '../../services/store.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent {
  store = inject(StoreService);
  selectedFilter = signal<string>('All');
  
  // Calendar state
  currentDate = signal<Date>(new Date());
  
  // Task group collapse state
  todayGroupExpanded = signal<boolean>(true);
  upcomingGroupExpanded = signal<boolean>(false);
  noDueDateGroupExpanded = signal<boolean>(false);

  todayTasksCount = computed(() => this.store.tasks().filter(t => t.due?.includes('Today')).length);
  completedTasksCount = computed(() => this.store.tasks().filter(t => t.status === 'COMPLETED').length);
  activeTasksCount = computed(() => this.store.tasks().filter(t => t.status === 'ACTIVE').length);
  priorityTasksCount = computed(() => this.store.tasks().filter(t => t.priority === 'PRIORITY 01').length);

  filteredTasks = computed(() => {
    const filter = this.selectedFilter();
    const tasks = this.store.tasks();
    
    if (filter === 'All') {
      return tasks;
    } else if (filter === 'Today') {
      return tasks.filter(t => t.due?.includes('Today'));
    } else if (filter === 'This Week') {
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);
      
      return tasks.filter(t => {
        if (!t.due) return false;
        if (t.due.includes('Today')) return true;
        if (t.due.includes('Overdue')) return true;
        // Check if due date is within the next 7 days
        // This is a simplified check - in a real app, you'd parse the date properly
        return true; // For now, include all tasks with due dates
      });
    }
    return tasks;
  });

  // Calendar computed values
  calendarMonth = computed(() => {
    const date = this.currentDate();
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  });

  calendarDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week for first day (0 = Sunday, 6 = Saturday)
    const startDay = firstDay.getDay();
    
    // Days in the month
    const daysInMonth = lastDay.getDate();
    
    // Previous month's days to show
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isActive: boolean }> = [];
    
    // Add previous month's trailing days
    for (let i = startDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({ day, isCurrentMonth: false, isToday: false, isActive: false });
    }
    
    // Add current month's days
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      // Check if any task is due on this day (simplified - in real app, parse dates properly)
      const isActive = this.store.tasks().some(t => {
        if (!t.due) return false;
        // Simple check - in production, you'd parse the date properly
        // Check if task is due today or has a date that matches
        if (t.due.includes('Today') && isToday) return true;
        // For other dates, we'd need proper date parsing
        return false;
      });
      days.push({ day, isCurrentMonth: true, isToday, isActive });
    }
    
    // Add next month's leading days to fill the grid (42 cells = 6 weeks)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false, isActive: false });
    }
    
    return days;
  });

  // Task groups
  todayTasks = computed(() => {
    return this.store.tasks().filter(t => t.due?.includes('Today'));
  });

  upcomingTasks = computed(() => {
    return this.store.tasks().filter(t => {
      if (!t.due) return false;
      if (t.due.includes('Today')) return false;
      if (t.due.includes('Overdue')) return false;
      return true;
    });
  });

  noDueDateTasks = computed(() => {
    return this.store.tasks().filter(t => !t.due);
  });

  activeTasksCountSidebar = computed(() => {
    return this.store.tasks().filter(t => t.status === 'ACTIVE').length;
  });

  // Methods
  navigateMonth(direction: 'prev' | 'next') {
    const current = this.currentDate();
    const newDate = new Date(current);
    
    if (direction === 'prev') {
      newDate.setMonth(current.getMonth() - 1);
    } else {
      newDate.setMonth(current.getMonth() + 1);
    }
    
    this.currentDate.set(newDate);
  }

  toggleTaskStatus(task: Task) {
    const newStatus = task.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    this.store.updateTask(task.id, { status: newStatus });
  }

  toggleTaskGroup(group: 'today' | 'upcoming' | 'noDueDate') {
    if (group === 'today') {
      this.todayGroupExpanded.update(v => !v);
    } else if (group === 'upcoming') {
      this.upcomingGroupExpanded.update(v => !v);
    } else if (group === 'noDueDate') {
      this.noDueDateGroupExpanded.update(v => !v);
    }
  }

  isGroupExpanded(group: 'today' | 'upcoming' | 'noDueDate'): boolean {
    if (group === 'today') return this.todayGroupExpanded();
    if (group === 'upcoming') return this.upcomingGroupExpanded();
    return this.noDueDateGroupExpanded();
  }

  openNewTaskDialog() {
    // For now, create a simple task - in production, you'd open a modal/dialog
    const newTask: Task = {
      id: Date.now().toString(),
      title: 'NEW TASK',
      priority: 'PRIORITY 03',
      hours: '0.0H',
      status: 'ACTIVE',
      due: undefined
    };
    this.store.addTask(newTask);
  }
}
