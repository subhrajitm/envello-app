import { __decorate } from "tslib";
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '@envello/core';
import { BinService } from '@envello/core';
import { SessionService } from '@envello/core';
import { UserService } from '@envello/core';
import { MeetingsService } from '@envello/core';
import { ArticleService } from '@envello/core';
import { JournalService } from '@envello/core';
import { ResearchService } from '@envello/core';
import { SqliteService } from '@envello/core';
import { TauriService } from '@envello/core';
let DeveloperSettingsComponent = class DeveloperSettingsComponent {
    router = inject(Router);
    store = inject(StoreService);
    bin = inject(BinService);
    session = inject(SessionService);
    userService = inject(UserService);
    meetings = inject(MeetingsService);
    articles = inject(ArticleService);
    journal = inject(JournalService);
    research = inject(ResearchService);
    sqlite = inject(SqliteService);
    tauri = inject(TauriService);
    isExporting = signal(false);
    activeTab = signal('tasks');
    searchQuery = signal('');
    tabs = computed(() => [
        this.makeTab('tasks', 'Tasks', 'checklist', 'Tasks', ['id', 'title', 'priority', 'status', 'project'], this.store.tasks()),
        this.makeTab('notes', 'Notes', 'note', 'Content', ['id', 'date', 'title', 'preview'], this.store.notes()),
        this.makeTab('planning', 'Planning Items', 'timeline', 'Tasks', ['id', 'title', 'tag', 'stage'], this.store.planningItems()),
        this.makeTab('activities', 'Activities', 'history', 'System', ['id', 'text', 'time', 'type'], this.store.activities()),
        this.makeTab('novels', 'Novels', 'menu_book', 'Content', ['id', 'title', 'status', 'wordCount', 'chapters'], this.store.novels()),
        this.makeTab('meetings', 'Meetings', 'event', 'Content', ['id', 'title', 'date', 'startTime', 'status'], this.meetings.meetings()),
        this.makeTab('articles', 'Articles', 'article', 'Content', ['id', 'title', 'platform', 'pipeline', 'wordCount'], this.articles.articles()),
        this.makeTab('journal-projects', 'Journal Projects', 'folder', 'Content', ['id', 'title', 'entriesCount', 'active'], this.journal.projects()),
        this.makeTab('journal-entries', 'Journal Entries', 'description', 'Content', ['id', 'projectId', 'title', 'type', 'column'], this.journal.entries()),
        this.makeTab('journal-columns', 'Journal Columns', 'view_column', 'Content', ['id', 'name', 'color', 'order'], this.journal.columns()),
        this.makeTab('research-libraries', 'Research Libraries', 'folder', 'Research', ['id', 'name', 'description'], this.research.libraries()),
        this.makeTab('research-sources', 'Research Sources', 'source', 'Research', ['id', 'libraryId', 'title', 'sourceType'], this.research.sources()),
        this.makeTab('research-summaries', 'Research Summaries', 'summarize', 'Research', ['id', 'libraryId', 'title', 'sourceIds'], this.research.summaries()),
        this.makeTab('bin', 'Bin Items', 'delete', 'System', ['id', 'type', 'originalId', 'title', 'deletedAt'], this.bin.items()),
        this.makeSessionTab(),
        this.makeUserTab(),
    ]);
    tabGroups = computed(() => {
        const groups = new Map();
        for (const tab of this.tabs()) {
            const list = groups.get(tab.group) ?? [];
            list.push(tab);
            groups.set(tab.group, list);
        }
        return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
    });
    activeTabData = computed(() => {
        const id = this.activeTab();
        return this.tabs().find(t => t.id === id) ?? this.tabs()[0];
    });
    makeTab(id, label, icon, group, columns, data) {
        return {
            id,
            label,
            icon,
            group,
            columns,
            data: [...data],
            count: data.length
        };
    }
    makeSessionTab() {
        const stats = this.session.pageStats();
        const sessionRows = stats.map(p => ({
            page: p.page,
            totalTimeMs: p.totalTimeMs,
            totalTime: this.session.formatTime(p.totalTimeMs),
            visits: p.visits,
            lastVisited: p.lastVisited
        }));
        return {
            id: 'session',
            label: 'Session / Page Stats',
            icon: 'schedule',
            group: 'System',
            columns: ['page', 'totalTime', 'totalTimeMs', 'visits', 'lastVisited'],
            data: sessionRows,
            count: sessionRows.length
        };
    }
    makeUserTab() {
        const u = this.userService.user();
        const userRows = u ? [{
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                joinedDate: u.joinedDate,
                stats: JSON.stringify(u.stats),
                preferences: JSON.stringify(u.preferences)
            }] : [];
        return {
            id: 'user',
            label: 'User Profile',
            icon: 'person',
            group: 'System',
            columns: ['id', 'name', 'email', 'role', 'joinedDate', 'stats', 'preferences'],
            data: userRows,
            count: userRows.length
        };
    }
    setActiveTab(id) {
        this.activeTab.set(id);
        this.searchQuery.set('');
    }
    goBack() {
        this.router.navigate(['/workspace']);
    }
    onSearchInput(e) {
        const el = e.target;
        this.searchQuery.set(el?.value?.trim() ?? '');
    }
    clearSearch() {
        this.searchQuery.set('');
    }
    formatColumnName(col) {
        return col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }
    getCellValue(row, col) {
        const val = row[col];
        if (val === null || val === undefined)
            return '—';
        if (typeof val === 'object')
            return JSON.stringify(val).slice(0, 80) + (JSON.stringify(val).length > 80 ? '…' : '');
        if (typeof val === 'boolean')
            return val ? 'Yes' : 'No';
        if (val instanceof Date)
            return val.toISOString();
        return String(val);
    }
    /** Filtered and precomputed table rows */
    tableRows = computed(() => {
        const tab = this.activeTabData();
        const query = this.searchQuery().toLowerCase();
        let rows = tab.data.map((row) => tab.columns.map((col) => this.getCellValue(row, col)));
        if (query) {
            rows = rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(query)));
        }
        return rows;
    });
    filteredCount = computed(() => this.tableRows().length);
    totalCount = computed(() => this.activeTabData().data.length);
    copyFeedback = signal(false);
    async copyToClipboard() {
        const tab = this.activeTabData();
        const rows = this.tableRows();
        const header = tab.columns.map((c) => this.formatColumnName(c)).join('\t');
        const body = rows.map((r) => r.join('\t')).join('\n');
        const text = [header, body].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            this.copyFeedback.set(true);
            setTimeout(() => this.copyFeedback.set(false), 1500);
        }
        catch {
            console.warn('Clipboard copy failed');
        }
    }
    async exportData() {
        this.isExporting.set(true);
        try {
            const data = await this.sqlite.exportAllData();
            const content = JSON.stringify(data, null, 2);
            const path = await this.tauri.saveFile({
                defaultPath: `envello-backup-${new Date().toISOString().split('T')[0]}.json`,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (path) {
                await this.tauri.writeTextFile(path, content);
                await this.tauri.notify({ title: 'Export Successful', body: `Data saved to ${path}` });
            }
        }
        catch (e) {
            console.error('Export failed', e);
            await this.tauri.notify({ title: 'Export Failed', body: String(e) });
        }
        finally {
            this.isExporting.set(false);
        }
    }
};
DeveloperSettingsComponent = __decorate([
    Component({
        selector: 'app-developer-settings',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './developer-settings.component.html',
        styleUrl: './developer-settings.component.css'
    })
], DeveloperSettingsComponent);
export { DeveloperSettingsComponent };
