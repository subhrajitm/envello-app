import { Component, inject, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService, MeetingsService } from '@envello/core';

type ResultType = 'note' | 'task' | 'novel' | 'bookmark' | 'meeting' | 'project' | 'command';
type FilterType = 'all' | ResultType;

interface QuickFindResult {
    id: string;
    type: ResultType;
    title: string;
    preview: string;
    icon: string;
    route: string;
    date?: string;
    tags?: string[];
    badge?: string;
}

interface ResultGroup {
    type: ResultType;
    label: string;
    icon: string;
    items: QuickFindResult[];
}

const TYPE_META: Record<ResultType, { label: string; icon: string; color: string }> = {
    note:     { label: 'Notes',     icon: 'edit_note',    color: '#22c55e' },
    task:     { label: 'Tasks',     icon: 'check_circle', color: '#fcd34d' },
    novel:    { label: 'Novels',    icon: 'menu_book',    color: '#3b82f6' },
    bookmark: { label: 'Bookmarks', icon: 'bookmark',     color: '#a855f7' },
    meeting:  { label: 'Meetings',  icon: 'groups',       color: '#ec4899' },
    project:  { label: 'Spaces',  icon: 'folder',       color: '#60a5fa' },
    command:  { label: 'Commands',  icon: 'terminal',     color: '#94a3b8' },
};

const NAV_COMMANDS: QuickFindResult[] = [
    { id: 'cmd-workspace',    type: 'command', title: 'Go to Workspace',    preview: 'Dashboard overview',          icon: 'dashboard',    route: '/workspace',     badge: '⌘1' },
    { id: 'cmd-tasks',        type: 'command', title: 'Go to Tasks',        preview: 'Manage your tasks',           icon: 'checklist',    route: '/tasks',         badge: '⌘2' },
    { id: 'cmd-notes',        type: 'command', title: 'Go to Notes',        preview: 'Daily notes & journals',      icon: 'edit_note',    route: '/daily-notes',   badge: '⌘3' },
    { id: 'cmd-meetings',     type: 'command', title: 'Go to Meetings',     preview: 'Schedule & notes',            icon: 'groups',       route: '/meetings' },
    { id: 'cmd-write',        type: 'command', title: 'Go to Write',        preview: 'Novels & creative projects',  icon: 'menu_book',    route: '/write' },
    { id: 'cmd-research',     type: 'command', title: 'Go to Research',     preview: 'Articles & research',         icon: 'science',      route: '/research' },
    { id: 'cmd-bookmarks',    type: 'command', title: 'Go to Bookmarks',    preview: 'Saved links & resources',     icon: 'bookmarks',    route: '/bookmarks' },
    { id: 'cmd-vault',        type: 'command', title: 'Go to Vault',        preview: 'Secrets & credentials',       icon: 'lock',         route: '/vault' },
    { id: 'cmd-subscriptions',type: 'command', title: 'Go to Vendors',      preview: 'Subscriptions & vendors',     icon: 'credit_card',  route: '/subscriptions' },
    { id: 'cmd-activity',     type: 'command', title: 'Go to Activity Log', preview: 'View recent activity',        icon: 'history',      route: '/activity-log' },
    { id: 'cmd-bin',          type: 'command', title: 'Go to Bin',          preview: 'Deleted items',               icon: 'delete',       route: '/bin' },
    { id: 'cmd-spaces',       type: 'command', title: 'Go to Spaces',     preview: 'Manage workspaces',           icon: 'folder',       route: '/spaces' },
];

@Component({
    selector: 'app-quick-find',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './quick-find.component.html',
    styleUrl: './quick-find.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickFindComponent {
    private store = inject(StoreService);
    private meetingsService = inject(MeetingsService);
    private router = inject(Router);

    isOpen = signal(false);
    searchQuery = signal('');
    activeFilter = signal<FilterType>('all');
    selectedIndex = signal(0);

    readonly typeMeta = TYPE_META;
    readonly filterTypes: FilterType[] = ['all', 'note', 'task', 'novel', 'bookmark', 'meeting', 'project'];

    isCommandMode = computed(() => this.searchQuery().startsWith('>'));

    flatResults = computed<QuickFindResult[]>(() => {
        const query = this.searchQuery().trim();
        const filter = this.activeFilter();

        if (this.isCommandMode()) {
            const term = query.slice(1).trim().toLowerCase();
            return NAV_COMMANDS.filter(c => !term || c.title.toLowerCase().includes(term) || c.preview.toLowerCase().includes(term));
        }

        if (!query) return this.buildRecentItems(filter);
        return this.buildSearchResults(query.toLowerCase(), filter);
    });

    groups = computed<ResultGroup[]>(() => {
        const filter = this.activeFilter();
        const items = this.flatResults();
        if (filter !== 'all' || this.isCommandMode()) return [];

        const map = new Map<ResultType, QuickFindResult[]>();
        for (const item of items) {
            const list = map.get(item.type) ?? [];
            list.push(item);
            map.set(item.type, list);
        }

        return Array.from(map.entries()).map(([type, groupItems]) => ({
            type,
            label: TYPE_META[type].label,
            icon: TYPE_META[type].icon,
            items: groupItems
        }));
    });

    // Flat list used for keyboard navigation
    navList = computed<QuickFindResult[]>(() => {
        if (this.activeFilter() !== 'all' || this.isCommandMode()) {
            return this.flatResults();
        }
        return this.groups().flatMap(g => g.items);
    });

    totalCount = computed(() => this.navList().length);

    @HostListener('document:keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            this.isOpen() ? this.close() : this.open();
            return;
        }
        if (!this.isOpen()) return;

        if (event.key === 'Escape') { this.close(); return; }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.selectedIndex.update(i => Math.min(i + 1, this.totalCount() - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.selectedIndex.update(i => Math.max(i - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            this.selectResult(this.navList()[this.selectedIndex()]);
        }
    }

    open() {
        this.isOpen.set(true);
        this.searchQuery.set('');
        this.activeFilter.set('all');
        this.selectedIndex.set(0);
        (document.querySelector('.qf-input') as HTMLInputElement)?.focus();
    }

    close() {
        this.isOpen.set(false);
        this.searchQuery.set('');
        this.activeFilter.set('all');
    }

    setFilter(f: FilterType) {
        this.activeFilter.set(f);
        this.selectedIndex.set(0);
    }

    onInput(event: Event) {
        this.searchQuery.set((event.target as HTMLInputElement).value);
        this.selectedIndex.set(0);
    }

    selectResult(result: QuickFindResult | undefined) {
        if (!result) return;
        this.router.navigate([result.route]);
        this.close();
    }

    getTypeColor(type: ResultType): string {
        return TYPE_META[type]?.color ?? 'var(--text-tertiary)';
    }

    getTypeLabel(type: ResultType): string {
        return TYPE_META[type]?.label ?? type;
    }

    getFilterMeta(): { label: string; icon: string; color: string } {
        const f = this.activeFilter();
        return f !== 'all' ? TYPE_META[f] : { label: '', icon: '', color: '' };
    }

    /** Returns the index of item i within group g in the flat navList, used for keyboard selection. */
    getGlobalIndex(group: ResultGroup, itemIndex: number): number {
        const groups = this.groups();
        let offset = 0;
        for (const g of groups) {
            if (g.type === group.type) return offset + itemIndex;
            offset += g.items.length;
        }
        return offset + itemIndex;
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private buildRecentItems(filter: FilterType): QuickFindResult[] {
        const results: QuickFindResult[] = [];

        if (filter === 'all' || filter === 'note') {
            this.store.notes().slice(0, 3).forEach(n => results.push({
                id: n.id, type: 'note', title: n.title, preview: n.preview || '',
                icon: 'edit_note', route: '/daily-notes', date: n.lastEdited || n.date, tags: n.tags
            }));
        }
        if (filter === 'all' || filter === 'task') {
            this.store.tasks().filter(t => t.status !== 'COMPLETED').slice(0, 3).forEach(t => results.push({
                id: t.id, type: 'task', title: t.title,
                preview: [t.project, t.priority].filter(Boolean).join(' · '),
                icon: 'check_circle', route: '/tasks', date: t.due, badge: t.status
            }));
        }
        if (filter === 'all' || filter === 'novel') {
            this.store.novels().slice(0, 3).forEach(n => results.push({
                id: n.id, type: 'novel', title: n.title,
                preview: n.genre?.join(', ') || n.status,
                icon: 'menu_book', route: '/write', badge: n.status
            }));
        }
        if (filter === 'all' || filter === 'bookmark') {
            this.store.bookmarks().slice(0, 3).forEach(b => results.push({
                id: b.id, type: 'bookmark', title: b.title, preview: b.url,
                icon: 'bookmark', route: '/bookmarks', tags: b.tags
            }));
        }
        if (filter === 'all' || filter === 'meeting') {
            this.meetingsService.meetings().slice(0, 3).forEach(m => results.push({
                id: m.id, type: 'meeting', title: m.title,
                preview: m.description || m.project || '',
                icon: 'groups', route: '/meetings', date: m.date
            }));
        }
        if (filter === 'all' || filter === 'project') {
            this.store.spaces().slice(0, 3).forEach(p => results.push({
                id: p.id, type: 'project', title: p.title,
                preview: p.description || p.status,
                icon: 'folder', route: '/spaces', badge: p.status
            }));
        }

        return results;
    }

    private buildSearchResults(query: string, filter: FilterType): QuickFindResult[] {
        const results: QuickFindResult[] = [];

        if (filter === 'all' || filter === 'note') {
            this.store.notes()
                .filter(n => n.title.toLowerCase().includes(query) || n.preview?.toLowerCase().includes(query) || n.tags?.some(t => t.toLowerCase().includes(query)))
                .slice(0, 5)
                .forEach(n => results.push({ id: n.id, type: 'note', title: n.title, preview: n.preview || '', icon: 'edit_note', route: '/daily-notes', date: n.lastEdited || n.date, tags: n.tags }));
        }
        if (filter === 'all' || filter === 'task') {
            this.store.tasks()
                .filter(t => t.title.toLowerCase().includes(query) || t.project?.toLowerCase().includes(query) || t.labels?.some(l => l.toLowerCase().includes(query)))
                .slice(0, 5)
                .forEach(t => results.push({ id: t.id, type: 'task', title: t.title, preview: [t.project, t.priority].filter(Boolean).join(' · '), icon: 'check_circle', route: '/tasks', date: t.due, badge: t.status }));
        }
        if (filter === 'all' || filter === 'novel') {
            this.store.novels()
                .filter(n => n.title.toLowerCase().includes(query) || n.genre?.some(g => g.toLowerCase().includes(query)))
                .slice(0, 5)
                .forEach(n => results.push({ id: n.id, type: 'novel', title: n.title, preview: n.genre?.join(', ') || '', icon: 'menu_book', route: '/write', badge: n.status }));
        }
        if (filter === 'all' || filter === 'bookmark') {
            this.store.bookmarks()
                .filter(b => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query) || b.description?.toLowerCase().includes(query) || b.tags?.some(t => t.toLowerCase().includes(query)))
                .slice(0, 5)
                .forEach(b => results.push({ id: b.id, type: 'bookmark', title: b.title, preview: b.url, icon: 'bookmark', route: '/bookmarks', tags: b.tags }));
        }
        if (filter === 'all' || filter === 'meeting') {
            this.meetingsService.meetings()
                .filter(m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query) || m.project?.toLowerCase().includes(query))
                .slice(0, 5)
                .forEach(m => results.push({ id: m.id, type: 'meeting', title: m.title, preview: m.description || m.project || '', icon: 'groups', route: '/meetings', date: m.date }));
        }
        if (filter === 'all' || filter === 'project') {
            this.store.spaces()
                .filter(p => p.title.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
                .slice(0, 5)
                .forEach(p => results.push({ id: p.id, type: 'project', title: p.title, preview: p.description || '', icon: 'folder', route: '/spaces', badge: p.status }));
        }

        return results;
    }
}
