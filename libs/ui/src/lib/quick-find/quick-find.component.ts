import { Component, inject, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService, MeetingsService, SemanticSearchService, AiService } from '@envello/core';

type ResultType = 'note' | 'task' | 'book' | 'bookmark' | 'meeting' | 'project' | 'command';
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
    book:     { label: 'Books',     icon: 'menu_book',    color: '#3b82f6' },
    bookmark: { label: 'Bookmarks', icon: 'bookmark',     color: '#a855f7' },
    meeting:  { label: 'Meetings',  icon: 'calendar_month', color: '#ec4899' },
    project:  { label: 'Spaces',    icon: 'folder',       color: '#60a5fa' },
    command:  { label: 'Commands',  icon: 'terminal',     color: '#94a3b8' },
};

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const NAV_COMMANDS: QuickFindResult[] = [
    { id: 'cmd-workspace',    type: 'command', title: 'Go to Workspace',    preview: 'Dashboard overview',          icon: 'dashboard',    route: '/workspace',     badge: '⌘1' },
    { id: 'cmd-tasks',        type: 'command', title: 'Go to Tasks',        preview: 'Manage your tasks',           icon: 'checklist',    route: '/tasks',         badge: '⌘2' },
    { id: 'cmd-notes',        type: 'command', title: 'Go to Notes',        preview: 'Daily notes & journals',      icon: 'edit_note',    route: '/daily-notes',   badge: '⌘3' },
    { id: 'cmd-meetings',     type: 'command', title: 'Go to Meetings',     preview: 'Schedule & notes',            icon: 'calendar_month', route: '/meetings' },
    { id: 'cmd-write',        type: 'command', title: 'Go to Write',        preview: 'Books & creative projects',   icon: 'menu_book',    route: '/write' },
    { id: 'cmd-research',     type: 'command', title: 'Go to Knowledge',    preview: 'Articles & research',         icon: 'hub',          route: '/knowledge' },
    { id: 'cmd-bookmarks',    type: 'command', title: 'Go to Bookmarks',    preview: 'Saved links & resources',     icon: 'bookmarks',    route: '/bookmarks' },
    ...( IS_TAURI ? [{ id: 'cmd-vault', type: 'command' as const, title: 'Go to Vault', preview: 'Secrets & credentials', icon: 'lock', route: '/vault' }] : []),
    { id: 'cmd-transactions', type: 'command', title: 'Go to Transactions',  preview: 'Manage transactions',         icon: 'receipt_long', route: '/transactions' },
    { id: 'cmd-activity',     type: 'command', title: 'Go to Activity Log', preview: 'View recent activity',        icon: 'history',      route: '/activity-log' },
    { id: 'cmd-bin',          type: 'command', title: 'Go to Bin',          preview: 'Deleted items',               icon: 'delete',       route: '/bin' },
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
    private semanticSearch = inject(SemanticSearchService);
    private ai = inject(AiService);

    isOpen = signal(false);
    searchQuery = signal('');
    activeFilter = signal<FilterType>('all');
    selectedIndex = signal(0);
    semanticResults = signal<QuickFindResult[]>([]);
    isSearchingAI = signal(false);
    aiAnswer = signal('');
    isAiStreaming = signal(false);
    aiSources = signal<QuickFindResult[]>([]);

    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private searchSequence = 0;
    private aiAbortRequested = false;

    readonly typeMeta = TYPE_META;
    readonly filterTypes: FilterType[] = ['all', 'note', 'task', 'book', 'bookmark', 'meeting'];

    isCommandMode = computed(() => this.searchQuery().startsWith('>'));
    isAiMode = computed(() => this.searchQuery().startsWith('?'));

    flatResults = computed<QuickFindResult[]>(() => {
        if (this.isAiMode()) return [];
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
        if (filter !== 'all' || this.isCommandMode() || this.isAiMode()) return [];

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

    navList = computed<QuickFindResult[]>(() => {
        if (this.isAiMode()) return this.aiSources();
        if (this.activeFilter() !== 'all' || this.isCommandMode()) return this.flatResults();
        return [...this.groups().flatMap(g => g.items), ...this.semanticResults()];
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

        if (this.isAiMode()) {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.submitAiQuery();
            }
            return;
        }

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
        setTimeout(() => (document.querySelector('.qf-input') as HTMLInputElement)?.focus(), 50);
    }

    close() {
        this.isOpen.set(false);
        this.searchQuery.set('');
        this.activeFilter.set('all');
        this.semanticResults.set([]);
        this.isSearchingAI.set(false);
        this.aiAnswer.set('');
        this.isAiStreaming.set(false);
        this.aiAbortRequested = true;
        this.aiSources.set([]);
        if (this.searchTimer) clearTimeout(this.searchTimer);
    }

    clearQuery() {
        this.searchQuery.set('');
        this.activeFilter.set('all');
        this.semanticResults.set([]);
        this.isSearchingAI.set(false);
        this.aiAnswer.set('');
        this.isAiStreaming.set(false);
        this.aiAbortRequested = true;
        this.aiSources.set([]);
        if (this.searchTimer) clearTimeout(this.searchTimer);
        setTimeout(() => (document.querySelector('.qf-input') as HTMLInputElement)?.focus(), 10);
    }

    setFilter(f: FilterType) {
        this.activeFilter.set(f);
        this.selectedIndex.set(0);
    }

    onInput(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchQuery.set(value);
        this.selectedIndex.set(0);
        // Reset AI answer when question changes
        if (this.aiAnswer()) {
            this.aiAnswer.set('');
            this.aiSources.set([]);
            this.aiAbortRequested = true;
        }
        this.scheduleSemanticSearch(value);
    }

    private scheduleSemanticSearch(query: string) {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        if (query.length < 3 || query.startsWith('>') || query.startsWith('?') || !this.semanticSearch.available) {
            this.semanticResults.set([]);
            this.isSearchingAI.set(false);
            return;
        }
        this.isSearchingAI.set(true);
        const seq = ++this.searchSequence;
        this.searchTimer = setTimeout(async () => {
            const docs = await this.semanticSearch.search(query, 8);
            if (seq !== this.searchSequence) return;
            const lexicalIds = new Set(this.flatResults().map(r => r.id));
            this.semanticResults.set(
                docs
                    .filter(d => !lexicalIds.has(d.id))
                    .map(d => ({
                        id: d.id,
                        type: d.type as ResultType,
                        title: d.title,
                        preview: d.preview,
                        icon: d.icon,
                        route: d.route,
                        tags: d.tags,
                        badge: d.badge,
                        date: d.date,
                    }))
            );
            this.isSearchingAI.set(false);
        }, 400);
    }

    async submitAiQuery() {
        const question = this.searchQuery().slice(1).trim();
        if (!question || this.isAiStreaming()) return;

        this.aiAnswer.set('');
        this.aiSources.set([]);
        this.isAiStreaming.set(true);
        this.aiAbortRequested = false;

        // ── Build context directly from store (always available) ──────────────
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const fmt = (d: Date) => d.toISOString().split('T')[0];

        const flattenTasks = (tasks: ReturnType<typeof this.store.tasks>): ReturnType<typeof this.store.tasks> => {
            const result: ReturnType<typeof this.store.tasks> = [];
            for (const t of tasks) {
                result.push(t);
                if (t.subtasks?.length) result.push(...flattenTasks(t.subtasks as any));
            }
            return result;
        };

        const allTasks = flattenTasks(this.store.tasks());
        const pendingTasks = allTasks.filter(t => t.status !== 'COMPLETED');
        const tasksBlock = pendingTasks.slice(0, 100)
            .map(t => `  - "${t.title}" | status: ${t.status} | due: ${t.due || 'none'} | priority: ${t.priority || 'none'} | project: ${t.project || 'none'}${t.parentId ? ' | subtask: yes' : ''}`)
            .join('\n') || '  (none)';

        const notesBlock = this.store.notes().slice(0, 20)
            .map(n => `  - "${n.title}": ${n.preview || ''}`)
            .join('\n') || '  (none)';

        const meetingsBlock = this.meetingsService.meetings().slice(0, 20)
            .map(m => `  - "${m.title}" on ${m.date || 'no date'}: ${m.description || ''}`)
            .join('\n') || '  (none)';

        const context = `You are a helpful assistant embedded in Envello, a personal productivity app.
Answer using the user's actual data below. Be concise and specific.
Tasks include both top-level tasks and subtasks. "due" dates are in YYYY-MM-DD format.

TODAY: ${fmt(today)}  |  TOMORROW: ${fmt(tomorrow)}

PENDING TASKS — including subtasks (${pendingTasks.length} pending of ${allTasks.length} total):
${tasksBlock}

RECENT NOTES:
${notesBlock}

MEETINGS:
${meetingsBlock}`;

        // ── Optionally augment with semantic search sources ───────────────────
        const sources: QuickFindResult[] = [];
        try {
            const docs = await this.semanticSearch.search(question, 6);
            sources.push(...docs.map(d => ({
                id: d.id, type: d.type as ResultType,
                title: d.title, preview: d.preview,
                icon: d.icon, route: d.route,
            })));
        } catch { /* embeddings not configured — skip */ }
        this.aiSources.set(sources);

        try {
            for await (const chunk of this.ai.streamMessage(question, context)) {
                if (this.aiAbortRequested) break;
                this.aiAnswer.update(a => a + chunk);
            }
        } catch {
            if (!this.aiAbortRequested) {
                this.aiAnswer.set('Something went wrong. Please check your AI settings and try again.');
            }
        } finally {
            this.isAiStreaming.set(false);
        }
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

    getSemanticGlobalIndex(itemIndex: number): number {
        return this.navList().length - this.semanticResults().length + itemIndex;
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
        if (filter === 'all' || filter === 'book') {
            this.store.books().slice(0, 3).forEach(n => results.push({
                id: n.id, type: 'book', title: n.title,
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
                icon: 'calendar_month', route: '/meetings', date: m.date
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
        if (filter === 'all' || filter === 'book') {
            this.store.books()
                .filter(n => n.title.toLowerCase().includes(query) || n.genre?.some(g => g.toLowerCase().includes(query)))
                .slice(0, 5)
                .forEach(n => results.push({ id: n.id, type: 'book', title: n.title, preview: n.genre?.join(', ') || '', icon: 'menu_book', route: '/write', badge: n.status }));
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
                .forEach(m => results.push({ id: m.id, type: 'meeting', title: m.title, preview: m.description || m.project || '', icon: 'calendar_month', route: '/meetings', date: m.date }));
        }
        return results;
    }
}
