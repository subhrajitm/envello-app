import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MeetingsService,
  Meeting,
  Attendee,
  AgendaItem,
  ActionItem,
  MeetingNote,
  MEETING_COLORS,
  MeetingViewFilter,
  MeetingViewMode,
  CalendarSyncService,
  CalendarConnection,
  PROVIDER_META,
  TauriService,
} from '@envello/core';
import { ButtonComponent, IconButtonComponent, EmptyStateComponent, ModalComponent } from '@envello/ui';

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconButtonComponent, EmptyStateComponent, ModalComponent],
  templateUrl: './meetings.component.html',
  styleUrl: './meetings.component.css'
})
export class MeetingsComponent {
  meetingsService = inject(MeetingsService);
  private tauriService = inject(TauriService);
  
  // View state
  viewMode = signal<MeetingViewMode>('list');
  viewFilter = signal<MeetingViewFilter>('all');
  
  // Filters
  selectedProject = signal('');
  selectedTimeRange = signal('All Time');
  sortBy = signal<'date' | 'title' | 'attendees'>('date');
  sortDirection = signal<'asc' | 'desc'>('asc');
  searchQuery = signal('');
  
  // Calendar view state
  calendarDate = signal<Date>(new Date());
  calendarView = signal<'month' | 'week'>('month');
  
  // Create meeting modal
  showCreateModal = signal(false);
  newMeeting = signal<Partial<Meeting>>({
    title: '',
    description: '',
    project: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    meetingType: 'video',
    platform: 'zoom',
    meetingLink: '',
    location: '',
    attendees: [],
    agenda: [],
    priority: 'MEDIUM',
    color: MEETING_COLORS[0],
    labels: [],
    reminders: [{ time: 15, type: 'notification', sent: false }],
  });
  newAttendeeInput = signal('');
  newAgendaInput = signal('');
  newLabelInput = signal('');
  showRecurringOptions = signal(false);
  recurringPattern = signal<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  recurringCount = signal(4);
  
  // Meeting details modal
  showDetailsModal = signal(false);
  selectedMeeting = signal<Meeting | null>(null);
  editingMeeting = signal(false);
  editedMeeting = signal<Partial<Meeting>>({});
  
  // Details tabs
  detailsTab = signal<'overview' | 'agenda' | 'notes' | 'action-items'>('overview');
  
  // Action items
  newActionItemInput = signal('');
  newActionItemAssignee = signal('');
  newActionItemPriority = signal<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  
  // Notes
  newNoteInput = signal('');
  
  // Agenda editing
  newAgendaItemTitle = signal('');
  newAgendaItemDuration = signal(15);
  newAgendaItemPresenter = signal('');
  editingAgendaItem = signal<string | null>(null);
  
  // Attendee editing
  showAddAttendee = signal(false);
  newAttendeeName = signal('');
  newAttendeeEmail = signal('');
  newAttendeeRole = signal<'required' | 'optional'>('required');
  
  // Date picker
  showDatePicker = signal(false);
  datePickerDate = signal<Date>(new Date());
  
  // Quick actions dropdown
  showQuickActions = signal<string | null>(null);
  
  // Keyboard shortcuts help
  showShortcutsHelp = signal(false);

  // Calendar sync modal
  syncService = inject(CalendarSyncService);
  readonly providerMeta = PROVIDER_META;
  showSyncModal = signal(false);
  syncActiveProvider = signal<CalendarConnection['provider']>('google');
  syncNewName = signal('');
  syncNewUrl = signal('');
  syncAddError = signal('');
  readonly syncProviders: CalendarConnection['provider'][] = ['google', 'outlook', 'apple', 'teams', 'zoom', 'custom'];

  // Available colors for meetings
  meetingColors = MEETING_COLORS;
  
  // Computed values
  filteredMeetings = computed(() => {
    let meetings = [...this.meetingsService.meetings()];
    
    // Apply view filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (this.viewFilter()) {
      case 'today':
        meetings = meetings.filter(m => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate.getTime() === today.getTime() && m.status !== 'cancelled';
        });
        break;
      case 'upcoming':
        meetings = meetings.filter(m => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate.getTime() >= today.getTime() && m.status !== 'cancelled' && m.status !== 'completed';
        });
        break;
      case 'past':
        meetings = meetings.filter(m => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate.getTime() < today.getTime() || m.status === 'completed';
        });
        break;
      case 'cancelled':
        meetings = meetings.filter(m => m.status === 'cancelled');
        break;
    }
    
    // Apply project filter
    const proj = this.selectedProject();
    if (proj) {
      meetings = meetings.filter(m =>
        proj === 'No project' ? !m.project : m.project === proj
      );
    }
    
    // Apply time range filter (All Time | 7d | 30d | Quarter)
    const range = this.selectedTimeRange();
    if (range && range !== 'All Time') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let days = 0;
      if (range === '7d') days = 7;
      else if (range === '30d') days = 30;
      else if (range === 'Quarter') days = 90;
      if (days > 0) {
        const min = new Date(today);
        min.setDate(min.getDate() - days);
        const max = new Date(today);
        max.setDate(max.getDate() + days);
        meetings = meetings.filter(m => {
          const d = new Date(m.date);
          d.setHours(0, 0, 0, 0);
          return d >= min && d <= max;
        });
      }
    }
    
    // Apply search
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      meetings = meetings.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.project?.toLowerCase().includes(query) ||
        m.attendees.some(a => a.name.toLowerCase().includes(query)) ||
        (m.labels ?? []).some(l => l.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    meetings.sort((a, b) => {
      let comparison = 0;
      switch (this.sortBy()) {
        case 'date':
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'attendees':
          comparison = b.attendees.length - a.attendees.length;
          break;
      }
      return this.sortDirection() === 'asc' ? comparison : -comparison;
    });
    
    return meetings;
  });
  
  // Calendar data
  calendarWeeks = computed(() => {
    const date = this.calendarDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Fill in days from previous month
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      currentWeek.push(prevDate);
    }
    
    // Fill in days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Fill in days from next month
    if (currentWeek.length > 0) {
      let nextDay = 1;
      while (currentWeek.length < 7) {
        currentWeek.push(new Date(year, month + 1, nextDay++));
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  });
  
  // Get meetings for a specific date (for calendar view)
  getMeetingsForDate(date: Date): Meeting[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.meetingsService.meetings().filter(m => 
      m.date === dateStr && m.status !== 'cancelled'
    );
  }
  
  // Get unique projects
  availableProjects = computed(() => {
    const projects = new Set<string>();
    this.meetingsService.meetings().forEach(m => {
      if (m.project) projects.add(m.project);
    });
    return Array.from(projects).sort();
  });
  
  // Upcoming syncs
  upcomingSyncs = computed(() => {
    const now = new Date();
    return this.meetingsService.meetings()
      .filter(m => {
        const meetingDateTime = new Date(`${m.date}T${m.startTime}`);
        return meetingDateTime >= now && m.status === 'scheduled';
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  });
  
  // Stats
  stats = computed(() => {
    const all = this.meetingsService.meetings();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const todayMeetings = all.filter(m => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime() && m.status !== 'cancelled';
    });
    
    const thisWeekMeetings = all.filter(m => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d < weekEnd && m.status !== 'cancelled';
    });
    
    const totalActionItems = all.reduce((sum, m) => sum + (m.actionItems?.length ?? 0), 0);
    const openActionItems = all.reduce((sum, m) => 
      sum + (m.actionItems?.filter(a => a.status !== 'completed').length ?? 0), 0
    );
    const actionItemsPct = totalActionItems > 0 
      ? Math.round(((totalActionItems - openActionItems) / totalActionItems) * 100) 
      : 0;
    
    return {
      todayCount: todayMeetings.length,
      thisWeekCount: thisWeekMeetings.length,
      totalActionItems,
      openActionItems,
      actionItemsPct,
      avgVelocity: '2.4k',
      deadlines: 2,
      totalScheduled: all.filter(m => m.status === 'scheduled').length,
      totalCompleted: all.filter(m => m.status === 'completed').length,
    };
  });
  
  /** Meetings grouped by project for sidebar */
  meetingsByProject = computed(() => {
    const map = new Map<string, number>();
    for (const m of this.meetingsService.meetings()) {
      if (m.status === 'cancelled') continue;
      const key = m.project || 'No project';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  });

  /** Whether any meetings have no project (for filter dropdown) */
  hasNoProject = computed(() => this.meetingsByProject().some((p) => p[0] === 'No project'));
  
  // Meetings by status for kanban
  meetingsByStatus = computed(() => {
    const meetings = this.filteredMeetings();
    return {
      scheduled: meetings.filter(m => m.status === 'scheduled'),
      in_progress: meetings.filter(m => m.status === 'in_progress'),
      completed: meetings.filter(m => m.status === 'completed'),
      cancelled: meetings.filter(m => m.status === 'cancelled'),
    };
  });
  
  
  /** All of today's non-cancelled meetings sorted by start time */
  todayMeetings = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.meetingsService.meetings()
      .filter(m => m.date === today && m.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  /** Next scheduled meeting from now */
  nextMeeting = computed((): Meeting | null => {
    const now = new Date();
    return this.meetingsService.meetings()
      .filter(m => new Date(`${m.date}T${m.startTime}`) >= now && m.status === 'scheduled')
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())[0] ?? null;
  });

  /** Count per meeting type for breakdown */
  meetingTypeBreakdown = computed(() => {
    const meetings = this.meetingsService.meetings().filter(m => m.status !== 'cancelled');
    const total = meetings.length;
    if (!total) return [];
    const counts = new Map<string, number>();
    for (const m of meetings) counts.set(m.meetingType, (counts.get(m.meetingType) ?? 0) + 1);
    const labels: Record<string, string> = { video: 'Video', phone: 'Phone', 'in-person': 'In-Person', hybrid: 'Hybrid' };
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, label: labels[type] ?? type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  timeUntilMeeting(meeting: Meeting): string {
    const diffMs = new Date(`${meeting.date}T${meeting.startTime}`).getTime() - Date.now();
    if (diffMs <= 0) return 'Now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `in ${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }

  isMeetingPast(meeting: Meeting): boolean {
    const end = meeting.endTime ?? meeting.startTime;
    return new Date(`${meeting.date}T${end}`) < new Date() || meeting.status === 'completed';
  }

  // Keyboard shortcuts
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showQuickActions()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.row-actions')) this.showQuickActions.set(null);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    // Escape to close modals, shortcuts help, or quick dropdown
    if (event.key === 'Escape') {
      if (this.showCreateModal()) {
        this.closeCreateModal();
        event.preventDefault();
      } else if (this.showDetailsModal()) {
        this.closeDetailsModal();
        event.preventDefault();
      } else if (this.showShortcutsHelp()) {
        this.showShortcutsHelp.set(false);
        event.preventDefault();
      } else if (this.showQuickActions()) {
        this.showQuickActions.set(null);
        event.preventDefault();
      }
      return;
    }
    
    // Don't handle shortcuts if input is focused
    if (isInputFocused) return;
    
    // Cmd/Ctrl + N: New meeting
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      this.openCreateModal();
      event.preventDefault();
      return;
    }
    
    // Cmd/Ctrl + K: Quick search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) searchInput.focus();
      event.preventDefault();
      return;
    }
    
    // Cmd/Ctrl + /: Show shortcuts
    if ((event.metaKey || event.ctrlKey) && event.key === '/') {
      this.showShortcutsHelp.set(true);
      event.preventDefault();
      return;
    }
    
    // 1-4: Switch view filters
    if (event.key === '1') this.viewFilter.set('all');
    if (event.key === '2') this.viewFilter.set('today');
    if (event.key === '3') this.viewFilter.set('upcoming');
    if (event.key === '4') this.viewFilter.set('past');
    
    // V: Cycle view modes
    if (event.key === 'v') {
      const modes: MeetingViewMode[] = ['list', 'calendar', 'kanban'];
      const currentIndex = modes.indexOf(this.viewMode());
      this.viewMode.set(modes[(currentIndex + 1) % modes.length]);
    }
  }
  
  // Modal methods
  openCreateModal() {
    this.newMeeting.set({
      title: '',
      description: '',
      project: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      meetingType: 'video',
      platform: 'zoom',
      meetingLink: '',
      location: '',
      attendees: [],
      agenda: [],
      priority: 'MEDIUM',
      color: MEETING_COLORS[0],
      labels: [],
      reminders: [{ time: 15, type: 'notification', sent: false }],
    });
    this.showCreateModal.set(true);
  }
  
  closeCreateModal() {
    this.showCreateModal.set(false);
    this.showRecurringOptions.set(false);
  }

  openShortcutsHelp() { this.showShortcutsHelp.set(true); }
  closeShortcutsHelp() { this.showShortcutsHelp.set(false); }
  
  createMeeting() {
    const meeting = this.newMeeting();
    if (!meeting.title?.trim()) return;
    
    // Calculate duration if not set
    if (meeting.startTime && meeting.endTime) {
      const [startH, startM] = meeting.startTime.split(':').map(Number);
      const [endH, endM] = meeting.endTime.split(':').map(Number);
      meeting.duration = (endH * 60 + endM) - (startH * 60 + startM);
    }
    
    if (this.showRecurringOptions()) {
      // Create recurring series
      const baseMeeting = {
        ...meeting,
        recurring: {
          pattern: this.recurringPattern(),
          interval: 1,
        },
      } as Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>;
      
      this.meetingsService.createRecurringSeries(
        baseMeeting,
        this.recurringCount()
      );
    } else {
      this.meetingsService.addMeeting(meeting as Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>);
    }
    
    this.closeCreateModal();
  }
  
  openDetailsModal(meeting: Meeting) {
    this.selectedMeeting.set(meeting);
    this.editedMeeting.set({ ...meeting });
    this.editingMeeting.set(false);
    this.detailsTab.set('overview');
    this.showDetailsModal.set(true);
  }
  
  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedMeeting.set(null);
    this.editingMeeting.set(false);
  }
  
  startEditing() {
    const meeting = this.selectedMeeting();
    if (meeting) {
      this.editedMeeting.set({ ...meeting });
      this.editingMeeting.set(true);
    }
  }
  
  saveEditing() {
    const meeting = this.selectedMeeting();
    const edited = this.editedMeeting();
    if (meeting && edited) {
      this.meetingsService.updateMeeting(meeting.id, edited);
      this.selectedMeeting.set({ ...meeting, ...edited } as Meeting);
      this.editingMeeting.set(false);
    }
  }
  
  cancelEditing() {
    const meeting = this.selectedMeeting();
    if (meeting) {
      this.editedMeeting.set({ ...meeting });
    }
    this.editingMeeting.set(false);
  }
  
  // Meeting actions
  deleteMeeting(meeting: Meeting) {
    if (confirm('Are you sure you want to delete this meeting?')) {
      this.meetingsService.deleteMeeting(meeting.id);
      this.closeDetailsModal();
    }
  }
  
  cancelMeeting(meeting: Meeting) {
    this.meetingsService.cancelMeeting(meeting.id);
    this.selectedMeeting.set({ ...meeting, status: 'cancelled' });
  }
  
  completeMeeting(meeting: Meeting) {
    this.meetingsService.completeMeeting(meeting.id);
    this.selectedMeeting.set({ ...meeting, status: 'completed' });
  }
  
  duplicateMeeting(meeting: Meeting) {
    const duplicated = this.meetingsService.duplicateMeeting(meeting.id);
    if (duplicated) {
      this.closeDetailsModal();
      this.openDetailsModal(duplicated);
    }
  }
  
  // Attendee methods
  addAttendeeToNew() {
    const input = this.newAttendeeInput().trim();
    if (!input) return;
    
    const newAttendee: Attendee = {
      id: Date.now().toString(),
      name: input,
      role: 'required',
      status: 'pending',
    };
    
    const current = this.newMeeting();
    this.newMeeting.set({
      ...current,
      attendees: [...(current.attendees ?? []), newAttendee],
    });
    this.newAttendeeInput.set('');
  }
  
  removeAttendeeFromNew(attendeeId: string) {
    const current = this.newMeeting();
    this.newMeeting.set({
      ...current,
      attendees: current.attendees?.filter(a => a.id !== attendeeId) ?? [],
    });
  }
  
  addAttendeeToMeeting() {
    const meeting = this.selectedMeeting();
    if (!meeting || !this.newAttendeeName().trim()) return;
    
    this.meetingsService.addAttendee(meeting.id, {
      name: this.newAttendeeName().trim(),
      email: this.newAttendeeEmail().trim() || undefined,
      role: this.newAttendeeRole(),
      status: 'pending',
    });
    
    // Refresh selected meeting
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
    
    this.newAttendeeName.set('');
    this.newAttendeeEmail.set('');
    this.showAddAttendee.set(false);
  }
  
  removeAttendee(attendeeId: string) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    this.meetingsService.removeAttendee(meeting.id, attendeeId);
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
  }
  
  // Agenda methods
  addAgendaItemToNew() {
    const title = this.newAgendaInput().trim();
    if (!title) return;
    
    const newItem: AgendaItem = {
      id: Date.now().toString(),
      title,
      duration: 15,
      completed: false,
    };
    
    const current = this.newMeeting();
    this.newMeeting.set({
      ...current,
      agenda: [...(current.agenda ?? []), newItem],
    });
    this.newAgendaInput.set('');
  }
  
  removeAgendaItemFromNew(itemId: string) {
    const current = this.newMeeting();
    this.newMeeting.set({
      ...current,
      agenda: current.agenda?.filter(a => a.id !== itemId) ?? [],
    });
  }
  
  addAgendaItem() {
    const meeting = this.selectedMeeting();
    if (!meeting || !this.newAgendaItemTitle().trim()) return;
    
    this.meetingsService.addAgendaItem(meeting.id, {
      title: this.newAgendaItemTitle().trim(),
      duration: this.newAgendaItemDuration(),
      presenter: this.newAgendaItemPresenter().trim() || undefined,
      completed: false,
    });
    
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
    
    this.newAgendaItemTitle.set('');
    this.newAgendaItemDuration.set(15);
    this.newAgendaItemPresenter.set('');
  }
  
  toggleAgendaItem(itemId: string) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    const item = meeting.agenda?.find(a => a.id === itemId);
    if (item) {
      this.meetingsService.updateAgendaItem(meeting.id, itemId, { completed: !item.completed });
      const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
      if (updated) this.selectedMeeting.set(updated);
    }
  }
  
  deleteAgendaItem(itemId: string) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    this.meetingsService.deleteAgendaItem(meeting.id, itemId);
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
  }
  
  // Action items methods
  addActionItem() {
    const meeting = this.selectedMeeting();
    if (!meeting || !this.newActionItemInput().trim()) return;
    
    this.meetingsService.addActionItem(meeting.id, {
      title: this.newActionItemInput().trim(),
      assignee: this.newActionItemAssignee().trim() || undefined,
      status: 'open',
      priority: this.newActionItemPriority(),
    });
    
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
    
    this.newActionItemInput.set('');
    this.newActionItemAssignee.set('');
    this.newActionItemPriority.set('MEDIUM');
  }
  
  toggleActionItem(itemId: string) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    const item = meeting.actionItems?.find(a => a.id === itemId);
    if (item) {
      const newStatus = item.status === 'completed' ? 'open' : 'completed';
      this.meetingsService.updateActionItem(meeting.id, itemId, { status: newStatus });
      const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
      if (updated) this.selectedMeeting.set(updated);
    }
  }
  
  deleteActionItem(itemId: string) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    this.meetingsService.deleteActionItem(meeting.id, itemId);
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
  }
  
  convertToTask(actionItem: ActionItem) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    this.meetingsService.convertActionItemToTask(meeting.id, actionItem.id);
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
  }
  
  // Notes methods
  addNote() {
    const meeting = this.selectedMeeting();
    if (!meeting || !this.newNoteInput().trim()) return;
    
    this.meetingsService.addNote(meeting.id, this.newNoteInput().trim());
    
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
    
    this.newNoteInput.set('');
  }
  
  deleteNote(noteId: string) {
    const meeting = this.selectedMeeting();
    if (!meeting) return;
    
    this.meetingsService.deleteNote(meeting.id, noteId);
    const updated = this.meetingsService.meetings().find(m => m.id === meeting.id);
    if (updated) this.selectedMeeting.set(updated);
  }
  
  // Labels methods
  addLabelToNew() {
    const label = this.newLabelInput().trim().toLowerCase();
    if (!label) return;
    
    const current = this.newMeeting();
    if (!current.labels?.includes(label)) {
      this.newMeeting.set({
        ...current,
        labels: [...(current.labels ?? []), label],
      });
    }
    this.newLabelInput.set('');
  }
  
  removeLabelFromNew(label: string) {
    const current = this.newMeeting();
    this.newMeeting.set({
      ...current,
      labels: current.labels?.filter(l => l !== label) ?? [],
    });
  }
  
  // Calendar methods
  previousMonth() {
    const current = this.calendarDate();
    this.calendarDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }
  
  nextMonth() {
    const current = this.calendarDate();
    this.calendarDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }
  
  goToToday() {
    this.calendarDate.set(new Date());
  }
  
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
  
  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.calendarDate().getMonth();
  }
  
  selectCalendarDate(date: Date) {
    // If in create modal, set the date
    if (this.showDatePicker()) {
      const current = this.newMeeting();
      this.newMeeting.set({
        ...current,
        date: date.toISOString().split('T')[0],
      });
      this.showDatePicker.set(false);
    }
  }
  
  // Utility methods
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  formatFullDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  getRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
    
    return this.formatDate(dateStr);
  }
  
  getMeetingTypeIcon(type: string): string {
    switch (type) {
      case 'video': return 'videocam';
      case 'phone': return 'phone';
      case 'in-person': return 'meeting_room';
      case 'hybrid': return 'groups';
      default: return 'event';
    }
  }
  
  getPlatformIcon(platform?: string): string {
    switch (platform) {
      case 'zoom': return 'video_call';
      case 'teams': return 'video_camera_front';
      case 'meet': return 'duo';
      case 'discord': return 'headphones';
      default: return 'link';
    }
  }
  
  getStatusColor(status: string): string {
    switch (status) {
      case 'scheduled': return '#3B82F6';
      case 'in_progress': return '#F97316';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'rescheduled': return '#8B5CF6';
      default: return '#6B7280';
    }
  }
  
  getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'HIGH': return '#EF4444';
      case 'MEDIUM': return '#F97316';
      case 'LOW': return '#10B981';
      default: return '#6B7280';
    }
  }
  
  getOpenActionItemsCount(meeting: Meeting): number {
    return meeting.actionItems?.filter(a => a.status !== 'completed').length ?? 0;
  }
  
  getCompletedActionItemsCount(meeting: Meeting): number {
    return meeting.actionItems?.filter(a => a.status === 'completed').length ?? 0;
  }
  
  getActionItemsProgress(meeting: Meeting): number {
    const total = meeting.actionItems?.length ?? 0;
    if (total === 0) return 0;
    const completed = this.getCompletedActionItemsCount(meeting);
    return Math.round((completed / total) * 100);
  }
  
  // Quick actions
  toggleQuickActions(meetingId: string, event: Event) {
    event.stopPropagation();
    if (this.showQuickActions() === meetingId) {
      this.showQuickActions.set(null);
    } else {
      this.showQuickActions.set(meetingId);
    }
  }
  
  joinMeeting(meeting: Meeting, event?: Event) {
    if (event) event.stopPropagation();
    if (meeting.meetingLink) {
      this.tauriService.openUrl(meeting.meetingLink).catch(() => {});
    }
    this.showQuickActions.set(null);
  }
  
  // Update new meeting field
  updateNewMeetingField(field: keyof Meeting, value: any) {
    const current = this.newMeeting();
    this.newMeeting.set({ ...current, [field]: value });
  }
  
  // Update edited meeting field
  updateEditedMeetingField(field: keyof Meeting, value: any) {
    const current = this.editedMeeting();
    this.editedMeeting.set({ ...current, [field]: value });
  }
  
  // Track by functions
  trackByMeetingId(index: number, meeting: Meeting): string {
    return meeting.id;
  }
  
  trackByAttendeeId(index: number, attendee: Attendee): string {
    return attendee.id;
  }
  
  trackByAgendaId(index: number, item: AgendaItem): string {
    return item.id;
  }
  
  trackByActionId(index: number, item: ActionItem): string {
    return item.id;
  }
  
  trackByNoteId(index: number, note: MeetingNote): string {
    return note.id;
  }

  // ─── Calendar Sync ───────────────────────────────────────────────

  openSyncModal() { this.showSyncModal.set(true); this.syncAddError.set(''); }
  closeSyncModal() { this.showSyncModal.set(false); }

  async addCalendarConnection() {
    const name = this.syncNewName().trim();
    const url = this.syncNewUrl().trim();
    if (!name) { this.syncAddError.set('Please enter a calendar name.'); return; }
    if (!url) { this.syncAddError.set('Please enter an ICS URL.'); return; }
    if (!url.startsWith('http')) { this.syncAddError.set('URL must start with http:// or https://'); return; }

    this.syncAddError.set('');
    const conn = this.syncService.addConnection({
      provider: this.syncActiveProvider(),
      name,
      icsUrl: url,
      enabled: true,
    });
    this.syncNewName.set('');
    this.syncNewUrl.set('');
    await this.syncService.syncConnection(conn.id);
  }

  async syncAllCalendars() { await this.syncService.syncAll(); }

  trackByConnId(_: number, c: CalendarConnection) { return c.id; }
}
