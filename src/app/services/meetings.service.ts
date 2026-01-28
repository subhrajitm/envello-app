import { Injectable, inject, signal, computed } from '@angular/core';
import { BinService } from './bin.service';
import { StoreService, Task } from './store.service';

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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
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

// Initial mock meetings
const initialMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Agent Sync: Quarterly Review',
    description: 'Quarterly review meeting to discuss progress and goals for the next quarter.',
    project: 'Neon Orchard Chronicles',
    date: '2026-01-28',
    startTime: '10:00',
    endTime: '11:00',
    duration: 60,
    meetingType: 'video',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/123456789',
    attendees: [
      { id: '1', name: 'Sarah Chen', email: 'sarah@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBshAUhVwVYKH81jgOo3cSGYQ_03DK0vuUnPQRITWWOWer3u8KH7UyBLt54X4k4q22py2yS1R6Yvb2Hv0EOlUke0QBsXv-_vyaGANjV44gsMbwE0CBc3DnOTLuXl3Q-hG0DDpwvvwtQmTNBi1w5t0p8for1h6R9dxLm_MIGl-wZY6zx-57MqzYatU70ArayMd8OC-A8f8Rz9bJDe_7coc5sHD141iEvUys7ecDE14M_JswlCtpbZbN6oB2mBKoqgOQxj9SaQu3RA5-U', role: 'organizer', status: 'accepted' },
      { id: '2', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV-e0vzaU8OnVjvi1c8je-Ulg79-URafS8W73HwjyD8qz9FuZDp2_kfk62ayt6UA6YPEQFXxLLRpWZnuQIyZgrgBmv0WnuBzwcVurJX08LI0qL95p4I8W-pNCRA4jWVjrZ1t9llgq52BJ8l5RNh0hQy_CEYBTnydt1cUPYtdAe-l4TWz9FZW_vLHImmjj4KnM1U2wzqE0BumUeCioAeQhpdsyNHzd4qlhZ5Mad2tUQq6OXpL2bVcE1TuB73Xc2mUQf0iSH-knDjukG', role: 'required', status: 'accepted' },
      { id: '3', name: 'Emily Davis', email: 'emily@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSkgMxJq7v06z31vv_d5-FZJvsBZUHEDG9EzciuEH91iF1_HWd0zN2dRCq0vThU3uHq9zSN_PM4QLzPpupJKXy9_lvhMeIIMncyd3Uye6etOu5KJiGi_J0YB93iCEPRp0Zz5J1c0B78Cd_9tub57KdXPka9o9NKNm7Eyk0M-Ich95TilOLe1eaGtjnZ9XHPm-S0fJyQyRVA--4a0GO1WOTYj_SzhG70YFMHuX4T75vPBWbNYw6aGQonGpZe3w2mK0S9mvg9LMjr1IS', role: 'optional', status: 'tentative' },
    ],
    agenda: [
      { id: '1', title: 'Q4 Performance Review', duration: 20, presenter: 'Sarah Chen', completed: false },
      { id: '2', title: 'Q1 Goals Discussion', duration: 25, presenter: 'Mike Johnson', completed: false },
      { id: '3', title: 'Open Discussion', duration: 15, completed: false },
    ],
    actionItems: [
      { id: '1', title: 'Update project timeline document', assignee: 'Sarah Chen', status: 'open', priority: 'HIGH' },
      { id: '2', title: 'Review marketing budget', assignee: 'Mike Johnson', status: 'open', priority: 'MEDIUM' },
      { id: '3', title: 'Schedule follow-up meeting', assignee: 'Emily Davis', status: 'open', priority: 'LOW' },
      { id: '4', title: 'Compile Q4 metrics report', assignee: 'Sarah Chen', status: 'in_progress', priority: 'HIGH' },
    ],
    status: 'scheduled',
    priority: 'HIGH',
    color: '#E8D55A',
    labels: ['quarterly', 'review'],
    reminders: [
      { time: 15, type: 'notification', sent: false },
      { time: 60, type: 'email', sent: true },
    ],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-27T14:30:00Z',
  },
  {
    id: '2',
    title: 'Worldbuilding Workshop',
    description: 'Collaborative workshop session to develop the world and setting.',
    project: 'Project Alpha',
    date: '2026-01-29',
    startTime: '14:30',
    endTime: '16:00',
    duration: 90,
    meetingType: 'video',
    platform: 'discord',
    meetingLink: 'https://discord.gg/workshop',
    attendees: [
      { id: '4', name: 'Alex Rivera', email: 'alex@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmY1FcHM_75uao_XhmRPmF-Gklc9_QZUHQW36c2mN4OSF-QQiAyZHO50KgBDfssgrutG_L6e6siyAt-glKOsGoxIhes2ugdspfx_oTHFmLsgP2sPmi5En5uQ5jLrXG6sWdc-fWDfnvoJwytTmkcWDgHuIw3BVOCmpr6HU0T4HTsgzx3a4v0XYYpAcIIlf6YVOPRDp6P6mJNWOu0nehVYqPxedrpKvF-atGJScrb5GAcOQlO4ysfoTedimw2my6wknzO1hxoP5K7IfH', role: 'organizer', status: 'accepted' },
      { id: '5', name: 'Jordan Lee', email: 'jordan@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5bwBoFq2vASkLUfPSUXUewuFrCl8iphiIqA-MWuyRRnpwUjz83zlHfox_QvsvRbLst9sLMQ9x7Z2uGGu-wZyX_1sRF16AMBO_XwW74GSRcTSqhGikFHTbW2h_tf0hjD2sgXxjAz0200odqSpdyvkvGW5R8igE0aAB1NqqQyAU-mVjLpxOEZc4twOnh8x5MpX_z5NbysbwXfLmpvaWkIHUJoi_bKiAAmvI_g6VHRWmwHgoho2XCvrIIWTYzbMQ7j5UzpCkvJ8tDtwJ', role: 'required', status: 'accepted' },
    ],
    agenda: [
      { id: '1', title: 'Geography and Map Review', duration: 30, completed: false },
      { id: '2', title: 'Culture Development', duration: 30, completed: false },
      { id: '3', title: 'Magic System Workshop', duration: 30, completed: false },
    ],
    actionItems: [
      { id: '1', title: 'Create map sketches', assignee: 'Alex Rivera', status: 'open', priority: 'HIGH' },
      { id: '2', title: 'Write culture document draft', assignee: 'Jordan Lee', status: 'open', priority: 'MEDIUM' },
    ],
    status: 'scheduled',
    priority: 'MEDIUM',
    color: '#3B82F6',
    labels: ['workshop', 'creative'],
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-25T16:00:00Z',
  },
  {
    id: '3',
    title: 'Editorial Feedback Session',
    description: 'Review editor feedback and discuss revisions.',
    project: 'The Scent of Green',
    date: '2026-01-25',
    startTime: '09:15',
    endTime: '10:15',
    duration: 60,
    meetingType: 'in-person',
    location: 'Conference Room A',
    attendees: [
      { id: '6', name: 'Chris Taylor', email: 'chris@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAopkW8tWTy_LepOvR9vwSVvSYlaWpfhTulaGYeBG5a8vREvZ-j4EmF2xLOMKjHpa2OeWv2n1RV2KDUgbrkHuSF5Jg9iaktjd52T0mzruQJ6tRSBJ7f8mtWfxJUaXEkWdvD_oTdO7NbrbgtMPpbPmy4-WkLZByKjdt4Phrpnm_99ESzO7rFPKSagl3vWMZ5nWNU17kCLfYzYyF8mLRAx0sxXTdSrirFxPLAv6y0Y2VwhneNOVkWeSiaioaFKdMfPIlr5TjG9tmuJnc', role: 'organizer', status: 'accepted' },
      { id: '7', name: 'Sam Martinez', email: 'sam@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtq6Uh1_arZuIO6y7E9-DEmV5B4ZiB68-5_yw-Ts5x9IsaXOyLE_HIw8WGqnJGCrg8EvEmJl_MSvS7nYMWpfbrKrnLDogQ1LJcOHVgoWfkz6A063wQQ-oYmEC1MXwP1FT0GxXbxp58fGPy_v4vSpNcVJ7roHDKy90jVa2LXk3ZA1-meqQWGPWGgH3o0BedFH0xCxhFuHrzoWxTaGDbmK8mw_2ptPrTKpaEuPuA5VSu8pFw209Uw0gO3E9ErERA6f5QpHF1tfxD25R_', role: 'required', status: 'accepted' },
      { id: '8', name: 'Taylor Kim', email: 'taylor@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBt_6vO4woNQjkvVX2WaOXDrBLZAdj27mViNtQIn_rJJtGII5GPMRxiJhs1xKk6LY7NsttWUOQQwJ4B118XI7QA9KIEp0vH5i9ZVTuZ0VtpPPf4zHDXuNfAHMEG7yCqp9DmovgNDXA_cuRKXdbyrKfQoEyLIZjkDndLLayyRAZKrNwdkE-TW5KasM8rBHqJOoslOPp3tw_KeNLlFltA_PIwyJEj2-gL2TP1ESRLfJtK0uwlbQqY5ZL5IH2L0f3O69IjXNyI3uiKlBen', role: 'optional', status: 'accepted' },
    ],
    notes: [
      { id: '1', content: 'Discussed chapter 3 pacing issues - agreed to restructure.', createdAt: '2026-01-25T09:30:00Z', createdBy: 'Chris Taylor' },
      { id: '2', content: 'Character motivation needs strengthening in act 2.', createdAt: '2026-01-25T09:45:00Z', createdBy: 'Sam Martinez' },
    ],
    actionItems: [],
    status: 'completed',
    priority: 'MEDIUM',
    color: '#10B981',
    labels: ['editorial', 'feedback'],
    createdAt: '2026-01-18T11:00:00Z',
    updatedAt: '2026-01-25T10:15:00Z',
  },
  {
    id: '4',
    title: 'Plot Hole Triage',
    description: 'Emergency session to address critical plot inconsistencies.',
    project: 'Echoes of the Void',
    date: '2026-01-30',
    startTime: '11:00',
    endTime: '12:30',
    duration: 90,
    meetingType: 'video',
    platform: 'teams',
    meetingLink: 'https://teams.microsoft.com/meeting',
    attendees: [
      { id: '9', name: 'Morgan Blake', email: 'morgan@example.com', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCB-FU_FjpRVd4taX1MJNuIIUYHel8yOYTd5uaKFRpFuNQjzfJ3aSLjqzmXRgA-n-Ld_BjPqoj56Mp-tlXfrzA0J9misg2pikkWWi-QulRTUGTgwkJwM8q_L4jG1T2kD1V9tryZtZ_x5EO2WbKZwA0dgA7hWDnByAX8XY5lZhIgYaCO_g_vblUDYpsNiL0chaKKMQ3sp1ObWRo4gM1M6fG5hzI6934c_a2aiDsMnH719ienmdab1KZa9j7ZC4GijJ25U-V-0YQUR9h', role: 'organizer', status: 'accepted' },
    ],
    agenda: [
      { id: '1', title: 'Identify critical plot holes', duration: 30, completed: false },
      { id: '2', title: 'Brainstorm solutions', duration: 40, completed: false },
      { id: '3', title: 'Prioritize fixes', duration: 20, completed: false },
    ],
    actionItems: [
      { id: '1', title: 'Document timeline inconsistencies', assignee: 'Morgan Blake', status: 'open', priority: 'HIGH' },
      { id: '2', title: 'Rewrite chapter 5 opening', assignee: 'Morgan Blake', status: 'open', priority: 'HIGH' },
      { id: '3', title: 'Create character relationship chart', assignee: 'Morgan Blake', status: 'open', priority: 'MEDIUM' },
      { id: '4', title: 'Review flashback sequences', assignee: 'Morgan Blake', status: 'open', priority: 'HIGH' },
      { id: '5', title: 'Check location consistency', assignee: 'Morgan Blake', status: 'open', priority: 'MEDIUM' },
      { id: '6', title: 'Verify magic system rules', assignee: 'Morgan Blake', status: 'open', priority: 'LOW' },
      { id: '7', title: 'Update story bible', assignee: 'Morgan Blake', status: 'open', priority: 'LOW' },
    ],
    status: 'scheduled',
    priority: 'HIGH',
    color: '#F97316',
    labels: ['urgent', 'plot'],
    createdAt: '2026-01-22T09:00:00Z',
    updatedAt: '2026-01-27T15:00:00Z',
  },
  {
    id: '5',
    title: 'Marketing Strategy',
    description: 'Discuss marketing plans and promotional activities.',
    project: 'Neon Orchard Chronicles',
    date: '2026-01-28',
    startTime: '16:00',
    endTime: '17:00',
    duration: 60,
    meetingType: 'video',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/987654321',
    attendees: [
      { id: '1', name: 'Sarah Chen', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBshAUhVwVYKH81jgOo3cSGYQ_03DK0vuUnPQRITWWOWer3u8KH7UyBLt54X4k4q22py2yS1R6Yvb2Hv0EOlUke0QBsXv-_vyaGANjV44gsMbwE0CBc3DnOTLuXl3Q-hG0DDpwvvwtQmTNBi1w5t0p8for1h6R9dxLm_MIGl-wZY6zx-57MqzYatU70ArayMd8OC-A8f8Rz9bJDe_7coc5sHD141iEvUys7ecDE14M_JswlCtpbZbN6oB2mBKoqgOQxj9SaQu3RA5-U', role: 'organizer', status: 'accepted' },
      { id: '10', name: 'Casey Wong', avatar: '', role: 'required', status: 'pending' },
    ],
    status: 'scheduled',
    priority: 'MEDIUM',
    color: '#8B5CF6',
    labels: ['marketing'],
    createdAt: '2026-01-26T12:00:00Z',
    updatedAt: '2026-01-27T09:00:00Z',
  },
  {
    id: '6',
    title: 'Character Arc Review',
    description: 'Deep dive into protagonist character development.',
    project: 'Project Alpha',
    date: '2026-01-29',
    startTime: '11:30',
    endTime: '12:30',
    duration: 60,
    meetingType: 'hybrid',
    location: 'Room 4B / Discord',
    meetingLink: 'https://discord.gg/review',
    attendees: [
      { id: '4', name: 'Alex Rivera', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmY1FcHM_75uao_XhmRPmF-Gklc9_QZUHQW36c2mN4OSF-QQiAyZHO50KgBDfssgrutG_L6e6siyAt-glKOsGoxIhes2ugdspfx_oTHFmLsgP2sPmi5En5uQ5jLrXG6sWdc-fWDfnvoJwytTmkcWDgHuIw3BVOCmpr6HU0T4HTsgzx3a4v0XYYpAcIIlf6YVOPRDp6P6mJNWOu0nehVYqPxedrpKvF-atGJScrb5GAcOQlO4ysfoTedimw2my6wknzO1hxoP5K7IfH', role: 'organizer', status: 'accepted' },
      { id: '6', name: 'Chris Taylor', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAopkW8tWTy_LepOvR9vwSVvSYlaWpfhTulaGYeBG5a8vREvZ-j4EmF2xLOMKjHpa2OeWv2n1RV2KDUgbrkHuSF5Jg9iaktjd52T0mzruQJ6tRSBJ7f8mtWfxJUaXEkWdvD_oTdO7NbrbgtMPpbPmy4-WkLZByKjdt4Phrpnm_99ESzO7rFPKSagl3vWMZ5nWNU17kCLfYzYyF8mLRAx0sxXTdSrirFxPLAv6y0Y2VwhneNOVkWeSiaioaFKdMfPIlr5TjG9tmuJnc', role: 'required', status: 'accepted' },
    ],
    status: 'scheduled',
    priority: 'LOW',
    color: '#EC4899',
    labels: ['character', 'review'],
    createdAt: '2026-01-25T14:00:00Z',
    updatedAt: '2026-01-27T10:00:00Z',
  },
];

export type MeetingViewFilter = 'all' | 'today' | 'upcoming' | 'past' | 'cancelled';
export type MeetingViewMode = 'list' | 'calendar' | 'kanban';
export type MeetingSortBy = 'date' | 'title' | 'project' | 'priority' | 'attendees';

@Injectable({
  providedIn: 'root'
})
export class MeetingsService {
  private bin = inject(BinService);
  private store = inject(StoreService);
  
  // Core state
  meetings = signal<Meeting[]>(initialMeetings);
  
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
    return id ? this.meetings().find(m => m.id === id) ?? null : null;
  });
  
  // Get unique projects from meetings
  availableProjects = computed(() => {
    const projects = new Set<string>();
    this.meetings().forEach(m => {
      if (m.project) projects.add(m.project);
    });
    return Array.from(projects).sort();
  });
  
  // Get unique labels from meetings
  availableLabels = computed(() => {
    const labels = new Set<string>();
    this.meetings().forEach(m => {
      m.labels?.forEach(l => labels.add(l));
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
        result = result.filter(m => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate.getTime() === today.getTime() && m.status !== 'cancelled';
        });
        break;
      case 'upcoming':
        result = result.filter(m => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate.getTime() >= today.getTime() && m.status !== 'cancelled' && m.status !== 'completed';
        });
        break;
      case 'past':
        result = result.filter(m => {
          const meetingDate = new Date(m.date);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate.getTime() < today.getTime() || m.status === 'completed';
        });
        break;
      case 'cancelled':
        result = result.filter(m => m.status === 'cancelled');
        break;
    }
    
    // Apply project filter
    const project = this.selectedProject();
    if (project) {
      result = result.filter(m => m.project === project);
    }
    
    // Apply labels filter
    const labels = this.selectedLabels();
    if (labels.length > 0) {
      result = result.filter(m => 
        labels.some(label => m.labels?.includes(label))
      );
    }
    
    // Apply search
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.project?.toLowerCase().includes(query) ||
        m.attendees.some(a => a.name.toLowerCase().includes(query)) ||
        m.labels?.some(l => l.toLowerCase().includes(query))
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
          const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
          comparison = (priorityOrder[a.priority ?? 'LOW'] || 2) - (priorityOrder[b.priority ?? 'LOW'] || 2);
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
      scheduled: meetings.filter(m => m.status === 'scheduled'),
      in_progress: meetings.filter(m => m.status === 'in_progress'),
      completed: meetings.filter(m => m.status === 'completed'),
      cancelled: meetings.filter(m => m.status === 'cancelled'),
      rescheduled: meetings.filter(m => m.status === 'rescheduled'),
    };
  });
  
  // Meetings for calendar view
  getMeetingsForDate(date: Date): Meeting[] {
    const targetDate = date.toISOString().split('T')[0];
    return this.meetings().filter(m => m.date === targetDate && m.status !== 'cancelled');
  }
  
  // Stats
  meetingStats = computed(() => {
    const all = this.meetings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMeetings = all.filter(m => {
      const meetingDate = new Date(m.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate.getTime() === today.getTime() && m.status !== 'cancelled';
    });
    
    const upcomingMeetings = all.filter(m => {
      const meetingDate = new Date(m.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate.getTime() > today.getTime() && m.status === 'scheduled';
    });
    
    const totalActionItems = all.reduce((sum, m) => sum + (m.actionItems?.length ?? 0), 0);
    const openActionItems = all.reduce((sum, m) => 
      sum + (m.actionItems?.filter(a => a.status !== 'completed').length ?? 0), 0
    );
    
    return {
      total: all.length,
      today: todayMeetings.length,
      upcoming: upcomingMeetings.length,
      completed: all.filter(m => m.status === 'completed').length,
      cancelled: all.filter(m => m.status === 'cancelled').length,
      totalActionItems,
      openActionItems,
    };
  });
  
  // Upcoming syncs (next meetings)
  upcomingSyncs = computed(() => {
    const now = new Date();
    return this.meetings()
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
  
  // CRUD Operations
  
  addMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) {
    const newMeeting: Meeting = {
      ...meeting,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.meetings.update(meetings => [...meetings, newMeeting]);
    this.store.addActivity('Meeting created: ' + newMeeting.title, 'system');
    return newMeeting;
  }
  
  updateMeeting(id: string, updates: Partial<Meeting>) {
    this.meetings.update(meetings =>
      meetings.map(meeting => 
        meeting.id === id 
          ? { ...meeting, ...updates, updatedAt: new Date().toISOString() } 
          : meeting
      )
    );
    this.store.addActivity('Meeting updated', 'system');
  }
  
  deleteMeeting(id: string) {
    const existing = this.meetings();
    const meetingToDelete = existing.find(m => m.id === id);
    
    if (meetingToDelete) {
      this.bin.addToBin({
        type: 'meeting' as any,
        originalId: meetingToDelete.id,
        title: meetingToDelete.title,
        payload: meetingToDelete
      });
    }
    
    this.meetings.set(existing.filter(m => m.id !== id));
    this.store.addActivity('Meeting deleted', 'system');
  }
  
  cancelMeeting(id: string) {
    this.updateMeeting(id, { status: 'cancelled' });
    this.store.addActivity('Meeting cancelled', 'system');
  }
  
  completeMeeting(id: string) {
    this.updateMeeting(id, { status: 'completed' });
    this.store.addActivity('Meeting completed', 'system');
  }
  
  rescheduleMeeting(id: string, newDate: string, newStartTime: string, newEndTime?: string) {
    this.updateMeeting(id, { 
      date: newDate, 
      startTime: newStartTime, 
      endTime: newEndTime,
      status: 'rescheduled' 
    });
    this.store.addActivity('Meeting rescheduled', 'system');
  }
  
  // Duplicate a meeting (useful for recurring meetings or templates)
  duplicateMeeting(id: string, newDate?: string): Meeting | null {
    const original = this.meetings().find(m => m.id === id);
    if (!original) return null;
    
    const duplicate: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> = {
      ...original,
      date: newDate ?? original.date,
      status: 'scheduled',
      notes: [],
      actionItems: original.actionItems?.map(ai => ({
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
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting) return;
    
    const newItem: AgendaItem = {
      ...item,
      id: Date.now().toString(),
    };
    
    this.updateMeeting(meetingId, {
      agenda: [...(meeting.agenda ?? []), newItem],
    });
  }
  
  updateAgendaItem(meetingId: string, itemId: string, updates: Partial<AgendaItem>) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting?.agenda) return;
    
    this.updateMeeting(meetingId, {
      agenda: meeting.agenda.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  }
  
  deleteAgendaItem(meetingId: string, itemId: string) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting?.agenda) return;
    
    this.updateMeeting(meetingId, {
      agenda: meeting.agenda.filter(item => item.id !== itemId),
    });
  }
  
  // Action items operations
  
  addActionItem(meetingId: string, item: Omit<ActionItem, 'id'>) {
    const meeting = this.meetings().find(m => m.id === meetingId);
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
  
  updateActionItem(meetingId: string, itemId: string, updates: Partial<ActionItem>) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting?.actionItems) return;
    
    this.updateMeeting(meetingId, {
      actionItems: meeting.actionItems.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  }
  
  deleteActionItem(meetingId: string, itemId: string) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting?.actionItems) return;
    
    this.updateMeeting(meetingId, {
      actionItems: meeting.actionItems.filter(item => item.id !== itemId),
    });
  }
  
  // Convert action item to task
  convertActionItemToTask(meetingId: string, actionItemId: string): void {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting) return;
    
    const actionItem = meeting.actionItems?.find(ai => ai.id === actionItemId);
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
    const meeting = this.meetings().find(m => m.id === meetingId);
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
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting?.notes) return;
    
    this.updateMeeting(meetingId, {
      notes: meeting.notes.map(note => 
        note.id === noteId ? { ...note, content } : note
      ),
    });
  }
  
  deleteNote(meetingId: string, noteId: string) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting?.notes) return;
    
    this.updateMeeting(meetingId, {
      notes: meeting.notes.filter(note => note.id !== noteId),
    });
  }
  
  // Attendees operations
  
  addAttendee(meetingId: string, attendee: Omit<Attendee, 'id'>) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting) return;
    
    const newAttendee: Attendee = {
      ...attendee,
      id: Date.now().toString(),
    };
    
    this.updateMeeting(meetingId, {
      attendees: [...meeting.attendees, newAttendee],
    });
  }
  
  updateAttendee(meetingId: string, attendeeId: string, updates: Partial<Attendee>) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting) return;
    
    this.updateMeeting(meetingId, {
      attendees: meeting.attendees.map(a => 
        a.id === attendeeId ? { ...a, ...updates } : a
      ),
    });
  }
  
  removeAttendee(meetingId: string, attendeeId: string) {
    const meeting = this.meetings().find(m => m.id === meetingId);
    if (!meeting) return;
    
    this.updateMeeting(meetingId, {
      attendees: meeting.attendees.filter(a => a.id !== attendeeId),
    });
  }
  
  // Recurring meeting operations
  
  createRecurringSeries(
    baseMeeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>,
    count: number
  ): Meeting[] {
    const seriesId = Date.now().toString();
    const meetings: Meeting[] = [];
    
    for (let i = 0; i < count; i++) {
      const meetingDate = new Date(baseMeeting.date);
      
      switch (baseMeeting.recurring?.pattern) {
        case 'daily':
          meetingDate.setDate(meetingDate.getDate() + i * (baseMeeting.recurring?.interval ?? 1));
          break;
        case 'weekly':
          meetingDate.setDate(meetingDate.getDate() + i * 7 * (baseMeeting.recurring?.interval ?? 1));
          break;
        case 'biweekly':
          meetingDate.setDate(meetingDate.getDate() + i * 14);
          break;
        case 'monthly':
          meetingDate.setMonth(meetingDate.getMonth() + i * (baseMeeting.recurring?.interval ?? 1));
          break;
        case 'yearly':
          meetingDate.setFullYear(meetingDate.getFullYear() + i * (baseMeeting.recurring?.interval ?? 1));
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
      day: 'numeric' 
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
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return Math.abs(diffDays) === 1 ? 'Yesterday' : `${Math.abs(diffDays)} days ago`;
    }
    if (diffDays <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  getOpenActionItemsCount(meeting: Meeting): number {
    return meeting.actionItems?.filter(ai => ai.status !== 'completed').length ?? 0;
  }
  
  getTotalActionItemsCount(meeting: Meeting): number {
    return meeting.actionItems?.length ?? 0;
  }
}
