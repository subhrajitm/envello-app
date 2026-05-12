import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService, type Novel, type WritingType, NovelContentService } from '@envello/core';
import { AiAssistantPanelComponent, AiPanelMessage } from '@envello/ui';

const WRITING_TYPE_META: Record<string, { color: string; icon: string }> = {
  NOVEL:       { color: '#f59e0b', icon: 'menu_book'    },
  SHORT_STORY: { color: '#3b82f6', icon: 'auto_stories' },
  ARTICLE:     { color: '#10b981', icon: 'article'      },
  ESSAY:       { color: '#8b5cf6', icon: 'psychology'   },
  SCRIPT:      { color: '#ec4899', icon: 'description'  },
  POETRY:      { color: '#f43f5e', icon: 'draw'         },
  BLOG_POST:   { color: '#06b6d4', icon: 'edit_note'    },
  RESEARCH:    { color: '#6366f1', icon: 'science'      },
};

const STATUS_META: Record<string, { color: string; icon: string; label: string }> = {
  PLANNING:  { color: '#9ca3af', icon: 'lightbulb',    label: 'Planning'  },
  DRAFTING:  { color: '#fbbf24', icon: 'edit',         label: 'Drafting'  },
  REVISING:  { color: '#fb923c', icon: 'autorenew',    label: 'Revising'  },
  PUBLISHED: { color: '#4ade80', icon: 'check_circle', label: 'Published' },
};

@Component({
  selector: 'app-write',
  standalone: true,
  imports: [CommonModule, FormsModule, AiAssistantPanelComponent],
  templateUrl: './write.component.html',
  styleUrl: './write.component.css'
})
export class WriteComponent {
  private router = inject(Router);
  store = inject(StoreService);
  private novelContent = inject(NovelContentService);

  // ── Filter / sort ─────────────────────────────────────────────────────────
  viewMode     = signal<'LIST' | 'GRID'>('LIST');
  selectedType = signal<WritingType | ''>('');
  statusFilter = signal<'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'>('ALL');
  sortBy       = signal<'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'>('UPDATED');
  searchQuery  = signal('');
  sortDropdownOpen = signal(false);

  // ── Add modal state ────────────────────────────────────────────────────────
  showAddModal      = signal(false);
  addModalSubmitting = signal(false);
  newNovel = signal<{ title: string; writingType: WritingType; status: Novel['status']; genre: string; targetWordCount: number; icon: string }>({
    title: '', writingType: 'NOVEL', status: 'PLANNING',
    genre: '', targetWordCount: 80000, icon: 'menu_book'
  });

  // ── Delete modal ───────────────────────────────────────────────────────────
  showDeleteModal = signal(false);
  novelToDelete   = signal<Novel | null>(null);
  novelMenuOpen   = signal<string | null>(null);

  // ── AI Assistant ──────────────────────────────────────────────────────────
  showAssistant = signal(false);
  aiLoading     = signal(false);
  aiMessages    = signal<AiPanelMessage[]>([]);

  readonly aiSuggestions = [
    'How many pieces do I have?',
    'Show me all drafts in progress',
    'What is my total word count?',
    'Which pieces are ready to publish?',
    'Show a breakdown by writing type',
  ];

  // ── Static data ───────────────────────────────────────────────────────────
  readonly writingTypes: { id: WritingType; label: string; defaultWords: number; defaultIcon: string }[] = [
    { id: 'NOVEL',       label: 'Novel',        defaultWords: 80000, defaultIcon: 'menu_book'   },
    { id: 'SHORT_STORY', label: 'Short Story',  defaultWords: 10000, defaultIcon: 'auto_stories'},
    { id: 'ARTICLE',     label: 'Article',      defaultWords:  2000, defaultIcon: 'article'     },
    { id: 'ESSAY',       label: 'Essay',        defaultWords:  3000, defaultIcon: 'psychology'  },
    { id: 'SCRIPT',      label: 'Script',       defaultWords: 15000, defaultIcon: 'description' },
    { id: 'POETRY',      label: 'Poetry',       defaultWords:   500, defaultIcon: 'draw'        },
    { id: 'BLOG_POST',   label: 'Blog Post',    defaultWords:  1500, defaultIcon: 'edit_note'   },
    { id: 'RESEARCH',    label: 'Research',     defaultWords:  5000, defaultIcon: 'science'     },
  ];

  readonly allStatusItems = [
    { id: 'PLANNING'  as const, ...STATUS_META['PLANNING']  },
    { id: 'DRAFTING'  as const, ...STATUS_META['DRAFTING']  },
    { id: 'REVISING'  as const, ...STATUS_META['REVISING']  },
    { id: 'PUBLISHED' as const, ...STATUS_META['PUBLISHED'] },
  ];

  readonly novelIcons = [
    { id: 'menu_book',    label: 'Book'     },
    { id: 'auto_stories', label: 'Story'    },
    { id: 'article',      label: 'Article'  },
    { id: 'description',  label: 'Document' },
    { id: 'edit_note',    label: 'Notes'    },
    { id: 'draw',         label: 'Creative' },
    { id: 'token',        label: 'Token'    },
    { id: 'castle',       label: 'Castle'   },
    { id: 'rocket_launch',label: 'Sci-Fi'   },
    { id: 'water_drop',   label: 'Drop'     },
    { id: 'science',      label: 'Research' },
    { id: 'psychology',   label: 'Essay'    },
  ] as const;

  // ── Computed ──────────────────────────────────────────────────────────────
  allTypeStats = computed(() =>
    this.writingTypes.map(t => ({
      ...t,
      color: WRITING_TYPE_META[t.id]?.color ?? '#9ca3af',
      count: this.store.novels().filter(n => n.writingType === t.id).length,
    })).filter(t => t.count > 0)
  );

  statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const n of this.store.novels()) {
      counts[n.status] = (counts[n.status] ?? 0) + 1;
    }
    return counts;
  });

  hasActiveFilters = computed(() =>
    !!this.searchQuery() || !!this.selectedType() || this.statusFilter() !== 'ALL'
  );

  totalWords = computed(() => this.store.novels().reduce((acc, n) => acc + n.wordCount, 0));
  activeDrafts = computed(() => this.store.novels().filter(n => n.status === 'DRAFTING' || n.status === 'REVISING').length);
  avgCompletion = computed(() => {
    const list = this.store.novels();
    if (!list.length) return 0;
    return Math.round(list.reduce((acc, n) => acc + n.progress, 0) / list.length);
  });

  filteredNovels = computed(() => {
    const q      = this.searchQuery().trim().toLowerCase();
    const type   = this.selectedType();
    const status = this.statusFilter();
    const sort   = this.sortBy();

    let list = this.store.novels();
    if (q)      list = list.filter(n => n.title.toLowerCase().includes(q) || n.genre.some(g => g.toLowerCase().includes(q)));
    if (type)   list = list.filter(n => n.writingType === type);
    if (status !== 'ALL') list = list.filter(n => n.status === status);

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'CREATED':  return new Date(b.createdAt ?? b.createdDate).getTime() - new Date(a.createdAt ?? a.createdDate).getTime();
        case 'TITLE':    return a.title.localeCompare(b.title);
        case 'PROGRESS': return b.progress - a.progress;
        default: return 0;
      }
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTypeMeta(type?: string)  { return WRITING_TYPE_META[type ?? ''] ?? { color: '#9ca3af', icon: 'article' }; }
  getStatusMeta(status: string) { return STATUS_META[status] ?? STATUS_META['PLANNING']; }

  readingTime(wordCount: number): string {
    const mins = Math.ceil(wordCount / 200);
    return mins < 1 ? '<1 min' : `${mins} min`;
  }

  getWritingTypeLabel(type?: string): string {
    return this.writingTypes.find(t => t.id === type)?.label ?? 'Novel';
  }

  getProgressColor(status: string): string {
    return status === 'PUBLISHED' ? '#4ade80' : '#fcd34d';
  }

  // ── Sidebar / filter ─────────────────────────────────────────────────────
  clearFilters() {
    this.searchQuery.set('');
    this.selectedType.set('');
    this.statusFilter.set('ALL');
  }

  selectType(type: WritingType | '') {
    this.selectedType.set(this.selectedType() === type ? '' : type);
  }

  selectStatus(status: 'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED') {
    this.statusFilter.set(this.statusFilter() === status ? 'ALL' : status);
  }

  toggleSortDropdown() { this.sortDropdownOpen.update(v => !v); }

  selectSort(sort: 'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS') {
    this.sortBy.set(sort);
    this.sortDropdownOpen.set(false);
  }

  getSortLabel(): string {
    switch (this.sortBy()) {
      case 'UPDATED':  return 'Last Updated';
      case 'CREATED':  return 'Date Created';
      case 'TITLE':    return 'Title';
      case 'PROGRESS': return 'Progress';
      default: return 'Sort';
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  openNovel(id: string) { this.router.navigate(['/write', id]); }

  // ── Novel menu ────────────────────────────────────────────────────────────
  toggleNovelMenu(novelId: string, e?: Event) {
    e?.stopPropagation();
    this.novelMenuOpen.update(id => id === novelId ? null : novelId);
  }
  closeNovelMenu() { this.novelMenuOpen.set(null); }

  duplicateNovel(novel: Novel, e?: Event) {
    e?.stopPropagation();
    const id = crypto.randomUUID();
    const now = new Date();
    const copy: Novel = {
      ...novel, id,
      title: `${novel.title} (Copy)`,
      createdDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastUpdated: 'Just now',
      createdAt: now.toISOString(),
      isRecentlyUpdated: true,
      wordCount: 0, progress: 0, chapters: 0,
    };
    this.store.addNovel(copy);
    this.novelContent.createAndPersistEmptyNovel(id, copy.title).catch(e => console.error(e));
    this.closeNovelMenu();
  }

  openDeleteModal(novel: Novel, e?: Event) {
    e?.stopPropagation();
    this.novelToDelete.set(novel);
    this.showDeleteModal.set(true);
    this.closeNovelMenu();
  }
  cancelDeleteNovel() { this.showDeleteModal.set(false); this.novelToDelete.set(null); }
  confirmDeleteNovel() {
    const novel = this.novelToDelete();
    if (novel) { this.store.deleteNovel(novel.id); this.cancelDeleteNovel(); }
  }

  // ── Add modal ─────────────────────────────────────────────────────────────
  openAddModal() {
    this.newNovel.set({ title: '', writingType: 'NOVEL', status: 'PLANNING', genre: '', targetWordCount: 80000, icon: 'menu_book' });
    this.showAddModal.set(true);
  }
  closeAddModal() { this.showAddModal.set(false); this.addModalSubmitting.set(false); }

  updateNewNovel(key: 'title' | 'writingType' | 'status' | 'genre' | 'targetWordCount' | 'icon', value: string | number) {
    if (key === 'writingType') {
      const def = this.writingTypes.find(t => t.id === value);
      if (def) {
        this.newNovel.update(n => ({ ...n, writingType: value as WritingType, targetWordCount: def.defaultWords, icon: def.defaultIcon }));
        return;
      }
    }
    this.newNovel.update(n => ({ ...n, [key]: value }));
  }

  async addNovel() {
    const form = this.newNovel();
    const title = form.title.trim();
    if (!title) return;
    this.addModalSubmitting.set(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const genre = form.genre.trim() ? form.genre.split(',').map(s => s.trim()).filter(Boolean) : ['Fiction'];
      const novel: Novel = {
        id, title, icon: form.icon, status: form.status, writingType: form.writingType,
        wordCount: 0, targetWordCount: Math.max(0, form.targetWordCount) || 80000,
        progress: 0, chapters: 0, notesCount: 0,
        createdDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastUpdated: 'Just now', createdAt: now.toISOString(), genre, isRecentlyUpdated: true,
      };
      this.store.addNovel(novel);
      await this.novelContent.createAndPersistEmptyNovel(id, title);
      this.closeAddModal();
      this.router.navigate(['/write', id]);
    } catch (e) {
      console.error('[NovelsComponent] addNovel failed', e);
      this.addModalSubmitting.set(false);
    }
  }

  // ── AI Assistant ──────────────────────────────────────────────────────────
  toggleAssistant() { this.showAssistant.update(v => !v); }
  clearAiChat()     { this.aiMessages.set([]); }

  async sendAiMessage(text: string) {
    if (!text || this.aiLoading()) return;
    this.aiMessages.update(m => [...m, { role: 'user', text }]);
    this.aiLoading.set(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    const novels = this.store.novels();
    const q = text.toLowerCase();
    let response = '';

    if (q.includes('how many') || q.includes('count')) {
      response = `You have **${novels.length}** piece${novels.length !== 1 ? 's' : ''} in total.\n${this.writingTypes.map(t => {
        const n = novels.filter(v => v.writingType === t.id).length;
        return n > 0 ? `${t.label}: ${n}` : null;
      }).filter(Boolean).join('\n')}`;
    } else if (q.includes('draft') || q.includes('in progress')) {
      const drafts = novels.filter(n => n.status === 'DRAFTING' || n.status === 'REVISING');
      response = drafts.length
        ? `**${drafts.length}** piece${drafts.length !== 1 ? 's' : ''} in progress:\n${drafts.map((n, i) => `${i + 1}. ${n.title} — ${n.status} (${n.progress}%)`).join('\n')}`
        : 'No pieces currently in draft or revision.';
    } else if (q.includes('word') || q.includes('total')) {
      const total = novels.reduce((a, n) => a + n.wordCount, 0);
      response = `Total word count: **${total.toLocaleString()}** words across ${novels.length} pieces.\nAverage: ${novels.length ? Math.round(total / novels.length).toLocaleString() : 0} words per piece.`;
    } else if (q.includes('publish') || q.includes('ready')) {
      const pub = novels.filter(n => n.status === 'PUBLISHED');
      response = pub.length
        ? `**${pub.length}** published piece${pub.length !== 1 ? 's' : ''}:\n${pub.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}`
        : 'No published pieces yet.';
    } else if (q.includes('breakdown') || q.includes('type')) {
      response = `Pieces by type:\n${this.writingTypes.map(t => `${t.label}: ${novels.filter(n => n.writingType === t.id).length}`).join('\n')}`;
    } else {
      response = `You have ${novels.length} piece${novels.length !== 1 ? 's' : ''} with a total of ${novels.reduce((a, n) => a + n.wordCount, 0).toLocaleString()} words. Ask about drafts, word counts, publishing status, or a breakdown by type.`;
    }

    this.aiMessages.update(m => [...m, { role: 'assistant', text: response }]);
    this.aiLoading.set(false);
    setTimeout(() => {
      const el = document.querySelector('.ai-panel-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.wr-sort-wrap'))  this.sortDropdownOpen.set(false);
    if (!target.closest('.novel-menu-wrapper')) this.closeNovelMenu();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showDeleteModal()) this.cancelDeleteNovel();
      else if (this.showAddModal()) this.closeAddModal();
      else { this.closeNovelMenu(); this.sortDropdownOpen.set(false); }
    }
  }
}
