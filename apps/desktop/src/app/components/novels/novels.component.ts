import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NovelStore } from '@envello/shared-state';
import { NovelCommands, Novel, NovelContent } from '@envello/shared-domain';
import { ButtonComponent, ModalComponent, EmptyStateComponent } from '../../shared/ui';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-novels',
  standalone: true,
  imports: [CommonModule, ButtonComponent, ModalComponent, EmptyStateComponent],
  templateUrl: './novels.component.html',
  styleUrl: './novels.component.css'
})
export class NovelsComponent {
  private router = inject(Router);
  novelStore = inject(NovelStore);
  novelCommands = inject(NovelCommands);

  viewMode = signal<'LIST' | 'GRID'>('LIST');
  statusFilter = signal<'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'>('ALL');
  sortBy = signal<'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'>('UPDATED');
  statusDropdownOpen = signal(false);
  sortDropdownOpen = signal(false);

  showAddModal = signal(false);
  addModalSubmitting = signal(false);
  newNovel = signal<{ title: string; status: Novel['status']; genre: string; targetWordCount: number; icon: string }>({
    title: '',
    status: 'PLANNING',
    genre: '',
    targetWordCount: 80000,
    icon: 'menu_book'
  });

  readonly novelIcons = [
    { id: 'menu_book', label: 'Book' },
    { id: 'auto_stories', label: 'Story' },
    { id: 'token', label: 'Token' },
    { id: 'castle', label: 'Castle' },
    { id: 'rocket_launch', label: 'Rocket' },
    { id: 'water_drop', label: 'Drop' },
  ] as const;

  novelMenuOpen = signal<string | null>(null);
  showDeleteModal = signal(false);
  novelToDelete = signal<Novel | null>(null);

  novels = computed(() => {
    let list: Novel[] = (this.novelStore.novels() as any);

    // Filter
    if (this.statusFilter() !== 'ALL') {
      list = list.filter((n: Novel) => n.status === this.statusFilter());
    }

    // Sort
    return list.sort((a: Novel, b: Novel) => {
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
    return (this.novelStore.novels() as any).reduce((acc: number, curr: Novel) => acc + curr.wordCount, 0);
  });

  activeDrafts = computed(() => {
    return (this.novelStore.novels() as any).filter((n: Novel) => n.status !== 'PUBLISHED').length;
  });

  avgCompletion = computed(() => {
    const list = (this.novelStore.novels() as any);
    if (list.length === 0) return 0;
    const total = list.reduce((acc: number, curr: Novel) => acc + curr.progress, 0);
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

  toggleNovelMenu(novelId: string, e?: Event) {
    e?.stopPropagation();
    this.novelMenuOpen.update(id => (id === novelId ? null : novelId));
  }

  closeNovelMenu() {
    this.novelMenuOpen.set(null);
  }

  openDeleteModal(novel: Novel, e?: Event) {
    e?.stopPropagation();
    this.novelToDelete.set(novel);
    this.showDeleteModal.set(true);
    this.closeNovelMenu();
  }

  cancelDeleteNovel() {
    this.showDeleteModal.set(false);
    this.novelToDelete.set(null);
  }

  confirmDeleteNovel() {
    const novel = this.novelToDelete() as any;
    if (novel) {
      this.novelCommands.deleteNovel(novel.id);
      this.cancelDeleteNovel();
    }
  }

  openAddModal() {
    this.newNovel.set({
      title: '',
      status: 'PLANNING',
      genre: '',
      targetWordCount: 80000,
      icon: 'menu_book'
    });
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.addModalSubmitting.set(false);
  }

  updateNewNovel(key: 'title' | 'status' | 'genre' | 'targetWordCount' | 'icon', value: string | number) {
    this.newNovel.update(n => ({ ...n, [key]: value }));
  }

  async addNovel() {
    const form = this.newNovel();
    const title = form.title.trim();
    if (!title) return;
    this.addModalSubmitting.set(true);
    try {
      const id = uuidv4();
      const now = new Date();
      const createdDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const genre = form.genre.trim() ? form.genre.split(',').map(s => s.trim()).filter(Boolean) : ['Fiction'];

      const novel: Novel = {
        id,
        title,
        icon: form.icon,
        status: form.status,
        wordCount: 0,
        targetWordCount: Math.max(0, form.targetWordCount) || 80000,
        progress: 0,
        chapters: 0,
        notesCount: 0,
        createdDate,
        lastUpdated: 'Just now',
        genre,
        isRecentlyUpdated: true
      };

      const initialContent: NovelContent = {
        id,
        title,
        synopsis: { logline: '', theme: '' },
        frontMatter: [],
        chapters: [
          {
            id: uuidv4(),
            title: 'Part 1',
            expanded: true,
            children: []
          }
        ],
        characters: [],
        locations: [],
        notes: [],
        timeline: []
      };

      this.novelCommands.createNovel(novel, initialContent);
      this.closeAddModal();
      this.router.navigate(['/novels', id]);
    } catch (e) {
      console.error('[NovelsComponent] addNovel failed', e);
      this.addModalSubmitting.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-wrapper')) {
      this.statusDropdownOpen.set(false);
      this.sortDropdownOpen.set(false);
    }
    if (!target.closest('.novel-menu-wrapper')) {
      this.closeNovelMenu();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showDeleteModal()) this.cancelDeleteNovel();
      else if (this.showAddModal()) this.closeAddModal();
      else this.closeNovelMenu();
    }
  }
}
