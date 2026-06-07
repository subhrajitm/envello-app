import { Component, computed, inject, signal, HostListener, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService, Task, NotificationService, FileStorageService, AiService } from '@envello/core';
import { SidebarNavItem, ModalComponent, AiAssistantPanelComponent, AiPanelMessage } from '@envello/ui';

type TaskViewFilter = 'inbox' | 'today' | 'upcoming' | 'completed';
type ViewMode = 'list' | 'thumbnails' | 'timeline';
type TaskListItem =
  | { kind: 'header'; label: string; count: number; accent: string }
  | { kind: 'task'; task: Task }
  | { kind: 'subtask'; task: Task; parentTitle: string };

type SubtaskDraft = { title: string; priority: Task['priority'] };

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, ModalComponent, AiAssistantPanelComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent implements OnInit, OnDestroy {
  readonly today = new Date();
  store = inject(StoreService);
  private notificationService = inject(NotificationService);
  private fileStorage = inject(FileStorageService);
  private aiService = inject(AiService);

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
  /** Drives which task is shown in the details modal. Using a computed keeps the modal always fresh from the store. */
  selectedTaskId = signal<string | null>(null);
  selectedTaskForDetails = computed(() => {
    const id = this.selectedTaskId();
    if (!id) return null;
    // Check top-level tasks first
    const top = this.store.tasks().find(t => t.id === id);
    if (top) return top;
    // Fall back to nested subtasks (e.g. calendar list subtask rows)
    for (const t of this.store.tasks()) {
      const sub = t.subtasks?.find(s => s.id === id);
      if (sub) return sub;
    }
    return null;
  });
  editingTaskDetails = signal<boolean>(false);
  editedTaskTitle = signal<string>('');
  editedTaskDescription = signal<string>('');
  editedTaskPriority = signal<Task['priority']>('MEDIUM');
  editedTaskDue = signal<string | undefined>(undefined);
  editedTaskList = signal<string>('Inbox');
  editedTaskLabels = signal<string[]>([]);
  editedTaskDueTime = signal<string>('12:00');
  editedTaskReminders = signal<string[]>([]);
  editedTaskRecurring = signal<boolean>(false);
  editedTaskRecurringPattern = signal<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  detailsLabelInput = signal<string>('');
  newSubtaskTitle = signal<string>('');
  editingSubtaskId = signal<string | null>(null);
  editingSubtaskTitle = signal<string>('');
  showReminderPicker = signal<boolean>(false);
  showNewTaskReminderPicker = signal<boolean>(false);

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

  // Tracks which task IDs have their subtasks collapsed in the list
  collapsedSubtasks = signal<Set<string>>(new Set());

  toggleSubtasksCollapse(taskId: string, event: Event) {
    event.stopPropagation();
    const current = new Set(this.collapsedSubtasks());
    current.has(taskId) ? current.delete(taskId) : current.add(taskId);
    this.collapsedSubtasks.set(current);
  }

  isSubtasksCollapsed(taskId: string): boolean {
    return this.collapsedSubtasks().has(taskId);
  }

  // Undo/Redo

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
  itemHeight: number = 65; // Approximate height of each task row

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
  newTaskStatus = signal<Task['status']>('ACTIVE');
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
  newTaskSubtasks = signal<SubtaskDraft[]>([]);
  newSubtaskInput = signal<string>('');
  newSubtaskPriority = signal<Task['priority']>('MEDIUM');

  // Advanced options (separate signals per modal to avoid shared state)
  newTaskShowAdvanced = signal<boolean>(false);
  detailsShowAdvanced = signal<boolean>(false);

  // Task dependencies
  newTaskDependencies = signal<string[]>([]);
  newTaskDependencyInput = signal<string>('');
  showDependencySearch = signal<boolean>(false);

  // Estimated hours & start date
  newTaskHours = signal<string>('1');
  newTaskStartDate = signal<string>('');

  // Recurring interval and end date
  newTaskRecurringInterval = signal<number>(1);
  newTaskRecurringEndDate = signal<string>('');

  // Template picker state
  newTaskTemplateOpen = signal<boolean>(false);

  // Calendar dropdown state
  showDatePicker = signal<boolean>(false);
  datePickerDate = signal<Date>(new Date());
  datePickerContext = signal<'new' | 'details' | 'new-start'>('new');

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

  // Bulk delete confirmation
  bulkDeleteModalOpen = signal<boolean>(false);

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
      .filter(t => this.isOverdue(t)).length;

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
    this.newTaskStatus.set('ACTIVE');
    this.newTaskDue.set(undefined);
    this.newTaskDueTime.set('12:00');
    this.newTaskList.set(this.selectedFolder() || 'Inbox');
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
    this.newSubtaskPriority.set('MEDIUM');
    this.newTaskTemplateOpen.set(false);
    this.newTaskRecurring.set(false);
    this.newTaskRecurringPattern.set('weekly');
    this.newTaskShowAdvanced.set(false);
    this.showLabelAutocomplete.set(false);
    this.newTaskDependencies.set([]);
    this.newTaskDependencyInput.set('');
    this.showDependencySearch.set(false);
    this.newTaskHours.set('1');
    this.newTaskStartDate.set('');
    this.newTaskRecurringInterval.set(1);
    this.newTaskRecurringEndDate.set('');
    this.newTaskReminderTimes.set([]);
    this.newReminderTimeInput.set('');
    this.filesToUpload.set([]);
    this.showMarkdownPreview.set(false);
    this.showNewTaskReminderPicker.set(false);
    this.newTaskModalOpen.set(true);
  }

  closeNewTaskDialog(force = false) {
    if (!force && this.hasUnsavedNewTaskData()) {
      if (!confirm('Discard unsaved task?')) return;
    }
    this.newTaskModalOpen.set(false);
    this.newTaskShowAdvanced.set(false);
    this.showDatePicker.set(false);
    this.datePickerPosition.set(null);
    this.showNewTaskReminderPicker.set(false);
  }

  private hasUnsavedNewTaskData(): boolean {
    return !!(
      this.newTaskTitle().trim() ||
      this.newTaskDescription().trim() ||
      this.newTaskLabels().length > 0 ||
      this.newTaskDue() ||
      this.newTaskSubtasks().length > 0 ||
      this.newTaskDependencies().length > 0
    );
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

  addNewTaskReminderPreset(value: string) {
    if (!value || this.newTaskReminderTimes().includes(value)) return;
    this.newTaskReminderTimes.update(r => [...r, value]);
    this.newTaskHasReminder.set(true);
    this.showNewTaskReminderPicker.set(false);
  }

  removeNewTaskReminderPreset(value: string) {
    this.newTaskReminderTimes.update(r => r.filter(x => x !== value));
    if (this.newTaskReminderTimes().length === 0) {
      this.newTaskHasReminder.set(false);
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

  labelSuggestions = computed(() => {
    const input = this.newTaskLabelInput().toLowerCase();
    if (!input) return [];
    return this.allLabels().filter(label =>
      label.toLowerCase().includes(input) &&
      !this.newTaskLabels().includes(label)
    ).slice(0, 5);
  });

  dependencySuggestions = computed(() => {
    const q = this.newTaskDependencyInput().toLowerCase().trim();
    if (!q) return [] as Task[];
    const existing = new Set(this.newTaskDependencies());
    return this.store.tasks()
      .filter(t => !existing.has(t.id) && t.status !== 'COMPLETED' && t.title.toLowerCase().includes(q))
      .slice(0, 5);
  });

  nextOccurrences = computed(() => {
    if (!this.newTaskRecurring() || !this.newTaskDue()) return [] as string[];
    const results: string[] = [];
    let current = this.newTaskDue();
    for (let i = 0; i < 3; i++) {
      current = this.calculateNextDue(current, this.newTaskRecurringPattern(), this.newTaskRecurringInterval() || 1);
      if (!current) break;
      results.push(current);
    }
    return results;
  });

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

    const taskId = crypto.randomUUID();

    // Optimistic update - show loading state
    this.isLoading.set(true);

    const subtasks: Task[] | undefined = this.newTaskSubtasks().length > 0
      ? this.newTaskSubtasks().map((st) => ({
        id: crypto.randomUUID(),
        title: st.title,
        priority: st.priority,
        hours: '0.5H',
        status: 'ACTIVE' as Task['status'],
        parentId: taskId
      }))
      : undefined;

    const hoursNum = parseFloat(this.newTaskHours()) || 1;
    const recurringInterval = this.newTaskRecurringInterval() || 1;

    const newTask: Task = {
      id: taskId,
      title,
      priority: this.newTaskPriority(),
      hours: `${hoursNum}H`,
      estimatedDuration: hoursNum * 60,
      status: this.newTaskStatus(),
      project: this.newTaskList() || undefined,
      due: this.newTaskDue(),
      startDate: this.newTaskStartDate() || undefined,
      labels: this.newTaskLabels().length ? this.newTaskLabels() : undefined,
      reminders: this.newTaskHasReminder() && this.newTaskReminderTimes().length > 0
        ? this.newTaskReminderTimes()
        : undefined,
      subtasks: subtasks,
      recurring: this.newTaskRecurring() ? {
        pattern: this.newTaskRecurringPattern(),
        interval: recurringInterval,
        endDate: this.newTaskRecurringEndDate() || undefined,
        nextDue: this.calculateNextDue(this.newTaskDue(), this.newTaskRecurringPattern(), recurringInterval)
      } : undefined,
      dependencies: this.newTaskDependencies().length > 0 ? this.newTaskDependencies() : undefined,
      description: this.newTaskDescription() || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      // Optimistic update
      this.store.addTask(newTask);
      this.scheduleRemindersForTask(newTask);

      // Upload files if any
      if (this.filesToUpload().length > 0) {
        await this.uploadFiles(taskId);
      }

      this.closeNewTaskDialog(true);
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
    this.newTaskSubtasks.update(subs => [...subs, { title: input, priority: this.newSubtaskPriority() }]);
    this.newSubtaskInput.set('');
  }

  removeSubtask(index: number) {
    const subtasks = this.newTaskSubtasks();
    this.newTaskSubtasks.set(subtasks.filter((_, i) => i !== index));
  }

  addNewTaskDependency(taskId: string) {
    if (!this.newTaskDependencies().includes(taskId)) {
      this.newTaskDependencies.update(deps => [...deps, taskId]);
    }
    this.newTaskDependencyInput.set('');
    this.showDependencySearch.set(false);
  }

  removeNewTaskDependency(taskId: string) {
    this.newTaskDependencies.update(deps => deps.filter(d => d !== taskId));
  }

  getDependencyTitle(taskId: string): string {
    return this.store.tasks().find(t => t.id === taskId)?.title ?? taskId;
  }

  hideDependencySearch() {
    setTimeout(() => this.showDependencySearch.set(false), 200);
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

  todayTasksCount = computed(() => {
    const today = new Date();
    return this.store.tasks().filter(t =>
      this.dueDateMatchesDay(t.due, today) ||
      (t.subtasks?.some(st => this.dueDateMatchesDay(st.due, today)) ?? false)
    ).length;
  });
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
    return this.store.tasks().filter(t => this.dueDateMatchesDay(t.due, selDate));
  });

  selectedDayTotal        = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().length : this.store.tasks().length);
  selectedDayCompleted    = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().filter(t => t.status === 'COMPLETED').length : this.completedTasksCount());
  selectedDayActive       = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().filter(t => t.status === 'ACTIVE').length : this.activeTasksCount());
  selectedDayToday        = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().length : this.todayTasksCount());
  selectedDayPriority     = computed(() => this.selectedCalendarDay() ? this.selectedDayTasks().filter(t => t.priority === 'HIGH').length : this.priorityTasksCount());

  /** Subtasks (from any parent) whose due date falls on the selected calendar day. */
  calendarDaySubtasks = computed((): Array<{ task: Task; parentTitle: string }> => {
    const sel = this.selectedCalendarDay();
    if (!sel) return [];
    const selDate = new Date(sel.year, sel.month, sel.day);
    const result: Array<{ task: Task; parentTitle: string }> = [];
    for (const parent of this.store.tasks()) {
      if (!parent.subtasks?.length) continue;
      for (const subtask of parent.subtasks) {
        if (this.dueDateMatchesDay(subtask.due, selDate)) {
          result.push({ task: subtask, parentTitle: parent.title });
        }
      }
    }
    return result;
  });

  /** Subtasks due today — shown as individual rows in the Today view. */
  todaySubtasks = computed((): Array<{ task: Task; parentTitle: string }> => {
    const today = new Date();
    const result: Array<{ task: Task; parentTitle: string }> = [];
    for (const parent of this.store.tasks()) {
      if (!parent.subtasks?.length) continue;
      for (const subtask of parent.subtasks) {
        if (this.dueDateMatchesDay(subtask.due, today)) {
          result.push({ task: subtask, parentTitle: parent.title });
        }
      }
    }
    return result;
  });

  /** Subtasks with a future due date — shown as individual rows in the Upcoming view. */
  upcomingSubtasks = computed((): Array<{ task: Task; parentTitle: string }> => {
    const today = new Date();
    const result: Array<{ task: Task; parentTitle: string }> = [];
    for (const parent of this.store.tasks()) {
      if (!parent.subtasks?.length) continue;
      for (const subtask of parent.subtasks) {
        if (subtask.due && !this.dueDateMatchesDay(subtask.due, today) && !this.isOverdue(subtask)) {
          result.push({ task: subtask, parentTitle: parent.title });
        }
      }
    }
    return result;
  });

  // Inbox/Today/Upcoming/Completed views
  inboxTasks = computed(() => this.store.tasks());

  viewTasks = computed(() => {
    const view = this.selectedView();
    const query = this.sidebarSearch().trim().toLowerCase();
    const selectedFolder = this.selectedFolder();
    const metric = this.metricFilter();
    const calDay = this.selectedCalendarDay();

    let base: Task[];
    const todayDate = new Date();
    if (calDay && (view === 'today' || view === 'upcoming')) {
      // Any calendar day click: show parent tasks due that day OR with a subtask due that day
      const selDate = new Date(calDay.year, calDay.month, calDay.day);
      base = this.store.tasks().filter(t =>
        this.dueDateMatchesDay(t.due, selDate) ||
        (t.subtasks?.some(st => this.dueDateMatchesDay(st.due, selDate)) ?? false)
      );
    } else if (view === 'today') {
      base = this.store.tasks().filter(t =>
        this.dueDateMatchesDay(t.due, todayDate) ||
        (t.subtasks?.some(st => this.dueDateMatchesDay(st.due, todayDate)) ?? false)
      );
    } else if (view === 'upcoming') {
      base = this.store.tasks().filter(t => {
        const taskUpcoming = !!t.due && !this.dueDateMatchesDay(t.due, todayDate) && !this.isOverdue(t);
        const hasUpcomingSubtask = t.subtasks?.some(st =>
          !!st.due && !this.dueDateMatchesDay(st.due, todayDate) && !this.isOverdue(st)
        ) ?? false;
        return taskUpcoming || hasUpcomingSubtask;
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
      const haystack = (
        t.title + ' ' +
        (t.project ?? '') + ' ' +
        (t.labels?.join(' ') ?? '') + ' ' +
        (t.description ?? '')
      ).toLowerCase();
      return haystack.includes(query);
    });
  });

  filteredTasks = computed(() => this.viewTasks());

  /** Flat list interleaved with group-header items for the inbox view. */
  flatListItems = computed((): TaskListItem[] => {
    const tasks = this.filteredTasks();
    let items: TaskListItem[];

    if (this.selectedView() !== 'inbox') {
      items = tasks.map(t => ({ kind: 'task', task: t }));
    } else {
      items = [];
      const push = (label: string, accent: string, list: Task[]) => {
        if (!list.length) return;
        items.push({ kind: 'header', label, count: list.length, accent });
        list.forEach(t => items.push({ kind: 'task', task: t }));
      };

      const today = new Date();
      push('Overdue', '#ef4444',
        tasks.filter(t => this.isOverdue(t) && t.status !== 'COMPLETED'));
      push('Today', '#f59e0b',
        tasks.filter(t => this.dueDateMatchesDay(t.due, today) && t.status !== 'COMPLETED'));
      push('Upcoming', '#6366f1',
        tasks.filter(t => !!t.due && !this.dueDateMatchesDay(t.due, today) && !this.isOverdue(t) && t.status !== 'COMPLETED'));
      push('No Date', '#9ca3af',
        tasks.filter(t => !t.due && t.status !== 'COMPLETED'));
      push('Completed', '#10b981',
        tasks.filter(t => t.status === 'COMPLETED'));
    }

    const appendSubtasks = (subs: Array<{ task: Task; parentTitle: string }>, label: string) => {
      if (!subs.length) return;
      items.push({ kind: 'header', label, count: subs.length, accent: '#8b5cf6' });
      subs.forEach(({ task, parentTitle }) => items.push({ kind: 'subtask', task, parentTitle }));
    };

    const view = this.selectedView();
    if (this.selectedCalendarDay()) {
      appendSubtasks(this.calendarDaySubtasks(), 'Subtasks Due');
    } else if (view === 'today') {
      appendSubtasks(this.todaySubtasks(), 'Subtasks Due Today');
    } else if (view === 'upcoming') {
      appendSubtasks(this.upcomingSubtasks(), 'Upcoming Subtasks');
    }

    return items;
  });

  cycleTaskPriority(task: Task, event: Event) {
    event.stopPropagation();
    const next: Task['priority'] =
      task.priority === 'HIGH' ? 'MEDIUM' : task.priority === 'MEDIUM' ? 'LOW' : 'HIGH';
    this.store.updateTask(task.id, { priority: next });
  }

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
      const d = new Date(year, month, day);
      const isActive = this.store.tasks().some(t =>
        this.dueDateMatchesDay(t.due, d) ||
        (t.subtasks?.some(st => this.dueDateMatchesDay(st.due, d)) ?? false)
      );
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
    const today = new Date();
    return this.store.tasks().filter(t => this.dueDateMatchesDay(t.due, today));
  });

  upcomingTasks = computed(() => {
    const today = new Date();
    return this.store.tasks().filter(t => {
      const taskUpcoming = !!t.due && !this.dueDateMatchesDay(t.due, today) && !this.isOverdue(t);
      const hasUpcomingSubtask = t.subtasks?.some(st =>
        !!st.due && !this.dueDateMatchesDay(st.due, today) && !this.isOverdue(st)
      ) ?? false;
      return taskUpcoming || hasUpcomingSubtask;
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

  toggleDatePicker(event?: Event, context: 'new' | 'details' | 'new-start' = 'new') {
    this.datePickerContext.set(context);
    this.showDatePicker.update(v => {
      if (!v) {
        setTimeout(() => {
          const target = event?.target as HTMLElement;
          const button = (target?.closest('.task-action-chip') || target?.closest('.task-modal-control-btn') || target?.closest('.td-prop-btn')) as HTMLElement;
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

  private buildDateString(date: Date, timeStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Tomorrow, ${timeStr}`;
    if (diffDays === -1) return `Yesterday, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeStr}`;
  }

  selectDate(day: number, isCurrentMonth: boolean) {
    if (!isCurrentMonth) return;
    const selectedDate = new Date(this.datePickerDate());
    selectedDate.setDate(day);
    const ctx = this.datePickerContext();
    if (ctx === 'new-start') {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      this.newTaskStartDate.set(`${y}-${m}-${d}`);
    } else {
      const isDetails = ctx === 'details';
      const timeStr = isDetails ? this.editedTaskDueTime() : this.newTaskDueTime();
      const dateString = this.buildDateString(selectedDate, timeStr);
      if (isDetails) {
        this.editedTaskDue.set(dateString);
      } else {
        this.newTaskDue.set(dateString);
      }
    }
    this.showDatePicker.set(false);
    this.datePickerPosition.set(null);
  }

  selectQuickDate(option: 'today' | 'tomorrow' | 'next-week') {
    const date = new Date();
    if (option === 'tomorrow') date.setDate(date.getDate() + 1);
    if (option === 'next-week') date.setDate(date.getDate() + (8 - date.getDay()));
    const ctx = this.datePickerContext();
    if (ctx === 'new-start') {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      this.newTaskStartDate.set(`${y}-${m}-${d}`);
    } else {
      const isDetails = ctx === 'details';
      const timeStr = isDetails ? this.editedTaskDueTime() : this.newTaskDueTime();
      const dateString = this.buildDateString(date, timeStr);
      if (isDetails) {
        this.editedTaskDue.set(dateString);
      } else {
        this.newTaskDue.set(dateString);
      }
    }
    this.showDatePicker.set(false);
    this.datePickerPosition.set(null);
  }

  clearTaskDue() {
    const ctx = this.datePickerContext();
    if (ctx === 'details') {
      this.editedTaskDue.set(undefined);
    } else if (ctx === 'new-start') {
      this.newTaskStartDate.set('');
    } else {
      this.newTaskDue.set(undefined);
    }
    this.showDatePicker.set(false);
    this.datePickerPosition.set(null);
  }

  updateDetailsTime(time: string) {
    this.editedTaskDueTime.set(time);
    const currentDue = this.editedTaskDue();
    if (currentDue) {
      const dateMatch = currentDue.match(/^(.+?),\s*\d{1,2}:\d{2}$/);
      if (dateMatch) {
        this.editedTaskDue.set(`${dateMatch[1]}, ${time}`);
      } else {
        this.editedTaskDue.set(`${currentDue.split(',')[0]}, ${time}`);
      }
    }
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

  datePickerDays = computed(() => {
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

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false });
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;
      days.push({ day, isCurrentMonth: true, isToday });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false });
    }

    return days;
  });

  datePickerMonth = computed(() => {
    const date = this.datePickerDate();
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  });

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
        !target.closest('.task-modal-control-btn') &&
        !target.closest('.task-action-chip')) {
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

    // Close template dropdown if clicking outside
    if (this.newTaskTemplateOpen()) {
      if (!target.closest('.modal-header-actions')) {
        this.newTaskTemplateOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;

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

    // Cmd/Ctrl + Enter: Submit new task modal
    if (modKey && event.key === 'Enter' && this.newTaskModalOpen()) {
      event.preventDefault();
      this.confirmNewTask();
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
      if (this.showTaskDetails()) {
        this.closeTaskDetails();
      }
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
  jumpToToday() {
    this.currentDate.set(new Date());
    this.onMetricClick('today');
  }

  onMetricClick(metric: 'today' | 'completed' | 'active' | 'priority') {
    this.sidebarSearch.set('');
    this.selectedFolder.set('');
    this.selectedCalendarDay.set(null);

    if (metric === 'today') {
      this.selectedView.set('today');
      this.sidebarActiveId.set('today');
      this.metricFilter.set('none');
    } else if (metric === 'completed') {
      this.selectedView.set('completed');
      this.sidebarActiveId.set('completed');
      this.metricFilter.set('none');
    } else if (metric === 'active') {
      this.selectedView.set('inbox');
      this.sidebarActiveId.set('inbox');
      this.metricFilter.set('active');
    } else if (metric === 'priority') {
      this.selectedView.set('inbox');
      this.sidebarActiveId.set('inbox');
      this.metricFilter.set('priority');
    }
  }

  hasIncompleteSubtasks(task: Task): boolean {
    return !!task.subtasks?.length && task.subtasks.some(st => st.status !== 'COMPLETED');
  }

  toggleTaskStatus(task: Task) {
    if (task.status !== 'COMPLETED' && this.hasIncompleteSubtasks(task)) {
      this.showErrorState('Complete all sub-tasks before marking this task as done.');
      return;
    }
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
    if (this.hasIncompleteSubtasks(task)) {
      this.showErrorState('Complete all sub-tasks before marking this task as done.');
      return;
    }

    try {
      this.store.updateTask(task.id, { status: 'COMPLETED' });
    } catch (error) {
      this.store.updateTask(task.id, { status: task.status });
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
    if (!subtaskTitle.trim()) return;
    const newSubtask: Task = {
      id: crypto.randomUUID(),
      title: subtaskTitle.trim(),
      priority: 'MEDIUM',
      hours: '0.5H',
      status: 'ACTIVE',
      parentId: parentTask.id
    };

    const freshParent = this.store.tasks().find(t => t.id === parentTask.id) ?? parentTask;
    const updatedSubtasks = [...(freshParent.subtasks || []), newSubtask];
    this.store.updateTask(freshParent.id, { subtasks: updatedSubtasks });
    this.newSubtaskTitle.set('');
  }

  startEditSubtask(subtask: Task) {
    this.editingSubtaskId.set(subtask.id);
    this.editingSubtaskTitle.set(subtask.title);
  }

  saveEditSubtask(parentTask: Task, subtask: Task) {
    const newTitle = this.editingSubtaskTitle().trim();
    if (newTitle && newTitle !== subtask.title) {
      const fresh = this.store.tasks().find(t => t.id === parentTask.id) ?? parentTask;
      const updated = (fresh.subtasks ?? []).map(s =>
        s.id === subtask.id ? { ...s, title: newTitle } : s
      );
      this.store.updateTask(fresh.id, { subtasks: updated });
    }
    this.editingSubtaskId.set(null);
    this.editingSubtaskTitle.set('');
  }

  deleteSubtask(parentTask: Task, subtaskId: string) {
    const fresh = this.store.tasks().find(t => t.id === parentTask.id) ?? parentTask;
    const updated = (fresh.subtasks ?? []).filter(s => s.id !== subtaskId);
    this.store.updateTask(fresh.id, { subtasks: updated });
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
    this.selectedTaskId.set(task.id);
    this.editedTaskTitle.set(task.title);
    this.editedTaskDescription.set(task.description || task.notes || '');
    this.editedTaskPriority.set(task.priority);
    this.editedTaskDue.set(task.due);
    this.editedTaskList.set(task.project || 'Inbox');
    this.editedTaskLabels.set(task.labels || []);
    this.editedTaskReminders.set(task.reminders || []);
    this.editedTaskRecurring.set(!!task.recurring);
    const p = task.recurring?.pattern;
    this.editedTaskRecurringPattern.set((p === 'daily' || p === 'weekly' || p === 'monthly' || p === 'yearly') ? p : 'weekly');
    this.editingTaskDetails.set(false);
    this.detailsShowAdvanced.set(true);
    this.newSubtaskTitle.set('');
    this.detailsLabelInput.set('');
    this.editedTaskDueTime.set('12:00');
    this.showDatePicker.set(false);
    this.showReminderPicker.set(false);
    this.datePickerPosition.set(null);
    this.showTaskDetails.set(true);
  }

  closeTaskDetails() {
    this.showTaskDetails.set(false);
    this.selectedTaskId.set(null);
    this.editingTaskDetails.set(false);
    this.detailsShowAdvanced.set(false);
    this.detailsLabelInput.set('');
    this.editedTaskReminders.set([]);
    this.editedTaskRecurring.set(false);
    this.editedTaskRecurringPattern.set('weekly');
    this.showDatePicker.set(false);
    this.showReminderPicker.set(false);
    this.datePickerPosition.set(null);
    this.showDetailsAi.set(false);
    this.detailsAiMessages.set([]);
    this.detailsAiInput.set('');
    this.editingSubtaskId.set(null);
    this.editingSubtaskTitle.set('');
  }

  toggleEditTaskDetails() {
    this.editingTaskDetails.update(v => !v);
  }

  readonly TASK_TEMPLATES = [
    {
      id: 'bug-report',
      label: 'Bug Report',
      icon: 'bug_report',
      priority: 'HIGH' as Task['priority'],
      labels: ['bug'],
      subtitles: ['Reproduce the issue', 'Fix root cause', 'Write regression test', 'Verify fix'],
    },
    {
      id: 'meeting-action',
      label: 'Meeting Action',
      icon: 'groups',
      priority: 'MEDIUM' as Task['priority'],
      labels: ['meeting'],
      subtitles: ['Prepare agenda', 'Send invites', 'Follow up on action items'],
    },
    {
      id: 'research',
      label: 'Research Task',
      icon: 'science',
      priority: 'LOW' as Task['priority'],
      labels: ['research'],
      subtitles: ['Gather sources', 'Summarize findings', 'Present results'],
    },
  ];

  readonly REMINDER_PRESETS = [
    { label: 'On due date', value: 'On due date' },
    { label: '30 min before', value: '30 min before' },
    { label: '1 hour before', value: '1 hour before' },
    { label: '3 hours before', value: '3 hours before' },
    { label: '1 day before', value: '1 day before' },
  ];

  addDetailsReminder(value: string) {
    if (!value || this.editedTaskReminders().includes(value)) return;
    this.editedTaskReminders.update(r => [...r, value]);
    this.showReminderPicker.set(false);
  }

  removeDetailsReminder(value: string) {
    this.editedTaskReminders.update(r => r.filter(x => x !== value));
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
      labels: this.editedTaskLabels().length > 0 ? this.editedTaskLabels() : undefined,
      reminders: this.editedTaskReminders().length > 0 ? this.editedTaskReminders() : undefined,
      recurring: this.editedTaskRecurring() ? {
        pattern: this.editedTaskRecurringPattern(),
        interval: 1,
        nextDue: this.calculateNextDue(this.editedTaskDue(), this.editedTaskRecurringPattern(), 1)
      } : undefined
    };

    if (task.parentId) {
      // Subtask: update via parent's subtasks array
      const parent = this.store.tasks().find(t => t.id === task.parentId);
      if (parent) {
        const updatedSubtasks = (parent.subtasks || []).map(st =>
          st.id === task.id ? { ...st, ...updates } : st
        );
        this.store.updateTask(parent.id, { subtasks: updatedSubtasks });
      }
    } else {
      this.store.updateTask(task.id, updates);
    }
    this.closeTaskDetails();
  }

  deleteTaskFromDetails() {
    const task = this.selectedTaskForDetails();
    if (!task) return;
    if (task.parentId) {
      // Subtask: remove from parent's subtasks array
      const parent = this.store.tasks().find(t => t.id === task.parentId);
      if (parent) {
        const updatedSubtasks = (parent.subtasks || []).filter(st => st.id !== task.id);
        this.store.updateTask(parent.id, { subtasks: updatedSubtasks });
      }
      this.closeTaskDetails();
    } else {
      this.closeTaskDetails();
      this.requestDeleteTask(task);
    }
  }

  completeTaskFromDetails() {
    const task = this.selectedTaskForDetails();
    if (!task) return;
    if (task.parentId) {
      // Subtask opened directly — must update via parent's subtasks array
      const parent = this.store.tasks().find(t => t.id === task.parentId);
      if (parent) this.toggleSubtaskStatus(parent, task);
    } else {
      this.toggleTaskStatus(task);
    }
  }

  startPomodoroFromDetails() {
    const task = this.selectedTaskForDetails();
    if (task) {
      this.startPomodoro(task);
    }
  }

  addLabelToEdit(event?: Event) {
    event?.preventDefault();
    const label = this.detailsLabelInput().trim();
    if (label && !this.editedTaskLabels().includes(label)) {
      this.editedTaskLabels.set([...this.editedTaskLabels(), label]);
    }
    this.detailsLabelInput.set('');
  }

  removeLabelFromEdit(label: string) {
    this.editedTaskLabels.set(this.editedTaskLabels().filter(l => l !== label));
  }

  toggleSubtaskStatus(parentTask: Task, subtask: Task) {
    // Always get the freshest parent from the store to avoid stale snapshot issues
    const freshParent = this.store.tasks().find(t => t.id === parentTask.id) ?? parentTask;
    const newStatus: Task['status'] = subtask.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    const updatedSubtasks = (freshParent.subtasks || []).map(st =>
      st.id === subtask.id ? { ...st, status: newStatus } : st
    );
    this.store.updateTask(freshParent.id, { subtasks: updatedSubtasks });
    // selectedTaskForDetails is a computed from store.tasks, so it auto-updates
  }

  /** Toggle a subtask's status when shown as a standalone calendar list item (looks up parent by parentId). */
  toggleCalendarSubtaskStatus(subtask: Task, event: Event) {
    event.stopPropagation();
    const parent = this.store.tasks().find(t => t.id === subtask.parentId);
    if (!parent) return;
    this.toggleSubtaskStatus(parent, subtask);
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
    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
      this.pomodoroInterval = null;
    }
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
      id: crypto.randomUUID(),
      recurring: {
        pattern,
        interval,
        nextDue: this.calculateNextDue(baseTask.due, pattern, interval)
      }
    };
    this.store.addTask(recurringTask);
  }

  onNewTaskTitleBlur() {
    const title = this.newTaskTitle().trim();
    if (!title || title.length < 5) return;
    const parsed = this.parseNaturalLanguage(title);
    if (parsed.title && parsed.title !== title) {
      this.newTaskTitle.set(parsed.title);
    }
    if (parsed.due && !this.newTaskDue()) {
      this.newTaskDue.set(parsed.due);
    }
    if (parsed.priority && this.newTaskPriority() === 'MEDIUM') {
      this.newTaskPriority.set(parsed.priority);
    }
    if (parsed.labels.length > 0) {
      const existing = new Set(this.newTaskLabels());
      const newLabels = parsed.labels.filter(l => !existing.has(l));
      if (newLabels.length > 0) {
        this.newTaskLabels.update(l => [...l, ...newLabels]);
      }
    }
  }

  applyTemplate(id: string) {
    const tpl = this.TASK_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    this.newTaskPriority.set(tpl.priority);
    this.newTaskLabels.set([...tpl.labels]);
    this.newTaskSubtasks.set(tpl.subtitles.map(s => ({ title: s, priority: 'MEDIUM' as Task['priority'] })));
    this.newTaskShowAdvanced.set(true);
    this.newTaskTemplateOpen.set(false);
  }

  private parseReminderOffsetMinutes(reminder: string): number {
    if (reminder === 'On due date') return 0;
    const match = reminder.match(/(\d+)\s*(min|hour|day)/i);
    if (!match) return 0;
    const n = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('min')) return n;
    if (unit.startsWith('hour')) return n * 60;
    if (unit.startsWith('day')) return n * 24 * 60;
    return 0;
  }

  scheduleRemindersForTask(task: Task) {
    if (!task.reminders?.length || !task.due) return;
    const dueDate = this.parseDateFromString(task.due);
    if (!dueDate) return;

    for (const reminder of task.reminders) {
      const offsetMs = this.parseReminderOffsetMinutes(reminder) * 60 * 1000;
      const fireAt = new Date(dueDate.getTime() - offsetMs);
      const delay = fireAt.getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          this.notificationService.info(
            `Reminder: ${task.title}`,
            `Due: ${task.due} — ${reminder}`
          );
        }, delay);
      }
    }
  }

  calculateNextDue(currentDue: string | undefined, pattern: string, interval: number): string {
    if (!currentDue) return '';
    // Base off the current due date if parseable; otherwise fall back to today
    const base = this.parseDateFromString(currentDue) ?? new Date();
    // If the base date is already in the past, advance from today instead
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    base.setHours(0, 0, 0, 0);
    const from = base < today ? today : base;
    const next = new Date(from);

    switch (pattern) {
      case 'daily':
        next.setDate(from.getDate() + interval);
        break;
      case 'weekly':
        next.setDate(from.getDate() + (7 * interval));
        break;
      case 'monthly':
        next.setMonth(from.getMonth() + interval);
        break;
      case 'yearly':
        next.setFullYear(from.getFullYear() + interval);
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

  /** Returns true if the task's due date is in the past (including the "Overdue" label or an actual past date string). */
  isOverdue(task: { due?: string; status?: string }): boolean {
    if (!task.due) return false;
    if (task.due.includes('Overdue')) return true;
    const parsed = this.parseDateFromString(task.due);
    if (!parsed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    return parsed < today;
  }

  /** Returns true if a task/subtask due string matches the given calendar date. Handles ISO (2026-05-18) and human-readable ("Mon, May 18") formats. */
  private dueDateMatchesDay(due: string | undefined, date: Date): boolean {
    if (!due) return false;
    const today = new Date();
    if (due.includes('Today') && date.toDateString() === today.toDateString()) return true;
    // ISO format: "2026-05-18"
    if (/^\d{4}-\d{2}-\d{2}/.test(due)) {
      const parsed = new Date(due + 'T00:00:00');
      return parsed.toDateString() === date.toDateString();
    }
    // Human-readable: "Mon, May 18"
    const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return due.includes(formatted);
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
    try {
      const libFiles = await Promise.all(
        files.map(f => this.fileStorage.upload(f, { type: 'task', id: taskId }))
      );
      const attachments = libFiles
        .filter((lf): lf is typeof lf & { publicUrl: string } => !!lf.publicUrl)
        .map(lf => ({
          id: lf.id,
          name: lf.name,
          url: lf.publicUrl,
          type: lf.mimeType,
          size: lf.size,
          uploadedAt: lf.uploadedAt,
        }));
      const task = this.store.tasks().find(t => t.id === taskId);
      if (task) {
        this.store.updateTask(taskId, {
          attachments: [...(task.attachments ?? []), ...attachments],
        });
      }
      this.filesToUpload.set([]);
    } catch (e) {
      this.notificationService.error('Upload failed', (e as Error).message ?? 'Could not upload files.');
    } finally {
      this.uploadingFiles.set(false);
    }
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
    let blocked = 0;
    selected.forEach(id => {
      const task = this.store.tasks().find(t => t.id === id);
      if (task && task.status !== 'COMPLETED') {
        if (this.hasIncompleteSubtasks(task)) {
          blocked++;
        } else {
          this.store.updateTask(id, { status: 'COMPLETED' });
        }
      }
    });
    if (blocked > 0) {
      this.showErrorState(`${blocked} task${blocked > 1 ? 's' : ''} skipped — complete their sub-tasks first.`);
    }
    this.clearSelection();
  }

  bulkDeleteTasks() {
    this.bulkDeleteModalOpen.set(true);
  }

  confirmBulkDelete() {
    const selected = this.selectedTasks();
    selected.forEach(id => this.store.deleteTask(id));
    this.bulkDeleteModalOpen.set(false);
    this.clearSelection();
  }

  cancelBulkDelete() {
    this.bulkDeleteModalOpen.set(false);
  }

  bulkChangePriority(priority: Task['priority']) {
    const selected = this.selectedTasks();
    selected.forEach(id => {
      const task = this.store.tasks().find(t => t.id === id);
      if (task) {
        this.store.updateTask(id, { priority });
      }
    });
    this.clearSelection();
  }


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

  getAvailableDependencyTasks(excludeId?: string): Task[] {
    return this.store.tasks().filter(t =>
      t.status !== 'COMPLETED' &&
      (!excludeId || t.id !== excludeId)
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

  // ── AI Assistant ─────────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  // Task Details inline AI
  showDetailsAi       = signal(false);
  detailsAiLoading    = signal(false);
  detailsAiMessages   = signal<AiPanelMessage[]>([]);
  detailsAiInput      = signal('');

  readonly detailsAiSuggestions = [
    'Break into subtasks',
    'Improve the description',
    'Estimate time needed',
    'Suggest labels',
    'What should I do next?',
  ];

  readonly aiSuggestions = [
    'What tasks are overdue?',
    'Show high priority tasks',
    'How many tasks do I have today?',
    'Which tasks are completed?',
    'What are my upcoming deadlines?',
  ];

  toggleAssistant() { this.showAssistant.update(v => !v); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    try {
      const tasks = this.store.tasks();
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const taskList = tasks.map(t => {
        const overdue = t.due && t.status !== 'COMPLETED' && new Date(t.due) < today;
        return `- [${t.status}] ${t.title} | priority: ${t.priority}${t.due ? ` | due: ${t.due}${overdue ? ' (OVERDUE)' : ''}` : ''}${t.project ? ` | project: ${t.project}` : ''}${t.labels?.length ? ` | labels: ${t.labels.join(', ')}` : ''}`;
      }).join('\n');
      const active = tasks.filter(t => t.status !== 'COMPLETED').length;
      const completed = tasks.filter(t => t.status === 'COMPLETED').length;
      const overdue = tasks.filter(t => t.due && t.status !== 'COMPLETED' && new Date(t.due) < today).length;
      const context = [
        'You are a task management assistant for the Envello productivity app.',
        `Today is ${todayStr}.`,
        `The user has ${tasks.length} total tasks: ${active} active, ${completed} completed, ${overdue} overdue.`,
        tasks.length ? `Task list:\n${taskList}` : 'No tasks yet.',
        'Answer concisely. Use markdown for lists. You can help prioritize, identify blockers, suggest next actions, or summarize workload.',
      ].join('\n');
      const response = await this.aiService.sendMessage(text, context);
      this.aiMessages.update(m => [...m, { role: 'assistant', text: response || 'No response — check your AI configuration in Settings.' }]);
    } catch {
      this.aiMessages.update(m => [...m, { role: 'assistant', text: 'Something went wrong. Check your AI configuration in Settings.' }]);
    } finally {
      this.aiLoading.set(false);
    }
  }

  clearAiChat() { this.aiMessages.set([]); }

  async sendDetailsAiMessage(text: string) {
    const task = this.selectedTaskForDetails();
    if (!text.trim() || this.detailsAiLoading() || !task) return;
    this.detailsAiMessages.update(m => [...m, { role: 'user', text }]);
    this.detailsAiLoading.set(true);
    this.detailsAiInput.set('');
    try {
      const subtaskList = (task.subtasks ?? []).map(s => `  - [${s.status}] ${s.title}`).join('\n');
      const context = [
        'You are a task assistant for the Envello productivity app. Help the user manage this specific task.',
        `Task: "${task.title}"`,
        `Priority: ${task.priority} | Status: ${task.status}${task.due ? ` | Due: ${task.due}` : ''}${task.project ? ` | Project: ${task.project}` : ''}`,
        task.description ? `Description: ${task.description}` : 'No description yet.',
        task.subtasks?.length ? `Subtasks:\n${subtaskList}` : 'No subtasks.',
        task.notes ? `Notes: ${task.notes}` : '',
        'You can break the task into subtasks, improve the description, estimate time, suggest labels, or advise what to do next. Be concise and actionable. Use markdown lists.',
      ].filter(Boolean).join('\n');
      const response = await this.aiService.sendMessage(text, context);
      this.detailsAiMessages.update(m => [...m, { role: 'assistant', text: response || 'No response — check your AI configuration in Settings.' }]);
    } catch {
      this.detailsAiMessages.update(m => [...m, { role: 'assistant', text: 'Something went wrong. Check your AI configuration in Settings.' }]);
    } finally {
      this.detailsAiLoading.set(false);
    }
  }

  clearDetailsAiChat() { this.detailsAiMessages.set([]); }
}
