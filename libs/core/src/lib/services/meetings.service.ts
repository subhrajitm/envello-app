import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, inject, signal, computed } from '@angular/core';
import { BinService } from './bin.service';
import { StoreService, Task } from './store.service';
import { DataService } from '@envello/data';

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: 'organizer' | 'required' | 'optional';
  status?: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface AgendaItem {
  id: string;
  title: string;
  duration?: number; // in minutes
  presenter?: string;
  completed?: boolean;
  notes?: string;
}

export interface MeetingNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed';
  linkedTaskId?: string; // Link to a task in StoreService
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  project?: string;

  // Date and time
  date: string; // ISO date string
  startTime: string; // e.g., "10:00"
  endTime?: string; // e.g., "11:00"
  duration?: number; // in minutes
  timezone?: string;

  // Location
  location?: string;
  meetingLink?: string;
  meetingType: 'video' | 'phone' | 'in-person' | 'hybrid';
  platform?: 'zoom' | 'teams' | 'meet' | 'discord' | 'other';

  // Attendees
  attendees: Attendee[];
  organizer?: Attendee;

  // Agenda and content
  agenda?: AgendaItem[];
  notes?: MeetingNote[];
  actionItems?: ActionItem[];

  // Status and categorization
  status:
    | 'scheduled'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'rescheduled';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
  labels?: string[];

  // Recurring meeting settings
  recurring?: {
    pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    endDate?: string;
    seriesId?: string;
    occurrenceNumber?: number;
  };

  // Reminders
  reminders?: Array<{
    time: number; // minutes before meeting
    type: 'notification' | 'email';
    sent?: boolean;
  }>;

  // Attachments
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Meeting colors for categorization
export const MEETING_COLORS = [
  '#E8D55A', // Yellow
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F97316', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export type MeetingViewFilter =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'past'
  | 'cancelled';
export type MeetingViewMode = 'list' | 'calendar' | 'kanban';
export type MeetingSortBy =
  | 'date'
  | 'title'
  | 'project'
  | 'priority'
  | 'attendees';

@Injectable({
  providedIn: 'root',
})
export class MeetingsService {
  private bin = inject(BinService);
  private store = inject(StoreService);
  private db = inject(DataService);

  meetings = signal<Meeting[]>([]);

  constructor() {
    this.loadFromDb();
  }

  private async loadFromDb(): Promise<void> {
    try {
      const list = await this.db.getAll<Meeting>('meetings');
      this.meetings.set(list);
    } catch (e) {
      logIfTauri('[MeetingsService] loadFromDb failed', e);
    }
  }

  private persistMeeting(m: Meeting): void {
    this.db
      .upsert('meetings', m)
      .catch((e) => logIfTauri('[MeetingsService] persist failed', e));
  }

  // UI state
  selectedMeetingId = signal<string | null>(null);
  viewFilter = signal<MeetingViewFilter>('all');
  viewMode = signal<MeetingViewMode>('list');
  sortBy = signal<MeetingSortBy>('date');
  sortDirection = signal<'asc' | 'desc'>('asc');
  searchQuery = signal<string>('');
  selectedProject = signal<string>('');
  selectedLabels = signal<string[]>([]);

  // Calendar state
  calendarDate = signal<Date>(new Date());

  // Computed values
  selectedMeeting = computed(() => {
    const id = this.selectedMeetingId();
    return id ? (this.meetings().find((m) => m.id === id) ?? null) : null;
  });

  // Get unique projects from meetings
  availableProjects = computed(() => {
    const projects = new Set<string>();
    this.meetings().forEach((m) => {
      if (m.project) projects.add(m.project);
    });
    return Array.from(projects).sort();
  });

  // Get unique labels from meetings
  availableLabels = computed(() => {
    const labels = new Set<string>();
    this.meetings().forEach((m) => {
      m.labels?.forEach((l) => labels.add(l));
    });
    return Array.from(labels).sort();
  });

  // Filtered and sorted meetings
  filteredMeetings = computed(() => {
    let result = [...this.meetings()];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply view filter
    const filter = this.viewFilter();
    switch (filter) {
      case 'today':
        result = result.filter((m) => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return (
            meetingDate.getTime() === today.getTime() &&
            m.status !== 'cancelled'
          );
        });
        break;
      case 'upcoming':
        result = result.filter((m) => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return (
            meetingDate.getTime() >= today.getTime() &&
            m.status !== 'cancelled' &&
            m.status !== 'completed'
          );
        });
        break;
      case 'past':
        result = result.filter((m) => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return (
            meetingDate.getTime() < today.getTime() || m.status === 'completed'
          );
        });
        break;
      case 'cancelled':
        result = result.filter((m) => m.status === 'cancelled');
        break;
    }

    // Apply project filter
    const project = this.selectedProject();
    if (project) {
      result = result.filter((m) => m.project === project);
    }

    // Apply labels filter
    const labels = this.selectedLabels();
    if (labels.length > 0) {
      result = result.filter((m) =>
        labels.some((label) => m.labels?.includes(label)),
      );
    }

    // Apply search
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          m.project?.toLowerCase().includes(query) ||
          m.attendees.some((a) => a.name.toLowerCase().includes(query)) ||
          m.labels?.some((l) => l.toLowerCase().includes(query)),
      );
    }

    // Apply sorting
    const sortField = this.sortBy();
    const direction = this.sortDirection();
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'project':
          comparison = (a.project ?? '').localeCompare(b.project ?? '');
          break;
        case 'priority':
          const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          comparison =
            (priorityOrder[a.priority ?? 'LOW'] || 2) -
            (priorityOrder[b.priority ?? 'LOW'] || 2);
          break;
        case 'attendees':
          comparison = b.attendees.length - a.attendees.length;
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  // Meetings grouped by status (for kanban view)
  meetingsByStatus = computed(() => {
    const meetings = this.filteredMeetings();
    return {
      scheduled: meetings.filter((m) => m.status === 'scheduled'),
      in_progress: meetings.filter((m) => m.status === 'in_progress'),
      completed: meetings.filter((m) => m.status === 'completed'),
      cancelled: meetings.filter((m) => m.status === 'cancelled'),
      rescheduled: meetings.filter((m) => m.status === 'rescheduled'),
    };
  });

  // Meetings for calendar view
  getMeetingsForDate(date: Date): Meeting[] {
    const targetDate = date.toISOString().split('T')[0];
    return this.meetings().filter(
      (m) => m.date === targetDate && m.status !== 'cancelled',
    );
  }

  // Stats
  meetingStats = computed(() => {
    const all = this.meetings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMeetings = all.filter((m) => {
      const meetingDate = new Date(m.date);
      meetingDate.setHours(0, 0, 0, 0);
      return (
        meetingDate.getTime() === today.getTime() && m.status !== 'cancelled'
      );
    });

    const upcomingMeetings = all.filter((m) => {
      const meetingDate = new Date(m.date);
      meetingDate.setHours(0, 0, 0, 0);
      return (
        meetingDate.getTime() > today.getTime() && m.status === 'scheduled'
      );
    });

    const totalActionItems = all.reduce(
      (sum, m) => sum + (m.actionItems?.length ?? 0),
      0,
    );
    const openActionItems = all.reduce(
      (sum, m) =>
        sum +
        (m.actionItems?.filter((a) => a.status !== 'completed').length ?? 0),
      0,
    );

    return {
      total: all.length,
      today: todayMeetings.length,
      upcoming: upcomingMeetings.length,
      completed: all.filter((m) => m.status === 'completed').length,
      cancelled: all.filter((m) => m.status === 'cancelled').length,
      totalActionItems,
      openActionItems,
    };
  });

  // Upcoming syncs (next meetings)
  upcomingSyncs = computed(() => {
    const now = new Date();
    return this.meetings()
      .filter((m) => {
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

  // CRUD Operations

  addMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) {
    // Auto-project ID if not provided
    const projectId = meeting.project || crypto.randomUUID();

    const newMeeting: Meeting = {
      ...meeting,
      id: Date.now().toString(),
      project: projectId, // Ensure it's linked
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.meetings.update((meetings) => [...meetings, newMeeting]);
    this.store.addActivity('Meeting created: ' + newMeeting.title, 'system');
    this.persistMeeting(newMeeting);

    // Create the Project container if we generated the ID
    if (!meeting.project) {
      this.store.addProject({
        id: projectId,
        title: newMeeting.title,
        description: 'Meeting Project: ' + newMeeting.title,
        status: 'PLANNING',
        words: '0',
        updated: new Date().toISOString(),
        icon: 'groups',
        linkedResources: {
          meetings: [newMeeting.id],
        },
      });
    }

    return newMeeting;
  }

  updateMeeting(id: string, updates: Partial<Meeting>) {
    this.meetings.update((meetings) =>
      meetings.map((meeting) =>
        meeting.id === id
          ? { ...meeting, ...updates, updatedAt: new Date().toISOString() }
          : meeting,
      ),
    );
    this.store.addActivity('Meeting updated', 'system');
    const m = this.meetings().find((x) => x.id === id);
    if (m) this.persistMeeting(m);
  }

  deleteMeeting(id: string) {
    const existing = this.meetings();
    const meetingToDelete = existing.find((m) => m.id === id);

    if (meetingToDelete) {
      this.bin.addToBin({
        type: 'meeting',
        originalId: meetingToDelete.id,
        title: meetingToDelete.title,
        payload: meetingToDelete,
      });
    }

    this.meetings.set(existing.filter((m) => m.id !== id));
    this.store.addActivity('Meeting deleted', 'system');
    this.db
      .remove('meetings', id)
      .catch((e) => logIfTauri('[MeetingsService] remove failed', e));
  }

  cancelMeeting(id: string) {
    this.updateMeeting(id, { status: 'cancelled' });
    this.store.addActivity('Meeting cancelled', 'system');
  }

  completeMeeting(id: string) {
    this.updateMeeting(id, { status: 'completed' });
    this.store.addActivity('Meeting completed', 'system');
  }

  rescheduleMeeting(
    id: string,
    newDate: string,
    newStartTime: string,
    newEndTime?: string,
  ) {
    this.updateMeeting(id, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'rescheduled',
    });
    this.store.addActivity('Meeting rescheduled', 'system');
  }

  // Duplicate a meeting (useful for recurring meetings or templates)
  duplicateMeeting(id: string, newDate?: string): Meeting | null {
    const original = this.meetings().find((m) => m.id === id);
    if (!original) return null;

    const duplicate: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> = {
      ...original,
      date: newDate ?? original.date,
      status: 'scheduled',
      notes: [],
      actionItems: original.actionItems?.map((ai) => ({
        ...ai,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        status: 'open' as const,
        linkedTaskId: undefined,
      })),
    };

    return this.addMeeting(duplicate);
  }

  // Agenda operations

  addAgendaItem(meetingId: string, item: Omit<AgendaItem, 'id'>) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return;

    const newItem: AgendaItem = {
      ...item,
      id: Date.now().toString(),
    };

    this.updateMeeting(meetingId, {
      agenda: [...(meeting.agenda ?? []), newItem],
    });
  }

  updateAgendaItem(
    meetingId: string,
    itemId: string,
    updates: Partial<AgendaItem>,
  ) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting?.agenda) return;

    this.updateMeeting(meetingId, {
      agenda: meeting.agenda.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    });
  }

  deleteAgendaItem(meetingId: string, itemId: string) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting?.agenda) return;

    this.updateMeeting(meetingId, {
      agenda: meeting.agenda.filter((item) => item.id !== itemId),
    });
  }

  // Action items operations

  addActionItem(meetingId: string, item: Omit<ActionItem, 'id'>) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return null;

    const newItem: ActionItem = {
      ...item,
      id: Date.now().toString(),
    };

    this.updateMeeting(meetingId, {
      actionItems: [...(meeting.actionItems ?? []), newItem],
    });

    return newItem;
  }

  updateActionItem(
    meetingId: string,
    itemId: string,
    updates: Partial<ActionItem>,
  ) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting?.actionItems) return;

    this.updateMeeting(meetingId, {
      actionItems: meeting.actionItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    });
  }

  deleteActionItem(meetingId: string, itemId: string) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting?.actionItems) return;

    this.updateMeeting(meetingId, {
      actionItems: meeting.actionItems.filter((item) => item.id !== itemId),
    });
  }

  // Convert action item to task
  convertActionItemToTask(meetingId: string, actionItemId: string): void {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return;

    const actionItem = meeting.actionItems?.find(
      (ai) => ai.id === actionItemId,
    );
    if (!actionItem) return;

    const task: Task = {
      id: Date.now().toString(),
      title: actionItem.title,
      priority: actionItem.priority ?? 'MEDIUM',
      hours: '1.0H',
      status: actionItem.status === 'completed' ? 'COMPLETED' : 'ACTIVE',
      project: meeting.project,
      due: actionItem.dueDate,
    };

    this.store.addTask(task);

    // Link the task to the action item
    this.updateActionItem(meetingId, actionItemId, { linkedTaskId: task.id });
  }

  // Notes operations

  addNote(meetingId: string, content: string, createdBy?: string) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return;

    const newNote: MeetingNote = {
      id: Date.now().toString(),
      content,
      createdAt: new Date().toISOString(),
      createdBy,
    };

    this.updateMeeting(meetingId, {
      notes: [...(meeting.notes ?? []), newNote],
    });
  }

  updateNote(meetingId: string, noteId: string, content: string) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting?.notes) return;

    this.updateMeeting(meetingId, {
      notes: meeting.notes.map((note) =>
        note.id === noteId ? { ...note, content } : note,
      ),
    });
  }

  deleteNote(meetingId: string, noteId: string) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting?.notes) return;

    this.updateMeeting(meetingId, {
      notes: meeting.notes.filter((note) => note.id !== noteId),
    });
  }

  // Attendees operations

  addAttendee(meetingId: string, attendee: Omit<Attendee, 'id'>) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return;

    const newAttendee: Attendee = {
      ...attendee,
      id: Date.now().toString(),
    };

    this.updateMeeting(meetingId, {
      attendees: [...meeting.attendees, newAttendee],
    });
  }

  updateAttendee(
    meetingId: string,
    attendeeId: string,
    updates: Partial<Attendee>,
  ) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return;

    this.updateMeeting(meetingId, {
      attendees: meeting.attendees.map((a) =>
        a.id === attendeeId ? { ...a, ...updates } : a,
      ),
    });
  }

  removeAttendee(meetingId: string, attendeeId: string) {
    const meeting = this.meetings().find((m) => m.id === meetingId);
    if (!meeting) return;

    this.updateMeeting(meetingId, {
      attendees: meeting.attendees.filter((a) => a.id !== attendeeId),
    });
  }

  // Recurring meeting operations

  createRecurringSeries(
    baseMeeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>,
    count: number,
  ): Meeting[] {
    const seriesId = Date.now().toString();
    const meetings: Meeting[] = [];

    for (let i = 0; i < count; i++) {
      const meetingDate = new Date(baseMeeting.date);

      switch (baseMeeting.recurring?.pattern) {
        case 'daily':
          meetingDate.setDate(
            meetingDate.getDate() + i * (baseMeeting.recurring?.interval ?? 1),
          );
          break;
        case 'weekly':
          meetingDate.setDate(
            meetingDate.getDate() +
              i * 7 * (baseMeeting.recurring?.interval ?? 1),
          );
          break;
        case 'biweekly':
          meetingDate.setDate(meetingDate.getDate() + i * 14);
          break;
        case 'monthly':
          meetingDate.setMonth(
            meetingDate.getMonth() + i * (baseMeeting.recurring?.interval ?? 1),
          );
          break;
        case 'yearly':
          meetingDate.setFullYear(
            meetingDate.getFullYear() +
              i * (baseMeeting.recurring?.interval ?? 1),
          );
          break;
      }

      const meeting = this.addMeeting({
        ...baseMeeting,
        date: meetingDate.toISOString().split('T')[0],
        recurring: {
          ...baseMeeting.recurring!,
          seriesId,
          occurrenceNumber: i + 1,
        },
      });
      meetings.push(meeting);
    }

    return meetings;
  }

  // Utility methods

  formatMeetingTime(meeting: Meeting): string {
    const date = new Date(meeting.date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    const dateStr = date.toLocaleDateString('en-US', options);
    const timeStr = this.formatTime(meeting.startTime);
    return `${dateStr}, ${timeStr}`;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  getMeetingDurationDisplay(meeting: Meeting): string {
    if (meeting.duration) {
      if (meeting.duration >= 60) {
        const hours = Math.floor(meeting.duration / 60);
        const mins = meeting.duration % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${meeting.duration}m`;
    }
    return '';
  }

  isMeetingToday(meeting: Meeting): boolean {
    const today = new Date();
    const meetingDate = new Date(meeting.date);
    return meetingDate.toDateString() === today.toDateString();
  }

  isMeetingTomorrow(meeting: Meeting): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const meetingDate = new Date(meeting.date);
    return meetingDate.toDateString() === tomorrow.toDateString();
  }

  getRelativeDateLabel(meeting: Meeting): string {
    if (this.isMeetingToday(meeting)) return 'Today';
    if (this.isMeetingTomorrow(meeting)) return 'Tomorrow';

    const date = new Date(meeting.date);
    const today = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return Math.abs(diffDays) === 1
        ? 'Yesterday'
        : `${Math.abs(diffDays)} days ago`;
    }
    if (diffDays <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getOpenActionItemsCount(meeting: Meeting): number {
    return (
      meeting.actionItems?.filter((ai) => ai.status !== 'completed').length ?? 0
    );
  }

  getTotalActionItemsCount(meeting: Meeting): number {
    return meeting.actionItems?.length ?? 0;
  }
}
