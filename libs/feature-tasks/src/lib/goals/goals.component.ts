import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '@envello/core';
import { Goal, GoalCategory, GoalMilestone } from '@envello/domain';
import {
  FeatureSidebarComponent,
  SliderPanelComponent,
  EmptyStateComponent,
  ConfirmDialogComponent,
} from '@envello/ui';

type StatusFilter = 'all' | 'active' | 'completed' | 'paused';

const CATEGORY_ICONS: Record<GoalCategory, string> = {
  health: 'favorite',
  career: 'work',
  finance: 'payments',
  learning: 'school',
  personal: 'person',
  other: 'category',
};

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  health: '#ef4444',
  career: '#6366f1',
  finance: '#10b981',
  learning: '#f59e0b',
  personal: '#8b5cf6',
  other: '#6b7280',
};

@Component({
  selector: 'lib-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe, FeatureSidebarComponent, SliderPanelComponent, EmptyStateComponent, ConfirmDialogComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalsComponent {
  store = inject(StoreService);

  // ── Sidebar filter ──────────────────────────────────────────────────────────
  statusFilter = signal<StatusFilter>('all');
  searchQuery  = signal('');

  // ── Detail panel ─────────────────────────────────────────────────────────────
  selectedGoalId = signal<string | null>(null);
  selectedGoal = computed(() => {
    const id = this.selectedGoalId();
    if (!id) return null;
    return this.store.spaceGoals().find(g => g.id === id) ?? null;
  });

  // ── Creation form ─────────────────────────────────────────────────────────────
  showCreateForm = signal(false);
  formTitle = signal('');
  formDescription = signal('');
  formCategory = signal<GoalCategory>('personal');
  formTargetDate = signal('');
  formMilestoneInputs = signal<string[]>(['']);

  // ── Edit mode (inline in detail panel) ───────────────────────────────────────
  editMode = signal(false);
  editTitle = signal('');
  editDescription = signal('');
  editCategory = signal<GoalCategory>('personal');
  editTargetDate = signal('');

  // ── Delete confirm ────────────────────────────────────────────────────────────
  showDeleteConfirm = signal(false);

  // ── Derived ──────────────────────────────────────────────────────────────────
  filteredGoals = computed(() => {
    const filter = this.statusFilter();
    const query  = this.searchQuery().toLowerCase().trim();
    let goals = this.store.spaceGoals();
    if (filter !== 'all') goals = goals.filter(g => g.status === filter);
    if (query) goals = goals.filter(g =>
      g.title.toLowerCase().includes(query) ||
      (g.description ?? '').toLowerCase().includes(query) ||
      g.category.toLowerCase().includes(query)
    );
    return goals;
  });

  counts = computed(() => {
    const goals = this.store.spaceGoals();
    return {
      all: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      paused: goals.filter(g => g.status === 'paused').length,
    };
  });

  sidebarNavItems = computed(() => [
    { id: 'all',       label: 'All Goals',  icon: 'flag',           count: this.counts().all       },
    { id: 'active',    label: 'Active',     icon: 'rocket_launch',  count: this.counts().active    },
    { id: 'paused',    label: 'Paused',     icon: 'pause_circle',   count: this.counts().paused    },
    { id: 'completed', label: 'Completed',  icon: 'check_circle',   count: this.counts().completed },
  ]);

  // ── Category helpers ──────────────────────────────────────────────────────────
  categoryIcon(cat: GoalCategory): string {
    return CATEGORY_ICONS[cat] ?? 'category';
  }

  categoryColor(cat: GoalCategory): string {
    return CATEGORY_COLORS[cat] ?? '#6b7280';
  }

  categories: GoalCategory[] = ['health', 'career', 'finance', 'learning', 'personal', 'other'];

  // ── Status badge ─────────────────────────────────────────────────────────────
  statusLabel(status: Goal['status']): string {
    const labels: Record<Goal['status'], string> = {
      active: 'Active',
      completed: 'Completed',
      paused: 'Paused',
      abandoned: 'Abandoned',
    };
    return labels[status];
  }

  statusClass(status: Goal['status']): string {
    return `goal-status--${status}`;
  }

  // ── Date display ─────────────────────────────────────────────────────────────
  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isOverdue(goal: Goal): boolean {
    if (!goal.targetDate || goal.status === 'completed') return false;
    return new Date(goal.targetDate) < new Date();
  }

  milestoneDoneCount(goal: Goal): number {
    return goal.milestones.filter(m => m.done).length;
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  setFilter(f: StatusFilter) {
    this.statusFilter.set(f);
  }

  // ── Goal card click ───────────────────────────────────────────────────────────
  openDetail(goal: Goal) {
    if (this.selectedGoalId() === goal.id) {
      this.selectedGoalId.set(null);
      this.editMode.set(false);
    } else {
      this.selectedGoalId.set(goal.id);
      this.editMode.set(false);
      this.showDeleteConfirm.set(false);
    }
  }

  closeDetail() {
    this.selectedGoalId.set(null);
    this.editMode.set(false);
    this.showDeleteConfirm.set(false);
  }

  // ── Milestone toggle ─────────────────────────────────────────────────────────
  toggleMilestone(goal: Goal, milestone: GoalMilestone) {
    const updatedMilestones: GoalMilestone[] = goal.milestones.map(m =>
      m.id === milestone.id ? { ...m, done: !m.done } : m,
    );
    this.store.updateGoal(goal.id, { milestones: updatedMilestones });
  }

  // ── Status cycling ────────────────────────────────────────────────────────────
  cycleStatus(goal: Goal, event: Event) {
    event.stopPropagation();
    const order: Goal['status'][] = ['active', 'paused', 'completed'];
    const idx = order.indexOf(goal.status);
    const next = order[(idx + 1) % order.length];
    this.store.updateGoal(goal.id, { status: next });
  }

  // ── Edit ──────────────────────────────────────────────────────────────────────
  startEdit(goal: Goal) {
    this.editTitle.set(goal.title);
    this.editDescription.set(goal.description ?? '');
    this.editCategory.set(goal.category);
    this.editTargetDate.set(goal.targetDate ?? '');
    this.editMode.set(true);
  }

  saveEdit(goal: Goal) {
    const title = this.editTitle().trim();
    if (!title) return;
    this.store.updateGoal(goal.id, {
      title,
      description: this.editDescription().trim() || undefined,
      category: this.editCategory(),
      targetDate: this.editTargetDate() || undefined,
    });
    this.editMode.set(false);
  }

  cancelEdit() {
    this.editMode.set(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  requestDelete() {
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(goal: Goal) {
    this.store.deleteGoal(goal.id);
    this.closeDetail();
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
  }

  // ── Creation form ─────────────────────────────────────────────────────────────
  openCreateForm() {
    this.formTitle.set('');
    this.formDescription.set('');
    this.formCategory.set('personal');
    this.formTargetDate.set('');
    this.formMilestoneInputs.set(['']);
    this.showCreateForm.set(true);
    this.closeDetail();
  }

  closeCreateForm() {
    this.showCreateForm.set(false);
  }

  addMilestoneInput() {
    this.formMilestoneInputs.update(list => [...list, '']);
  }

  removeMilestoneInput(i: number) {
    this.formMilestoneInputs.update(list => list.filter((_, idx) => idx !== i));
  }

  updateMilestoneInput(i: number, value: string) {
    this.formMilestoneInputs.update(list => {
      const next = [...list];
      next[i] = value;
      return next;
    });
  }

  submitCreate() {
    const title = this.formTitle().trim();
    if (!title) return;

    const milestones: GoalMilestone[] = this.formMilestoneInputs()
      .map(t => t.trim())
      .filter(t => !!t)
      .map(t => ({ id: crypto.randomUUID(), title: t, done: false }));

    const goal: Goal = {
      id: crypto.randomUUID(),
      title,
      description: this.formDescription().trim() || undefined,
      category: this.formCategory(),
      targetDate: this.formTargetDate() || undefined,
      progress: 0,
      status: 'active',
      milestones,
      createdAt: new Date().toISOString(),
    };

    this.store.addGoal(goal);
    this.closeCreateForm();
    this.selectedGoalId.set(goal.id);
  }

  // ── Keyboard close ────────────────────────────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.showCreateForm()) {
      this.closeCreateForm();
      return;
    }
    if (this.editMode()) {
      this.cancelEdit();
      return;
    }
    if (this.showDeleteConfirm()) {
      this.cancelDelete();
      return;
    }
    if (this.selectedGoalId()) {
      this.closeDetail();
    }
  }

  getLinkedTask(taskId: string) {
    return this.store.tasks().find(t => t.id === taskId) ?? null;
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}
