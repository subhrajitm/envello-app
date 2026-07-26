import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '@envello/state';
import { Habit, HabitCategory, HabitFrequency } from '@envello/domain';
import { FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent } from '@envello/ui';

type HabitFilter = 'today' | 'all' | 'archived' | HabitCategory;
type SliderMode  = 'view' | 'edit';

const CAT_META: Record<HabitCategory, { label: string; icon: string; color: string }> = {
  health:       { label: 'Health',       icon: 'water_drop',      color: '#3b82f6' },
  fitness:      { label: 'Fitness',      icon: 'fitness_center',  color: '#10b981' },
  mindfulness:  { label: 'Mindfulness',  icon: 'self_improvement',color: '#8b5cf6' },
  learning:     { label: 'Learning',     icon: 'menu_book',       color: '#f59e0b' },
  productivity: { label: 'Productivity', icon: 'rocket_launch',   color: '#6d28d9' },
  social:       { label: 'Social',       icon: 'group',           color: '#ec4899' },
  other:        { label: 'Other',        icon: 'star',            color: '#6b7280' },
};

const HABIT_ICONS = [
  'water_drop','fitness_center','menu_book','self_improvement',
  'bedtime','directions_run','restaurant','psychology',
  'edit','code','music_note','favorite',
  'eco','local_cafe','sports','hiking',
];

const HABIT_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#6d28d9','#ec4899','#ef4444','#6b7280'];

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [CommonModule, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent],
  templateUrl: './habits.component.html',
  styleUrl:    './habits.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitsComponent {
  private store = inject(StoreService);

  // ── View state ──────────────────────────────────────────────────────────────
  activeFilter = signal<HabitFilter>('today');

  // ── Slider ──────────────────────────────────────────────────────────────────
  showSlider  = signal(false);
  sliderMode  = signal<SliderMode>('view');
  selectedId  = signal<string | null>(null);

  // ── Form ────────────────────────────────────────────────────────────────────
  formTitle       = signal('');
  formDescription = signal('');
  formCategory    = signal<HabitCategory | ''>('');
  formFrequency   = signal<HabitFrequency>('daily');
  formTargetDays  = signal<number[]>([1,2,3,4,5]);
  formColor       = signal(HABIT_COLORS[0]);
  formIcon        = signal('star');

  // ── Delete ───────────────────────────────────────────────────────────────────
  deleteTarget = signal<Habit | null>(null);

  // ── Config ───────────────────────────────────────────────────────────────────
  readonly categoryOptions: HabitCategory[] = ['health','fitness','mindfulness','learning','productivity','social','other'];
  readonly iconOptions     = HABIT_ICONS;
  readonly colorOptions    = HABIT_COLORS;
  readonly dayLabels       = DAY_LABELS;

  // ── Computed ─────────────────────────────────────────────────────────────────
  private readonly _active   = computed(() => this.store.habits().filter(h => !h.archivedAt && !h.deleted_at));
  private readonly _archived = computed(() => this.store.habits().filter(h => !!h.archivedAt && !h.deleted_at));

  readonly todayHabits = computed(() => this._active().filter(h => this.isScheduledToday(h)));
  readonly todayDone   = computed(() => this.todayHabits().filter(h => this.isDoneToday(h)));
  readonly todayPending= computed(() => this.todayHabits().filter(h => !this.isDoneToday(h)));
  readonly todayProgress = computed(() => {
    const t = this.todayHabits().length;
    return t ? Math.round(this.todayDone().length / t * 100) : 0;
  });

  readonly filtered = computed(() => {
    const f = this.activeFilter();
    if (f === 'today')    return this.todayHabits();
    if (f === 'archived') return this._archived();
    if (f === 'all')      return this._active();
    return this._active().filter(h => h.category === f);
  });

  readonly sidebarNavItems = computed(() => {
    const active = this._active();
    return [
      { id: 'today',    label: 'Today',        icon: 'today',         count: this.todayPending().length },
      { id: 'all',      label: 'All Habits',   icon: 'checklist',     count: active.length },
      ...this.categoryOptions.map(cat => ({
        id: cat, label: CAT_META[cat].label, icon: CAT_META[cat].icon,
        count: active.filter(h => h.category === cat).length,
      })),
      { id: 'archived', label: 'Archived',     icon: 'archive',       count: this._archived().length },
    ];
  });

  readonly selectedHabit  = computed(() => this.store.habits().find(h => h.id === this.selectedId()) ?? null);
  readonly canSave        = computed(() => !!this.formTitle().trim());
  readonly isTodayFilter  = computed(() => this.activeFilter() === 'today');
  readonly isArchivedFilter = computed(() => this.activeFilter() === 'archived');

  // Calendar for detail view: last 28 days
  readonly detailCalendar = computed(() => {
    const h = this.selectedHabit();
    if (!h) return [];
    return this.calendarDays(h);
  });

  // Stats for detail view
  readonly detailStreak       = computed(() => { const h = this.selectedHabit(); return h ? this.streak(h) : 0; });
  readonly detailLongest      = computed(() => { const h = this.selectedHabit(); return h ? this.longestStreak(h) : 0; });
  readonly detailTotal        = computed(() => this.selectedHabit()?.logs.length ?? 0);
  readonly detailRate         = computed(() => { const h = this.selectedHabit(); return h ? this.completionRate(h) : 0; });

  // Today header label
  readonly todayLabel = computed(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  );

  // ── Actions ──────────────────────────────────────────────────────────────────
  checkIn(habit: Habit, e: Event) { e.stopPropagation(); this.store.checkInHabit(habit.id); }

  openDetail(habit: Habit) {
    this.selectedId.set(habit.id);
    this.sliderMode.set('view');
    this.showSlider.set(true);
  }

  openNew() {
    this.selectedId.set(null);
    this.resetForm();
    this.sliderMode.set('edit');
    this.showSlider.set(true);
  }

  openEditMode() {
    const h = this.selectedHabit();
    if (!h) return;
    this.formTitle.set(h.title);
    this.formDescription.set(h.description ?? '');
    this.formCategory.set(h.category ?? '');
    this.formFrequency.set(h.frequency);
    this.formTargetDays.set([...(h.targetDays ?? [1,2,3,4,5])]);
    this.formColor.set(h.color ?? HABIT_COLORS[0]);
    this.formIcon.set(h.icon ?? 'star');
    this.sliderMode.set('edit');
  }

  closeSlider() { this.showSlider.set(false); this.selectedId.set(null); }

  save() {
    if (!this.canSave()) return;
    const payload: Partial<Habit> = {
      title:       this.formTitle().trim(),
      description: this.formDescription().trim() || undefined,
      category:    (this.formCategory() as HabitCategory) || undefined,
      frequency:   this.formFrequency(),
      targetDays:  this.formFrequency() === 'weekly' ? this.formTargetDays() : undefined,
      color:       this.formColor(),
      icon:        this.formIcon(),
    };
    const id = this.selectedId();
    if (id) {
      this.store.updateHabit(id, payload);
      this.sliderMode.set('view');
    } else {
      const habit: Habit = {
        id:        crypto.randomUUID(),
        title:     this.formTitle().trim(),
        frequency: this.formFrequency(),
        logs:      [],
        createdAt: new Date().toISOString(),
        ...payload,
      };
      this.store.addHabit(habit);
      this.selectedId.set(habit.id);
      this.sliderMode.set('view');
    }
  }

  archiveHabit(habit: Habit, e?: Event) {
    e?.stopPropagation();
    this.store.updateHabit(habit.id, { archivedAt: new Date().toISOString() });
    if (this.selectedId() === habit.id) this.closeSlider();
  }

  restoreHabit(habit: Habit, e?: Event) {
    e?.stopPropagation();
    this.store.updateHabit(habit.id, { archivedAt: undefined });
  }

  doDelete() {
    const h = this.deleteTarget();
    if (!h) return;
    this.store.deleteHabit(h.id);
    if (this.selectedId() === h.id) this.closeSlider();
    this.deleteTarget.set(null);
  }

  deleteSelected() { const h = this.selectedHabit(); if (h) this.deleteTarget.set(h); }

  toggleTargetDay(day: number) {
    const days = this.formTargetDays();
    if (days.includes(day)) {
      if (days.length > 1) this.formTargetDays.update(d => d.filter(x => x !== day).sort());
    } else {
      this.formTargetDays.update(d => [...d, day].sort());
    }
  }

  onNavItemClick(id: string) { this.activeFilter.set(id as HabitFilter); }

  // ── Helpers (used by template, no arrow fns) ─────────────────────────────────
  isDoneToday(habit: Habit): boolean {
    const today = this.todayStr();
    return habit.logs.some(l => l.date === today);
  }

  isScheduledToday(habit: Habit): boolean {
    if (habit.frequency === 'daily') return true;
    return (habit.targetDays ?? []).includes(new Date().getDay());
  }

  streak(habit: Habit): number {
    const logSet = new Set(habit.logs.map(l => l.date));
    const today  = this.todayStr();
    const d = new Date(); d.setHours(12,0,0,0);
    // Grace: if today isn't done yet, start counting from yesterday
    if (!logSet.has(today)) d.setDate(d.getDate() - 1);
    let s = 0;
    const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    while (d >= twoYearsAgo) {
      if (!this.isScheduledOn(habit, d)) { d.setDate(d.getDate() - 1); continue; }
      if (logSet.has(this.dateStr(d))) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  }

  longestStreak(habit: Habit): number {
    if (!habit.logs.length) return 0;
    const sorted = habit.logs.map(l => l.date).sort();
    let longest = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i-1]).getTime()) / 86400000);
      current = diff === 1 ? current + 1 : 1;
      longest = Math.max(longest, current);
    }
    return longest;
  }

  completionRate(habit: Habit): number {
    const days = Math.max(1, Math.ceil((Date.now() - new Date(habit.createdAt).getTime()) / 86400000));
    return Math.min(100, Math.round(habit.logs.length / days * 100));
  }

  last7Days(habit: Habit): boolean[] {
    const logSet = new Set(habit.logs.map(l => l.date));
    const d = new Date(); d.setHours(12,0,0,0);
    const result: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(d); day.setDate(day.getDate() - i);
      result.push(logSet.has(this.dateStr(day)));
    }
    return result;
  }

  calendarDays(habit: Habit): Array<{ dateStr: string; done: boolean; isToday: boolean; scheduled: boolean }> {
    const logSet = new Set(habit.logs.map(l => l.date));
    const today  = this.todayStr();
    const d = new Date(); d.setHours(12,0,0,0);
    d.setDate(d.getDate() - 27);
    const result = [];
    for (let i = 0; i < 28; i++) {
      const dateStr  = this.dateStr(d);
      const scheduled = this.isScheduledOn(habit, d);
      result.push({ dateStr, done: logSet.has(dateStr), isToday: dateStr === today, scheduled });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }

  isTargetDay(day: number): boolean { return this.formTargetDays().includes(day); }

  catMeta(cat?: HabitCategory | '') { return cat ? CAT_META[cat] : null; }
  habitIcon(h: Habit)  { return h.icon  ?? 'star'; }
  habitColor(h: Habit) { return h.color ?? '#6b7280'; }
  streakLabel(s: number): string { return s > 0 ? `${s} 🔥` : '—'; }

  private isScheduledOn(habit: Habit, d: Date): boolean {
    if (habit.frequency === 'daily') return true;
    return (habit.targetDays ?? []).includes(d.getDay());
  }
  private todayStr() { return this.dateStr(new Date()); }
  private dateStr(d: Date) { return d.toISOString().split('T')[0]; }

  private resetForm() {
    this.formTitle.set(''); this.formDescription.set(''); this.formCategory.set('');
    this.formFrequency.set('daily'); this.formTargetDays.set([1,2,3,4,5]);
    this.formColor.set(HABIT_COLORS[0]); this.formIcon.set('star');
  }
}
