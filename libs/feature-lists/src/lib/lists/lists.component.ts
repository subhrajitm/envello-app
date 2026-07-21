import { Component, inject, signal, computed, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '@envello/state';
import { UserList, ListItem, ListType } from '@envello/domain';
import { EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent } from '@envello/ui';

const TYPE_META: Record<ListType, { label: string; icon: string; color: string }> = {
  shopping:  { label: 'Shopping',  icon: 'shopping_cart', color: '#059669' },
  packing:   { label: 'Packing',   icon: 'luggage',       color: '#0284c7' },
  checklist: { label: 'Checklist', icon: 'checklist',     color: '#6d28d9' },
  todo:      { label: 'To-do',     icon: 'check_box',     color: '#d97706' },
};

const COLORS = ['#6d28d9','#0284c7','#059669','#d97706','#dc2626','#ec4899','#0891b2','#6b7280'];

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, SliderPanelComponent, ConfirmDialogComponent],
  templateUrl: './lists.component.html',
  styleUrl:    './lists.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListsComponent {
  private store = inject(StoreService);

  // ── Active list ─────────────────────────────────────────────────────────────
  activeListId = signal<string | null>(null);

  readonly sortedLists = computed(() =>
    [...this.store.lists()].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
  );

  readonly activeList = computed(() =>
    this.sortedLists().find(l => l.id === this.activeListId()) ?? null
  );

  readonly uncheckedItems = computed(() =>
    (this.activeList()?.items ?? []).filter(i => !i.checked).sort((a, b) => a.order - b.order)
  );

  readonly checkedItems = computed(() =>
    (this.activeList()?.items ?? []).filter(i => i.checked).sort((a, b) => a.order - b.order)
  );

  readonly hasChecked = computed(() => (this.activeList()?.items ?? []).some(i => i.checked));

  // ── Add item form ────────────────────────────────────────────────────────────
  newItemText = signal('');
  newItemQty  = signal('');
  @ViewChild('itemInput') itemInputRef?: ElementRef<HTMLInputElement>;

  // ── List editor slider ───────────────────────────────────────────────────────
  showSlider  = signal(false);
  editingListId = signal<string | null>(null);

  formTitle       = signal('');
  formType        = signal<ListType>('shopping');
  formColor       = signal(COLORS[0]);
  formIsRecurring = signal(false);

  // ── Delete ───────────────────────────────────────────────────────────────────
  deleteTarget = signal<UserList | null>(null);

  // ── Config ───────────────────────────────────────────────────────────────────
  readonly typeOptions: ListType[] = ['shopping', 'packing', 'checklist', 'todo'];
  readonly colorOptions = COLORS;
  readonly isEditMode   = computed(() => !!this.editingListId());

  // ── List selection ───────────────────────────────────────────────────────────
  selectList(id: string) {
    this.activeListId.set(id);
    this.newItemText.set('');
    this.newItemQty.set('');
  }

  // ── Items ────────────────────────────────────────────────────────────────────
  addItem() {
    const text = this.newItemText().trim();
    const listId = this.activeListId();
    if (!text || !listId) return;

    const existing = this.activeList()?.items ?? [];
    const item: ListItem = {
      id:       crypto.randomUUID(),
      text,
      checked:  false,
      quantity: this.newItemQty().trim() || undefined,
      order:    existing.length,
    };
    this.store.addListItem(listId, item);
    this.newItemText.set('');
    this.newItemQty.set('');
    setTimeout(() => this.itemInputRef?.nativeElement.focus(), 0);
  }

  toggle(itemId: string) {
    const id = this.activeListId();
    if (id) this.store.toggleListItem(id, itemId);
  }

  removeItem(itemId: string) {
    const id = this.activeListId();
    if (id) this.store.removeListItem(id, itemId);
  }

  clearChecked() {
    const id = this.activeListId();
    if (id) this.store.clearCheckedItems(id);
  }

  resetList() {
    const id = this.activeListId();
    if (id) this.store.resetListItems(id);
  }

  // ── List create / edit ───────────────────────────────────────────────────────
  openNewList() {
    this.editingListId.set(null);
    this.formTitle.set('');
    this.formType.set('shopping');
    this.formColor.set(COLORS[0]);
    this.formIsRecurring.set(false);
    this.showSlider.set(true);
  }

  openEditList(list: UserList, e?: Event) {
    e?.stopPropagation();
    this.editingListId.set(list.id);
    this.formTitle.set(list.title);
    this.formType.set(list.type);
    this.formColor.set(list.color ?? COLORS[0]);
    this.formIsRecurring.set(list.isRecurring);
    this.showSlider.set(true);
  }

  saveList() {
    const title = this.formTitle().trim();
    if (!title) return;
    const id = this.editingListId();
    if (this.isEditMode() && id) {
      this.store.updateList(id, {
        title, type: this.formType(), color: this.formColor(), isRecurring: this.formIsRecurring(),
      });
    } else {
      const list: UserList = {
        id:          crypto.randomUUID(),
        title,
        type:        this.formType(),
        color:       this.formColor(),
        isRecurring: this.formIsRecurring(),
        items:       [],
        createdAt:   new Date().toISOString(),
      };
      this.store.addList(list);
      this.activeListId.set(list.id);
    }
    this.showSlider.set(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  doDelete() {
    const list = this.deleteTarget();
    if (!list) return;
    if (this.activeListId() === list.id) this.activeListId.set(null);
    this.store.deleteList(list.id);
    this.deleteTarget.set(null);
    this.showSlider.set(false);
  }

  deleteEditing() {
    const id = this.editingListId();
    const list = id ? this.sortedLists().find(l => l.id === id) ?? null : null;
    if (list) this.deleteTarget.set(list);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  typeMeta(type: ListType) { return TYPE_META[type]; }

  itemCount(list: UserList)   { return list.items.length; }
  checkedCount(list: UserList){ return list.items.filter(i => i.checked).length; }

  listProgress(list: UserList): number {
    const total = list.items.length;
    if (!total) return 0;
    return Math.round(list.items.filter(i => i.checked).length / total * 100);
  }

  onItemKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.addItem(); }
  }
}
