import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from '@envello/ui';
import { Router } from '@angular/router';
import { StoreService } from '@envello/core';
import { BinService } from '@envello/core';
import { SessionService } from '@envello/core';
import { UserService } from '@envello/core';
import { MeetingsService } from '@envello/core';
import { ArticleService } from '@envello/core';
import { ResearchService } from '@envello/core';
import { SqliteDataService as DatabaseService } from '@envello/core';

export interface DataTab {
  id: string;
  label: string;
  icon: string;
  group: string;
  columns: string[];
  data: unknown[];
  count: number;
}

@Component({
  selector: 'app-developer-settings',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './developer-settings.component.html',
  styleUrl: './developer-settings.component.css'
})
export class DeveloperSettingsComponent {
  private router = inject(Router);
  private store = inject(StoreService);
  private bin = inject(BinService);
  private session = inject(SessionService);
  private userService = inject(UserService);
  private meetings = inject(MeetingsService);
  private articles = inject(ArticleService);
  private research = inject(ResearchService);
  private db = inject(DatabaseService);

  isImporting = signal(false);
  importConfirm = signal(false);
  private pendingImportData: unknown = null;
  pendingImportFileName = '';

  activeTab = signal<string>('tasks');
  searchQuery = signal('');

  tabs = computed<DataTab[]>(() => [
    this.makeTab('tasks', 'Tasks', 'checklist', 'Tasks', ['id', 'title', 'priority', 'status', 'project'], this.store.tasks()),
    this.makeTab('notes', 'Notes', 'note', 'Content', ['id', 'date', 'title', 'preview'], this.store.notes()),
    this.makeTab('planning', 'Planning Items', 'timeline', 'Tasks', ['id', 'title', 'tag', 'stage'], this.store.planningItems()),
    this.makeTab('activities', 'Activities', 'history', 'System', ['id', 'text', 'time', 'type'], this.store.activities()),
    this.makeTab('novels', 'Novels', 'menu_book', 'Content', ['id', 'title', 'status', 'wordCount', 'chapters'], this.store.novels()),
    this.makeTab('meetings', 'Meetings', 'event', 'Content', ['id', 'title', 'date', 'startTime', 'status'], this.meetings.meetings()),
    this.makeTab('articles', 'Articles', 'article', 'Content', ['id', 'title', 'platform', 'pipeline', 'wordCount'], this.articles.articles()),
    this.makeTab('research-libraries', 'Research Libraries', 'folder', 'Research', ['id', 'name', 'description'], this.research.libraries()),
    this.makeTab('research-sources', 'Research Sources', 'source', 'Research', ['id', 'libraryId', 'title', 'sourceType'], this.research.sources()),
    this.makeTab('research-summaries', 'Research Summaries', 'summarize', 'Research', ['id', 'libraryId', 'title', 'sourceIds'], this.research.summaries()),
    this.makeTab('bin', 'Bin Items', 'delete', 'System', ['id', 'type', 'originalId', 'title', 'deletedAt'], this.bin.items()),
    this.makeSessionTab(),
    this.makeUserTab(),
  ]);

  tabGroups = computed(() => {
    const groups = new Map<string, DataTab[]>();
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

  private makeTab(id: string, label: string, icon: string, group: string, columns: string[], data: unknown[]): DataTab {
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

  private makeSessionTab(): DataTab {
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

  private makeUserTab(): DataTab {
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

  setActiveTab(id: string) {
    this.activeTab.set(id);
    this.searchQuery.set('');
  }

  goBack() {
    this.router.navigate(['/workspace']);
  }

  onSearchInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.searchQuery.set(el?.value?.trim() ?? '');
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  formatColumnName(col: string): string {
    return col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  getCellValue(row: Record<string, unknown>, col: string): string {
    const val = row[col];
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 80) + (JSON.stringify(val).length > 80 ? '…' : '');
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (val instanceof Date) return val.toISOString();
    return String(val);
  }

  /** Filtered and precomputed table rows */
  tableRows = computed(() => {
    const tab = this.activeTabData();
    const query = this.searchQuery().toLowerCase();
    let rows = tab.data.map((row) =>
      tab.columns.map((col) => this.getCellValue(row as Record<string, unknown>, col))
    );
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
      this.copyFeedback.set(false);
      this.copyFeedback.set(true);
    } catch {
      console.warn('Clipboard copy failed');
    }
  }


  async onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.isImporting.set(true);

    try {
      const text = await file.text();
      this.pendingImportData = JSON.parse(text);
      this.pendingImportFileName = file.name;
      this.importConfirm.set(true);
    } catch (e) {
      console.error('Import parse failed', e);
    } finally {
      this.isImporting.set(false);
      input.value = '';
    }
  }

  async doImport() {
    this.importConfirm.set(false);
    if (!this.pendingImportData) return;
    try {
      await this.db.importData(this.pendingImportData);
      window.location.reload();
    } catch (e) {
      console.error('Import failed', e);
    } finally {
      this.pendingImportData = null;
      this.pendingImportFileName = '';
    }
  }
}
