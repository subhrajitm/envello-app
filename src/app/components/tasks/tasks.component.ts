import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Task } from '../../services/store.service';
import { SidebarComponent, SidebarNavItem } from '../layout/sidebar/sidebar.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

type TaskViewFilter = 'inbox' | 'today' | 'upcoming' | 'completed';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ModalComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent {
  store = inject(StoreService);

  // Left sidebar state
  sidebarSearch = signal<string>('');
  selectedView = signal<TaskViewFilter>('inbox');
  quickAddMode = signal<'do-now' | 'do-later'>('do-now');
  /**
   * Main content layout mode for the center panel.
   * - 'list'      → compact data grid (existing experience)
   * - 'thumbnails' → card / thumbnail layout
   */
  viewMode = signal<'list' | 'thumbnails'>('list');

  // New task modal state
  newTaskModalOpen = signal<boolean>(false);
  newTaskTitle = signal<string>('');
  newTaskDescription = signal<string>('');
  newTaskPriority = signal<Task['priority']>('PRIORITY 02');
  newTaskDue = signal<string | undefined>(undefined);
  newTaskList = signal<string>('Inbox');
  newTaskHasReminder = signal<boolean>(false);
   // Labels for the new task
  newTaskLabels = signal<string[]>([]);
  newTaskLabelInput = signal<string>('');
  
  // Calendar dropdown state
  showDatePicker = signal<boolean>(false);
  datePickerDate = signal<Date>(new Date());
  
  // Folder dropdown state
  showFolderDropdown = signal<boolean>(false);
  showCreateFolder = signal<boolean>(false);
  newFolderName = signal<string>('');
  
  // Available lists/folders
  availableLists = computed(() => {
    const lists = new Set<string>(['Inbox']);
    this.store.tasks().forEach(task => {
      if (task.project) {
        lists.add(task.project);
      }
    });
    return Array.from(lists).sort();
  });

  // Delete confirmation modal state
  deleteModalOpen = signal<boolean>(false);
  taskPendingDelete = signal<Task | null>(null);

  sidebarItems = computed<SidebarNavItem[]>(() => [
    {
      id: 'inbox',
      icon: 'inbox',
      label: 'Inbox',
      count: this.inboxTasks().length
    },
    {
      id: 'today',
      icon: 'today',
      label: 'Today',
      count: this.todayTasksCount()
    },
    {
      id: 'upcoming',
      icon: 'upcoming',
      label: 'Upcoming',
      count: this.upcomingTasks().length
    },
    {
      id: 'completed',
      icon: 'task_alt',
      label: 'Completed',
      count: this.completedTasksCount()
    }
  ]);

  /**
   * Derived UI state
   * - Used to style the toolbar Filter button so users can see
   *   when any filtering / scoping is active.
   */
  filtersActive = computed(() => {
    const view = this.selectedView();
    const query = this.sidebarSearch().trim();
    // Inbox + no query == baseline, everything else is considered "filtered"
    return view !== 'inbox' || !!query;
  });

  /**
   * Human-readable view title used in the toolbar.
   */
  viewTitle = computed(() => {
    const view = this.selectedView();
    if (view === 'today') return 'Today';
    if (view === 'upcoming') return 'Upcoming';
    if (view === 'completed') return 'Completed';
    return 'Inbox';
  });

  /**
   * Compact summary line shown under the title.
   * Example: "4 tasks • 2 due today • 1 overdue"
   */
  viewSubtitle = computed(() => {
    const total = this.filteredTasks().length;
    const dueToday = this.todayTasksCount();
    const overdue = this.store
      .tasks()
      .filter(t => t.due?.includes('Overdue')).length;

    const parts: string[] = [];
    parts.push(`${total} task${total === 1 ? '' : 's'}`);
    parts.push(`${dueToday} due today`);
    parts.push(`${overdue} overdue`);

    return parts.join(' • ');
  });

  /**
   * Toolbar view switcher handlers.
   */
  setListView() {
    this.viewMode.set('list');
  }

  setThumbnailsView() {
    this.viewMode.set('thumbnails');
  }

  /**
   * New Task Modal: open/reset + helpers
   */
  openNewTaskDialog() {
    this.newTaskTitle.set('');
    this.newTaskDescription.set('');
    this.newTaskPriority.set('PRIORITY 02');
    this.newTaskDue.set(undefined);
    this.newTaskList.set('Inbox');
    this.newTaskHasReminder.set(false);
    this.newTaskLabels.set([]);
    this.newTaskLabelInput.set('');
    this.quickAddMode.set('do-now');
    this.showDatePicker.set(false);
    this.showFolderDropdown.set(false);
    this.showCreateFolder.set(false);
    this.newFolderName.set('');
    this.datePickerDate.set(new Date());
    this.newTaskModalOpen.set(true);
  }

  closeNewTaskDialog() {
    this.newTaskModalOpen.set(false);
  }

  setNewTaskPriority(priority: Task['priority']) {
    this.newTaskPriority.set(priority);
  }

  toggleNewTaskTodayDue() {
    // Simple helper: toggle between no date and a generic "Today" label.
    if (this.newTaskDue()) {
      this.newTaskDue.set(undefined);
    } else {
      this.newTaskDue.set('Today, 12:00');
    }
  }

  setQuickAddMode(mode: 'do-now' | 'do-later') {
    this.quickAddMode.set(mode);
    // Set defaults based on mode
    if (mode === 'do-now') {
      // For "Do Now", set due date to today if not already set
      if (!this.newTaskDue()) {
        this.newTaskDue.set('Today, 12:00');
      }
    } else {
      // For "Do Later", clear due date to let user set it manually
      // Keep it if already set
    }
  }

  toggleNewTaskReminder() {
    this.newTaskHasReminder.update(v => !v);
  }

  addNewTaskLabel() {
    const raw = this.newTaskLabelInput().trim();
    if (!raw) return;
    const existing = this.newTaskLabels();
    if (existing.includes(raw)) {
      this.newTaskLabelInput.set('');
      return;
    }
    this.newTaskLabels.set([...existing, raw]);
    this.newTaskLabelInput.set('');
  }

  removeNewTaskLabel(label: string) {
    this.newTaskLabels.set(this.newTaskLabels().filter(l => l !== label));
  }

  /** Open delete confirmation for a given task. */
  requestDeleteTask(task: Task, event?: Event) {
    event?.stopPropagation();
    this.taskPendingDelete.set(task);
    this.deleteModalOpen.set(true);
  }

  cancelDeleteTask() {
    this.deleteModalOpen.set(false);
    this.taskPendingDelete.set(null);
  }

  confirmNewTask() {
    const title = this.newTaskTitle().trim();
    if (!title) {
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title,
      priority: this.newTaskPriority(),
      hours: '1.0H',
      status: 'ACTIVE',
      project: this.newTaskList() || undefined,
      due: this.newTaskDue(),
      labels: this.newTaskLabels().length ? this.newTaskLabels() : undefined,
      reminders: this.newTaskHasReminder() ? ['Default reminder'] : undefined
    };

    this.store.addTask(newTask);
    this.closeNewTaskDialog();
  }

  onSidebarActiveChange(id: string) {
    this.selectedView.set(id as TaskViewFilter);
  }

  // Legacy top filter buttons (kept but internally derive from selectedView)
  selectedFilter = signal<string>('All');

  // Calendar state
  currentDate = signal<Date>(new Date());

  // Task group collapse state
  todayGroupExpanded = signal<boolean>(true);
  upcomingGroupExpanded = signal<boolean>(false);
  noDueDateGroupExpanded = signal<boolean>(false);

  todayTasksCount = computed(
    () => this.store.tasks().filter(t => t.due?.includes('Today')).length
  );
  completedTasksCount = computed(
    () => this.store.tasks().filter(t => t.status === 'COMPLETED').length
  );
  activeTasksCount = computed(
    () => this.store.tasks().filter(t => t.status === 'ACTIVE').length
  );
  priorityTasksCount = computed(
    () => this.store.tasks().filter(t => t.priority === 'PRIORITY 01').length
  );

  // Inbox/Today/Upcoming/Completed views
  inboxTasks = computed(() => this.store.tasks());

  viewTasks = computed(() => {
    const view = this.selectedView();
    const query = this.sidebarSearch().trim().toLowerCase();

    let base: Task[];
    if (view === 'today') {
      base = this.store.tasks().filter(t => t.due?.includes('Today'));
    } else if (view === 'upcoming') {
      base = this.store.tasks().filter(t => {
        if (!t.due) return false;
        if (t.due.includes('Today')) return false;
        if (t.due.includes('Overdue')) return false;
        return true;
      });
    } else if (view === 'completed') {
      base = this.store.tasks().filter(t => t.status === 'COMPLETED');
    } else {
      // inbox
      base = this.inboxTasks();
    }

    if (!query) return base;

    return base.filter(t => {
      const haystack =
        (t.title + ' ' + (t.project ?? '') + ' ' + (t.assignee ?? '')).toLowerCase();
      return haystack.includes(query);
    });
  });

  filteredTasks = computed(() => this.viewTasks());

  // Helper used by header checkbox to determine "all done" state
  allVisibleTasksCompleted = computed(() => {
    const tasks = this.filteredTasks();
    return tasks.length > 0 && tasks.every(t => t.status === 'COMPLETED');
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

  /**
   * Calendar day click:
   * - Only reacts to days in the current month.
   * - If the clicked day is today, switches to Today view.
   * - Otherwise, switches to Upcoming as a lightweight "schedule" view.
   */
  onCalendarDayClick(day: { day: number; isCurrentMonth: boolean; isToday: boolean; isActive: boolean }) {
    if (!day.isCurrentMonth) {
      return;
    }

    this.sidebarSearch.set('');

    if (day.isToday) {
      this.selectedView.set('today');
    } else {
      this.selectedView.set('upcoming');
    }
  }
  
  // Date picker methods
  toggleDatePicker() {
    this.showDatePicker.update(v => !v);
    if (!this.showDatePicker()) {
      this.datePickerDate.set(new Date());
    }
  }
  
  selectDate(day: number, isCurrentMonth: boolean) {
    if (!isCurrentMonth) return;
    
    const selectedDate = new Date(this.datePickerDate());
    selectedDate.setDate(day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let dateString = '';
    if (diffDays === 0) {
      dateString = 'Today, 12:00';
    } else if (diffDays === 1) {
      dateString = 'Tomorrow, 12:00';
    } else if (diffDays === -1) {
      dateString = 'Yesterday, 12:00';
    } else {
      dateString = selectedDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    this.newTaskDue.set(dateString);
    this.showDatePicker.set(false);
  }
  
  navigateDatePickerMonth(direction: 'prev' | 'next') {
    const current = this.datePickerDate();
    const newDate = new Date(current);
    
    if (direction === 'prev') {
      newDate.setMonth(current.getMonth() - 1);
    } else {
      newDate.setMonth(current.getMonth() + 1);
    }
    
    this.datePickerDate.set(newDate);
  }
  
  getDatePickerDays() {
    const date = this.datePickerDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    
    // Previous month's trailing days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false });
    }
    
    // Current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && 
                     today.getMonth() === month && 
                     today.getFullYear() === year;
      days.push({ day, isCurrentMonth: true, isToday });
    }
    
    // Next month's leading days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false });
    }
    
    return days;
  }
  
  getDatePickerMonth() {
    const date = this.datePickerDate();
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  }
  
  // Folder methods
  toggleFolderDropdown() {
    this.showFolderDropdown.update(v => !v);
    this.showCreateFolder.set(false);
    this.newFolderName.set('');
  }
  
  selectFolder(folderName: string) {
    this.newTaskList.set(folderName);
    this.showFolderDropdown.set(false);
  }
  
  toggleCreateFolder() {
    this.showCreateFolder.update(v => !v);
    if (this.showCreateFolder()) {
      this.newFolderName.set('');
    }
  }
  
  createNewFolder() {
    const folderName = this.newFolderName().trim();
    if (!folderName) return;
    
    this.newTaskList.set(folderName);
    this.showCreateFolder.set(false);
    this.showFolderDropdown.set(false);
    this.newFolderName.set('');
  }

  /**
   * Metric cards are clickable shortcuts into common views.
   */
  onMetricClick(metric: 'today' | 'completed' | 'active' | 'priority') {
    this.sidebarSearch.set('');

    if (metric === 'today') {
      this.selectedView.set('today');
    } else if (metric === 'completed') {
      this.selectedView.set('completed');
    } else {
      // For "active" and "priority", keep inbox but ensure baseline view.
      this.selectedView.set('inbox');
    }
  }

  toggleTaskStatus(task: Task) {
    const newStatus = task.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    this.store.updateTask(task.id, { status: newStatus });
  }

  /**
   * Quick row action: mark a single task as completed.
   * If it's already completed, we leave it as-is to avoid accidental re-open.
   */
  onQuickComplete(task: Task) {
    if (task.status === 'COMPLETED') {
      return;
    }
    this.store.updateTask(task.id, { status: 'COMPLETED' });
  }

  /**
   * Delete a single task (used by confirmation modal) and push it into the bin via StoreService.
   */
  deleteTask(task: Task) {
    this.store.deleteTask(task.id);
  }

  confirmDeleteTask() {
    const task = this.taskPendingDelete();
    if (!task) return;
    this.deleteTask(task);
    this.cancelDeleteTask();
  }

  /**
   * Header checkbox helper:
   * - If all visible tasks are completed, mark them ACTIVE.
   * - Otherwise, mark all visible tasks COMPLETED.
   */
  toggleAllVisibleTasksStatus() {
    const tasks = this.filteredTasks();
    if (tasks.length === 0) {
      return;
    }

    const allCompleted = this.allVisibleTasksCompleted();
    const nextStatus: Task['status'] = allCompleted ? 'ACTIVE' : 'COMPLETED';

    for (const task of tasks) {
      if (task.status !== nextStatus) {
        this.store.updateTask(task.id, { status: nextStatus });
      }
    }
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

  // (legacy quick-create kept via confirmNewTask modal now)
}
