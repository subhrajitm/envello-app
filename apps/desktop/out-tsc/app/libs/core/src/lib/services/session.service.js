import { __decorate } from "tslib";
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
const STORAGE_KEY = 'envello-session-data';
const PAGE_MAP = {
    'overview': 'Overview',
    'novels': 'Novels/Fiction',
    'research': 'Research',
    'articles': 'Articles/Blogs',
    'journals': 'Journals',
    'daily-notes': 'Daily Notes',
    'tasks': 'Tasks/Todos',
    'meetings': 'Meetings',
    'books': 'Books/Reading',
    'snippets': 'Code Snippets',
    'bin': 'Bin'
};
let SessionService = class SessionService {
    router = inject(Router);
    routerSub;
    intervalId;
    currentPage = signal('');
    pageStartTime = signal(0);
    sessionData = signal(this.loadSessionData());
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
    initTracking() {
        // Track route changes
        this.routerSub = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event) => {
            const navEnd = event;
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
    ngOnDestroy() {
        this.cleanup();
    }
    cleanup() {
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
    handleVisibilityChange = () => {
        if (document.hidden) {
            // Tab hidden - save current time
            this.saveCurrentPageTime();
        }
        else {
            // Tab visible again - reset start time
            this.pageStartTime.set(Date.now());
        }
    };
    handleBeforeUnload = () => {
        this.saveCurrentPageTime();
    };
    onPageChange(newPage) {
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
    updateCurrentPageTime() {
        if (document.hidden)
            return;
        const page = this.currentPage();
        const startTime = this.pageStartTime();
        if (!page || !startTime)
            return;
        const elapsed = Date.now() - startTime;
        // Only update if at least 1 second has passed
        if (elapsed >= 1000) {
            this.addTimeToPage(page, 1000);
            this.pageStartTime.set(Date.now());
        }
    }
    saveCurrentPageTime() {
        const page = this.currentPage();
        const startTime = this.pageStartTime();
        if (!page || !startTime)
            return;
        const elapsed = Date.now() - startTime;
        if (elapsed > 0) {
            this.addTimeToPage(page, elapsed);
            this.pageStartTime.set(Date.now());
        }
    }
    addTimeToPage(page, timeMs) {
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
    loadSessionData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Reset today's time if it's a new day
                const today = new Date().toISOString().split('T')[0];
                if (data.todayDate !== today) {
                    data.todayTimeMs = 0;
                    data.todayDate = today;
                }
                return data;
            }
        }
        catch (e) {
            console.error('[SessionService] Failed to load session data:', e);
        }
        return this.createEmptySessionData();
    }
    createEmptySessionData() {
        return {
            pages: {},
            sessionStart: new Date().toISOString(),
            totalSessionTimeMs: 0,
            todayTimeMs: 0,
            todayDate: new Date().toISOString().split('T')[0]
        };
    }
    persistSessionData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessionData()));
        }
        catch (e) {
            console.error('[SessionService] Failed to persist session data:', e);
        }
    }
    // Public methods for getting stats
    getTimeSpentOnPage(page) {
        const data = this.sessionData();
        return data.pages[page]?.totalTimeMs || 0;
    }
    getVisitsForPage(page) {
        const data = this.sessionData();
        return data.pages[page]?.visits || 0;
    }
    formatTime(ms) {
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
    formatTimeShort(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    // Reset all session data
    resetSessionData() {
        this.sessionData.set(this.createEmptySessionData());
        this.persistSessionData();
    }
};
SessionService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], SessionService);
export { SessionService };
