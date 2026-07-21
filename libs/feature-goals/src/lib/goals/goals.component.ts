import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '@envello/state';
import { Goal, GoalCategory, GoalStatus, Milestone } from '@envello/domain';
import {
  FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent,
} from '@envello/ui';

type SidebarFilter = 'all' | GoalStatus | GoalCategory;

const CATEGORY_META: Record<GoalCategory, { label: string; icon: string; color: string }> = {
  health:        { label: 'Health',        icon: 'favorite',      color: '#ef4444' },
  career:        { label: 'Career',        icon: 'work',          color: '#6d28d9' },
  finance:       { label: 'Finance',       icon: 'savings',       color: '#059669' },
  learning:      { label: 'Learning',      icon: 'school',        color: '#0284c7' },
  personal:      { label: 'Personal',      icon: 'person',        color: '#d97706' },
  relationships: { label: 'Relationships', icon: 'group',         color: '#ec4899' },
  creative:      { label: 'Creative',      icon: 'brush',         color: '#8b5cf6' },
  other:         { label: 'Other',         icon: 'interests',     color: '#6b7280' },
};

const STATUS_META: Record<GoalStatus, { label: string; color: string; icon: string }> = {
  active:    { label: 'Active',    color: '#10b981', icon: 'radio_button_checked' },
  completed: { label: 'Completed', color: '#6d28d9', icon: 'task_alt'            },
  paused:    { label: 'Paused',    color: '#f59e0b', icon: 'pause_circle'         },
  abandoned: { label: 'Abandoned', color: '#6b7280', icon: 'cancel'               },
};

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalsComponent {
  private store = inject(StoreService);

  // ── View state ──────────────────────────────────────────────────────────────
  activeFilter = signal<SidebarFilter>('all');
  searchQuery  = signal('');

  // ── Slider ──────────────────────────────────────────────────────────────────
  showSlider  = signal(false);
  editingId   = signal<string | null>(null);

  // ── Form ────────────────────────────────────────────────────────────────────
  formTitle        = signal('');
  formDescription  = signal('');
  formCategory     = signal<GoalCategory | ''>('');
  formStatus       = signal<GoalStatus>('active');
  formTargetDate   = signal('');
  formProgressMode = signal<'manual' | 'milestones'>('milestones');
  formProgress     = signal(0);
  formNotes        = signal('');
  formMilestones   = signal<Milestone[]>([]);
  newMilestoneText = signal('');

  // ── Delete ──────────────────────────────────────────────────────────────────
  deleteTarget = signal<Goal | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────
  readonly all = computed(() => this.store.goals());

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const f = this.activeFilter();
    const list = this.all();

    const byFilter = (() => {
      if (f === 'all') return list;
      if (['active','completed','paused','abandoned'].includes(f)) return list.filter(g => g.status === f);
      return list.filter(g => g.category === f);
    })();

    if (!q) return byFilter;
    return byFilter.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.notes?.toLowerCase().includes(q)
    );
  });

  private _counts = computed(() => {
    const list = this.all();
    const cat: Partial<Record<GoalCategory, number>> = {};
    for (const g of list) if (g.category) cat[g.category] = (cat[g.category] ?? 0) + 1;
    return {
      all:       list.length,
      active:    list.filter(g => g.status === 'active').length,
      completed: list.filter(g => g.status === 'completed').length,
      paused:    list.filter(g => g.status === 'paused').length,
      abandoned: list.filter(g => g.status === 'abandoned').length,
      ...cat,
    };
  });

  readonly sidebarNavItems = computed(() => {
    const c = this._counts();
    return [
      { id: 'all',           label: 'All Goals',      icon: 'flag',               count: c['all'] ?? 0      },
      { id: 'active',        label: 'Active',         icon: 'radio_button_checked',count: c['active'] ?? 0   },
      { id: 'completed',     label: 'Completed',      icon: 'task_alt',            count: c['completed'] ?? 0},
      { id: 'paused',        label: 'Paused',         icon: 'pause_circle',        count: c['paused'] ?? 0   },
      { id: 'health',        label: 'Health',         icon: 'favorite',            count: c['health'] ?? 0   },
      { id: 'career',        label: 'Career',         icon: 'work',                count: c['career'] ?? 0   },
      { id: 'finance',       label: 'Finance',        icon: 'savings',             count: c['finance'] ?? 0  },
      { id: 'learning',      label: 'Learning',       icon: 'school',              count: c['learning'] ?? 0 },
      { id: 'personal',      label: 'Personal',       icon: 'person',              count: c['personal'] ?? 0 },
      { id: 'relationships', label: 'Relationships',  icon: 'group',               count: c['relationships'] ?? 0 },
      { id: 'creative',      label: 'Creative',       icon: 'brush',               count: c['creative'] ?? 0 },
    ];
  });

  readonly isEditMode          = computed(() => !!this.editingId());
  readonly canSave             = computed(() => !!this.formTitle().trim());
  readonly editingGoal         = computed(() => this.all().find(g => g.id === this.editingId()) ?? null);
  readonly formMilestoneDone   = computed(() => this.formMilestones().filter(m => !!m.completedAt).length);

  // Effective progress for the form preview
  readonly effectiveProgress = computed(() => {
    if (this.formProgressMode() === 'manual') return this.formProgress();
    const ms = this.formMilestones();
    if (!ms.length) return 0;
    return Math.round(ms.filter(m => m.completedAt).length / ms.length * 100);
  });

  // Config arrays
  readonly categoryOptions: GoalCategory[] = ['health', 'career', 'finance', 'learning', 'personal', 'relationships', 'creative', 'other'];
  readonly statusOptions: GoalStatus[]      = ['active', 'completed', 'paused', 'abandoned'];

  // ── Slider open/close ────────────────────────────────────────────────────────
  openAdd() {
    this.editingId.set(null);
    this.resetForm();
    this.showSlider.set(true);
  }

  openEdit(goal: Goal, e?: Event) {
    e?.stopPropagation();
    this.editingId.set(goal.id);
    this.formTitle.set(goal.title);
    this.formDescription.set(goal.description ?? '');
    this.formCategory.set(goal.category ?? '');
    this.formStatus.set(goal.status);
    this.formTargetDate.set(goal.targetDate ?? '');
    this.formProgressMode.set(goal.progressMode);
    this.formProgress.set(goal.progress);
    this.formNotes.set(goal.notes ?? '');
    this.formMilestones.set(goal.milestones ? goal.milestones.map(m => ({ ...m })) : []);
    this.newMilestoneText.set('');
    this.showSlider.set(true);
  }

  closeSlider() {
    this.showSlider.set(false);
    this.editingId.set(null);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  save() {
    if (!this.canSave()) return;
    const milestones = this.formMilestones();
    const progress = this.formProgressMode() === 'milestones' && milestones.length
      ? Math.round(milestones.filter(m => m.completedAt).length / milestones.length * 100)
      : this.formProgress();

    const payload: Partial<Goal> = {
      title:        this.formTitle().trim(),
      description:  this.formDescription().trim() || undefined,
      category:     (this.formCategory() as GoalCategory) || undefined,
      status:       this.formStatus(),
      targetDate:   this.formTargetDate()  || undefined,
      progressMode: this.formProgressMode(),
      progress,
      milestones:   milestones.length ? milestones : undefined,
      notes:        this.formNotes().trim() || undefined,
      completedAt:  this.formStatus() === 'completed' ? (new Date().toISOString()) : undefined,
    };

    const id = this.editingId();
    if (this.isEditMode() && id) {
      this.store.updateGoal(id, payload);
    } else {
      this.store.addGoal({ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString() } as Goal);
    }
    this.closeSlider();
  }

  // ── Milestone management ─────────────────────────────────────────────────────
  addMilestone() {
    const text = this.newMilestoneText().trim();
    if (!text) return;
    const ms = this.formMilestones();
    this.formMilestones.set([...ms, { id: crypto.randomUUID(), title: text, order: ms.length }]);
    this.newMilestoneText.set('');
  }

  toggleMilestone(id: string) {
    this.formMilestones.update(list =>
      list.map(m => m.id === id
        ? { ...m, completedAt: m.completedAt ? undefined : new Date().toISOString() }
        : m)
    );
  }

  deleteMilestone(id: string) {
    this.formMilestones.update(list => list.filter(m => m.id !== id));
  }

  // Quick milestone toggle directly on a saved goal (from card)
  quickToggleMilestone(goalId: string, milestoneId: string, currentlyDone: boolean, e: Event) {
    e.stopPropagation();
    this.store.updateMilestone(goalId, milestoneId, {
      completedAt: currentlyDone ? undefined : new Date().toISOString(),
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  confirmDelete(goal: Goal, e?: Event) {
    e?.stopPropagation();
    this.deleteTarget.set(goal);
  }

  doDelete() {
    const goal = this.deleteTarget();
    if (!goal) return;
    this.store.deleteGoal(goal.id);
    if (this.editingId() === goal.id) this.closeSlider();
    this.deleteTarget.set(null);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private resetForm() {
    this.formTitle.set('');
    this.formDescription.set('');
    this.formCategory.set('');
    this.formStatus.set('active');
    this.formTargetDate.set('');
    this.formProgressMode.set('milestones');
    this.formProgress.set(0);
    this.formNotes.set('');
    this.formMilestones.set([]);
    this.newMilestoneText.set('');
  }

  goalProgress(goal: Goal): number {
    if (goal.progressMode === 'manual') return goal.progress;
    const ms = goal.milestones ?? [];
    if (!ms.length) return goal.progress;
    return Math.round(ms.filter(m => m.completedAt).length / ms.length * 100);
  }

  daysUntil(dateStr?: string): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setHours(12,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (days < 0)  return `${-days}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 30)  return `${days}d left`;
    if (days < 365) return `${Math.round(days / 30)}mo left`;
    return `${(days / 365).toFixed(1)}yr left`;
  }

  isOverdue(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  categoryMeta(cat?: GoalCategory | '') { return cat ? CATEGORY_META[cat] : null; }
  statusMeta(s: GoalStatus)             { return STATUS_META[s]; }

  milestoneDoneCount(goal: Goal): number {
    return (goal.milestones ?? []).filter(m => !!m.completedAt).length;
  }

  goalMilestones(goal: Goal) { return goal.milestones ?? []; }

  deleteEditing() {
    const goal = this.editingGoal();
    if (goal) this.deleteTarget.set(goal);
  }

  onNavItemClick(id: string) { this.activeFilter.set(id as SidebarFilter); }
}
