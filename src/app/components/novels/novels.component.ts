import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-novels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './novels.component.html',
  styleUrl: './novels.component.css'
})
export class NovelsComponent {
  private router = inject(Router);
  store = inject(StoreService);

  viewMode = signal<'LIST' | 'GRID'>('LIST');
  statusFilter = signal<'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'>('ALL');
  sortBy = signal<'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'>('UPDATED');
  statusDropdownOpen = signal(false);
  sortDropdownOpen = signal(false);

  novels = computed(() => {
    let list = this.store.novels();

    // Filter
    if (this.statusFilter() !== 'ALL') {
      list = list.filter(n => n.status === this.statusFilter());
    }

    // Sort
    return list.sort((a, b) => {
      switch (this.sortBy()) {
        case 'UPDATED': return 0; // Keeping simple for demo as date strings are fuzzy
        case 'TITLE': return a.title.localeCompare(b.title);
        case 'PROGRESS': return b.progress - a.progress;
        default: return 0;
      }
    });
  });

  // Metrics
  totalWords = computed(() => {
    return this.store.novels().reduce((acc, curr) => acc + curr.wordCount, 0);
  });

  activeDrafts = computed(() => {
    return this.store.novels().filter(n => n.status !== 'PUBLISHED').length;
  });

  avgCompletion = computed(() => {
    const list = this.store.novels();
    if (list.length === 0) return 0;
    const total = list.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(total / list.length);
  });

  toggleView(mode: 'LIST' | 'GRID') {
    this.viewMode.set(mode);
  }

  toggleStatusDropdown() {
    this.statusDropdownOpen.update(v => !v);
    if (this.statusDropdownOpen()) {
      this.sortDropdownOpen.set(false);
    }
  }

  toggleSortDropdown() {
    this.sortDropdownOpen.update(v => !v);
    if (this.sortDropdownOpen()) {
      this.statusDropdownOpen.set(false);
    }
  }

  selectStatus(status: 'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED') {
    this.statusFilter.set(status);
    this.statusDropdownOpen.set(false);
  }

  selectSort(sort: 'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS') {
    this.sortBy.set(sort);
    this.sortDropdownOpen.set(false);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ALL': return 'filter_alt';
      case 'DRAFTING': return 'edit';
      case 'PLANNING': return 'lightbulb';
      case 'REVISING': return 'autorenew';
      case 'PUBLISHED': return 'check_circle';
      default: return 'filter_alt';
    }
  }

  getStatusLabel(status: string): string {
    return status;
  }

  getSortIcon(sort: string): string {
    switch (sort) {
      case 'UPDATED': return 'schedule';
      case 'CREATED': return 'calendar_today';
      case 'TITLE': return 'sort_by_alpha';
      case 'PROGRESS': return 'trending_up';
      default: return 'sort';
    }
  }

  getSortLabel(sort: string): string {
    switch (sort) {
      case 'UPDATED': return 'Last Updated';
      case 'CREATED': return 'Date Created';
      case 'TITLE': return 'Title';
      case 'PROGRESS': return 'Progress';
      default: return sort;
    }
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'DRAFTING': return 'status-yellow';
      case 'PLANNING': return 'status-gray';
      case 'PUBLISHED': return 'status-green';
      case 'REVISING': return 'status-orange';
      default: return 'status-gray';
    }
  }

  getProgressColor(status: string) {
    switch (status) {
      case 'PUBLISHED': return '#4ade80';
      default: return '#fcd34d'; // Match yellow-400
    }
  }

  openNovel(id: string) {
    this.router.navigate(['/novels', id]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-wrapper')) {
      this.statusDropdownOpen.set(false);
      this.sortDropdownOpen.set(false);
    }
  }
}
