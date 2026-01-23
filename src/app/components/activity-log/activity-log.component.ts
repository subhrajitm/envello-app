import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '../../services/store.service';

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

  searchQuery = signal('');
  activeFilter = signal<'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI'>('ALL');
  expandedRowId = signal<string | null>(null);

  // Raw mapped activities
  allActivities = computed(() => {
    return this.store.activities().map(activity => ({
      id: activity.id,
      action: activity.text,
      time: activity.time,
      type: activity.type,
      icon: this.getIconForType(activity.type),
      user: 'Super Admin',
      device: 'MacBook Pro',
      ip: '192.168.1.1'
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
        a.action.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query)
      );
    }

    return list;
  });

  totalCount = computed(() => this.allActivities().length);
  visibleCount = computed(() => this.filteredActivities().length);

  goBack() {
    this.router.navigate(['/overview']);
  }

  setFilter(filter: 'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI') {
    this.activeFilter.set(filter);
    this.expandedRowId.set(null); // Close details on filter change
  }

  updateSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  toggleRow(id: string) {
    if (this.expandedRowId() === id) {
      this.expandedRowId.set(null);
    } else {
      this.expandedRowId.set(id);
    }
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
