import { Component, computed, inject, signal, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Task } from '@envello/core';
import { SidebarNavItem, ModalComponent } from '@envello/ui';

type TaskViewFilter = 'inbox' | 'today' | 'upcoming' | 'completed';
type ViewMode = 'list' | 'thumbnails' | 'timeline';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent implements OnInit, OnDestroy {
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
  viewMode = signal<ViewMode>('list');

  // Quick add bar state
  quickAddVisible = signal<boolean>(false);
  quickAddInput = signal<string>('');

  // Focus mode state
  focusMode = signal<boolean>(false);
  focusedTask = signal<Task | null>(null);

  // Task details modal state
  showTaskDetails = signal<boolean>(false);
  selectedTaskForDetails = signal<Task | null>(null);
  editingTaskDetails = signal<boolean>(false);
  editedTaskTitle = signal<string>('');
  editedTaskDescription = signal<string>('');
  editedTaskPriority = signal<Task['priority']>('MEDIUM');
  editedTaskDue = signal<string | undefined>(undefined);
  editedTaskList = signal<string>('Inbox');
  editedTaskLabels = signal<string[]>([]);

  // Pomodoro timer state
  pomodoroActive = signal<boolean>(false);
  pomodoroTime = signal<number>(25 * 60); // 25 minutes in seconds
  pomodoroTask = signal<Task | null>(null);

  // Keyboard shortcuts help
  showShortcutsHelp = signal<boolean>(false);

  // Timeline/Gantt view state
  timelineViewDate = signal<Date>(new Date());
  timelineZoom = signal<'day' | 'week' | 'month'>('week');

  // Bulk operations
  selectedTasks = signal<Set<string>>(new Set());
  bulkActionMode = signal<boolean>(false);

  // Undo/Redo
  actionHistory = signal<Array<{ type: string; task: Task; previousState?: Partial<Task> }>>([]);
  historyIndex = signal<number>(-1);

  // Theme
  theme = signal<'light' | 'dark'>('light');

  // File upload
  uploadingFiles = signal<boolean>(false);
  filesToUpload = signal<File[]>([]);

  // Markdown preview
  showMarkdownPreview = signal<boolean>(false);

  // Loading states
  isLoading = signal<boolean>(false);

  // Virtual scrolling
  virtualScrollEnabled = signal<boolean>(true);
  visibleTaskRange = signal<{ start: number; end: number }>({ start: 0, end: 50 });
  itemHeight: number = 60; // Approximate height of each task row

  // Voice input
  isListening = signal<boolean>(false);
  voiceRecognition: any = null;
  voiceTranscript = signal<string>('');

  // Photo capture
  showCameraCapture = signal<boolean>(false);
  capturedPhoto = signal<string | null>(null);

  // Toolbar attachments dropdown
  showAttachmentsMenu = signal<boolean>(false);

  // Error handling
  errorMessage = signal<string | null>(null);
  showError = signal<boolean>(false);

  // Image preview
  previewingImage = signal<string | null>(null);

  // Snooze
  snoozeOptions = signal<Array<{ id: string; label: string; minutes: number }>>([
    { id: '5min', label: '5 minutes', minutes: 5 },
    { id: '15min', label: '15 minutes', minutes: 15 },
    { id: '30min', label: '30 minutes', minutes: 30 },
    { id: '1hour', label: '1 hour', minutes: 60 },
    { id: '2hours', label: '2 hours', minutes: 120 },
    { id: 'tomorrow', label: 'Tomorrow', minutes: 24 * 60 }
  ]);

  // Theme customization
  fontSize = signal<'small' | 'medium' | 'large'>('medium');
  customColors = signal<{ primary: string; secondary: string } | null>(null);
  showThemeSettings = signal<boolean>(false);

  // Snooze
  showSnoozeOptions = signal<number | null>(null);

  // New task modal state
  newTaskModalOpen = signal<boolean>(false);
  newTaskTitle = signal<string>('');
  newTaskDescription = signal<string>('');
  newTaskPriority = signal<Task['priority']>('MEDIUM');
  newTaskDue = signal<string | undefined>(undefined);
  newTaskDueTime = signal<string>('12:00');
  newTaskList = signal<string>('Inbox');
  newTaskHasReminder = signal<boolean>(false);
  newTaskReminderTimes = signal<string[]>([]);
  newReminderTimeInput = signal<string>('');
  // Labels for the new task
  newTaskLabels = signal<string[]>([]);
  newTaskLabelInput = signal<string>('');
  showLabelAutocomplete = signal<boolean>(false);

  // Recurring task state
  newTaskRecurring = signal<boolean>(false);
  newTaskRecurringPattern = signal<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');

  // Subtasks state
  newTaskSubtasks = signal<string[]>([]);
  newSubtaskInput = signal<string>('');

  // Advanced options
  showAdvancedOptions = signal<boolean>(false);

  // Task dependencies
  newTaskDependencies = signal<string[]>([]);

  // Calendar dropdown state
  showDatePicker = signal<boolean>(false);
  datePickerDate = signal<Date>(new Date());

  // Folder dropdown state
  showFolderDropdown = signal<boolean>(false);
  showCreateFolder = signal<boolean>(false);
  newFolderName = signal<string>('');

  // Sidebar folder state
  showCreateFolderInSidebar = signal<boolean>(false);
  newFolderNameSidebar = signal<string>('');
  // Currently selected project/context in sidebar; empty = all
  selectedFolder = signal<string>('');
  // Active item in primary sidebar nav (Inbox/Today/Upcoming/Completed)
  sidebarActiveId = signal<string | null>('inbox');

  // Available lists/folders
  availableLists = computed(() => {
    const lists = new Set<string>();
    this.store.tasks().forEach(task => {
      if (task.project) {
        lists.add(task.project);
      }
    });
    return Array.from(lists).sort();
  });

  // Get task count for a folder
  getFolderTaskCount(folderName: string): number {
    return this.store.tasks().filter(t => t.project === folderName).length;
  }

  // Sidebar folder methods
  selectFolderInSidebar(folderName: string) {
    // When a project/context is selected, clear primary nav selection
    this.sidebarActiveId.set(null);
    // Always show inbox view but scoped by selectedFolder
    this.selectedView.set('inbox');
    this.selectedFolder.set(folderName);
    // Clear metric-based filters when explicitly scoping by project/context
    this.metricFilter.set('none');
    // Filter tasks by folder
    this.sidebarSearch.set('');
  }

  createFolderInSidebar() {
    const folderName = this.newFolderNameSidebar().trim();
    if (!folderName) return;

    this.showCreateFolderInSidebar.set(false);
    this.newFolderNameSidebar.set('');
    this.selectedFolder.set(folderName);
  }

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
    const hasProjectScope = !!this.selectedFolder();
    const metric = this.metricFilter();
    // Inbox + no query + no project + no metric == baseline
    return view !== 'inbox' || !!query || hasProjectScope || metric !== 'none';
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
   * New Task Modal: open/reset + helpers
   */
  openNewTaskDialog() {
    this.newTaskTitle.set('');
    this.newTaskDescription.set('');
    this.newTaskPriority.set('MEDIUM');
    this.newTaskDue.set(undefined);
    this.newTaskDueTime.set('12:00');
    this.newTaskList.set('Inbox');
    this.newTaskHasReminder.set(false);
    this.newTaskLabels.set([]);
    this.newTaskLabelInput.set('');
    this.showDatePicker.set(false);
    this.showFolderDropdown.set(false);
    this.showCreateFolder.set(false);
    this.newFolderName.set('');
    this.showCreateFolderInSidebar.set(false);
    this.newFolderNameSidebar.set('');
    this.datePickerDate.set(new Date());
    this.datePickerPosition.set(null);
    this.folderDropdownPosition.set(null);
    this.newTaskSubtasks.set([]);
    this.newSubtaskInput.set('');
    this.newTaskRecurring.set(false);
    this.newTaskRecurringPattern.set('weekly');
    this.showAdvancedOptions.set(false);
    this.showLabelAutocomplete.set(false);
    this.newTaskDependencies.set([]);
    this.newTaskReminderTimes.set([]);
    this.newReminderTimeInput.set('');
    this.filesToUpload.set([]);
    this.showMarkdownPreview.set(false);
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
      this.newTaskDue.set(`Today, ${this.newTaskDueTime()}`);
    }
  }

  setQuickAddMode(mode: 'do-now' | 'do-later') {
    this.quickAddMode.set(mode);
    // Set defaults based on mode
    if (mode === 'do-now') {
      // For "Do Now", set due date to today if not already set
      if (!this.newTaskDue()) {
        this.newTaskDue.set(`Today, ${this.newTaskDueTime()}`);
      }
    } else {
      // For "Do Later", clear due date to let user set it manually
      // Keep it if already set
    }
  }

  toggleNewTaskReminder() {
    this.newTaskHasReminder.update(v => !v);
    if (!this.newTaskHasReminder()) {
      this.newTaskReminderTimes.set([]);
    } else if (this.newTaskReminderTimes().length === 0) {
      // Set default reminder
      this.newTaskReminderTimes.set(['1 hour before']);
    }
  }

  addReminderTime() {
    const time = this.newReminderTimeInput().trim();
    if (!time) return;
    this.newTaskReminderTimes.set([...this.newTaskReminderTimes(), time]);
    this.newReminderTimeInput.set('');
  }

  removeReminderTime(index: number) {
    const times = this.newTaskReminderTimes();
    this.newTaskReminderTimes.set(times.filter((_, i) => i !== index));
  }

  snoozeReminder(index: number, minutes: number) {
    const times = this.newTaskReminderTimes();
    const currentTime = times[index];

    // Calculate new reminder time
    const now = new Date();
    const snoozeTime = new Date(now.getTime() + minutes * 60 * 1000);
    const newTime = minutes >= 24 * 60
      ? 'Tomorrow, ' + snoozeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : snoozeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const updated = [...times];
    updated[index] = newTime;
    this.newTaskReminderTimes.set(updated);
    this.showSnoozeOptions.set(null);
  }

  addNewTaskLabel(label?: string) {
    const raw = (label || this.newTaskLabelInput()).trim();
    if (!raw) return;
    const existing = this.newTaskLabels();
    if (existing.includes(raw)) {
      this.newTaskLabelInput.set('');
      this.showLabelAutocomplete.set(false);
      return;
    }
    this.newTaskLabels.set([...existing, raw]);
    this.newTaskLabelInput.set('');
    this.showLabelAutocomplete.set(false);
  }

  getLabelSuggestions(): string[] {
    const input = this.newTaskLabelInput().toLowerCase();
    if (!input) return [];
    return this.allLabels().filter(label =>
      label.toLowerCase().includes(input) &&
      !this.newTaskLabels().includes(label)
    ).slice(0, 5);
  }

  hideLabelAutocomplete() {
    // Delay hiding to allow click events on suggestions
    setTimeout(() => {
      this.showLabelAutocomplete.set(false);
    }, 200);
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

  async confirmNewTask() {
    const title = this.newTaskTitle().trim();
    if (!title) {
      this.showErrorState('Task title is required');
      return;
    }

    const taskId = Date.now().toString();

    // Optimistic update - show loading state
    this.isLoading.set(true);

    const subtasks: Task[] | undefined = this.newTaskSubtasks().length > 0
      ? this.newTaskSubtasks().map((st, idx) => ({
        id: `${taskId}-${idx}`,
        title: st,
        priority: 'MEDIUM' as Task['priority'],
        hours: '0.5H',
        status: 'ACTIVE' as Task['status'],
        parentId: taskId
      }))
      : undefined;

    const newTask: Task = {
      id: taskId,
      title,
      priority: this.newTaskPriority(),
      hours: '1.0H',
      status: 'ACTIVE',
      project: this.newTaskList() || undefined,
      due: this.newTaskDue(),
      labels: this.newTaskLabels().length ? this.newTaskLabels() : undefined,
      reminders: this.newTaskHasReminder() && this.newTaskReminderTimes().length > 0
        ? this.newTaskReminderTimes()
        : undefined,
      subtasks: subtasks,
      recurring: this.newTaskRecurring() ? {
        pattern: this.newTaskRecurringPattern(),
        interval: 1,
        nextDue: this.calculateNextDue(this.newTaskDue(), this.newTaskRecurringPattern(), 1)
      } : undefined,
      dependencies: this.newTaskDependencies().length > 0 ? this.newTaskDependencies() : undefined,
      description: this.newTaskDescription() || undefined
    };

    try {
      // Optimistic update
      this.store.addTask(newTask);

      // Upload files if any
      if (this.filesToUpload().length > 0) {
        await this.uploadFiles(taskId);
      }

      this.closeNewTaskDialog();
      this.isLoading.set(false);
    } catch (error) {
      this.isLoading.set(false);
      this.showErrorState('Failed to create task. Please try again.');
      // Could implement rollback here if needed
    }
  }

  handleFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
      this.filesToUpload.set([...this.filesToUpload(), ...files]);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  getFilePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  previewImage(url: string) {
    this.previewingImage.set(url);
  }

  closeImagePreview() {
    this.previewingImage.set(null);
  }

  addSubtaskToNew() {
    const input = this.newSubtaskInput().trim();
    if (!input) return;
    this.newTaskSubtasks.set([...this.newTaskSubtasks(), input]);
    this.newSubtaskInput.set('');
  }

  removeSubtask(index: number) {
    const subtasks = this.newTaskSubtasks();
    this.newTaskSubtasks.set(subtasks.filter((_, i) => i !== index));
  }

  onSidebarActiveChange(id: string) {
    this.selectedView.set(id as TaskViewFilter);
    this.sidebarActiveId.set(id);
    // Reset metric and project filters when switching primary view
    this.metricFilter.set('none');

    // When switching back to Inbox, clear filters and show all tasks
    if (id === 'inbox') {
      this.sidebarSearch.set('');
      this.selectedFolder.set('');
    } else {
      // For non-inbox views, don't keep a project/context selection
      this.selectedFolder.set('');
    }
  }

  // Legacy top filter buttons (kept but internally derive from selectedView)
  selectedFilter = signal<string>('All');

  // Metric-based filter from right-side KPIs
  // 'none' = no extra filter, 'active' = only ACTIVE tasks, 'priority' = only HIGH priority
  metricFilter = signal<'none' | 'active' | 'priority'>('none');

  // Calendar state
  currentDate = signal<Date>(new Date());
  // null = no specific day selected (show all-time KPIs)
  selectedCalendarDay = signal<{ day: number; month: number; year: number } | null>(null);

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
    () => this.store.tasks().filter(t => t.priority === 'HIGH').length
  );

  // Per-selected-day KPI counts
  selectedDayLabel = computed(() => {
    const sel = this.selectedCalendarDay();
    if (!sel) return 'Overview';
    const d = new Date(sel.year, sel.month, sel.day);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  });

  selectedDayTasks = computed(() => {
    const sel = this.selectedCalendarDay();
    if (!sel) return this.store.tasks();
    const selDate = new Date(sel.year, sel.month, sel.day);
    const today = new Date();
    const isToday = selDate.toDateString() === today.toDateString();
    return this.store.tasks().filter(t => {
      if (!t.due) return false;
      if (isToday && t.due.includes('Today')) return true;
      // Match formatted date strings like "Mon, Apr 21"
      const formatted = selDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return t.due.includes(formatted);
    });
  });

  selectedDayTotal        = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().length : this.store.tasks().length);
  selectedDayCompleted    = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().filter(t => t.status === 'COMPLETED').length : this.completedTasksCount());
  selectedDayActive       = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().filter(t => t.status === 'ACTIVE').length : this.activeTasksCount());
  selectedDayToday        = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().length : this.todayTasksCount());
  selectedDayPriority     = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().filter(t => t.priority === 'HIGH').length : this.priorityTasksCount());

  // Inbox/Today/Upcoming/Completed views
  inboxTasks = computed(() => this.store.tasks());

  viewTasks = computed(() => {
    const view = this.selectedView();
    const query = this.sidebarSearch().trim().toLowerCase();
    const selectedFolder = this.selectedFolder();
    const metric = this.metricFilter();

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

    // Apply Project / Context filter from sidebar (empty = all)
    if (selectedFolder) {
      base = base.filter(t => t.project === selectedFolder);
    }

    // Apply metric-based filters from KPI chips
    if (metric === 'active') {
      base = base.filter(t => t.status === 'ACTIVE');
    } else if (metric === 'priority') {
      base = base.filter(t => t.priority === 'HIGH');
    }

    if (!query) return base;

    return base.filter(t => {
      const haystack =
        (t.title + ' ' + (t.project ?? '')).toLowerCase();
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
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const sel = this.selectedCalendarDay();

    const days: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isActive: boolean; isSelected: boolean }> = [];

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false, isActive: false, isSelected: false });
    }

    const today = new Date();
    const isCurrentCalMonth = today.getMonth() === month && today.getFullYear() === year;

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentCalMonth && day === today.getDate();
      const isSelected = !!sel && sel.day === day && sel.month === month && sel.year === year;
      const isActive = this.store.tasks().some(t => {
        if (!t.due) return false;
        if (t.due.includes('Today') && isToday) return true;
        const d = new Date(year, month, day);
        const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return t.due.includes(formatted);
      });
      days.push({ day, isCurrentMonth: true, isToday, isActive, isSelected });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false, isActive: false, isSelected: false });
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
  onCalendarDayClick(day: { day: number; isCurrentMonth: boolean; isToday: boolean; isActive: boolean; isSelected?: boolean }) {
    if (!day.isCurrentMonth) return;

    const date = this.currentDate();
    this.selectedCalendarDay.set({ day: day.day, month: date.getMonth(), year: date.getFullYear() });
    this.sidebarSearch.set('');

    if (day.isToday) {
      this.selectedView.set('today');
    } else {
      this.selectedView.set('upcoming');
    }
  }

  // Date picker methods
  datePickerPosition = signal<{ top: number; left: number } | null>(null);

  // Folder dropdown position
  folderDropdownPosition = signal<{ top: number; left: number } | null>(null);

  toggleDatePicker(event?: Event) {
    this.showDatePicker.update(v => {
      if (!v) {
        // Calculate position when opening
        setTimeout(() => {
          const target = event?.target as HTMLElement;
          const button = target?.closest('.task-modal-control-btn') as HTMLElement ||
            document.querySelector('.task-modal-control-btn') as HTMLElement;
          if (button) {
            const rect = button.getBoundingClientRect();
            this.datePickerPosition.set({
              top: rect.bottom + 8,
              left: rect.left
            });
          }
        }, 0);
      }
      return !v;
    });
    if (!this.showDatePicker()) {
      this.datePickerDate.set(new Date());
      this.datePickerPosition.set(null);
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

    const timeStr = this.newTaskDueTime();
    let dateString = '';
    if (diffDays === 0) {
      dateString = `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      dateString = `Tomorrow, ${timeStr}`;
    } else if (diffDays === -1) {
      dateString = `Yesterday, ${timeStr}`;
    } else {
      dateString = `${selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })}, ${timeStr}`;
    }

    this.newTaskDue.set(dateString);
    this.showDatePicker.set(false);
    this.datePickerPosition.set(null);
  }

  updateDueTime(time: string) {
    this.newTaskDueTime.set(time);
    // Update the existing due date string with the new time
    const currentDue = this.newTaskDue();
    if (currentDue) {
      // Extract the date part (everything before the comma and time)
      const dateMatch = currentDue.match(/^(.+?),\s*\d{1,2}:\d{2}$/);
      if (dateMatch) {
        this.newTaskDue.set(`${dateMatch[1]}, ${time}`);
      } else {
        // If format is unexpected, try to preserve what we can
        this.newTaskDue.set(`${currentDue.split(',')[0]}, ${time}`);
      }
    }
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
  toggleFolderDropdown(event?: Event) {
    this.showFolderDropdown.update(v => {
      if (!v) {
        // Calculate position when opening
        setTimeout(() => {
          const target = event?.target as HTMLElement;
          const button = target?.closest('.task-modal-folder-btn') as HTMLElement ||
            document.querySelector('.task-modal-folder-btn') as HTMLElement;
          if (button) {
            const rect = button.getBoundingClientRect();
            this.folderDropdownPosition.set({
              top: rect.bottom + 8,
              left: rect.left
            });
          }
        }, 0);
      }
      return !v;
    });
    if (!this.showFolderDropdown()) {
      this.showCreateFolder.set(false);
      this.newFolderName.set('');
      this.folderDropdownPosition.set(null);
    }
  }

  selectFolder(folderName: string) {
    this.newTaskList.set(folderName);
    this.showFolderDropdown.set(false);
    this.folderDropdownPosition.set(null);
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
    this.folderDropdownPosition.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Close attachments menu if clicking outside
    if (this.showAttachmentsMenu()) {
      if (!target.closest('.attachments-toolbar-wrapper')) {
        this.showAttachmentsMenu.set(false);
      }
    }

    // Close date picker if clicking outside
    if (this.showDatePicker()) {
      if (!target.closest('.task-modal-date-picker') &&
        !target.closest('.task-modal-control-btn')) {
        this.showDatePicker.set(false);
        this.datePickerPosition.set(null);
      }
    }

    // Close folder dropdown if clicking outside
    if (this.showFolderDropdown()) {
      if (!target.closest('.task-modal-folder-dropdown') &&
        !target.closest('.task-modal-folder-btn')) {
        this.showFolderDropdown.set(false);
        this.showCreateFolder.set(false);
        this.folderDropdownPosition.set(null);
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    // Cmd/Ctrl + Z: Undo
    if (modKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (this.canUndo()) {
        this.undo();
      }
      return;
    }

    // Cmd/Ctrl + Shift + Z: Redo
    if (modKey && event.key === 'z' && event.shiftKey) {
      event.preventDefault();
      if (this.canRedo()) {
        this.redo();
      }
      return;
    }

    // Cmd/Ctrl + K: Quick add
    if (modKey && event.key === 'k' && !event.shiftKey) {
      event.preventDefault();
      this.quickAddVisible.set(true);
      setTimeout(() => {
        const input = document.querySelector('.quick-add-input') as HTMLInputElement;
        input?.focus();
      }, 0);
      return;
    }

    // Cmd/Ctrl + N: New task modal
    if (modKey && event.key === 'n') {
      event.preventDefault();
      this.openNewTaskDialog();
      return;
    }

    // Cmd/Ctrl + F: Focus search
    if (modKey && event.key === 'f') {
      event.preventDefault();
      const searchInput = document.querySelector('.toolbar-search') as HTMLInputElement;
      searchInput?.focus();
      return;
    }

    // Cmd/Ctrl + /: Show shortcuts help
    if (modKey && event.key === '/') {
      event.preventDefault();
      this.showShortcutsHelp.set(!this.showShortcutsHelp());
      return;
    }

    // Escape: Close modals/dropdowns
    if (event.key === 'Escape') {
      if (this.newTaskModalOpen()) {
        this.closeNewTaskDialog();
      }
      if (this.showDatePicker()) {
        this.showDatePicker.set(false);
        this.datePickerPosition.set(null);
      }
      if (this.showFolderDropdown()) {
        this.showFolderDropdown.set(false);
        this.folderDropdownPosition.set(null);
      }
      if (this.quickAddVisible()) {
        this.quickAddVisible.set(false);
        this.quickAddInput.set('');
      }
      if (this.showShortcutsHelp()) {
        this.showShortcutsHelp.set(false);
      }
      if (this.focusMode()) {
        this.focusMode.set(false);
        this.focusedTask.set(null);
      }
      return;
    }
  }

  // Natural language parsing
  parseNaturalLanguage(input: string): {
    title: string;
    due?: string;
    priority?: Task['priority'];
    labels: string[];
  } {
    let title = input.trim();
    const labels: string[] = [];
    let priority: Task['priority'] | undefined;
    let due: string | undefined;

    // Extract hashtags (#work, #personal)
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(title)) !== null) {
      labels.push(match[1]);
      title = title.replace(match[0], '').trim();
    }

    // Extract priority keywords
    const priorityKeywords = {
      high: ['high', 'urgent', 'important', 'critical', 'asap', 'priority'],
      low: ['low', 'later', 'someday', 'optional']
    };

    const lowerTitle = title.toLowerCase();
    for (const [key, keywords] of Object.entries(priorityKeywords)) {
      if (keywords.some(kw => lowerTitle.includes(kw))) {
        priority = key.toUpperCase() as Task['priority'];
        // Remove priority keyword from title
        keywords.forEach(kw => {
          title = title.replace(new RegExp(kw, 'gi'), '').trim();
        });
        break;
      }
    }

    // Extract dates
    const datePatterns = [
      { pattern: /tomorrow/i, value: () => `Tomorrow, ${this.newTaskDueTime()}` },
      { pattern: /today/i, value: () => `Today, ${this.newTaskDueTime()}` },
      {
        pattern: /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        value: (match: RegExpMatchArray) => `${this.getNextWeekday(match[1])}, ${this.newTaskDueTime()}`
      },
      {
        pattern: /in\s+(\d+)\s+days?/i,
        value: (match: RegExpMatchArray) => `${this.getDateInDays(parseInt(match[1]))}, ${this.newTaskDueTime()}`
      },
      {
        pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
        value: (match: RegExpMatchArray) => `${this.parseDate(match[1], match[2], match[3])}, ${this.newTaskDueTime()}`
      }
    ];

    for (const { pattern, value } of datePatterns) {
      const dateMatch = title.match(pattern);
      if (dateMatch) {
        if (typeof value === 'function') {
          // Check if function expects a match parameter (has regex groups)
          if (dateMatch.length > 1) {
            due = (value as (match: RegExpMatchArray) => string)(dateMatch);
          } else {
            due = (value as () => string)();
          }
        } else {
          due = value;
        }
        title = title.replace(pattern, '').trim();
        break;
      }
    }

    // Extract time
    const timePatterns = [
      {
        pattern: /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
        value: (match: RegExpMatchArray) => {
          let hours = parseInt(match[1]);
          const minutes = match[2];
          const period = match[3]?.toLowerCase();

          if (period === 'pm' && hours !== 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;

          if (due) {
            return due.replace(/\d{2}:\d{2}/, `${hours.toString().padStart(2, '0')}:${minutes}`);
          }
          return `Today, ${hours.toString().padStart(2, '0')}:${minutes}`;
        }
      }
    ];

    for (const { pattern, value } of timePatterns) {
      const timeMatch = title.match(pattern);
      if (timeMatch) {
        const timeStr = value(timeMatch);
        if (timeStr) {
          due = timeStr;
          title = title.replace(pattern, '').trim();
        }
      }
    }

    // Clean up title (remove extra spaces)
    title = title.replace(/\s+/g, ' ').trim();

    return { title, due, priority, labels };
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  getNextWeekday(dayName: string): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  getDateInDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  parseDate(month: string, day: string, year?: string): string {
    const currentYear = new Date().getFullYear();
    const y = year ? (year.length === 2 ? `20${year}` : year) : currentYear.toString();
    const date = new Date(parseInt(y), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Quick add functionality
  handleQuickAdd() {
    const input = this.quickAddInput().trim();
    if (!input) return;

    const parsed = this.parseNaturalLanguage(input);

    if (!parsed.title) {
      // If title is empty after parsing, use original input
      parsed.title = input;
    }

    // Set parsed values
    this.newTaskTitle.set(parsed.title);
    if (parsed.due) {
      this.newTaskDue.set(parsed.due);
      // Extract time from parsed due date and update time input
      const extractedTime = this.extractTime(parsed.due);
      if (extractedTime) {
        this.newTaskDueTime.set(extractedTime);
      }
    }
    if (parsed.priority) this.newTaskPriority.set(parsed.priority);
    if (parsed.labels.length > 0) {
      this.newTaskLabels.set([...this.newTaskLabels(), ...parsed.labels]);
    }

    // Create task immediately or open modal for confirmation
    if (parsed.title && !parsed.due && !parsed.priority && parsed.labels.length === 0) {
      // Simple task - create immediately
      this.confirmNewTask();
      this.quickAddInput.set('');
      this.quickAddVisible.set(false);
    } else {
      // Complex task - open modal for confirmation
      this.quickAddVisible.set(false);
      this.newTaskModalOpen.set(true);
    }
  }

  /**
   * Metric cards are clickable shortcuts into common views.
   */
  onMetricClick(metric: 'today' | 'completed' | 'active' | 'priority') {
    this.sidebarSearch.set('');
    this.selectedFolder.set('');

    if (metric === 'today') {
      this.selectedView.set('today');
      this.metricFilter.set('none');
    } else if (metric === 'completed') {
      this.selectedView.set('completed');
      this.metricFilter.set('none');
    } else if (metric === 'active') {
      // Show only active tasks in inbox
      this.selectedView.set('inbox');
      this.metricFilter.set('active');
    } else if (metric === 'priority') {
      // Show only high priority tasks in inbox
      this.selectedView.set('inbox');
      this.metricFilter.set('priority');
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

    // Optimistic update
    const previousState = { status: task.status };
    this.addToHistory('update', task, previousState);

    try {
      this.store.updateTask(task.id, { status: 'COMPLETED' });
    } catch (error) {
      // Rollback on error
      this.store.updateTask(task.id, previousState);
      this.showErrorState('Failed to complete task. Please try again.');
    }
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

    // Optimistic update
    this.addToHistory('delete', task);

    try {
      this.deleteTask(task);
      this.cancelDeleteTask();
    } catch (error) {
      this.showErrorState('Failed to delete task. Please try again.');
      // Could restore task here if needed
    }
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

  extractTime(dueString: string | undefined): string {
    if (!dueString) return '';
    const timeMatch = dueString.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return timeMatch[0];
    }
    return '';
  }


  // Subtasks methods
  getCompletedSubtasks(task: Task): number {
    if (!task.subtasks) return 0;
    return task.subtasks.filter(st => st.status === 'COMPLETED').length;
  }

  getDependencyTitles(task: Task): string[] {
    if (!task.dependencies) return [];
    return task.dependencies
      .map(id => this.getTaskById(id))
      .filter(t => t !== undefined)
      .map(t => t!.title);
  }

  isTaskBlocked(task: Task): boolean {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const depTask = this.getTaskById(depId);
      return depTask && depTask.status !== 'COMPLETED';
    });
  }

  addSubtask(parentTask: Task, subtaskTitle: string) {
    const newSubtask: Task = {
      id: Date.now().toString(),
      title: subtaskTitle,
      priority: 'MEDIUM',
      hours: '0.5H',
      status: 'ACTIVE',
      parentId: parentTask.id
    };

    const updatedSubtasks = [...(parentTask.subtasks || []), newSubtask];
    this.store.updateTask(parentTask.id, { subtasks: updatedSubtasks });
  }

  // Focus mode
  focusTask(task: Task) {
    this.focusedTask.set(task);
    this.focusMode.set(true);
  }

  exitFocusMode() {
    this.focusMode.set(false);
    this.focusedTask.set(null);
  }

  // Task details modal methods
  openTaskDetails(task: Task) {
    this.selectedTaskForDetails.set(task);
    this.editedTaskTitle.set(task.title);
    this.editedTaskDescription.set(task.description || task.notes || '');
    this.editedTaskPriority.set(task.priority);
    this.editedTaskDue.set(task.due);
    this.editedTaskList.set(task.project || 'Inbox');
    this.editedTaskLabels.set(task.labels || []);
    this.editingTaskDetails.set(false);
    this.showTaskDetails.set(true);
  }

  closeTaskDetails() {
    this.showTaskDetails.set(false);
    this.selectedTaskForDetails.set(null);
    this.editingTaskDetails.set(false);
  }

  toggleEditTaskDetails() {
    this.editingTaskDetails.update(v => !v);
  }

  saveTaskDetails() {
    const task = this.selectedTaskForDetails();
    if (!task) return;

    const updates: Partial<Task> = {
      title: this.editedTaskTitle().trim(),
      description: this.editedTaskDescription().trim() || undefined,
      priority: this.editedTaskPriority(),
      due: this.editedTaskDue(),
      project: this.editedTaskList() === 'Inbox' ? undefined : this.editedTaskList(),
      labels: this.editedTaskLabels().length > 0 ? this.editedTaskLabels() : undefined
    };

    this.store.updateTask(task.id, updates);
    this.addToHistory('update', task, updates);
    this.editingTaskDetails.set(false);

    // Update the selected task reference
    const updatedTask = { ...task, ...updates };
    this.selectedTaskForDetails.set(updatedTask);
  }

  deleteTaskFromDetails() {
    const task = this.selectedTaskForDetails();
    if (task) {
      this.closeTaskDetails();
      this.requestDeleteTask(task);
    }
  }

  completeTaskFromDetails() {
    const task = this.selectedTaskForDetails();
    if (task) {
      this.toggleTaskStatus(task);
      // Update the selected task reference
      const updatedTask = { ...task, status: task.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED' as Task['status'] };
      this.selectedTaskForDetails.set(updatedTask);
    }
  }

  startPomodoroFromDetails() {
    const task = this.selectedTaskForDetails();
    if (task) {
      this.startPomodoro(task);
    }
  }

  addLabelToEdit(event: Event) {
    const input = event.target as HTMLInputElement;
    const label = input.value.trim();
    if (label && !this.editedTaskLabels().includes(label)) {
      this.editedTaskLabels.set([...this.editedTaskLabels(), label]);
      input.value = '';
    }
    event.preventDefault();
  }

  removeLabelFromEdit(label: string) {
    this.editedTaskLabels.set(this.editedTaskLabels().filter(l => l !== label));
  }

  toggleSubtaskStatus(parentTask: Task, subtask: Task) {
    const newStatus: Task['status'] = subtask.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    const updatedSubtasks = (parentTask.subtasks || []).map(st =>
      st.id === subtask.id ? { ...st, status: newStatus } : st
    );
    this.store.updateTask(parentTask.id, { subtasks: updatedSubtasks });

    // Update the selected task reference
    const updatedTask = { ...parentTask, subtasks: updatedSubtasks };
    this.selectedTaskForDetails.set(updatedTask);
  }

  isAttachmentImage(attachment: { name: string; type: string }): boolean {
    return attachment.type.startsWith('image/');
  }

  // Pomodoro timer
  startPomodoro(task: Task) {
    this.pomodoroTask.set(task);
    this.pomodoroActive.set(true);
    this.pomodoroTime.set(25 * 60);

    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
    }

    this.pomodoroInterval = setInterval(() => {
      const current = this.pomodoroTime();
      if (current > 0) {
        this.pomodoroTime.set(current - 1);
      } else {
        this.stopPomodoro();
      }
    }, 1000);
  }

  stopPomodoro() {
    this.pomodoroActive.set(false);
    this.pomodoroTask.set(null);
  }

  formatPomodoroTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  pomodoroInterval: any = null;

  ngOnInit() {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.theme.set(savedTheme);
    }
    document.documentElement.setAttribute('data-theme', this.theme());

    // Initialize font size
    const savedFontSize = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large' | null;
    if (savedFontSize) {
      this.fontSize.set(savedFontSize);
    }
    document.documentElement.setAttribute('data-font-size', this.fontSize());

    // Initialize voice recognition if available
    this.initVoiceRecognition();
  }

  initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.voiceRecognition = new SpeechRecognition();
      this.voiceRecognition.continuous = false;
      this.voiceRecognition.interimResults = false;
      this.voiceRecognition.lang = 'en-US';

      this.voiceRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.voiceTranscript.set(transcript);
        if (this.quickAddVisible()) {
          this.quickAddInput.set(transcript);
        } else if (this.newTaskModalOpen()) {
          this.newTaskTitle.set(transcript);
        }
        this.isListening.set(false);
      };

      this.voiceRecognition.onerror = (event: any) => {
        this.showErrorState('Voice recognition error: ' + event.error);
        this.isListening.set(false);
      };

      this.voiceRecognition.onend = () => {
        this.isListening.set(false);
      };
    }
  }

  startVoiceInput() {
    if (!this.voiceRecognition) {
      this.showErrorState('Voice recognition is not supported in your browser');
      return;
    }

    try {
      this.isListening.set(true);
      this.voiceTranscript.set('');
      this.voiceRecognition.start();
    } catch (error) {
      this.showErrorState('Failed to start voice recognition');
      this.isListening.set(false);
    }
  }

  stopVoiceInput() {
    if (this.voiceRecognition && this.isListening()) {
      this.voiceRecognition.stop();
      this.isListening.set(false);
    }
  }

  isVoiceSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  // Photo capture
  openCameraCapture() {
    this.showCameraCapture.set(true);
  }

  closeCameraCapture() {
    this.showCameraCapture.set(false);
    this.capturedPhoto.set(null);
  }

  capturePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.capturedPhoto.set(e.target.result);
          // Add as attachment
          this.filesToUpload.set([...this.filesToUpload(), file]);
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }

  // Error handling
  showErrorState(message: string) {
    this.errorMessage.set(message);
    this.showError.set(true);
    setTimeout(() => {
      this.showError.set(false);
      setTimeout(() => this.errorMessage.set(null), 300);
    }, 3000);
  }

  dismissError() {
    this.showError.set(false);
    setTimeout(() => this.errorMessage.set(null), 300);
  }

  ngOnDestroy() {
    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
    }
  }

  // Recurring tasks
  createRecurringTask(baseTask: Task, pattern: 'daily' | 'weekly' | 'monthly' | 'yearly', interval: number = 1) {
    const recurringTask: Task = {
      ...baseTask,
      id: Date.now().toString(),
      recurring: {
        pattern,
        interval,
        nextDue: this.calculateNextDue(baseTask.due, pattern, interval)
      }
    };
    this.store.addTask(recurringTask);
  }

  calculateNextDue(currentDue: string | undefined, pattern: string, interval: number): string {
    if (!currentDue) return '';
    const today = new Date();
    const next = new Date(today);

    switch (pattern) {
      case 'daily':
        next.setDate(today.getDate() + interval);
        break;
      case 'weekly':
        next.setDate(today.getDate() + (7 * interval));
        break;
      case 'monthly':
        next.setMonth(today.getMonth() + interval);
        break;
      case 'yearly':
        next.setFullYear(today.getFullYear() + interval);
        break;
    }

    return next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Enhanced labels with colors
  getLabelColor(label: string): string {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16'
    ];
    const index = label.charCodeAt(0) % colors.length;
    return colors[index];
  }

  // All available labels
  allLabels = computed(() => {
    const labels = new Set<string>();
    this.store.tasks().forEach(task => {
      if (task.labels) {
        task.labels.forEach(label => labels.add(label));
      }
    });
    return Array.from(labels).sort();
  });

  // Timeline/Gantt view methods
  navigateTimeline(direction: 'prev' | 'next') {
    const current = this.timelineViewDate();
    const newDate = new Date(current);
    const zoom = this.timelineZoom();

    if (zoom === 'day') {
      newDate.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    } else if (zoom === 'week') {
      newDate.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(current.getMonth() + (direction === 'next' ? 1 : -1));
    }

    this.timelineViewDate.set(newDate);
  }

  getTimelineTitle(): string {
    const date = this.timelineViewDate();
    const zoom = this.timelineZoom();

    if (zoom === 'day') {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (zoom === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  getTimelineTasks(): Task[] {
    return this.filteredTasks().filter(task => {
      if (!task.due && !task.startDate) return false;
      const taskDate = task.startDate ? new Date(task.startDate) : this.parseDateFromString(task.due || '');
      if (!taskDate) return false;

      const viewDate = this.timelineViewDate();
      const zoom = this.timelineZoom();

      if (zoom === 'day') {
        return taskDate.toDateString() === viewDate.toDateString();
      } else if (zoom === 'week') {
        const weekStart = new Date(viewDate);
        weekStart.setDate(viewDate.getDate() - viewDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return taskDate >= weekStart && taskDate <= weekEnd;
      } else {
        return taskDate.getMonth() === viewDate.getMonth() && taskDate.getFullYear() === viewDate.getFullYear();
      }
    });
  }

  getTimelineDates(): Date[] {
    const dates: Date[] = [];
    const start = new Date(this.timelineViewDate());
    const zoom = this.timelineZoom();

    if (zoom === 'day') {
      dates.push(start);
    } else if (zoom === 'week') {
      start.setDate(start.getDate() - start.getDay());
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    } else {
      const firstDay = new Date(start.getFullYear(), start.getMonth(), 1);
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
        dates.push(new Date(start.getFullYear(), start.getMonth(), d));
      }
    }

    return dates;
  }

  getDateDay(date: Date): string {
    return date.getDate().toString();
  }

  getDateWeekday(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getTaskTimelineBar(task: Task): { startPercent: number; widthPercent: number; startDate: string; endDate: string } | null {
    const startDate = task.startDate ? new Date(task.startDate) : this.parseDateFromString(task.due || '');
    if (!startDate) return null;

    const duration = task.estimatedDuration || 1;
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + duration);

    const dates = this.getTimelineDates();
    if (dates.length === 0) return null;

    const timelineStart = dates[0];
    const timelineEnd = dates[dates.length - 1];
    timelineEnd.setHours(23, 59, 59);

    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const startMs = startDate.getTime() - timelineStart.getTime();
    const endMs = endDate.getTime() - timelineStart.getTime();

    const startPercent = Math.max(0, (startMs / totalMs) * 100);
    const endPercent = Math.min(100, (endMs / totalMs) * 100);
    const widthPercent = Math.max(2, endPercent - startPercent);

    return {
      startPercent,
      widthPercent,
      startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endDate: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }

  parseDateFromString(dateStr: string): Date | null {
    if (!dateStr) return null;
    if (dateStr.includes('Today')) {
      return new Date();
    }
    if (dateStr.includes('Tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    // Try to parse common date formats
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // File attachment methods
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.filesToUpload.set([...this.filesToUpload(), ...files]);
    }
  }

  removeFileToUpload(index: number) {
    const files = this.filesToUpload();
    this.filesToUpload.set(files.filter((_, i) => i !== index));
  }

  async uploadFiles(taskId: string): Promise<void> {
    const files = this.filesToUpload();
    if (files.length === 0) return;

    this.uploadingFiles.set(true);

    // Simulate file upload (in real app, upload to server)
    const attachments = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file), // In real app, this would be server URL
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    const task = this.store.tasks().find(t => t.id === taskId);
    if (task) {
      const existingAttachments = task.attachments || [];
      this.store.updateTask(taskId, {
        attachments: [...existingAttachments, ...attachments]
      });
    }

    this.filesToUpload.set([]);
    this.uploadingFiles.set(false);
  }

  removeAttachment(taskId: string, attachmentId: string) {
    const task = this.store.tasks().find(t => t.id === taskId);
    if (task && task.attachments) {
      const updated = task.attachments.filter(a => a.id !== attachmentId);
      this.store.updateTask(taskId, { attachments: updated });
    }
  }

  // Bulk operations
  toggleTaskSelection(taskId: string) {
    const selected = new Set(this.selectedTasks());
    if (selected.has(taskId)) {
      selected.delete(taskId);
    } else {
      selected.add(taskId);
    }
    this.selectedTasks.set(selected);
    this.bulkActionMode.set(selected.size > 0);
  }

  selectAllTasks() {
    const allTaskIds = new Set(this.filteredTasks().map(t => t.id));
    this.selectedTasks.set(allTaskIds);
    this.bulkActionMode.set(true);
  }

  clearSelection() {
    this.selectedTasks.set(new Set());
    this.bulkActionMode.set(false);
  }

  bulkCompleteTasks() {
    const selected = this.selectedTasks();
    selected.forEach(id => {
      const task = this.store.tasks().find(t => t.id === id);
      if (task && task.status !== 'COMPLETED') {
        this.addToHistory('complete', task);
        this.store.updateTask(id, { status: 'COMPLETED' });
      }
    });
    this.clearSelection();
  }

  bulkDeleteTasks() {
    const selected = this.selectedTasks();
    selected.forEach(id => {
      const task = this.store.tasks().find(t => t.id === id);
      if (task) {
        this.addToHistory('delete', task);
        this.store.deleteTask(id);
      }
    });
    this.clearSelection();
  }

  bulkChangePriority(priority: Task['priority']) {
    const selected = this.selectedTasks();
    selected.forEach(id => {
      const task = this.store.tasks().find(t => t.id === id);
      if (task) {
        this.addToHistory('update', task, { priority: task.priority });
        this.store.updateTask(id, { priority });
      }
    });
    this.clearSelection();
  }

  // Undo/Redo
  addToHistory(type: string, task: Task, previousState?: Partial<Task>) {
    const history = this.actionHistory();
    const index = this.historyIndex();

    // Remove any history after current index
    const newHistory = history.slice(0, index + 1);
    newHistory.push({ type, task: { ...task }, previousState });

    this.actionHistory.set(newHistory);
    this.historyIndex.set(newHistory.length - 1);

    // Limit history size
    if (newHistory.length > 50) {
      this.actionHistory.set(newHistory.slice(-50));
      this.historyIndex.set(49);
    }
  }

  undo() {
    const index = this.historyIndex();
    if (index < 0) return;

    const history = this.actionHistory();
    const action = history[index];

    if (action.type === 'delete') {
      this.store.addTask(action.task);
    } else if (action.type === 'complete') {
      this.store.updateTask(action.task.id, { status: 'ACTIVE' });
    } else if (action.type === 'update' && action.previousState) {
      this.store.updateTask(action.task.id, action.previousState);
    }

    this.historyIndex.set(index - 1);
  }

  redo() {
    const history = this.actionHistory();
    const index = this.historyIndex();
    if (index >= history.length - 1) return;

    const nextIndex = index + 1;
    const action = history[nextIndex];

    if (action.type === 'delete') {
      this.store.deleteTask(action.task.id);
    } else if (action.type === 'complete') {
      this.store.updateTask(action.task.id, { status: 'COMPLETED' });
    } else if (action.type === 'update') {
      // Re-apply the update (would need to store the new state)
    }

    this.historyIndex.set(nextIndex);
  }

  canUndo = computed(() => this.historyIndex() >= 0);
  canRedo = computed(() => this.historyIndex() < this.actionHistory().length - 1);

  // Virtual scrolling - visible tasks
  visibleTasks = computed(() => {
    const tasks = this.filteredTasks();
    if (!this.virtualScrollEnabled() || tasks.length <= 50) {
      return tasks;
    }
    const range = this.visibleTaskRange();
    return tasks.slice(range.start, range.end);
  });

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const containerHeight = target.clientHeight;
    const scrollHeight = target.scrollHeight;

    const tasks = this.filteredTasks();
    if (tasks.length <= 50) return;

    // Calculate visible range
    const start = Math.floor(scrollTop / this.itemHeight);
    const end = Math.min(start + Math.ceil(containerHeight / this.itemHeight) + 10, tasks.length);

    this.visibleTaskRange.set({ start: Math.max(0, start - 5), end });
  }

  // Theme switching
  toggleTheme() {
    const current = this.theme();
    const newTheme = current === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }

  setFontSize(size: 'small' | 'medium' | 'large') {
    this.fontSize.set(size);
    document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem('fontSize', size);
  }

  // Markdown rendering (simple implementation)
  renderMarkdown(text: string): string {
    if (!text) return '';

    // Basic markdown parsing
    let html = text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br>');

    return html;
  }

  // Task dependencies
  getTaskById(id: string): Task | undefined {
    return this.store.tasks().find(t => t.id === id);
  }

  getAvailableDependencyTasks(): Task[] {
    return this.store.tasks().filter(t =>
      t.status !== 'COMPLETED' &&
      t.id !== this.newTaskTitle() // Exclude self if editing
    );
  }

  addDependency(taskId: string) {
    if (!taskId || this.newTaskDependencies().includes(taskId)) return;
    this.newTaskDependencies.set([...this.newTaskDependencies(), taskId]);
  }

  removeDependency(taskId: string) {
    this.newTaskDependencies.set(this.newTaskDependencies().filter(id => id !== taskId));
  }

  // (legacy quick-create kept via confirmNewTask modal now)
}
