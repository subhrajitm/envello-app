import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService, RecentActivityService, MeetingsService } from '@envello/core';

interface ActivityRow {
  id: string;
  type: string;
  title: string;
  icon: string;
  timeLabel: string;
  route: string[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css'
})
export class RecentActivityComponent {
  private store = inject(StoreService);
  private recentActivity = inject(RecentActivityService);
  private meetingsService = inject(MeetingsService);
  private router = inject(Router);

  activities = computed((): ActivityRow[] => {
    const records = this.recentActivity.recentItems(10);
    const now = Date.now();

    return records.map(r => {
      const title = this.lookupTitle(r.id, r.type);
      const { route, queryParams } = this.buildRoute(r.id, r.type);
      return {
        id: r.id,
        type: r.type,
        title: title ?? 'Untitled',
        icon: this.iconFor(r.type),
        timeLabel: this.formatAge(now - r.ts),
        route,
        queryParams,
      };
    }).filter(r => r.title !== null);
  });

  navigateTo(row: ActivityRow) {
    this.router.navigate(row.route, row.queryParams ? { queryParams: row.queryParams } : undefined);
  }

  viewAll() {
    this.router.navigate(['/activity-log']);
  }

  private lookupTitle(id: string, type: string): string | null {
    switch (type) {
      case 'note':     return this.store.notes().find(n => n.id === id)?.title || null;
      case 'task':     return this.store.tasks().find(t => t.id === id)?.title || null;
      case 'book':     return this.store.books().find(b => b.id === id)?.title || null;
      case 'bookmark': return this.store.bookmarks().find(b => b.id === id)?.title || null;
      case 'meeting':  return this.meetingsService.meetings().find(m => m.id === id)?.title || null;
      default:         return null;
    }
  }

  private buildRoute(id: string, type: string): { route: string[]; queryParams?: Record<string, string> } {
    switch (type) {
      case 'note':     return { route: ['/daily-notes'], queryParams: { noteId: id } };
      case 'task':     return { route: ['/tasks'], queryParams: { taskId: id } };
      case 'book':     return { route: ['/write', id] };
      case 'bookmark': return { route: ['/bookmarks'] };
      case 'meeting':  return { route: ['/meetings'] };
      default:         return { route: ['/workspace'] };
    }
  }

  private iconFor(type: string): string {
    switch (type) {
      case 'note':     return 'description';
      case 'task':     return 'check_circle';
      case 'book':     return 'menu_book';
      case 'bookmark': return 'bookmark';
      case 'meeting':  return 'calendar_month';
      default:         return 'history';
    }
  }

  private formatAge(ms: number): string {
    const mins  = Math.floor(ms / 60_000);
    const hours = Math.floor(ms / 3_600_000);
    const days  = Math.floor(ms / 86_400_000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}
