import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  StoreService, UserService, MeetingsService, BookContentService,
} from '@envello/core';
import { Note, Task, Book, Bookmark } from '@envello/domain';
import { Meeting } from '@envello/core';

export type RecentTab = 'all' | 'notes' | 'tasks' | 'meetings' | 'bookmarks' | 'books';

export interface RecentEntry {
  id: string;
  type: RecentTab;
  title: string;
  meta: string;
  icon: string;
  color: string;
  timestamp: number;
  route: string[];
  status?: string;
}

const MAX_RECENT = 12;
const TODAY_TASK_LIMIT = 6;
const TODAY_MEETING_LIMIT = 4;

@Component({
  selector: 'lib-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private store = inject(StoreService);
  private meetingsService = inject(MeetingsService);
  private bookContentService = inject(BookContentService);
  private userService = inject(UserService);
  private router = inject(Router);

  user = this.userService.user;
  activeTab = signal<RecentTab>('all');

  readonly tabs: { id: RecentTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'notes', label: 'Notes' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'books', label: 'Books' },
  ];

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.user()?.name?.split(' ')[0] ?? '';
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return `Good ${period}${name ? ', ' + name : ''}`;
  });

  readonly todayDate = computed(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  });

  readonly todayISO = new Date().toISOString().split('T')[0];

  readonly activeTasks = computed(() =>
    this.store.tasks()
      .filter(t => t.status === 'ACTIVE' || t.status === 'PENDING')
      .slice(0, TODAY_TASK_LIMIT)
  );

  readonly todayMeetings = computed(() =>
    this.meetingsService.meetings()
      .filter(m => m.date === this.todayISO)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, TODAY_MEETING_LIMIT)
  );

  readonly completedTasksToday = computed(() =>
    this.store.tasks().filter(t => t.status === 'COMPLETED').length
  );

  // ── Recent entries per type ────────────────────────────────────────────────

  private recentNotes = computed<RecentEntry[]>(() =>
    this.store.notes().slice(0, MAX_RECENT).map(n => ({
      id: n.id,
      type: 'notes' as RecentTab,
      title: n.title || 'Untitled Note',
      meta: n.date,
      icon: 'edit_note',
      color: '#e8a87c',
      timestamp: this.parseNoteDate(n),
      route: ['/daily-notes'],
    }))
  );

  private recentTasks = computed<RecentEntry[]>(() =>
    this.store.tasks()
      .filter(t => t.status !== 'COMPLETED')
      .slice(0, MAX_RECENT)
      .map(t => ({
        id: t.id,
        type: 'tasks' as RecentTab,
        title: t.title,
        meta: t.priority,
        icon: 'check_circle',
        color: '#7eb3d4',
        timestamp: t.createdAt ? new Date(t.createdAt).getTime() : Date.now(),
        route: ['/tasks'],
        status: t.status,
      }))
  );

  private recentMeetings = computed<RecentEntry[]>(() =>
    this.meetingsService.meetings()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, MAX_RECENT)
      .map(m => ({
        id: m.id,
        type: 'meetings' as RecentTab,
        title: m.title,
        meta: this.formatMeetingMeta(m),
        icon: 'calendar_month',
        color: '#d89090',
        timestamp: new Date(m.date).getTime(),
        route: ['/meetings'],
        status: m.status,
      }))
  );

  private recentBookmarks = computed<RecentEntry[]>(() =>
    this.store.bookmarks()
      .slice(0, MAX_RECENT)
      .map(b => ({
        id: b.id,
        type: 'bookmarks' as RecentTab,
        title: b.title || b.url,
        meta: b.url ? this.extractDomain(b.url) : '',
        icon: 'bookmark',
        color: '#b48ce8',
        timestamp: b.createdAt ? new Date(b.createdAt).getTime() : Date.now(),
        route: ['/bookmarks'],
      }))
  );

  private recentBooks = computed<RecentEntry[]>(() =>
    this.store.books()
      .slice(0, MAX_RECENT)
      .map(bk => ({
        id: bk.id,
        type: 'books' as RecentTab,
        title: bk.title,
        meta: bk.status,
        icon: 'menu_book',
        color: '#c4a8d8',
        timestamp: bk.lastUpdated ? new Date(bk.lastUpdated).getTime() : Date.now(),
        route: ['/write', bk.id],
      }))
  );

  readonly allRecent = computed<RecentEntry[]>(() => {
    const entries = [
      ...this.recentNotes(),
      ...this.recentTasks(),
      ...this.recentMeetings(),
      ...this.recentBookmarks(),
      ...this.recentBooks(),
    ];
    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENT);
  });

  readonly filteredRecent = computed<RecentEntry[]>(() => {
    const tab = this.activeTab();
    switch (tab) {
      case 'all':      return this.allRecent();
      case 'notes':    return this.recentNotes();
      case 'tasks':    return this.recentTasks();
      case 'meetings': return this.recentMeetings();
      case 'bookmarks': return this.recentBookmarks();
      case 'books':    return this.recentBooks();
      default:         return this.allRecent();
    }
  });

  readonly stats = computed(() => ({
    notes: this.store.notes().length,
    tasks: this.store.tasks().filter(t => t.status === 'ACTIVE').length,
    meetings: this.todayMeetings().length,
    bookmarks: this.store.bookmarks().length,
  }));

  // ── Actions ────────────────────────────────────────────────────────────────

  setTab(tab: RecentTab) {
    this.activeTab.set(tab);
  }

  openEntry(entry: RecentEntry) {
    this.router.navigate(entry.route);
  }

  createNote() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newNote: Note = {
      id: `note-${Date.now()}`,
      date: dateStr,
      title: `Note - ${dateStr}`,
      preview: 'Start writing...',
      content: '',
      tags: [],
      lastEdited: timeStr,
    };
    this.store.addNote(newNote);
    this.router.navigate(['/daily-notes']);
  }

  createTask() {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      priority: 'MEDIUM',
      hours: '1.0H',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.store.addTask(newTask);
    this.router.navigate(['/tasks']);
  }

  createBook() {
    const id = `book-${Date.now()}`;
    const newBook: Book = {
      id,
      title: 'Untitled Book',
      icon: '📖',
      status: 'PLANNING',
      wordCount: 0,
      targetWordCount: 50000,
      progress: 0,
      chapters: 0,
      notesCount: 0,
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      genre: [],
      isRecentlyUpdated: true,
    };
    this.store.addBook(newBook);
    this.bookContentService.createAndPersistEmptyBook(id, newBook.title).catch(() => {});
    this.router.navigate(['/write', id]);
  }

  createBookmark() {
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      title: 'New Bookmark',
      url: 'https://',
      createdAt: new Date().toISOString(),
      tags: [],
    };
    this.store.addBookmark(bookmark);
    this.router.navigate(['/bookmarks']);
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  getPriorityClass(priority: string): string {
    return priority?.toLowerCase() ?? 'medium';
  }

  getMeetingStatusClass(status: string): string {
    return status?.toLowerCase() ?? 'scheduled';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private parseNoteDate(note: Note): number {
    try {
      return new Date(note.date).getTime();
    } catch {
      return Date.now();
    }
  }

  private formatMeetingMeta(m: Meeting): string {
    if (m.date === this.todayISO) return `Today · ${m.startTime}`;
    const d = new Date(m.date);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${m.startTime}`;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  getTabCount(tab: RecentTab): number {
    switch (tab) {
      case 'notes':     return this.store.notes().length;
      case 'tasks':     return this.store.tasks().filter(t => t.status !== 'COMPLETED').length;
      case 'meetings':  return this.meetingsService.meetings().length;
      case 'bookmarks': return this.store.bookmarks().length;
      case 'books':     return this.store.books().length;
      default:          return 0;
    }
  }
}
