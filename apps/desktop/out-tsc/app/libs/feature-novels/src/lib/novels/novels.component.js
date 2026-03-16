import { __decorate } from 'tslib';
import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService, NovelContentService } from '@envello/core';
import {
  ButtonComponent,
  ModalComponent,
  EmptyStateComponent,
} from '@envello/ui';
let NovelsComponent = class NovelsComponent {
  router = inject(Router);
  store = inject(StoreService);
  novelContent = inject(NovelContentService);
  viewMode = signal('LIST');
  statusFilter = signal('ALL');
  sortBy = signal('UPDATED');
  statusDropdownOpen = signal(false);
  sortDropdownOpen = signal(false);
  showAddModal = signal(false);
  addModalSubmitting = signal(false);
  newNovel = signal({
    title: '',
    status: 'PLANNING',
    genre: '',
    targetWordCount: 80000,
    icon: 'menu_book',
  });
  novelIcons = [
    { id: 'menu_book', label: 'Book' },
    { id: 'auto_stories', label: 'Story' },
    { id: 'token', label: 'Token' },
    { id: 'castle', label: 'Castle' },
    { id: 'rocket_launch', label: 'Rocket' },
    { id: 'water_drop', label: 'Drop' },
  ];
  novelMenuOpen = signal(null);
  showDeleteModal = signal(false);
  novelToDelete = signal(null);
  novels = computed(() => {
    let list = this.store.novels();
    // Filter
    if (this.statusFilter() !== 'ALL') {
      list = list.filter((n) => n.status === this.statusFilter());
    }
    // Sort
    return list.sort((a, b) => {
      switch (this.sortBy()) {
        case 'UPDATED':
          return 0; // Keeping simple for demo as date strings are fuzzy
        case 'TITLE':
          return a.title.localeCompare(b.title);
        case 'PROGRESS':
          return b.progress - a.progress;
        default:
          return 0;
      }
    });
  });
  // Metrics
  totalWords = computed(() => {
    return this.store.novels().reduce((acc, curr) => acc + curr.wordCount, 0);
  });
  activeDrafts = computed(() => {
    return this.store.novels().filter((n) => n.status !== 'PUBLISHED').length;
  });
  avgCompletion = computed(() => {
    const list = this.store.novels();
    if (list.length === 0) return 0;
    const total = list.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(total / list.length);
  });
  toggleView(mode) {
    this.viewMode.set(mode);
  }
  toggleStatusDropdown() {
    this.statusDropdownOpen.update((v) => !v);
    if (this.statusDropdownOpen()) {
      this.sortDropdownOpen.set(false);
    }
  }
  toggleSortDropdown() {
    this.sortDropdownOpen.update((v) => !v);
    if (this.sortDropdownOpen()) {
      this.statusDropdownOpen.set(false);
    }
  }
  selectStatus(status) {
    this.statusFilter.set(status);
    this.statusDropdownOpen.set(false);
  }
  selectSort(sort) {
    this.sortBy.set(sort);
    this.sortDropdownOpen.set(false);
  }
  getStatusIcon(status) {
    switch (status) {
      case 'ALL':
        return 'filter_alt';
      case 'DRAFTING':
        return 'edit';
      case 'PLANNING':
        return 'lightbulb';
      case 'REVISING':
        return 'autorenew';
      case 'PUBLISHED':
        return 'check_circle';
      default:
        return 'filter_alt';
    }
  }
  getStatusLabel(status) {
    return status;
  }
  getSortIcon(sort) {
    switch (sort) {
      case 'UPDATED':
        return 'schedule';
      case 'CREATED':
        return 'calendar_today';
      case 'TITLE':
        return 'sort_by_alpha';
      case 'PROGRESS':
        return 'trending_up';
      default:
        return 'sort';
    }
  }
  getSortLabel(sort) {
    switch (sort) {
      case 'UPDATED':
        return 'Last Updated';
      case 'CREATED':
        return 'Date Created';
      case 'TITLE':
        return 'Title';
      case 'PROGRESS':
        return 'Progress';
      default:
        return sort;
    }
  }
  getStatusColor(status) {
    switch (status) {
      case 'DRAFTING':
        return 'status-yellow';
      case 'PLANNING':
        return 'status-gray';
      case 'PUBLISHED':
        return 'status-green';
      case 'REVISING':
        return 'status-orange';
      default:
        return 'status-gray';
    }
  }
  getProgressColor(status) {
    switch (status) {
      case 'PUBLISHED':
        return '#4ade80';
      default:
        return '#fcd34d'; // Match yellow-400
    }
  }
  openNovel(id) {
    this.router.navigate(['/novels', id]);
  }
  toggleNovelMenu(novelId, e) {
    e?.stopPropagation();
    this.novelMenuOpen.update((id) => (id === novelId ? null : novelId));
  }
  closeNovelMenu() {
    this.novelMenuOpen.set(null);
  }
  openDeleteModal(novel, e) {
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
    const novel = this.novelToDelete();
    if (novel) {
      this.store.deleteNovel(novel.id);
      this.cancelDeleteNovel();
    }
  }
  openAddModal() {
    this.newNovel.set({
      title: '',
      status: 'PLANNING',
      genre: '',
      targetWordCount: 80000,
      icon: 'menu_book',
    });
    this.showAddModal.set(true);
  }
  closeAddModal() {
    this.showAddModal.set(false);
    this.addModalSubmitting.set(false);
  }
  updateNewNovel(key, value) {
    this.newNovel.update((n) => ({ ...n, [key]: value }));
  }
  async addNovel() {
    const form = this.newNovel();
    const title = form.title.trim();
    if (!title) return;
    this.addModalSubmitting.set(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const createdDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const genre = form.genre.trim()
        ? form.genre
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['Fiction'];
      const novel = {
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
        isRecentlyUpdated: true,
      };
      this.store.addNovel(novel);
      await this.novelContent.createAndPersistEmptyNovel(id, title);
      this.closeAddModal();
      this.router.navigate(['/novels', id]);
    } catch (e) {
      console.error('[NovelsComponent] addNovel failed', e);
      this.addModalSubmitting.set(false);
    }
  }
  onDocumentClick(event) {
    const target = event.target;
    if (!target.closest('.custom-dropdown-wrapper')) {
      this.statusDropdownOpen.set(false);
      this.sortDropdownOpen.set(false);
    }
    if (!target.closest('.novel-menu-wrapper')) {
      this.closeNovelMenu();
    }
  }
  onKeyDown(e) {
    if (e.key === 'Escape') {
      if (this.showDeleteModal()) this.cancelDeleteNovel();
      else if (this.showAddModal()) this.closeAddModal();
      else this.closeNovelMenu();
    }
  }
};
__decorate(
  [HostListener('document:click', ['$event'])],
  NovelsComponent.prototype,
  'onDocumentClick',
  null,
);
__decorate(
  [HostListener('document:keydown', ['$event'])],
  NovelsComponent.prototype,
  'onKeyDown',
  null,
);
NovelsComponent = __decorate(
  [
    Component({
      selector: 'app-novels',
      standalone: true,
      imports: [
        CommonModule,
        ButtonComponent,
        ModalComponent,
        EmptyStateComponent,
      ],
      templateUrl: './novels.component.html',
      styleUrl: './novels.component.css',
    }),
  ],
  NovelsComponent,
);
export { NovelsComponent };
