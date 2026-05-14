import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService, UserService } from '@envello/core';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.css'
})
export class ActivityLogComponent {
  private store = inject(StoreService);
  private router = inject(Router);
  private userService = inject(UserService);

  searchQuery = signal('');
  activeFilter = signal<'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI'>('ALL');
  expandedRowId = signal<string | null>(null);

  userName = this.userService.userName;
  userInitials = this.userService.userInitials;

  // Raw mapped activities
  allActivities = computed(() => {
    return this.store.activities().map(activity => ({
      id: activity.id,
      action: activity.text,
      time: activity.time,
      type: activity.type,
      icon: this.getIconForType(activity.type),
    }));
  });

  // Filtered activities
  filteredActivities = computed(() => {
    let list = this.allActivities();
    const query = this.searchQuery().toLowerCase();
    const filter = this.activeFilter();

    if (filter !== 'ALL') {
      list = list.filter(a => a.type.toLowerCase() === filter.toLowerCase());
    }

    if (query) {
      list = list.filter(a =>
        a.action.toLowerCase().includes(query)
      );
    }

    return list;
  });

  totalCount = computed(() => this.allActivities().length);
  visibleCount = computed(() => this.filteredActivities().length);

  goBack() {
    this.router.navigate(['/workspace']);
  }

  setFilter(filter: 'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI') {
    this.activeFilter.set(filter);
    this.expandedRowId.set(null);
  }

  updateSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  toggleRow(id: string) {
    this.expandedRowId.set(this.expandedRowId() === id ? null : id);
  }

  refresh() {
    // No-op for now; activities come from live store
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'entry': return 'edit_note';
      case 'sync': return 'cloud_sync';
      case 'ai': return 'smart_toy';
      case 'system': return 'settings';
      default: return 'info';
    }
  }
}
