import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '@envello/state';
import { MediaItem, MediaType, MediaStatus } from '@envello/domain';
import {
  FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent,
} from '@envello/ui';

type SidebarFilter = MediaStatus | MediaType | 'all';

const TYPE_META: Record<MediaType, { label: string; icon: string; color: string; watchLabel: string; ingLabel: string; doneLabel: string }> = {
  movie:   { label: 'Movie',   icon: 'movie',      color: '#6d28d9', watchLabel: 'Watch',  ingLabel: 'Watching', doneLabel: 'Watched'  },
  show:    { label: 'Show',    icon: 'tv',          color: '#0284c7', watchLabel: 'Watch',  ingLabel: 'Watching', doneLabel: 'Watched'  },
  book:    { label: 'Book',    icon: 'menu_book',   color: '#059669', watchLabel: 'Read',   ingLabel: 'Reading',  doneLabel: 'Read'     },
  podcast: { label: 'Podcast', icon: 'podcasts',    color: '#d97706', watchLabel: 'Listen', ingLabel: 'Listening',doneLabel: 'Listened' },
};

const STATUS_META: Record<MediaStatus, { label: string; color: string }> = {
  want:     { label: 'Want to Watch', color: '#6d28d9' },
  watching: { label: 'Watching',      color: '#f59e0b' },
  watched:  { label: 'Watched',       color: '#10b981' },
  dropped:  { label: 'Dropped',       color: '#6b7280' },
};

const COLORS = ['#6d28d9','#0284c7','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#16a34a','#b45309'];

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [CommonModule, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent],
  templateUrl: './media.component.html',
  styleUrl: './media.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaComponent {
  private store = inject(StoreService);

  // ── View state ──────────────────────────────────────────────────────────────
  activeFilter = signal<SidebarFilter>('all');
  searchQuery  = signal('');

  // ── Slider ──────────────────────────────────────────────────────────────────
  showSlider   = signal(false);
  editingId    = signal<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────────
  formTitle         = signal('');
  formType          = signal<MediaType>('movie');
  formStatus        = signal<MediaStatus>('want');
  formCreator       = signal('');
  formYear          = signal('');
  formGenre         = signal('');
  formRating        = signal(0);
  formHoverRating   = signal(0);
  formNotes         = signal('');
  formLink          = signal('');
  formEpisode       = signal('');
  formTotalEpisodes = signal('');

  // ── Delete ──────────────────────────────────────────────────────────────────
  deleteTarget = signal<MediaItem | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────
  readonly all = computed(() => this.store.media());

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const f = this.activeFilter();
    const list = this.all();

    const byFilter = (() => {
      if (f === 'all')                         return list;
      if (['want','watching','watched','dropped'].includes(f)) return list.filter(m => m.status === f);
      return list.filter(m => m.type === f);
    })();

    if (!q) return byFilter;
    return byFilter.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.creator?.toLowerCase().includes(q) ||
      m.genre?.toLowerCase().includes(q)
    );
  });

  // Sidebar counts
  private _counts = computed(() => {
    const list = this.all();
    return {
      all:      list.length,
      want:     list.filter(m => m.status === 'want').length,
      watching: list.filter(m => m.status === 'watching').length,
      watched:  list.filter(m => m.status === 'watched').length,
      dropped:  list.filter(m => m.status === 'dropped').length,
      movie:    list.filter(m => m.type === 'movie').length,
      show:     list.filter(m => m.type === 'show').length,
      book:     list.filter(m => m.type === 'book').length,
      podcast:  list.filter(m => m.type === 'podcast').length,
    };
  });

  readonly sidebarNavItems = computed(() => {
    const c = this._counts();
    return [
      { id: 'all',      label: 'All Media',      icon: 'grid_view',   count: c.all      },
      { id: 'want',     label: 'Want to Watch',  icon: 'bookmark',    count: c.want     },
      { id: 'watching', label: 'In Progress',    icon: 'play_circle', count: c.watching },
      { id: 'watched',  label: 'Completed',      icon: 'check_circle',count: c.watched  },
      { id: 'dropped',  label: 'Dropped',        icon: 'cancel',      count: c.dropped  },
      { id: 'movie',    label: 'Movies',         icon: 'movie',       count: c.movie    },
      { id: 'show',     label: 'Shows',          icon: 'tv',          count: c.show     },
      { id: 'book',     label: 'Books',          icon: 'menu_book',   count: c.book     },
      { id: 'podcast',  label: 'Podcasts',       icon: 'podcasts',    count: c.podcast  },
    ];
  });

  readonly isEditMode  = computed(() => !!this.editingId());
  readonly canSave     = computed(() => !!this.formTitle().trim());
  readonly editingItem = computed(() => this.all().find(m => m.id === this.editingId()) ?? null);

  // ── Type / Status config ─────────────────────────────────────────────────────
  readonly typeOptions: MediaType[]   = ['movie', 'show', 'book', 'podcast'];
  readonly statusOptions: MediaStatus[] = ['want', 'watching', 'watched', 'dropped'];

  // ── Slider open/close ────────────────────────────────────────────────────────
  openAdd() {
    this.editingId.set(null);
    this.resetForm();
    this.showSlider.set(true);
  }

  openEdit(item: MediaItem, e?: Event) {
    e?.stopPropagation();
    this.editingId.set(item.id);
    this.formTitle.set(item.title);
    this.formType.set(item.type);
    this.formStatus.set(item.status);
    this.formCreator.set(item.creator ?? '');
    this.formYear.set(item.year ? String(item.year) : '');
    this.formGenre.set(item.genre ?? '');
    this.formRating.set(item.rating ?? 0);
    this.formNotes.set(item.notes ?? '');
    this.formLink.set(item.link ?? '');
    this.formEpisode.set(item.episode ? String(item.episode) : '');
    this.formTotalEpisodes.set(item.totalEpisodes ? String(item.totalEpisodes) : '');
    this.formHoverRating.set(0);
    this.showSlider.set(true);
  }

  closeSlider() {
    this.showSlider.set(false);
    this.editingId.set(null);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  save() {
    if (!this.canSave()) return;
    const payload: Partial<MediaItem> = {
      title:         this.formTitle().trim(),
      type:          this.formType(),
      status:        this.formStatus(),
      creator:       this.formCreator().trim()       || undefined,
      year:          this.formYear() ? +this.formYear() : undefined,
      genre:         this.formGenre().trim()          || undefined,
      rating:        this.formRating()                || undefined,
      notes:         this.formNotes().trim()          || undefined,
      link:          this.formLink().trim()            || undefined,
      episode:       this.formEpisode() ? +this.formEpisode() : undefined,
      totalEpisodes: this.formTotalEpisodes() ? +this.formTotalEpisodes() : undefined,
    };

    const editId = this.editingId();
    if (this.isEditMode() && editId) {
      this.store.updateMedia(editId, payload);
    } else {
      this.store.addMedia({ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString() } as MediaItem);
    }
    this.closeSlider();
  }

  // ── Quick status cycle ───────────────────────────────────────────────────────
  cycleStatus(item: MediaItem, e: Event) {
    e.stopPropagation();
    const order: MediaStatus[] = ['want', 'watching', 'watched', 'dropped'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    const updates: Partial<MediaItem> = { status: next };
    if (next === 'watching' && !item.startedAt) updates.startedAt = new Date().toISOString().split('T')[0];
    if (next === 'watched')  updates.finishedAt = new Date().toISOString().split('T')[0];
    this.store.updateMedia(item.id, updates);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  deleteEditing(e: Event) {
    const item = this.editingItem();
    if (item) this.confirmDelete(item, e);
  }

  confirmDelete(item: MediaItem, e: Event) {
    e.stopPropagation();
    this.deleteTarget.set(item);
  }

  doDelete() {
    const item = this.deleteTarget();
    if (item) this.store.deleteMedia(item.id);
    this.deleteTarget.set(null);
    if (this.editingId() === item?.id) this.closeSlider();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private resetForm() {
    this.formTitle.set('');
    this.formType.set('movie');
    this.formStatus.set('want');
    this.formCreator.set('');
    this.formYear.set('');
    this.formGenre.set('');
    this.formRating.set(0);
    this.formHoverRating.set(0);
    this.formNotes.set('');
    this.formLink.set('');
    this.formEpisode.set('');
    this.formTotalEpisodes.set('');
  }

  typeMeta(type: MediaType)     { return TYPE_META[type]; }
  statusMeta(status: MediaStatus) { return STATUS_META[status]; }

  statusLabel(item: MediaItem): string {
    const m = TYPE_META[item.type];
    if (item.status === 'want')     return `Want to ${m.watchLabel}`;
    if (item.status === 'watching') return m.ingLabel;
    if (item.status === 'watched')  return m.doneLabel;
    return 'Dropped';
  }

  avatarColor(title: string): string {
    let h = 0;
    for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  stars(n: number): boolean[] { return [1,2,3,4,5].map(i => i <= n); }

  setRating(n: number) { this.formRating.set(this.formRating() === n ? 0 : n); }

  onNavItemClick(id: string) { this.activeFilter.set(id as SidebarFilter); }
}
