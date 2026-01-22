import { Component, inject, signal, computed } from '@angular/core';
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

  toggleStatusFilter() {
    const states: any[] = ['ALL', 'DRAFTING', 'PLANNING', 'REVISING', 'PUBLISHED'];
    const currentIdx = states.indexOf(this.statusFilter());
    const nextIdx = (currentIdx + 1) % states.length;
    this.statusFilter.set(states[nextIdx]);
  }

  toggleSort() {
    const sorts: any[] = ['UPDATED', 'TITLE', 'PROGRESS'];
    const currentIdx = sorts.indexOf(this.sortBy());
    const nextIdx = (currentIdx + 1) % sorts.length;
    this.sortBy.set(sorts[nextIdx]);
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
}
