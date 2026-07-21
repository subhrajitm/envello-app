import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '@envello/state';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep } from '@envello/domain';
import { FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent } from '@envello/ui';

type RecipeFilter = 'all' | 'favorites' | RecipeCategory;
type SliderMode  = 'view' | 'edit';

const CAT_META: Record<RecipeCategory, { label: string; icon: string; color: string }> = {
  breakfast: { label: 'Breakfast', icon: 'breakfast_dining', color: '#f59e0b' },
  lunch:     { label: 'Lunch',     icon: 'lunch_dining',     color: '#10b981' },
  dinner:    { label: 'Dinner',    icon: 'dinner_dining',    color: '#6d28d9' },
  snack:     { label: 'Snack',     icon: 'cookie',           color: '#d97706' },
  dessert:   { label: 'Dessert',   icon: 'cake',             color: '#ec4899' },
  drink:     { label: 'Drink',     icon: 'local_cafe',       color: '#0284c7' },
  other:     { label: 'Other',     icon: 'restaurant',       color: '#6b7280' },
};

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, FeatureSidebarComponent, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent],
  templateUrl: './recipes.component.html',
  styleUrl:    './recipes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesComponent {
  private store = inject(StoreService);

  // ── View state ──────────────────────────────────────────────────────────────
  activeFilter = signal<RecipeFilter>('all');
  searchQuery  = signal('');

  // ── Slider ──────────────────────────────────────────────────────────────────
  showSlider   = signal(false);
  sliderMode   = signal<SliderMode>('view');
  selectedId   = signal<string | null>(null);

  // ── Cooking mode — local checklist state, not persisted ─────────────────────
  checkedIngredients = signal<Set<string>>(new Set());

  // ── Form state ───────────────────────────────────────────────────────────────
  formTitle       = signal('');
  formDescription = signal('');
  formCategory    = signal<RecipeCategory | ''>('');
  formServings    = signal('');
  formPrepTime    = signal('');
  formCookTime    = signal('');
  formIngredients = signal<RecipeIngredient[]>([]);
  formSteps       = signal<RecipeStep[]>([]);
  formTags        = signal<string[]>([]);
  formTagInput    = signal('');
  formSourceUrl   = signal('');
  formNotes       = signal('');

  // New ingredient row
  newIngAmount = signal('');
  newIngUnit   = signal('');
  newIngName   = signal('');

  // New step row
  newStepText  = signal('');

  // ── Delete ───────────────────────────────────────────────────────────────────
  deleteTarget = signal<Recipe | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────────
  readonly all = computed(() =>
    [...this.store.recipes()].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
  );

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const f = this.activeFilter();
    const list = this.all();

    const byFilter = (() => {
      if (f === 'all')       return list;
      if (f === 'favorites') return list.filter(r => r.isFavorite);
      return list.filter(r => r.category === f);
    })();

    if (!q) return byFilter;
    return byFilter.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(q)) ||
      r.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  readonly sidebarNavItems = computed(() => {
    const list = this.all();
    return [
      { id: 'all',       label: 'All Recipes', icon: 'restaurant_menu', count: list.length },
      { id: 'favorites', label: 'Favourites',  icon: 'star',            count: list.filter(r => r.isFavorite).length },
      ...this.categoryOptions.map(cat => ({
        id: cat, label: CAT_META[cat].label, icon: CAT_META[cat].icon,
        count: list.filter(r => r.category === cat).length,
      })),
    ];
  });

  readonly selectedRecipe   = computed(() => this.all().find(r => r.id === this.selectedId()) ?? null);
  readonly isEditMode       = computed(() => !!this.selectedId() && this.sliderMode() === 'edit' || !this.selectedId());
  readonly canSave          = computed(() => !!this.formTitle().trim() && this.formIngredients().length > 0);
  readonly anyIngChecked    = computed(() => this.checkedIngredients().size > 0);
  readonly formTotalMinutes = computed(() => (+this.formPrepTime() || 0) + (+this.formCookTime() || 0));

  readonly categoryOptions: RecipeCategory[] = ['breakfast','lunch','dinner','snack','dessert','drink','other'];

  // ── Open/close ───────────────────────────────────────────────────────────────
  openView(recipe: Recipe) {
    this.selectedId.set(recipe.id);
    this.sliderMode.set('view');
    this.checkedIngredients.set(new Set());
    this.showSlider.set(true);
  }

  openNew() {
    this.selectedId.set(null);
    this.resetForm();
    this.sliderMode.set('edit');
    this.showSlider.set(true);
  }

  openEditMode() {
    const r = this.selectedRecipe();
    if (!r) return;
    this.populateForm(r);
    this.sliderMode.set('edit');
  }

  closeSlider() {
    this.showSlider.set(false);
    this.selectedId.set(null);
    this.sliderMode.set('view');
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  save() {
    if (!this.canSave()) return;
    const payload: Partial<Recipe> = {
      title:       this.formTitle().trim(),
      description: this.formDescription().trim()  || undefined,
      category:    (this.formCategory() as RecipeCategory) || undefined,
      servings:    this.formServings()   ? +this.formServings()  : undefined,
      prepTime:    this.formPrepTime()   ? +this.formPrepTime()  : undefined,
      cookTime:    this.formCookTime()   ? +this.formCookTime()  : undefined,
      ingredients: this.formIngredients(),
      steps:       this.formSteps().map((s, i) => ({ ...s, order: i })),
      tags:        this.formTags().length ? this.formTags() : undefined,
      sourceUrl:   this.formSourceUrl().trim() || undefined,
      notes:       this.formNotes().trim()     || undefined,
    };

    const id = this.selectedId();
    if (id) {
      this.store.updateRecipe(id, payload);
      this.sliderMode.set('view');
    } else {
      const newRecipe: Recipe = {
        id:          crypto.randomUUID(),
        title:       this.formTitle().trim(),
        isFavorite:  false,
        ingredients: payload.ingredients ?? [],
        steps:       payload.steps ?? [],
        ...payload,
        createdAt:   new Date().toISOString(),
      };
      this.store.addRecipe(newRecipe);
      this.selectedId.set(newRecipe.id);
      this.sliderMode.set('view');
    }
  }

  // ── Favourite ────────────────────────────────────────────────────────────────
  toggleFav(recipe: Recipe, e?: Event) {
    e?.stopPropagation();
    this.store.updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite });
  }

  // ── Cooking mode ─────────────────────────────────────────────────────────────
  toggleIngredient(id: string) {
    this.checkedIngredients.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  isIngChecked(id: string): boolean { return this.checkedIngredients().has(id); }
  clearCooking() { this.checkedIngredients.set(new Set()); }

  // ── Ingredient management ────────────────────────────────────────────────────
  addIngredient() {
    const name = this.newIngName().trim();
    if (!name) return;
    const ing: RecipeIngredient = {
      id:     crypto.randomUUID(),
      amount: this.newIngAmount().trim(),
      unit:   this.newIngUnit().trim(),
      name,
    };
    this.formIngredients.update(list => [...list, ing]);
    this.newIngAmount.set('');
    this.newIngUnit.set('');
    this.newIngName.set('');
  }

  removeIngredient(id: string) {
    this.formIngredients.update(list => list.filter(i => i.id !== id));
  }

  // ── Step management ──────────────────────────────────────────────────────────
  addStep() {
    const text = this.newStepText().trim();
    if (!text) return;
    const step: RecipeStep = {
      id:          crypto.randomUUID(),
      order:       this.formSteps().length,
      instruction: text,
    };
    this.formSteps.update(list => [...list, step]);
    this.newStepText.set('');
  }

  removeStep(id: string) {
    this.formSteps.update(list => list.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  }

  // ── Tags ─────────────────────────────────────────────────────────────────────
  addTag() {
    const tag = this.formTagInput().trim().toLowerCase();
    if (!tag || this.formTags().includes(tag)) { this.formTagInput.set(''); return; }
    this.formTags.update(ts => [...ts, tag]);
    this.formTagInput.set('');
  }

  removeTag(tag: string) { this.formTags.update(ts => ts.filter(t => t !== tag)); }

  // ── Delete ───────────────────────────────────────────────────────────────────
  doDelete() {
    const r = this.deleteTarget();
    if (!r) return;
    this.store.deleteRecipe(r.id);
    if (this.selectedId() === r.id) this.closeSlider();
    this.deleteTarget.set(null);
  }

  deleteSelected() { const r = this.selectedRecipe(); if (r) this.deleteTarget.set(r); }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private resetForm() {
    this.formTitle.set(''); this.formDescription.set(''); this.formCategory.set('');
    this.formServings.set(''); this.formPrepTime.set(''); this.formCookTime.set('');
    this.formIngredients.set([]); this.formSteps.set([]); this.formTags.set([]);
    this.formTagInput.set(''); this.formSourceUrl.set(''); this.formNotes.set('');
    this.newIngAmount.set(''); this.newIngUnit.set(''); this.newIngName.set('');
    this.newStepText.set('');
  }

  private populateForm(r: Recipe) {
    this.formTitle.set(r.title);
    this.formDescription.set(r.description ?? '');
    this.formCategory.set(r.category ?? '');
    this.formServings.set(r.servings ? String(r.servings) : '');
    this.formPrepTime.set(r.prepTime ? String(r.prepTime) : '');
    this.formCookTime.set(r.cookTime ? String(r.cookTime) : '');
    this.formIngredients.set(r.ingredients.map(i => ({ ...i })));
    this.formSteps.set(r.steps.map(s => ({ ...s })));
    this.formTags.set([...(r.tags ?? [])]);
    this.formTagInput.set('');
    this.formSourceUrl.set(r.sourceUrl ?? '');
    this.formNotes.set(r.notes ?? '');
    this.newIngAmount.set(''); this.newIngUnit.set(''); this.newIngName.set('');
    this.newStepText.set('');
  }

  catMeta(cat?: RecipeCategory | '') { return cat ? CAT_META[cat] : null; }

  formatTime(minutes?: number): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  totalTime(r: Recipe): number { return (r.prepTime ?? 0) + (r.cookTime ?? 0); }

  formatIngredient(i: RecipeIngredient): string {
    const parts = [i.amount, i.unit, i.name].filter(Boolean).join(' ');
    return i.note ? `${parts} (${i.note})` : parts;
  }

  avatarColor(title: string): string {
    const colors = ['#6d28d9','#0284c7','#059669','#d97706','#dc2626','#ec4899','#0891b2'];
    let h = 0;
    for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }

  onIngKeydown(e: KeyboardEvent) { if (e.key === 'Enter') { e.preventDefault(); this.addIngredient(); } }
  onStepKeydown(e: KeyboardEvent){ if (e.key === 'Enter') { e.preventDefault(); this.addStep(); } }
  onTagKeydown(e: KeyboardEvent) { if (e.key === 'Enter' || (e as KeyboardEvent).key === ',') { e.preventDefault(); this.addTag(); } }

  onNavItemClick(id: string) { this.activeFilter.set(id as RecipeFilter); }
}
