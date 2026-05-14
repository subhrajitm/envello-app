import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export interface PageSession {
  page: string;
  totalTimeMs: number;
  visits: number;
  lastVisited: string;
}

export interface SessionData {
  pages: Record<string, PageSession>;
  sessionStart: string;
  totalSessionTimeMs: number;
  todayTimeMs: number;
  todayDate: string;
}

const STORAGE_KEY = 'envello-session-data';
const PAGE_MAP: Record<string, string> = {
  'overview': 'Overview',
  'novels': 'Novels/Fiction',
  'research': 'Research',
  'articles': 'Articles/Blogs',
  'journals': 'Journals',
  'daily-notes': 'Daily Notes',
  'tasks': 'Tasks/Todos',
  'meetings': 'Meetings',
  'books': 'Books/Reading',

  'bin': 'Bin'
};

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {
  private router = inject(Router);
  private routerSub?: Subscription;
  private intervalId?: ReturnType<typeof setInterval>;
  
  private currentPage = signal<string>('');
  private pageStartTime = signal<number>(0);
  private sessionData = signal<SessionData>(this.loadSessionData());

  // Computed stats
  pageStats = computed(() => {
    const data = this.sessionData();
    return Object.values(data.pages).sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  });

  todayTime = computed(() => {
    const data = this.sessionData();
    const today = new Date().toISOString().split('T')[0];
    if (data.todayDate !== today) {
      return 0;
    }
    return data.todayTimeMs;
  });

  totalSessionTime = computed(() => this.sessionData().totalSessionTimeMs);

  currentPageName = computed(() => this.currentPage());

  constructor() {
    this.initTracking();
  }

  private initTracking(): void {
    // Track route changes
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navEnd = event as NavigationEnd;
      const urlPath = navEnd.urlAfterRedirects.split('/')[1] || 'overview';
      const pageName = PAGE_MAP[urlPath] || 'Overview';
      this.onPageChange(pageName);
    });

    // Update time every second while on a page
    this.intervalId = setInterval(() => {
      this.updateCurrentPageTime();
    }, 1000);

    // Handle visibility changes (tab hidden/shown)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Handle page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Set initial page
    const initialPath = window.location.pathname.split('/')[1] || 'overview';
    const initialPage = PAGE_MAP[initialPath] || 'Overview';
    this.currentPage.set(initialPage);
    this.pageStartTime.set(Date.now());
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    // Save current page time before cleanup
    this.saveCurrentPageTime();
    
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab hidden - save current time
      this.saveCurrentPageTime();
    } else {
      // Tab visible again - reset start time
      this.pageStartTime.set(Date.now());
    }
  };

  private handleBeforeUnload = (): void => {
    this.saveCurrentPageTime();
  };

  private onPageChange(newPage: string): void {
    // Save time for the previous page
    this.saveCurrentPageTime();
    
    // Set up tracking for new page
    this.currentPage.set(newPage);
    this.pageStartTime.set(Date.now());
    
    // Increment visit count for new page
    this.sessionData.update(data => {
      const pages = { ...data.pages };
      const existing = pages[newPage] || {
        page: newPage,
        totalTimeMs: 0,
        visits: 0,
        lastVisited: new Date().toISOString()
      };
      
      pages[newPage] = {
        ...existing,
        visits: existing.visits + 1,
        lastVisited: new Date().toISOString()
      };
      
      return { ...data, pages };
    });
    
    this.persistSessionData();
  }

  private updateCurrentPageTime(): void {
    if (document.hidden) return;
    
    const page = this.currentPage();
    const startTime = this.pageStartTime();
    if (!page || !startTime) return;
    
    const elapsed = Date.now() - startTime;
    
    // Only update if at least 1 second has passed
    if (elapsed >= 1000) {
      this.addTimeToPage(page, 1000);
      this.pageStartTime.set(Date.now());
    }
  }

  private saveCurrentPageTime(): void {
    const page = this.currentPage();
    const startTime = this.pageStartTime();
    if (!page || !startTime) return;
    
    const elapsed = Date.now() - startTime;
    if (elapsed > 0) {
      this.addTimeToPage(page, elapsed);
      this.pageStartTime.set(Date.now());
    }
  }

  private addTimeToPage(page: string, timeMs: number): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.sessionData.update(data => {
      const pages = { ...data.pages };
      const existing = pages[page] || {
        page,
        totalTimeMs: 0,
        visits: 0,
        lastVisited: new Date().toISOString()
      };
      
      pages[page] = {
        ...existing,
        totalTimeMs: existing.totalTimeMs + timeMs,
        lastVisited: new Date().toISOString()
      };
      
      // Reset today's time if it's a new day
      let todayTimeMs = data.todayTimeMs;
      let todayDate = data.todayDate;
      if (todayDate !== today) {
        todayTimeMs = 0;
        todayDate = today;
      }
      todayTimeMs += timeMs;
      
      return {
        ...data,
        pages,
        totalSessionTimeMs: data.totalSessionTimeMs + timeMs,
        todayTimeMs,
        todayDate
      };
    });
    
    this.persistSessionData();
  }

  private loadSessionData(): SessionData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as SessionData;
        // Reset today's time if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (data.todayDate !== today) {
          data.todayTimeMs = 0;
          data.todayDate = today;
        }
        return data;
      }
    } catch (e) {
      console.error('[SessionService] Failed to load session data:', e);
    }
    
    return this.createEmptySessionData();
  }

  private createEmptySessionData(): SessionData {
    return {
      pages: {},
      sessionStart: new Date().toISOString(),
      totalSessionTimeMs: 0,
      todayTimeMs: 0,
      todayDate: new Date().toISOString().split('T')[0]
    };
  }

  private persistSessionData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessionData()));
    } catch (e) {
      console.error('[SessionService] Failed to persist session data:', e);
    }
  }

  // Public methods for getting stats
  getTimeSpentOnPage(page: string): number {
    const data = this.sessionData();
    return data.pages[page]?.totalTimeMs || 0;
  }

  getVisitsForPage(page: string): number {
    const data = this.sessionData();
    return data.pages[page]?.visits || 0;
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  formatTimeShort(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Reset all session data
  resetSessionData(): void {
    this.sessionData.set(this.createEmptySessionData());
    this.persistSessionData();
  }
}
